import assert from 'node:assert/strict';
import fs from 'fs';
import {
  buildInstructorGroups,
  buildCourseTimesLookup,
  buildTermOfferings,
  courseTimeKey,
  mapMeeting,
  parseCourseTimeHtmlFile,
} from '../scripts/exportStaticFrontendData.js';

const htmlRows = await parseCourseTimeHtmlFile('step2_courseParsing/courseTimesHtml/FW2026SC.html');
const chem1500SectionA = htmlRows.filter((row) =>
  row.faculty === 'SC' &&
  row.dept === 'CHEM' &&
  row.code === '1500' &&
  row.term === 'F' &&
  row.section === 'A'
);

assert.equal(chem1500SectionA.length, 12);

const lecture = chem1500SectionA.find((row) => row.type === 'LECT' && row.componentNumber === '01');
assert.deepEqual(
  lecture?.times.map((time) => `${time.dayOfWeek} ${time.startTime}-${time.endTime}`),
  ['T 13:00-14:20', 'R 13:00-14:20']
);
assert.equal(lecture.catNumber, null);

const lab01 = chem1500SectionA.find((row) => row.type === 'LAB' && row.componentNumber === '01');
const lab02 = chem1500SectionA.find((row) => row.type === 'LAB' && row.componentNumber === '02');
assert.equal(lab01?.catNumber, 'R26A03');
assert.equal(lab02?.catNumber, 'R26A04');
assert.deepEqual(lab01?.times.map((time) => `${time.dayOfWeek} ${time.startTime}-${time.endTime}`), ['M 14:30-17:20']);
assert.deepEqual(lab02?.times.map((time) => `${time.dayOfWeek} ${time.startTime}-${time.endTime}`), ['T 14:30-17:20']);

const courses = JSON.parse(fs.readFileSync('step2_courseParsing/archive/all_courses_FallWinter_2026-2027_2026-07-01T02-23-08-851Z.json', 'utf8'));
const course = courses.find((item) =>
  item.facultyPrefix === 'SC' &&
  item.dept === 'CHEM' &&
  item.code === '1500'
);
const term = course.terms.find((item) => item.term === 'F' && item.section === 'A');
const courseTimes = await buildCourseTimesLookup();
const meetings = term.meetings.flatMap((meeting) => mapMeeting(meeting, new Map()));
const offerings = buildTermOfferings(course, term, meetings, courseTimes);

assert.equal(offerings.length, 10);

const r26a03 = offerings.find((offering) => offering.catNumber === 'R26A03');
const r26a04 = offerings.find((offering) => offering.catNumber === 'R26A04');

assert.deepEqual(
  r26a03.courseTimes.map((time) => `${time.type}${time.componentNumber} ${time.dayOfWeek} ${time.startTime}-${time.endTime}`),
  [
    'LAB01 M 14:30-17:20',
    'TUTR01 T 11:30-12:20',
    'LECT01 T 13:00-14:20',
    'LECT01 R 13:00-14:20',
  ]
);
assert.deepEqual(
  r26a04.courseTimes.map((time) => `${time.type}${time.componentNumber} ${time.dayOfWeek} ${time.startTime}-${time.endTime}`),
  [
    'TUTR01 T 11:30-12:20',
    'LECT01 T 13:00-14:20',
    'LAB02 T 14:30-17:20',
    'LECT01 R 13:00-14:20',
  ]
);
assert.equal(r26a03.meetings.some((meeting) => meeting.type === 'LAB' && meeting.componentNumber === '02'), false);
assert.equal(r26a04.meetings.some((meeting) => meeting.type === 'LAB' && meeting.componentNumber === '01'), false);

const r26a03InstructorGroups = buildInstructorGroups(r26a03.meetings);
const derekGroup = r26a03InstructorGroups.find((group) => group.firstName === 'Derek' && group.lastName === 'Jackson');
const tbaLabGroup = r26a03InstructorGroups.find((group) => group.isTba);

assert.equal(r26a03InstructorGroups.length, 2);
assert.deepEqual(
  derekGroup?.roles.map((role) => `${role.type}${role.componentNumber || ''}`),
  ['LECT01', 'TUTR01'],
  'Derek Jackson should be grouped once with lecture and tutorial roles'
);
assert.deepEqual(
  tbaLabGroup?.roles.map((role) => `${role.type}${role.componentNumber || ''}`),
  ['LAB01'],
  'the selected lab should stay visible as a distinct TBA role'
);

const edfe1101 = courses.find((item) =>
  item.facultyPrefix === 'ED' &&
  item.dept === 'EDFE' &&
  item.code === '1101'
);
const edfe1101SectionA = edfe1101.terms.find((item) => item.term === 'F' && item.section === 'A');
const edfeMeetings = edfe1101SectionA.meetings.flatMap((meeting) => mapMeeting(meeting, new Map()));
const edfeOfferings = buildTermOfferings(edfe1101, edfe1101SectionA, edfeMeetings, courseTimes);
const m83h02 = edfeOfferings.find((offering) => offering.catNumber === 'M83H02');
const m83h03 = edfeOfferings.find((offering) => offering.catNumber === 'M83H03');

assert.equal(edfeOfferings.length, 6);
assert.deepEqual(
  m83h02.courseTimes.map((time) => `${time.type}${time.componentNumber} ${time.dayOfWeek} ${time.startTime}-${time.endTime}`),
  [
    'LECT01 M 8:30-10:20',
    'TUTR01 M 10:30-11:20',
  ]
);
assert.deepEqual(
  m83h03.courseTimes.map((time) => `${time.type}${time.componentNumber} ${time.dayOfWeek} ${time.startTime}-${time.endTime}`),
  [
    'LECT01 M 8:30-10:20',
    'TUTR02 M 10:30-11:20',
  ]
);
assert.equal(m83h02.meetings.some((meeting) => meeting.type === 'TUTR' && meeting.componentNumber === '02'), false);
assert.equal(m83h03.meetings.some((meeting) => meeting.type === 'TUTR' && meeting.componentNumber === '01'), false);

function sortedCats(values) {
  return [...values].filter(Boolean).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
}

let multiCatSectionsChecked = 0;
let multiCatOfferingsChecked = 0;

for (const rawCourse of courses) {
  for (const rawTerm of rawCourse.terms || []) {
    const sectionKey = courseTimeKey({
      faculty: rawCourse.facultyPrefix,
      dept: rawCourse.dept,
      code: rawCourse.code,
      credit: rawCourse.credit,
      term: rawTerm.term,
      section: rawTerm.section,
    });
    const timetableCats = courseTimes.catsBySection.get(sectionKey);
    if (!timetableCats || timetableCats.size < 2) continue;

    const rawMeetings = rawTerm.meetings.flatMap((meeting) => mapMeeting(meeting, new Map()));
    const termOfferings = buildTermOfferings(rawCourse, rawTerm, rawMeetings, courseTimes);
    const expectedCats = sortedCats(timetableCats);
    const actualCats = sortedCats(termOfferings.map((offering) => offering.catNumber));

    assert.deepEqual(
      actualCats,
      expectedCats,
      `${rawCourse.facultyPrefix}/${rawCourse.dept} ${rawCourse.code} ${rawTerm.term} Section ${rawTerm.section} should export one offering per timetable CAT`
    );

    for (const offering of termOfferings) {
      multiCatOfferingsChecked++;
      assert.ok(offering.catNumber, 'multi-CAT section offerings must keep their selected CAT number');
      assert.ok(offering.courseTimes.length > 0, `${offering.catNumber} should keep its common/selected times`);

      const foreignTimes = offering.courseTimes.filter((time) =>
        time.catNumber && time.catNumber !== offering.catNumber
      );
      assert.deepEqual(
        foreignTimes,
        [],
        `${rawCourse.facultyPrefix}/${rawCourse.dept} ${rawCourse.code} ${rawTerm.term} Section ${rawTerm.section} CAT ${offering.catNumber} should not include another CAT's times`
      );

      const selectedSpecificTimes = offering.courseTimes.filter((time) => time.catNumber === offering.catNumber);
      assert.ok(
        selectedSpecificTimes.length > 0,
        `${rawCourse.facultyPrefix}/${rawCourse.dept} ${rawCourse.code} ${rawTerm.term} Section ${rawTerm.section} CAT ${offering.catNumber} should include its own CAT-specific component time`
      );
    }

    multiCatSectionsChecked++;
  }
}

assert.ok(multiCatSectionsChecked > 500, `expected broad multi-CAT coverage, checked ${multiCatSectionsChecked}`);
assert.ok(multiCatOfferingsChecked > 2000, `expected broad multi-CAT offering coverage, checked ${multiCatOfferingsChecked}`);

const frontendPayload = JSON.parse(fs.readFileSync('../frontend/yorku-elective-tracker/public/data/electives.json', 'utf8'));
const frontendChem1500 = frontendPayload.courses.find((course) => course.code === 'SC/CHEM 1500');
const frontendR26A03 = frontendChem1500?.terms.find((offering) =>
  offering.term === 'F' &&
  offering.section === 'A' &&
  offering.catNumber === 'R26A03'
);
const frontendDerekGroup = frontendR26A03?.instructorGroups?.find((group) =>
  group.firstName === 'Derek' &&
  group.lastName === 'Jackson'
);
const frontendTbaGroup = frontendR26A03?.instructorGroups?.find((group) => group.isTba);

assert.ok(frontendR26A03, 'expected frontend data to include SC/CHEM 1500 CAT R26A03');
assert.deepEqual(
  frontendDerekGroup?.roles.map((role) => `${role.type}${role.componentNumber || ''}`),
  ['LECT01', 'TUTR01'],
  'frontend data should save Derek Jackson once with lecture and tutorial roles'
);
assert.deepEqual(
  frontendTbaGroup?.roles.map((role) => `${role.type}${role.componentNumber || ''}`),
  ['LAB01'],
  'frontend data should save the selected lab TBA as its own role'
);

let frontendMultiCatGroupsChecked = 0;
for (const exportedCourse of frontendPayload.courses || []) {
  const groups = new Map();
  for (const offering of exportedCourse.terms || []) {
    const key = [exportedCourse.code, offering.term, offering.section].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(offering);
  }

  for (const group of groups.values()) {
    const cats = group.map((offering) => offering.catNumber).filter(Boolean);
    if (new Set(cats).size < 2) continue;

    for (const offering of group) {
      const foreignTimes = (offering.courseTimes || []).filter((time) =>
        time.catNumber && time.catNumber !== offering.catNumber
      );
      assert.deepEqual(
        foreignTimes,
        [],
        `${exportedCourse.code} ${offering.term} Section ${offering.section} CAT ${offering.catNumber} in public data should not include another CAT's times`
      );
    }

    frontendMultiCatGroupsChecked++;
  }
}

assert.ok(frontendMultiCatGroupsChecked > 300, `expected generated frontend data to include broad multi-CAT groups, checked ${frontendMultiCatGroupsChecked}`);

console.log(
  `courseTimes.test.js passed: checked ${multiCatSectionsChecked} raw multi-CAT sections, ${multiCatOfferingsChecked} raw CAT offerings, and ${frontendMultiCatGroupsChecked} generated frontend multi-CAT groups`
);
