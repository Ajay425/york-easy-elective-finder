import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { fileURLToPath } from "url";

import { extractPrereqsWithCredits } from "./parsePrereqsHelperFunc.js";
import { Console } from "console";

/**
 * Extract meeting/term info from each course HTML table
 */
function extracttermInfo($, termRows) {
  const terms = [];

  termRows.each((_, elem) => {
    const text = $(elem).text().trim();
    const termMatch = text.match(/Term\s+([A-Z])\s+Section\s+([A-Z0-9]+)/);
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
        const nameParts = fullName.split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts[nameParts.length - 1] || "";
        instructors.push({ firstName, lastName });
        
      });

      // ✅ Fallback if no <a> tags (old style tables)
      if (instructors.length === 0) {
        const text = $(cols[3]).text().trim().replace(/\s+/g, " ");
        const nameParts = text.split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts[nameParts.length - 1] || "";
        instructors.push({ firstName, lastName });
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
  const prereqs = extractPrereqsWithCredits(description);

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
  };
}

// ------------------------------------------------------
//  EXECUTION: Parse all HTML files recursively
// ------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root folder where all subjects are stored
const baseDir = path.resolve(__dirname, "../../PythonCourseScraper/york_courses");

// Output files
const outputFile = path.join(__dirname, "all_courses.json");
const failedFilePath = path.join(__dirname, "failedParsing.json");

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

console.log(`🔍 Searching for .html files in:\n${baseDir}\n`);

const allHtmlFiles = getAllHtmlFiles(baseDir);

if (allHtmlFiles.length === 0) {
  console.log("⚠️ No HTML files found in:", baseDir);
  process.exit(0);
}

console.log(`📚 Found ${allHtmlFiles.length} HTML files total.\n`);

const allCourses = [];
const failedFiles = [];

for (const filePath of allHtmlFiles) {
  const fileName = path.basename(filePath);
  console.log(`📄 Parsing ${fileName}...`);

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
}

// ------------------------------------------------------
//  SAVE RESULTS TO JSON
// ------------------------------------------------------
try {
  fs.writeFileSync(outputFile, JSON.stringify(allCourses, null, 2), "utf-8");
  console.log(`\n✅ Parsed ${allCourses.length} courses successfully.`);
  console.log(`💾 Saved to: ${outputFile}`);
} catch (err) {
  console.error("❌ Failed to write all_courses.json:", err.message);
}

// ------------------------------------------------------
//  SAVE FAILED PARSING RESULTS
// ------------------------------------------------------
try {
  fs.writeFileSync(failedFilePath, JSON.stringify(failedFiles, null, 2), "utf-8");
  console.log(
    `⚠️ ${failedFiles.length} files failed to parse. Details saved to: ${failedFilePath}\n`
  );
} catch (err) {
  console.error("❌ Failed to write failedParsing.json:", err.message);
}
