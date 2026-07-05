import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { fileURLToPath } from "url";

import { extractPrereqsWithCredits } from "./parsePrereqsHelperFunc.js";
import { mergeFreshCoursesWithArchive } from "./mergePreviousCourses.js";

const PROGRESS_EVERY = 100;

// ES module setup for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Include session metadata from step1 so we can tag offerings with term+year
const sessionMetaPath = path.join(__dirname, "../step1_PythonCourseScraper/session_meta.json");
let termAndYear = process.env.TERM_AND_YEAR || null;
try {
  if (!termAndYear && fs.existsSync(sessionMetaPath)) {
    const raw = fs.readFileSync(sessionMetaPath, "utf-8");
    const meta = JSON.parse(raw);
    termAndYear = meta.termAndYear || meta.sessionName || null;
  }
} catch (err) {
  console.warn(`⚠️ Failed to read session metadata from ${sessionMetaPath}: ${err.message}`);
}

if (!termAndYear) {
  console.warn(`⚠️ termAndYear is missing from session metadata; falling back to 'unknown'.`);
  termAndYear = 'unknown';
}

/**
 * Extract meeting/term info from each course HTML table
 */
function parseInstructorName(value) {
  const fullName = String(value || "").trim().replace(/\s+/g, " ");
  if (!fullName || fullName.toUpperCase() === "TBA") {
    return { firstName: "TBA", lastName: "" };
  }

  const nameParts = fullName.split(" ");
  return {
    firstName: nameParts[0] || "TBA",
    lastName: nameParts[nameParts.length - 1] || "",
  };
}

function extracttermInfo($, termRows) {
  const terms = [];

  termRows.each((_, elem) => {
    const text = $(elem).text().trim();
    const termMatch = text.match(/Term\s+([A-Z][A-Z0-9]*)\s+Section\s+([A-Z0-9]+)/);
    if (!termMatch) return;

    const [, term, section] = termMatch;
    const classTable = $(elem).closest("table").find("table[border='5']").first();
    const meetings = [];

    classTable.find("tr").each((index, tr) => {
      if (index < 2) return; // skip header rows

      const cols = $(tr).find("td");
      if (cols.length < 4) return;

      const type = $(cols[0]).text().trim();

      // Get category number
      const catNumber = $(cols[2]).text().trim();

      // ✅ Extract all instructors (each in <a> tag)
      const instructorLinks = $(cols[3]).find("a");
      const instructors = [];

      instructorLinks.each((_, a) => {
        const fullName = $(a).text().trim().replace(/\s+/g, " ");
        instructors.push(parseInstructorName(fullName));
        
      });

      // ✅ Fallback if no <a> tags (old style tables)
      if (instructors.length === 0) {
        const text = $(cols[3]).text().trim().replace(/\s+/g, " ");
        instructors.push(parseInstructorName(text));
      }

      meetings.push({ type, catNumber, instructors });
    });

    terms.push({ term, section,  meetings });
  });

  return terms;
}


/**
 * Parse a York University course HTML page into structured data
 */
export function parseYorkCourse(html, filePath) {
  const $ = cheerio.load(html);

  // 1️⃣ Extract course heading
  const heading = $("h1").first().text().trim();
const match = heading.match(/^([A-Z]{1,3})\/([A-Z]+)\s+(\d{4}[A-Z]?)\s+([\d.]+)\s+(.*)$/);

  if (!match) {
    console.warn(
      `⚠️ Could not parse heading in file: ${path.basename(filePath)} — heading text: "${heading}"`
    );
    return null;
  }

  const [_, facultyPrefix, dept, code, credit, title] = match;

  // 2️⃣ Extract course description
  const descHeader = $("p.bold:contains('Course Description:')");
  const description = descHeader.next("p").text().replace(/\s+/g, " ").trim();

  // 3️⃣ Extract language of instruction
  const langHeader = $("p.bold:contains('Language of Instruction:')");
  const language = langHeader.next("p").text().replace(/\s+/g, " ").trim();

  // 4️⃣ Extract prerequisites
  const prereqs = extractPrereqsWithCredits(description, { facultyPrefix, dept });

  // 5️⃣ Extract all term/meeting information
  const termRows = $("td.bodytext:contains('Term')");
  const terms = extracttermInfo($, termRows);

  return {
    facultyPrefix,
    dept,
    code,
    credit: parseFloat(credit),
    title: title.trim(),
    language,
    description,
    terms,
    prereqs,
    termAndYear,
  };
}

// ------------------------------------------------------
//  EXECUTION: Parse all HTML files recursively
// ------------------------------------------------------

// Root folder where all subjects are stored
const baseDir = process.env.COURSE_HTML_DIR
  ? path.resolve(process.env.COURSE_HTML_DIR)
  : path.resolve(__dirname, "../step1_PythonCourseScraper/york_courses");

// Output files
const outputFile = process.env.COURSES_OUTPUT_FILE || path.join(__dirname, "all_courses.json");
const failedFilePath = process.env.FAILED_PARSING_FILE || path.join(__dirname, "failedParsing.json");
const archiveDir = process.env.PREVIOUS_COURSE_ARCHIVE_DIR || path.join(__dirname, "archive");
const scraperFailureReportPath = process.env.SCRAPER_FAILURE_REPORT_FILE
  || path.join(__dirname, "../step1_PythonCourseScraper/failed_scrape_report.json");
const mergeReportPath = process.env.STEP1_MERGE_REPORT_FILE
  || path.join(__dirname, "../runtime/reports/step1_mergePreviousCoursesReport.json");

/**
 * Recursively collect all HTML files from a directory tree
 */
function getAllHtmlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let htmlFiles = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      htmlFiles = htmlFiles.concat(getAllHtmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
      htmlFiles.push(fullPath);
    }
  }

  return htmlFiles;
}

// ------------------------------------------------------
//  Main Execution
// ------------------------------------------------------
if (!fs.existsSync(baseDir)) {
  console.error("❌ Base folder not found:", baseDir);
  process.exit(1);
}

console.log(`[step1] Scanning HTML files under: ${baseDir}`);

const allHtmlFiles = getAllHtmlFiles(baseDir);

if (allHtmlFiles.length === 0) {
  console.log(`[step1] No HTML files found in: ${baseDir}`);
  process.exit(0);
}

console.log(`[step1] Found ${allHtmlFiles.length} HTML files.`);

const allCourses = [];
const failedFiles = [];

for (let i = 0; i < allHtmlFiles.length; i++) {
  const filePath = allHtmlFiles[i];
  const fileName = path.basename(filePath);

  try {
    const html = fs.readFileSync(filePath, "utf-8");
    const course = parseYorkCourse(html, filePath);
    if (course) {
      allCourses.push(course);
    } else {
      failedFiles.push({
        file: fileName,
        reason: "Could not parse heading",
        path: filePath,
      });
    }
  } catch (err) {
    console.error(`❌ Error reading ${fileName}:`, err.message);
    failedFiles.push({
      file: fileName,
      reason: err.message,
      path: filePath,
    });
  }

  const processed = i + 1;
  if (processed === 1 || processed % PROGRESS_EVERY === 0 || processed === allHtmlFiles.length) {
    console.log(
      `[step1] Progress ${processed}/${allHtmlFiles.length} files | parsed=${allCourses.length} failed=${failedFiles.length}`
    );
  }
}

const mergeEnabled = process.env.MERGE_PREVIOUS_COURSES !== "0";
let outputCourses = allCourses;

if (mergeEnabled) {
  try {
    const mergeResult = await mergeFreshCoursesWithArchive(allCourses, {
      archiveDir,
      termAndYear,
      failureReportPath: scraperFailureReportPath,
      outputReportPath: mergeReportPath,
    });
    outputCourses = mergeResult.courses;

    if (mergeResult.report.carriedForwardCount > 0) {
      console.warn(
        `[step1] Carrying forward ${mergeResult.report.carriedForwardCount} course(s) from previous archive. `
        + `Reasons: ${mergeResult.report.reasons.join(", ")}. Report: ${mergeReportPath}`
      );
    } else {
      console.log(`[step1] Previous-archive merge checked; no courses carried forward. Report: ${mergeReportPath}`);
    }
  } catch (err) {
    console.warn(`[step1] Previous-archive merge failed; using fresh parse only: ${err.message}`);
  }
} else {
  console.log("[step1] Previous-archive merge disabled by MERGE_PREVIOUS_COURSES=0.");
}

// ------------------------------------------------------
//  SAVE RESULTS TO JSON
// ------------------------------------------------------
try {
  fs.writeFileSync(outputFile, JSON.stringify(outputCourses, null, 2), "utf-8");
  console.log(`[step1] Parsed ${allCourses.length} fresh courses.`);
  if (outputCourses.length !== allCourses.length) {
    console.log(`[step1] Wrote ${outputCourses.length} courses after previous-archive fallback.`);
  }
  console.log(`[step1] Wrote output to: ${outputFile}`);
} catch (err) {
  console.error("❌ Failed to write all_courses.json:", err.message);
}

// ------------------------------------------------------
//  SAVE FAILED PARSING RESULTS
// ------------------------------------------------------
try {
  fs.writeFileSync(failedFilePath, JSON.stringify(failedFiles, null, 2), "utf-8");
  console.log(`[step1] Failed parses: ${failedFiles.length}. Report: ${failedFilePath}`);
} catch (err) {
  console.error("❌ Failed to write failedParsing.json:", err.message);
}
