import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { PrismaClient } from "@prisma/client";
import {
  calculateEndTime,
  parseCourseTimeHtml,
} from "../lib/courseTimeHtmlParser.js";

const prisma = new PrismaClient();

// ================= CONFIG =================
const HTML_DIR = "./courseTimesHtml";
const DRY_RUN = false;
const PROGRESS_EVERY = 25;
const MAX_INVALID_TIME_WARNINGS = 5;

// Components that can carry schedule rows. Tutorials/labs matter because CAT choices
// often differ only by one of these components.
const schedulableTypes = ["LECT", "SEMR", "BLEN", "ONLN", "ONCA", "HYFX", "TUTR", "LAB"];
// =========================================

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
  invalidTimeCalculations: 0,
};

function noteInvalidTimeWarning(message) {
  stats.invalidTimeCalculations++;
  if (stats.invalidTimeCalculations <= MAX_INVALID_TIME_WARNINGS) {
    console.warn(message);
  }
}

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
  const components = parseCourseTimeHtml($);

  let fileParsedBlocks = 0;

  for (const component of components) {
    if (!schedulableTypes.includes(component.type)) continue;

    if (component.times.length === 0) {
      stats.timeSkippedNoTimes++;
      continue;
    }

    stats.parsedBlocks++;
    fileParsedBlocks++;

    // 1) Find Course
    const course = await prisma.course.findUnique({
      where: {
        faculty_deptAcronym_courseCode_credit: {
          faculty: component.faculty,
          deptAcronym: component.dept,
          courseCode: component.code,
          credit: component.credit,
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
        term: component.term,
        courseId: course.id,
        section: component.section,
        type: component.type,
        ...(component.catNumber ? { catNumber: component.catNumber } : {}),
      },
      select: { id: true },
    });

    if (!offering) {
      stats.offeringMissing++;
      continue;
    }

    // 3) Insert / update CourseTime
    for (const t of component.times) {
      const endTime = calculateEndTime(t.startTime, t.durationMinutes);
      if (!endTime) {
        noteInvalidTimeWarning(`⚠️ Invalid time input: startTime=${t.startTime}, durationMinutes=${t.durationMinutes}`);
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
  console.log(`[step10] No .html files found in ${HTML_DIR}`);
  await prisma.$disconnect();
  process.exit(1);
}

console.log(`[step10] Found ${files.length} HTML files in ${HTML_DIR}. DRY_RUN=${DRY_RUN}`);

for (let i = 0; i < files.length; i++) {
  const f = files[i];
  try {
    await processHtmlFile(f);
    stats.filesProcessed++;
  } catch (err) {
    stats.filesErrored++;
    console.error(`[step10] Error processing ${f}:`, err?.message ?? err);
  }

  const processed = i + 1;
  if (processed === 1 || processed % PROGRESS_EVERY === 0 || processed === files.length) {
    console.log(
      `[step10] Progress ${processed}/${files.length} | parsedBlocks=${stats.parsedBlocks} inserted=${stats.timeInserted} updated=${stats.timeUpdated} unchanged=${stats.timeUnchanged} missingCourse=${stats.courseMissing} missingOffering=${stats.offeringMissing}`
    );
  }
}

await prisma.$disconnect();

if (stats.invalidTimeCalculations > MAX_INVALID_TIME_WARNINGS) {
  console.warn(
    `[step10] Suppressed ${stats.invalidTimeCalculations - MAX_INVALID_TIME_WARNINGS} additional invalid time warnings.`
  );
}
console.log(`[step10] Summary: ${JSON.stringify(stats)}`);
