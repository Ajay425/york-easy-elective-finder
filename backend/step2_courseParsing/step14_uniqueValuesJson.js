import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const coursesPath = process.env.COURSES_FILE || path.join(__dirname, 'all_courses.json');
const outputFile = process.env.STEP14_OUTPUT_FILE || path.join(__dirname, 'step14_uniqueValues.json');
const archiveDir = path.join(__dirname, 'archive');

function previewList(values, max = 10) {
  if (!Array.isArray(values) || values.length === 0) return '(none)';
  if (values.length <= max) return values.join(', ');
  return `${values.slice(0, max).join(', ')} ... (+${values.length - max} more)`;
}

async function archivePrevious() {
  try {
    await fs.access(outputFile);
    await fs.mkdir(archiveDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
    const archiveName = `step14_uniqueValues_${ts}.json`;
    await fs.rename(outputFile, path.join(archiveDir, archiveName));
    console.log(`[step14-json] Archived previous output to archive/${archiveName}`);
  } catch {
    // No previous file to archive.
  }
}

function sortedStrings(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

function sortedNumbers(values) {
  return [...new Set(values.map(Number).filter(Number.isFinite))]
    .sort((a, b) => a - b);
}

const courses = JSON.parse(await fs.readFile(coursesPath, 'utf-8'));

if (!Array.isArray(courses)) {
  throw new Error(`${coursesPath} must contain an array`);
}

const result = {
  generatedAt: new Date().toISOString(),
  source: 'step2_courseParsing/all_courses.json',
  faculties: sortedStrings(courses.map((course) => course.facultyPrefix)),
  departments: sortedStrings(courses.map((course) => course.dept)),
  credits: sortedNumbers(courses.map((course) => course.credit)),
  years: sortedNumbers(courses.map((course) => String(course.code || '').match(/\d/)?.[0])),
  terms: sortedStrings(courses.flatMap((course) => (course.terms || []).map((term) => term.term))),
  termAndYears: sortedStrings(courses.map((course) => course.termAndYear)),
};

await archivePrevious();
await fs.writeFile(outputFile, `${JSON.stringify(result, null, 2)}\n`, 'utf-8');

console.log('[step14-json] Unique values summary:');
console.log(`  faculties=${result.faculties.length} | ${previewList(result.faculties)}`);
console.log(`  departments=${result.departments.length} | ${previewList(result.departments)}`);
console.log(`  credits=${result.credits.length} | ${previewList(result.credits)}`);
console.log(`  years=${result.years.length} | ${previewList(result.years)}`);
console.log(`  terms=${result.terms.length} | ${previewList(result.terms)}`);
console.log(`  termAndYears=${result.termAndYears.length} | ${previewList(result.termAndYears)}`);
console.log(`[step14-json] Saved output to ${outputFile}`);
