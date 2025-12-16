import { chromium } from 'playwright';
import playwrightStealth from 'playwright-stealth';
const { stealth } = playwrightStealth;
import fs from 'fs';
import path from 'path';
import random from 'random';

// Add your previous code here

// Add your previous code here


const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ----------------------------------------------------------
// ⚙️ USER SETTINGS
// ----------------------------------------------------------
const FAST_MODE = false;
const MAX_SUBJECTS = null;
const CAMPUS_NAME = "Keele";
const SAVE_DIR = "york_courses";
const PROGRESS_FILE = "progress.txt";

// ----------------------------------------------------------
// Dynamic timing based on FAST_MODE
const HUMAN_DELAY_MIN = FAST_MODE ? 100 : 15000;
const HUMAN_DELAY_MAX = FAST_MODE ? 400 : 25000;

function humanPause(min_ms = HUMAN_DELAY_MIN, max_ms = HUMAN_DELAY_MAX) {
  return sleep(random.int(min_ms, max_ms));
}

function sanitizeFilename(name) {
  return name.replace(/[\\/*?:"<>|]/g, "_").slice(0, 120);
}

// ----------------------------------------------------------
// 🕐 DAILY MAINTENANCE CHECK (with 5-minute leeway)
// ----------------------------------------------------------
async function checkMaintenanceWindow() {
  const now = new Date();
  const start = new Date(now.setHours(23, 55, 0, 0));
  let end = new Date(now.setHours(1, 45, 0, 0));

  if (now.getHours() < 2) {
    start.setDate(start.getDate() - 1);  // Move start time to previous day
  }

  if (start <= now && now <= end) {
    const target = new Date(start.setHours(1, 45, 0, 0));
    const waitTime = target - now;
    console.log(`🕐 Maintenance window detected (${now.toLocaleTimeString()} → 1:45 a.m.).`);
    console.log(`💤 Sleeping for ${waitTime / 60000} minutes...`);
    await sleep(waitTime);
    console.log("✅ Maintenance window over — resuming.");
  }
}

// ----------------------------------------------------------
// 🧠 SESSION DETECTION + RECOVERY HELPERS
// ----------------------------------------------------------
async function sessionExpired(page) {
  const content = await page.content();
  return content.toLowerCase().includes("your session has been ended") ||
         content.toLowerCase().includes("you have exceeded the maximum time limit");
}

async function reloadYorkMain(page, startUrl, subjectValue = null, campusName = null) {
  console.log("🔄 Re-loading main York course site...");
  const retries = 3;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.locator("img[alt='Search By Subject']").click();
      await page.waitForLoadState('networkidle', { timeout: 60000 });
      break;
    } catch (error) {
      console.log(`⚠️ Reload attempt ${attempt} failed: ${error}`);
      if (attempt < retries) {
        console.log(`⏳ Waiting ${10 * attempt}s before retry...`);
        await sleep(10000 * attempt);
      } else {
        console.log("❌ All reload attempts failed. Continuing with next subject.");
        return;
      }
    }
  }

  if (subjectValue && campusName) {
    try {
      await page.selectOption("#subjectSelect", { value: subjectValue });
      await page.evaluate((campusName) => {
        const campus = document.getElementById('campusSelect');
        for (const option of campus.options) option.selected = false;
        for (const option of campus.options)
          if (option.text.includes(campusName)) option.selected = true;
      }, campusName);
      await page.locator("input[type=submit][value='Search Courses']").click();
      await page.waitForLoadState('networkidle', { timeout: 60000 });
    } catch (error) {
      console.log(`⚠️ Failed to re-select subject/campus after reload: ${error}`);
    }
  }
}

// ----------------------------------------------------------
// 🚀 MAIN SCRAPER
// ----------------------------------------------------------
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--disable-backgrounding-occluded-windows",
      "--disable-background-timer-throttling",
      "--disable-features=UseSkiaRenderer",
      "--ignore-gpu-blacklist",
    ],
  });

  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1366, height: 768 },
  });

  stealth(context);  // Apply stealth to avoid detection
  const page = await context.newPage();

  const baseUrl = "https://w2prod.sis.yorku.ca";
  const startUrl = `${baseUrl}/Apps/WebObjects/cdm.woa/`;

  // ----------------------------------------------------------
  // Step 1 – Open main site and reach “Search by Subject”
  // ----------------------------------------------------------
  await checkMaintenanceWindow();
  console.log("🌐 Opening York course site...");
  await page.goto(startUrl, { timeout: 60000 });
  await humanPause();
  await page.locator("img[alt='Search By Subject']").click();
  await humanPause(500, 1500);
  await page.waitForLoadState('networkidle');

  // ----------------------------------------------------------
  // Step 2 – Collect all subject options
  // ----------------------------------------------------------
  const options = await page.locator("#subjectSelect option").all();
  const subjects = await Promise.all(options.map(async (opt) => {
    const text = await opt.innerText();
    const value = await opt.getAttribute('value');
    return value ? [text.trim(), value] : null;
  }));
  const filteredSubjects = subjects.filter(subject => subject !== null);
  if (MAX_SUBJECTS) {
    filteredSubjects.splice(MAX_SUBJECTS);
  }

  console.log(`📚 Found ${filteredSubjects.length} subjects to scrape`);

  if (!fs.existsSync(SAVE_DIR)) {
    fs.mkdirSync(SAVE_DIR);
  }

  const progressSet = new Set();
  if (fs.existsSync(PROGRESS_FILE)) {
    const progressData = fs.readFileSync(PROGRESS_FILE, 'utf8').split('\n').filter(Boolean);
    progressSet.add(...progressData);
  }

  const newlyCompleted = [...filteredSubjects]
    .map(([subjectName]) => subjectName)
    .filter(name => !progressSet.has(name));

  if (newlyCompleted.length) {
    fs.appendFileSync(PROGRESS_FILE, newlyCompleted.join("\n") + "\n");
    console.log(`🧾 Added ${newlyCompleted.length} pre-existing folders to ${PROGRESS_FILE}`);
  } else {
    console.log("✅ No new pre-existing folders found to add.");
  }

  const completedSubjects = new Set(fs.readFileSync(PROGRESS_FILE, 'utf8').split('\n').filter(Boolean));
  console.log(`🔁 Resuming — ${completedSubjects.size} subjects already completed`);

  // ----------------------------------------------------------
  // Step 3 – Loop through each subject
  // ----------------------------------------------------------
  for (let idx = 0; idx < filteredSubjects.length; idx++) {
    const [subjectName, subjectValue] = filteredSubjects[idx];

    await checkMaintenanceWindow(); // 🕐 Pause automatically if in window

    if (completedSubjects.has(subjectName)) {
      console.log(`⏭️ Skipping ${subjectName} — already completed.`);
      continue;
    }

    console.log(`\n🎓 [${idx + 1}/${filteredSubjects.length}] Scraping subject: ${subjectName}`);

    // --- Select subject + campus ---
    try {
      await page.waitForSelector("#subjectSelect", { timeout: 60000 });
      await page.selectOption("#subjectSelect", { value: subjectValue });
    } catch (error) {
      console.log(`⚠️ subjectSelect not found — reloading main York site.`);
      await reloadYorkMain(page, startUrl);
      continue;
    }

    await page.evaluate((campusName) => {
      const campus = document.getElementById('campusSelect');
      for (const option of campus.options) option.selected = false;
      for (const option of campus.options) {
        if (option.text.includes(campusName)) option.selected = true;
      }
    }, CAMPUS_NAME);

    await page.locator("input[type=submit][value='Search Courses']").click();
    await page.waitForLoadState('networkidle');

    if (await sessionExpired(page)) {
      await reloadYorkMain(page, startUrl, subjectValue, CAMPUS_NAME);
    }

    // Gather course links
    const rows = await page.locator("table >> tr").all();
    const courseLinks = [];

    for (let row of rows.slice(2)) {  // Skip header rows
      const tds = await row.locator("td").all();
      if (tds.length < 3) continue;

      const code = await tds[0].innerText();
      const title = await tds[1].innerText();
      const hrefs = await tds[2].locator("a").evaluateAll(els => els.map(e => e.getAttribute('href')));
      const href = hrefs.find(h => h && h.startsWith("/Apps/WebObjects/cdm.woa/"));
      if (href) {
        courseLinks.push([code.trim(), title.trim(), baseUrl + href]);
      }
    }

    console.log(`   → Found ${courseLinks.length} courses`);

    // ----------------------------------------------------------
    // Step 4 – Visit each course, save HTML, return to list
    // ----------------------------------------------------------
    for (let [code, title, link] of courseLinks) {
      await checkMaintenanceWindow();

      const filename = sanitizeFilename(`${code}_${title}.html`);
      const filepath = path.join(SAVE_DIR, sanitizeFilename(subjectName), filename);
      console.log(`   ↳ ${code} – ${title}`);

      try {
        await page.goto(link, { waitUntil: 'networkidle', timeout: 60000 });

        if (await sessionExpired(page)) {
          await reloadYorkMain(page, startUrl, subjectValue, CAMPUS_NAME);
        }

        const html = await page.content();
        fs.mkdirSync(path.dirname(filepath), { recursive: true });
        fs.writeFileSync(filepath, html, 'utf8');
        console.log(`      💾 Saved ${filename}`);
        await humanPause(1000, 2000);
      } catch (error) {
        console.log(`      ❌ Failed: ${error}`);
      }

      try {
        await page.goBack({ waitUntil: 'networkidle', timeout: 60000 });
        await humanPause(1000, 2000);
      } catch (error) {
        console.log(`⚠️ goBack failed: ${error}, reloading main site.`);
        await reloadYorkMain(page, startUrl, subjectValue, CAMPUS_NAME);
      }
    }

    fs.appendFileSync(PROGRESS_FILE, subjectName + "\n");
    console.log(`✅ Finished ${subjectName} (saved to ${PROGRESS_FILE})`);
    await humanPause();
  }

  console.log("\n🎉 Done! All subjects processed.");
  await browser.close();
})();
