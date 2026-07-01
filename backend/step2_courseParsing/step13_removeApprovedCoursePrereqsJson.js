import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { RUNTIME_REPORTS_DIR, STEP13_FILE } from '../utils/paths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const coursesPath = process.env.COURSES_FILE || path.join(__dirname, 'all_courses.json');
const reportPath = process.env.STEP13_REPORT_FILE || path.join(RUNTIME_REPORTS_DIR, 'step13_removedPrereqsReport.json');

function normalizeCourseEntry(entry) {
  return {
    faculty: String(entry?.faculty ?? '').trim(),
    deptAcronym: String(entry?.deptAcronym ?? '').trim(),
    courseCode: String(entry?.courseCode ?? '').trim(),
    credit: Number(entry?.credit),
    reason: entry?.reason ? String(entry.reason).trim() : null,
    courseDescription: entry?.courseDescription ? String(entry.courseDescription).trim() : null,
  };
}

function isValidCourseEntry(entry) {
  return Boolean(
    entry.faculty &&
    entry.deptAcronym &&
    entry.courseCode &&
    Number.isFinite(entry.credit)
  );
}

function courseKey(entry) {
  return [
    String(entry.faculty || entry.facultyPrefix || '').trim(),
    String(entry.deptAcronym || entry.dept || '').trim(),
    String(entry.courseCode || entry.code || '').trim(),
    String(Number(entry.credit)),
  ].join('|');
}

async function loadApprovedCourses() {
  const raw = await fs.readFile(STEP13_FILE, 'utf-8');
  const parsed = JSON.parse(raw);
  const courses = Array.isArray(parsed?.courses) ? parsed.courses : [];
  return courses.map(normalizeCourseEntry).filter(isValidCourseEntry);
}

await fs.mkdir(RUNTIME_REPORTS_DIR, { recursive: true });

const [approvedCourses, rawCourses] = await Promise.all([
  loadApprovedCourses(),
  fs.readFile(coursesPath, 'utf-8').then(JSON.parse),
]);

if (!Array.isArray(rawCourses)) {
  throw new Error(`${coursesPath} must contain an array`);
}

const approvedByKey = new Map(approvedCourses.map((course) => [courseKey(course), course]));
const removedCourses = [];
const skippedCourses = [];
let totalPrereqRowsDeleted = 0;

for (const course of rawCourses) {
  const approved = approvedByKey.get(courseKey(course));
  if (!approved) continue;

  const deletedPrereqRows = Array.isArray(course.prereqs) ? course.prereqs.length : 0;
  course.prereqs = [];
  totalPrereqRowsDeleted += deletedPrereqRows;

  removedCourses.push({
    faculty: course.facultyPrefix,
    deptAcronym: course.dept,
    courseCode: course.code,
    credit: Number(course.credit),
    name: course.title,
    reason: approved.reason,
    courseDescription: approved.courseDescription,
    deletedPrereqRows,
  });
}

const rawKeys = new Set(rawCourses.map(courseKey));
for (const approved of approvedCourses) {
  if (!rawKeys.has(courseKey(approved))) {
    skippedCourses.push({ ...approved, status: 'course_not_found' });
  }
}

const report = {
  processedAt: new Date().toISOString(),
  totalCoursesListed: approvedCourses.length,
  totalPrereqRowsDeleted,
  removedCourses,
  skippedCourses,
};

await Promise.all([
  fs.writeFile(coursesPath, `${JSON.stringify(rawCourses, null, 2)}\n`, 'utf-8'),
  fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8'),
]);

console.log(
  `[step13-json] Processed=${approvedCourses.length}, removedPrereqRows=${totalPrereqRowsDeleted}, skippedCourses=${skippedCourses.length}, report=${reportPath}`
);
