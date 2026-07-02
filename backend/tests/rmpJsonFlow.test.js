import assert from 'node:assert/strict';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import {
  finalizeRecords,
  hasUsableRating,
  normalizeExistingRecord,
  professorKey,
} from '../step2_courseParsing/step6_rmpAddprofessorRatingsJson.js';

const backendRoot = process.cwd();
const projectRoot = path.resolve(backendRoot, '..');
const frontendDataPath = path.join(projectRoot, 'frontend', 'yorku-elective-tracker', 'public', 'data', 'electives.json');

const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yucourses-rmp-json-'));
const rmpFile = path.join(tmpDir, 'rmp.json');

const existingIan = normalizeExistingRecord({
  first: 'Ian',
  last: 'Slater',
  avgRating: 4.3,
  overall_rating: 4.3,
  avgDifficulty: 2.1,
  wouldTakeAgainPercent: 88,
  numratings: 17,
  rateMyProfLink: 'https://www.ratemyprofessors.com/professor/ian-slater',
});
assert.ok(hasUsableRating(existingIan), 'expected existing Ian Slater RMP row to count as usable');

const ambiguousRefreshRecord = hasUsableRating(existingIan)
  ? normalizeExistingRecord(existingIan, { firstname: 'Ian', lastname: 'Slater', dept: 'NATS, STS' })
  : null;
assert.equal(
  ambiguousRefreshRecord.rateMyProfLink,
  existingIan.rateMyProfLink,
  'ambiguous RMP refresh should preserve the existing RMP link instead of changing it to N/A'
);
assert.equal(ambiguousRefreshRecord.avgRating, 4.3);

const preservedMap = new Map();
preservedMap.set(professorKey(existingIan.first, existingIan.last), existingIan);
const preservedRows = finalizeRecords(preservedMap);
assert.equal(preservedRows.length, 1, 'expected preserved RMP cache rows to remain in final output');
assert.equal(preservedRows[0].first, 'Ian');
assert.equal(preservedRows[0].rateMyProfLink, existingIan.rateMyProfLink);

await fs.writeFile(rmpFile, `${JSON.stringify([
  {
    first: 'High',
    last: 'Rated',
    avgRating: 4.8,
    overall_rating: 4.8,
    avgDifficulty: 1.5,
    wouldTakeAgainPercent: 92,
    numratings: 40,
    rateMyProfLink: 'https://www.ratemyprofessors.com/professor/123',
  },
  {
    first: 'No',
    last: 'Link',
    avgRating: 5,
    overall_rating: 5,
    avgDifficulty: 1,
    wouldTakeAgainPercent: 100,
    numratings: 99,
    rateMyProfLink: null,
  },
])}\n`, 'utf-8');

const result = spawnSync('node', ['step2_courseParsing/step9_jsonInstructorPopularity.js'], {
  cwd: backendRoot,
  env: { ...process.env, RMP_INPUT_FILE: rmpFile },
  encoding: 'utf-8',
});

assert.equal(
  result.status,
  0,
  `step9_jsonInstructorPopularity.js failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
);

const rmpRows = JSON.parse(await fs.readFile(rmpFile, 'utf-8'));
assert.ok(rmpRows[0].popularity > 50 && rmpRows[0].popularity <= 100, 'expected linked RMP row to receive positive popularity');
assert.equal(rmpRows[1].popularity, 0, 'expected unlinked RMP row to receive zero popularity');

const frontendPayload = JSON.parse(await fs.readFile(frontendDataPath, 'utf-8'));
const meetings = (frontendPayload.courses || [])
  .flatMap((course) => course.terms || [])
  .flatMap((offering) => offering.meetings || []);
const rmpMeeting = meetings.find((meeting) =>
  meeting.rateMyProfLink &&
  Number(meeting.avgRating) > 0 &&
  Number(meeting.numberOfRatings) > 0 &&
  Number(meeting.popularity) > 0
);

assert.ok(rmpMeeting, 'expected exported frontend JSON to include RMP rating/link/popularity on instructor meetings');
assert.ok(
  (frontendPayload.courses || []).some((course) => Number(course.topInstructorPopularity) > 0),
  'expected exported frontend JSON to include topInstructorPopularity values'
);

console.log(
  `rmpJsonFlow.test.js passed: frontend JSON includes RMP data for ${rmpMeeting.firstName} ${rmpMeeting.lastName}`
);
