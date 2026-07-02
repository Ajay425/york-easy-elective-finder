import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import { spawnSync } from 'child_process';
import { artifactPaths } from '../step2_courseParsing/jsonPipelineArtifacts.js';
import { newestArchivedCourseFile } from '../scripts/exportStaticFrontendData.js';

const backendRoot = process.cwd();
const courseSource = await newestArchivedCourseFile('Fall/Winter 2026-2027');
assert.ok(courseSource, 'expected a Fall/Winter archived course source for artifact tests');

function runStep(script) {
  const result = spawnSync('node', [script], {
    cwd: backendRoot,
    env: { ...process.env, COURSES_FILE: courseSource },
    encoding: 'utf-8',
  });

  assert.equal(
    result.status,
    0,
    `${script} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
}

for (const script of [
  'step2_courseParsing/step2_jsonCourses.js',
  'step2_courseParsing/step3_jsonPrereqs.js',
  'step2_courseParsing/step4_jsonInstructors.js',
  'step2_courseParsing/step5_jsonDepartments.js',
  'step2_courseParsing/step7_jsonCourseOfferings.js',
  'step2_courseParsing/step8_jsonInstructorOfferings.js',
  'step2_courseParsing/step10_jsonAddTimes.js',
  'step2_courseParsing/step12_jsonCoursePrereqs.js',
]) {
  runStep(script);
}

const [
  courses,
  prereqEdges,
  instructors,
  departments,
  offerings,
  instructorOfferings,
  courseTimes,
  coursePrereqs,
] = await Promise.all([
  fs.readFile(artifactPaths.step2Courses, 'utf-8').then(JSON.parse),
  fs.readFile(artifactPaths.step3PrereqEdges, 'utf-8').then(JSON.parse),
  fs.readFile(artifactPaths.step4Instructors, 'utf-8').then(JSON.parse),
  fs.readFile(artifactPaths.step5Departments, 'utf-8').then(JSON.parse),
  fs.readFile(artifactPaths.step7Offerings, 'utf-8').then(JSON.parse),
  fs.readFile(artifactPaths.step8InstructorOfferings, 'utf-8').then(JSON.parse),
  fs.readFile(artifactPaths.step10CourseTimes, 'utf-8').then(JSON.parse),
  fs.readFile(artifactPaths.step12CoursePrereqs, 'utf-8').then(JSON.parse),
]);

assert.ok(courses.totalCourses > 4000, 'expected step2 course snapshot to contain the full course set');
assert.ok(prereqEdges.totalEdges > 1000, 'expected step3 prerequisite edges');
assert.ok(instructors.totalInstructors > 1000, 'expected step4 instructor roster');
assert.ok(departments.departments.length > 100, 'expected step5 department snapshot');
assert.ok(offerings.totalOfferings > 4000, 'expected step7 course offerings');
assert.ok(instructorOfferings.totalRows > 4000, 'expected step8 instructor-offering rows');
assert.ok(courseTimes.fileCount > 0 && courseTimes.parsedRows > 0, 'expected step10 course-time sidecar');
assert.equal(coursePrereqs.totalCourses, courses.totalCourses, 'expected step12 prereq snapshot for every course');

console.log(
  `jsonPipelineArtifacts.test.js passed: ${courses.totalCourses} courses, ${instructors.totalInstructors} instructors, ${offerings.totalOfferings} offerings`
);
