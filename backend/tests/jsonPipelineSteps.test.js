import assert from 'node:assert/strict';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { newestArchivedCourseFile } from '../scripts/exportStaticFrontendData.js';

const backendRoot = process.cwd();
const archiveDir = path.join(backendRoot, 'step2_courseParsing', 'archive');
const approvedListPath = path.join(backendRoot, 'step2_courseParsing', 'step13_coursesWithoutRealPrereqs.json');

function courseKey(course) {
  return [
    course.faculty || course.facultyPrefix || '',
    course.deptAcronym || course.dept || '',
    course.courseCode || course.code || '',
    Number(course.credit),
  ].join('|');
}

async function latestArchiveWithApprovedCourse(approvedKeys) {
  const entries = await fs.readdir(archiveDir);
  const candidates = await Promise.all(entries
    .filter((name) => name.startsWith('all_courses_') && name.endsWith('.json') && !name.endsWith('_unique_lists.json'))
    .map(async (name) => {
      const filePath = path.join(archiveDir, name);
      const stat = await fs.stat(filePath);
      return { filePath, mtimeMs: stat.mtimeMs };
    }));

  assert.ok(candidates.length > 0, 'expected at least one archived all_courses JSON file');
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);

  for (const candidate of candidates) {
    const courses = JSON.parse(await fs.readFile(candidate.filePath, 'utf-8'));
    if (Array.isArray(courses) && courses.some((course) => approvedKeys.has(courseKey(course)))) {
      return candidate.filePath;
    }
  }

  throw new Error('expected at least one archived all_courses JSON file to contain an approved Step 13 course');
}

function runStep(script, env) {
  const result = spawnSync('node', [script], {
    cwd: backendRoot,
    env: { ...process.env, ...env },
    encoding: 'utf-8',
  });

  assert.equal(
    result.status,
    0,
    `${script} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
}

const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yucourses-json-pipeline-'));
const coursesFile = path.join(tmpDir, 'all_courses.json');
const reportFile = path.join(tmpDir, 'step13_report.json');
const uniqueFile = path.join(tmpDir, 'step14_uniqueValues.json');
const approvedCourses = await fs.readFile(approvedListPath, 'utf-8').then(JSON.parse);
const approvedKeys = new Set((approvedCourses.courses || []).map(courseKey));

await fs.copyFile(await latestArchiveWithApprovedCourse(approvedKeys), coursesFile);

const seedCourses = await fs.readFile(coursesFile, 'utf-8').then(JSON.parse);
const seededCourse = seedCourses.find((course) => approvedKeys.has(courseKey(course)));
assert.ok(seededCourse, 'expected at least one approved course in the archived course data');
seededCourse.prereqs = [
  {
    full: 'ZZ/TEST 9999 3',
    faculty: 'ZZ',
    dept: 'TEST',
    code: '9999',
    credits: 3,
  },
];
await fs.writeFile(coursesFile, `${JSON.stringify(seedCourses, null, 2)}\n`, 'utf-8');

runStep('step2_courseParsing/step11_cleanupSelfPrereqsJson.js', { COURSES_FILE: coursesFile });
runStep('step2_courseParsing/step13_removeApprovedCoursePrereqsJson.js', {
  COURSES_FILE: coursesFile,
  STEP13_REPORT_FILE: reportFile,
});
runStep('step2_courseParsing/step14_uniqueValuesJson.js', {
  COURSES_FILE: coursesFile,
  STEP14_OUTPUT_FILE: uniqueFile,
});

const [courses, approved, report, unique] = await Promise.all([
  fs.readFile(coursesFile, 'utf-8').then(JSON.parse),
  fs.readFile(approvedListPath, 'utf-8').then(JSON.parse),
  fs.readFile(reportFile, 'utf-8').then(JSON.parse),
  fs.readFile(uniqueFile, 'utf-8').then(JSON.parse),
]);

const fallWinterSource = await newestArchivedCourseFile('Fall/Winter 2026-2027');
if (fallWinterSource) {
  const fallWinterArchiveNames = (await fs.readdir(archiveDir))
    .filter((name) => name.startsWith('all_courses_FallWinter_2026-2027_') && name.endsWith('.json'));
  const fallWinterCounts = await Promise.all(fallWinterArchiveNames.map(async (name) => {
    const rows = await fs.readFile(path.join(archiveDir, name), 'utf-8').then(JSON.parse);
    return Array.isArray(rows) ? rows.length : 0;
  }));
  const maxFallWinterCount = Math.max(...fallWinterCounts);
  const selectedRows = await fs.readFile(fallWinterSource, 'utf-8').then(JSON.parse);
  assert.ok(
    selectedRows.length >= Math.floor(maxFallWinterCount * 0.8),
    `expected exporter to skip partial Fall/Winter archives; selected ${selectedRows.length}, max ${maxFallWinterCount}`
  );
}

const approvedKeysAfterCleanup = new Set((approved.courses || []).map(courseKey));
const stillWithPrereqs = courses
  .filter((course) => approvedKeysAfterCleanup.has(courseKey(course)) && (course.prereqs || []).length > 0)
  .map(courseKey);

assert.deepEqual(stillWithPrereqs, [], 'approved no-real-prereq courses must have prereqs cleared');
assert.ok(report.totalPrereqRowsDeleted > 0, 'expected approved-prereq cleanup to remove rows');
assert.ok(unique.faculties.length > 0, 'expected JSON unique values to include faculties');
assert.ok(unique.departments.length > 0, 'expected JSON unique values to include departments');
assert.ok(unique.terms.length > 0, 'expected JSON unique values to include terms');

console.log(
  `jsonPipelineSteps.test.js passed: removed ${report.totalPrereqRowsDeleted} approved prereq row(s), generated ${unique.departments.length} departments`
);
