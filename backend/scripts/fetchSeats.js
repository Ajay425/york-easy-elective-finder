/**
 * fetchSeats.js
 * Fetches open seat counts for every course from York's VSB (Visual Schedule Builder)
 * and writes public/data/seats.json for the frontend to consume.
 *
 * Usage:
 *   node scripts/fetchSeats.js
 *
 * Required .env:
 *   YORK_USERNAME=your_passport_york_username
 *   YORK_PASSWORD=your_passport_york_password
 *   VSB_TERM=2026102119   (optional, defaults to Fall/Winter 2026-2027)
 */

import { chromium } from "playwright";
import { load as cheerioLoad } from "cheerio";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from backend/ regardless of where node is invoked from
dotenv.config({ path: path.resolve(__dirname, "../.env") });
const PROJECT_ROOT = path.resolve(__dirname, "../../");

const ELECTIVES_PATH = path.join(
  PROJECT_ROOT,
  "frontend/yorku-elective-tracker/public/data/electives.json"
);
const SEATS_OUTPUT = path.join(
  PROJECT_ROOT,
  "frontend/yorku-elective-tracker/public/data/seats.json"
);

const VSB_TERM = process.env.VSB_TERM || "2026102119"; // Fall/Winter 2026-2027
const VSB_BASE = "https://schedulebuilder.yorku.ca/vsb";

const DELAY_MS = 200;     // polite delay between requests
const LOG_EVERY = 50;     // log progress every N courses
const CONCURRENCY = 1;    // keep sequential to avoid hammering VSB

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Compute the t/e anti-bot values the VSB uses (from common.js nWindow()) */
function computeTE() {
  const t = Math.floor(Date.now() / 60000) % 1000;
  const e = (t % 3) + (t % 19) + (t % 42);
  return { t, e };
}

/** Build the VSB course key from our electives data */
function buildCourseKey(course) {
  // code is like "SC/NATS 1510" — we want the last token
  const number = course.code.trim().split(/\s+/).pop();
  const credits = course.credits; // "3.00"
  return `${course.facultyPrefix}-${course.deptAcronym}-${number}-${credits}-EN-`;
}

/** Parse open seats from VSB XML response. Returns { catNumber -> openSeats } */
function parseSeats(xml) {
  const $ = cheerioLoad(xml, { xmlMode: true });
  const seats = {};
  $("block").each((_, el) => {
    const key = $(el).attr("key");
    const os = $(el).attr("os");
    if (key && os !== undefined) {
      const parsed = parseInt(os, 10);
      if (!isNaN(parsed)) seats[key] = parsed;
    }
  });
  return seats;
}

/** Authenticate with Passport York and navigate to VSB to establish session */
async function authenticate(page) {
  const username = process.env.YORK_USERNAME;
  const password = process.env.YORK_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "YORK_USERNAME and YORK_PASSWORD must be set in backend/.env"
    );
  }

  console.log("🔐 Authenticating with Passport York...");

  // Navigate to VSB — will redirect to Passport York if not authenticated
  await page.goto(
    `${VSB_BASE}/criteria.jsp?lang=en&term=${VSB_TERM}`,
    { waitUntil: "domcontentloaded", timeout: 60000 }
  );

  // If already on VSB, no login needed
  if (page.url().includes("schedulebuilder.yorku.ca")) {
    console.log("✅ Session already active.");
    return;
  }

  // Wait for login form — Passport York inputs often lack a type attribute,
  // so use getByRole('textbox') which matches <input> with no type too.
  await page.getByRole("textbox").first().waitFor({ state: "visible", timeout: 30000 });

  // Fill username (first textbox) and password
  await page.getByRole("textbox").first().fill(username);
  await page.locator("input[type=password]").fill(password);

  // Click Login — Passport York uses <input type=submit> labelled "Login"
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }),
    page.locator("input[type=submit], button[type=submit], button").filter({ hasText: /login|sign in/i }).first().click(),
  ]);

  // If there's a MFA/redirect loop, just wait for final VSB URL
  await page.waitForURL(/schedulebuilder\.yorku\.ca/, { timeout: 60000 });
  console.log("✅ Authenticated — VSB session active.");
}

/** Fetch seat data for one course from VSB */
async function fetchCourseSeats(page, course) {
  const key = buildCourseKey(course);
  const { t, e } = computeTE();
  const ts = Date.now();
  const url =
    `${VSB_BASE}/getclassdata.jsp?term=${VSB_TERM}` +
    `&course_0_0=${encodeURIComponent(key)}` +
    `&rq_0_0=null&t=${t}&e=${e}&nouser=1&_=${ts}`;

  const xml = await page.evaluate(async (fetchUrl) => {
    const r = await fetch(fetchUrl, { credentials: "include" });
    return r.text();
  }, url);

  if (xml.includes("<error>")) {
    const m = xml.match(/<error>(.*?)<\/error>/s);
    const msg = m ? m[1].trim() : "unknown error";
    throw new Error(msg);
  }

  return parseSeats(xml);
}

async function main() {
  // Load course list
  const electivesRaw = await fs.readFile(ELECTIVES_PATH, "utf-8");
  const electivesData = JSON.parse(electivesRaw);
  const courses = electivesData.courses ?? [];
  console.log(`📚 Loaded ${courses.length} courses from electives.json`);

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    await authenticate(page);

    const allSeats = {};
    let success = 0;
    let failed = 0;

    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      try {
        const courseSeats = await fetchCourseSeats(page, course);
        Object.assign(allSeats, courseSeats);
        success++;
      } catch (err) {
        failed++;
        // Only log first few failures to avoid noise
        if (failed <= 10) {
          console.warn(`  ⚠️  ${course.code}: ${err.message}`);
        }
      }

      if ((i + 1) % LOG_EVERY === 0 || i === courses.length - 1) {
        console.log(
          `  Progress: ${i + 1}/${courses.length} ` +
          `(✓ ${success}, ✗ ${failed}, seats so far: ${Object.keys(allSeats).length})`
        );
        // Write intermediate snapshot so progress isn't lost on crash
        await writeSeats(allSeats, { partial: true });
      }

      await sleep(DELAY_MS);
    }

    await writeSeats(allSeats, { partial: false });
    console.log(
      `\n✅ Done — ${Object.keys(allSeats).length} seat entries written to seats.json`
    );
  } finally {
    await browser.close();
  }
}

async function writeSeats(seats, { partial }) {
  const output = {
    generatedAt: new Date().toISOString(),
    termCode: VSB_TERM,
    ...(partial ? { partial: true } : {}),
    seats,
  };
  await fs.mkdir(path.dirname(SEATS_OUTPUT), { recursive: true });
  await fs.writeFile(SEATS_OUTPUT, JSON.stringify(output, null, 2), "utf-8");
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
