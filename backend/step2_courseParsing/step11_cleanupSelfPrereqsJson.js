import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const coursesPath = process.env.COURSES_FILE || path.join(__dirname, 'all_courses.json');

function courseKey(course) {
  return [
    String(course?.facultyPrefix || '').trim(),
    String(course?.dept || '').trim(),
    String(course?.code || '').trim(),
    String(Number(course?.credit)),
  ].join('|');
}

function prereqKey(prereq) {
  return [
    String(prereq?.faculty || '').trim(),
    String(prereq?.dept || '').trim(),
    String(prereq?.code || '').trim(),
    String(Number(prereq?.credits)),
  ].join('|');
}

const raw = await fs.readFile(coursesPath, 'utf-8');
const courses = JSON.parse(raw);

if (!Array.isArray(courses)) {
  throw new Error(`${coursesPath} must contain an array`);
}

let removed = 0;

for (const course of courses) {
  if (!Array.isArray(course.prereqs) || course.prereqs.length === 0) continue;

  const selfKey = courseKey(course);
  const before = course.prereqs.length;
  course.prereqs = course.prereqs.filter((prereq) => prereqKey(prereq) !== selfKey);
  removed += before - course.prereqs.length;
}

await fs.writeFile(coursesPath, `${JSON.stringify(courses, null, 2)}\n`, 'utf-8');
console.log(`[step11-json] Removed ${removed} self-referential prerequisite row(s).`);
