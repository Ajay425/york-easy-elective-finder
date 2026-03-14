import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ================= CONFIG =================
const HTML_DIR = "./courseTimesHtml";
const DRY_RUN = false;

// ✅ ONLY these teaching types are allowed
const teachingTypes = ["LECT", "SEMR", "BLEN", "ONLN", "ONCA", "HYFX"];
// =========================================

const clean = (s) => (s ?? "").replace(/\u00A0/g, " ").trim();
const normType = (s) => clean(s).replace(/\s+/g, "");

// Calculate end time from start time (HH:MM format) and duration in minutes
function calculateEndTime(startTime, durationMinutes) {
  try {
    const [hours, mins] = String(startTime).split(':').map(Number);
    const durationInt = Math.floor(Number(durationMinutes));
    
    if (isNaN(hours) || isNaN(mins) || isNaN(durationInt)) {
      console.warn(`⚠️  Invalid time calculation: startTime=${startTime}, durationMinutes=${durationMinutes}`);
      return null;
    }
    
    const totalMinutes = hours * 60 + mins + durationInt;
    const endHours = Math.floor(totalMinutes / 60);
    const endMins = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
  } catch (err) {
    console.warn(`⚠️  Error calculating endTime:`, err.message);
    return null;
  }
}

// Global stats
let stats = {
  filesProcessed: 0,
  filesErrored: 0,
  parsedBlocks: 0,
  courseMissing: 0,
  offeringMissing: 0,
  timeInserted: 0,
  timeUpdated: 0,
  timeUnchanged: 0,
  timeSkippedNoTimes: 0,
};

// ✅ Decode HTML that might be UTF-16 (BE/LE) or UTF-8
function readHtmlSmart(filePath) {
  const buf = fs.readFileSync(filePath);

  if (buf.length >= 2) {
    const b0 = buf[0];
    const b1 = buf[1];

    // UTF-16 BE BOM: FE FF
    if (b0 === 0xfe && b1 === 0xff) {
      const body = buf.slice(2);
      // Node doesn't support utf16be directly -> swap bytes and decode as utf16le
      const swapped = Buffer.allocUnsafe(body.length);
      for (let i = 0; i + 1 < body.length; i += 2) {
        swapped[i] = body[i + 1];
        swapped[i + 1] = body[i];
      }
      return swapped.toString("utf16le");
    }

    // UTF-16 LE BOM: FF FE
    if (b0 === 0xff && b1 === 0xfe) {
      return buf.slice(2).toString("utf16le");
    }
  }

  // fallback: treat as UTF-8
  return buf.toString("utf8");
}

function listHtmlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => name.toLowerCase().endsWith(".html"))
    .map((name) => path.join(dir, name))
    .sort();
}

async function processHtmlFile(filePath) {
  const html = readHtmlSmart(filePath);
  const $ = cheerio.load(html);

  let currentFaculty = null;
  let currentDept = null;
  let currentTerm = null;

  // Persist across rows where course info is omitted
  let lastCourseCode = null;
  let lastCredit = null;
  let lastSection = null;

  const mainTable = $("table[border='1']").first();
  const rows = mainTable.find("tr").toArray(); // ✅ robust: tbody/no-tbody doesn’t matter

  let fileParsedBlocks = 0;

  for (const row of rows) {
    const tds = $(row).find("> td").toArray();
    if (tds.length === 0) continue;

    // Skip the black header row ("Fac Dept Term ...")
    if (clean($(tds[0]).text()) === "Fac") continue;

    // Course title header row (td[3] colspan="8")
    const td3colspan = tds[3] ? $(tds[3]).attr("colspan") : undefined;
    if (tds.length >= 4 && td3colspan === "8") {
      currentFaculty = clean($(tds[0]).text());
      currentDept = clean($(tds[1]).text());
      currentTerm = clean($(tds[2]).text());
      continue;
    }

    if (!currentFaculty || !currentDept || !currentTerm) continue;

    const firstColspan = $(tds[0]).attr("colspan");

    let typeText = null;
    let timesTd = null;

    // Pattern A: rows with course info (colspan="3")
    if (firstColspan === "3") {
      const courseCellText = clean($(tds[1]).text());
      typeText = normType($(tds[3]).text());
      timesTd = tds[6] ? $(tds[6]) : null;

      const m = courseCellText.match(
        /(?<code>\d{4})\s+(?<credit>\d+\.\d{2})\s+(?<section>[A-Z])/
      );
      if (!m) continue;

      lastCourseCode = m.groups.code;
      lastCredit = parseFloat(m.groups.credit);
      lastSection = m.groups.section;
    }

    // Pattern B: rows WITHOUT course info (colspan="5") reuse last*
    else if (firstColspan === "5") {
      typeText = normType($(tds[1]).text());
      timesTd = tds[4] ? $(tds[4]) : null;

      if (!lastCourseCode || !lastSection || lastCredit == null) continue;
    } else {
      continue;
    }

    // ✅ FILTER: ignore all non-teaching types
    if (!teachingTypes.includes(typeText)) continue;
    if (!timesTd) continue;

    // Parse meeting times
    const times = [];
    const timeRows = timesTd.find("table tr").toArray();

    for (const tr of timeRows) {
      const cells = $(tr).find("td").toArray();
      if (cells.length < 3) continue;

      const dayOfWeek = clean($(cells[0]).text());
      const startTime = clean($(cells[1]).text());
      const durationMinutes = Math.floor(parseInt(clean($(cells[2]).text()), 10));

      if (!dayOfWeek || !startTime || Number.isNaN(durationMinutes)) continue;
      times.push({ dayOfWeek, startTime, durationMinutes });
    }

    if (times.length === 0) {
      stats.timeSkippedNoTimes++;
      continue;
    }

    stats.parsedBlocks++;
    fileParsedBlocks++;

    // 1) Find Course
    const course = await prisma.course.findUnique({
      where: {
        faculty_deptAcronym_courseCode_credit: {
          faculty: currentFaculty,
          deptAcronym: currentDept,
          courseCode: lastCourseCode,
          credit: lastCredit,
        },
      },
      select: { id: true },
    });

    if (!course) {
      stats.courseMissing++;
      continue;
    }

    // 2) Find Offering
    const offering = await prisma.currentCourseOfferings.findFirst({
      where: {
        term: currentTerm,
        courseId: course.id,
        section: lastSection,
        type: typeText,
      },
      select: { id: true },
    });

    if (!offering) {
      stats.offeringMissing++;
      continue;
    }

    // 3) Insert / update CourseTime
    for (const t of times) {
      const endTime = calculateEndTime(t.startTime, t.durationMinutes);
      
      // Debug logging
      if (!endTime) {
        console.warn(`⚠️  Failed to calculate endTime for ${t.startTime} + ${t.durationMinutes} min`);
      }
      
      const existing = await prisma.courseTime.findFirst({
        where: {
          currentCourseId: offering.id,
          dayOfWeek: t.dayOfWeek,
          startTime: t.startTime,
        },
        select: { id: true, durationMinutes: true, endTime: true },
      });

      if (!existing) {
        if (!DRY_RUN) {
          await prisma.courseTime.create({
            data: {
              currentCourseId: offering.id,
              dayOfWeek: t.dayOfWeek,
              startTime: t.startTime,
              durationMinutes: t.durationMinutes,
              endTime: endTime,
            },
          });
        }
        stats.timeInserted++;
      } else if (existing.durationMinutes !== t.durationMinutes || existing.endTime !== endTime) {
        if (!DRY_RUN) {
          await prisma.courseTime.update({
            where: { id: existing.id },
            data: { 
              durationMinutes: t.durationMinutes,
              endTime: endTime,
            },
          });
        }
        stats.timeUpdated++;
      } else {
        stats.timeUnchanged++;
      }
    }
  }

  return fileParsedBlocks;
}

const files = listHtmlFiles(HTML_DIR);

if (files.length === 0) {
  console.log(`❌ No .html files found in ${HTML_DIR}`);
  await prisma.$disconnect();
  process.exit(1);
}

console.log(`📂 Found ${files.length} HTML files in ${HTML_DIR}`);
console.log(`DRY_RUN = ${DRY_RUN}\n`);

for (const f of files) {
  try {
    console.log(`➡️  Processing ${f} ...`);
    const blocks = await processHtmlFile(f);
    stats.filesProcessed++;
    console.log(`   ✅ Parsed blocks from file: ${blocks}\n`);
  } catch (err) {
    stats.filesErrored++;
    console.error(`   ❌ Error processing ${f}:`, err?.message ?? err);
    console.log();
  }
}

await prisma.$disconnect();

console.log("✅ All done.");
console.log(stats);
