import assert from 'node:assert/strict';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import {
  courseKey,
  mergeFreshCoursesWithArchive,
  mergeWithPreviousCourses,
  newestStableArchive,
} from '../step2_courseParsing/mergePreviousCourses.js';

function course(dept, code, title = `${dept} ${code}`) {
  return {
    facultyPrefix: 'AP',
    dept,
    code,
    credit: 3,
    title,
    description: title,
    terms: [],
    prereqs: [],
    termAndYear: 'Fall/Winter 2026-2027',
  };
}

function manyCourses(count, prefix = 'TEST') {
  return Array.from({ length: count }, (_, index) => course(prefix, String(1000 + index), `${prefix} ${index}`));
}

async function writeArchive(dir, name, courses, mtime) {
  const filePath = path.join(dir, name);
  await fs.writeFile(filePath, `${JSON.stringify(courses, null, 2)}\n`, 'utf8');
  await fs.utimes(filePath, mtime, mtime);
  return filePath;
}

const previous = [
  course('ITEC', '1000', 'old title should be replaced'),
  course('ITEC', '2000', 'missing from fresh'),
  course('HUMA', '3000', 'also missing from fresh'),
];
const fresh = [
  course('ITEC', '1000', 'fresh title wins'),
];

const withoutFailure = mergeWithPreviousCourses(fresh, previous, {}, { lowFreshRatio: 0.1 });
assert.equal(withoutFailure.report.carriedForwardCount, 0);
assert.equal(withoutFailure.courses.length, 1);

const withFailure = mergeWithPreviousCourses(fresh, previous, { failedCourses: [{ code: 'AP/ITEC 2000 3.00' }] });
assert.equal(withFailure.report.carriedForwardCount, 2);
assert.equal(withFailure.courses.length, 3);
assert.equal(withFailure.courses.find((row) => row.dept === 'ITEC' && row.code === '1000').title, 'fresh title wins');
assert.equal(new Set(withFailure.courses.map(courseKey)).size, withFailure.courses.length);
assert.deepEqual(withFailure.report.reasons, ['scrape-failure-report']);

const lowFresh = mergeWithPreviousCourses(manyCourses(900), manyCourses(1000), {}, { lowFreshRatio: 0.98 });
assert.equal(lowFresh.report.carriedForwardCount, 100);
assert.ok(lowFresh.report.reasons.includes('low-fresh-course-count'));

const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'merge-previous-courses-'));
const archiveDir = path.join(tmpDir, 'archive');
await fs.mkdir(archiveDir);

const olderStable = await writeArchive(
  archiveDir,
  'all_courses_FallWinter_2026-2027_2026-07-01T00-00-00-000Z.json',
  manyCourses(1000, 'BASE'),
  new Date('2026-07-01T00:00:00Z')
);
await writeArchive(
  archiveDir,
  'all_courses_FallWinter_2026-2027_2026-07-02T00-00-00-000Z.json',
  manyCourses(100, 'PART'),
  new Date('2026-07-02T00:00:00Z')
);

const stableArchive = await newestStableArchive(archiveDir, 'Fall/Winter 2026-2027');
assert.equal(stableArchive.filePath, olderStable);
assert.equal(stableArchive.count, 1000);

const failureReportPath = path.join(tmpDir, 'failed_scrape_report.json');
await fs.writeFile(
  failureReportPath,
  `${JSON.stringify({ generatedAt: '2026-07-05T00:00:00.000Z', failedCourses: [{ code: 'BASE 1001' }] })}\n`,
  'utf8'
);

const outputReportPath = path.join(tmpDir, 'merge_report.json');
const mergedFromArchive = await mergeFreshCoursesWithArchive(manyCourses(999, 'BASE'), {
  archiveDir,
  termAndYear: 'Fall/Winter 2026-2027',
  failureReportPath,
  outputReportPath,
});
const writtenReport = JSON.parse(await fs.readFile(outputReportPath, 'utf8'));

assert.equal(mergedFromArchive.courses.length, 1000);
assert.equal(writtenReport.carriedForwardCount, 1);
assert.equal(writtenReport.previousArchive, olderStable);
assert.equal(writtenReport.scrapeFailureReportExists, true);

const integrationDir = await fs.mkdtemp(path.join(os.tmpdir(), 'step1-extract-merge-'));
const htmlDir = path.join(integrationDir, 'html', 'TEST - Test Subject - ( AP )');
const integrationArchiveDir = path.join(integrationDir, 'archive');
const integrationOutput = path.join(integrationDir, 'all_courses.json');
const integrationFailedParsing = path.join(integrationDir, 'failedParsing.json');
const integrationFailureReport = path.join(integrationDir, 'failed_scrape_report.json');
const integrationMergeReport = path.join(integrationDir, 'merge_report.json');
await fs.mkdir(htmlDir, { recursive: true });
await fs.mkdir(integrationArchiveDir, { recursive: true });

await fs.writeFile(path.join(htmlDir, 'AP_TEST 1000 3.00_Fresh Course_CourseSchedule.html'), `
  <html>
    <body>
      <h1>AP/TEST 1000 3.00 Fresh Course</h1>
      <p class="bold">Course Description:</p>
      <p>A current scrape row without prerequisites.</p>
      <p class="bold">Language of Instruction:</p>
      <p>English</p>
      <table>
        <tr><td class="bodytext">Term F Section A</td></tr>
        <tr><td>
          <table border="5">
            <tr><td>Type</td><td>Room</td><td>Cat</td><td>Instructor</td></tr>
            <tr><td>Type</td><td>Room</td><td>Cat</td><td>Instructor</td></tr>
            <tr><td>LECT 01</td><td></td><td>T01</td><td><a>Jane Doe</a></td></tr>
          </table>
        </td></tr>
      </table>
    </body>
  </html>
`, 'utf8');

await writeArchive(
  integrationArchiveDir,
  'all_courses_FallWinter_2026-2027_2026-07-01T00-00-00-000Z.json',
  [
    course('TEST', '1000', 'Old Course Title'),
    course('TEST', '2000', 'Carried Forward Course'),
  ],
  new Date('2026-07-01T00:00:00Z')
);
await fs.writeFile(
  integrationFailureReport,
  `${JSON.stringify({ generatedAt: '2026-07-05T00:00:00.000Z', failedCourses: [{ code: 'AP/TEST 2000 3.00' }] })}\n`,
  'utf8'
);

const extractResult = spawnSync('node', ['step2_courseParsing/step1_extractAllCoursestoJson.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    TERM_AND_YEAR: 'Fall/Winter 2026-2027',
    COURSE_HTML_DIR: htmlDir,
    COURSES_OUTPUT_FILE: integrationOutput,
    FAILED_PARSING_FILE: integrationFailedParsing,
    PREVIOUS_COURSE_ARCHIVE_DIR: integrationArchiveDir,
    SCRAPER_FAILURE_REPORT_FILE: integrationFailureReport,
    STEP1_MERGE_REPORT_FILE: integrationMergeReport,
  },
  encoding: 'utf8',
});

assert.equal(
  extractResult.status,
  0,
  `step1_extractAllCoursestoJson.js failed\nstdout:\n${extractResult.stdout}\nstderr:\n${extractResult.stderr}`
);

const integrationCourses = JSON.parse(await fs.readFile(integrationOutput, 'utf8'));
const integrationReport = JSON.parse(await fs.readFile(integrationMergeReport, 'utf8'));
assert.equal(integrationCourses.length, 2);
assert.equal(integrationCourses.find((row) => row.code === '1000').title, 'Fresh Course');
assert.equal(integrationCourses.find((row) => row.code === '2000').title, 'Carried Forward Course');
assert.equal(integrationReport.carriedForwardCount, 1);

console.log('mergePreviousCourses.test.js passed');
