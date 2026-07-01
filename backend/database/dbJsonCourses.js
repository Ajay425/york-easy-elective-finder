import fs from 'fs/promises';
import { FRONTEND_ELECTIVES_FILE } from '../utils/paths.js';

let cache = null;
let cacheMtimeMs = 0;

function readonlyError(action) {
  const err = new Error(
    `${action} is not available in the JSON-backed backend. Regenerate the static JSON files instead of mutating a PostgreSQL database.`
  );
  err.statusCode = 501;
  return err;
}

async function readElectivesPayload() {
  const stat = await fs.stat(FRONTEND_ELECTIVES_FILE);
  if (cache && cacheMtimeMs === stat.mtimeMs) return cache;

  const parsed = JSON.parse(await fs.readFile(FRONTEND_ELECTIVES_FILE, 'utf-8'));
  if (!parsed || !Array.isArray(parsed.courses)) {
    throw new Error(`${FRONTEND_ELECTIVES_FILE} must contain a courses array`);
  }

  cache = parsed;
  cacheMtimeMs = stat.mtimeMs;
  return cache;
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function splitCode(code) {
  const match = String(code || '').match(/^(?:([A-Z]+)\/)?([A-Z]+)\s+(\d{3,4}[A-Z]?)$/i);
  return {
    faculty: match?.[1] || null,
    deptAcronym: match?.[2] || null,
    courseCode: match?.[3] || null,
  };
}

function courseId(index) {
  return index + 1;
}

function offeringId(courseIndex, offeringIndex) {
  return courseId(courseIndex) * 10000 + offeringIndex + 1;
}

function instructorId(courseIndex, offeringIndex, meetingIndex) {
  return courseId(courseIndex) * 1000000 + (offeringIndex + 1) * 1000 + meetingIndex + 1;
}

function normalizeMeetingType(value) {
  return String(value || '').trim().toUpperCase();
}

function mapInstructor(meeting, courseIndex, offeringIndex, meetingIndex) {
  return {
    id: instructorId(courseIndex, offeringIndex, meetingIndex),
    firstname: meeting.firstName || 'TBA',
    lastname: meeting.lastName || '',
    avgRating: toNumber(meeting.avgRating),
    avgDifficulty: toNumber(meeting.avgDifficulty),
    wouldTakeAgainPercent: toNumber(meeting.wouldTakeAgainPercent),
    numberOfRatings: toNumber(meeting.numberOfRatings),
    department: meeting.department || null,
    rateMyProfLink: meeting.rateMyProfLink || null,
    popularity: toNumber(meeting.popularity),
  };
}

function mapOffering(offering, courseIndex, offeringIndex) {
  const meetings = Array.isArray(offering.meetings) ? offering.meetings : [];
  const firstType = normalizeMeetingType(meetings[0]?.type);

  return {
    id: offeringId(courseIndex, offeringIndex),
    term: offering.term,
    section: offering.section,
    catNumber: offering.catNumber || null,
    type: firstType || null,
    courseTimes: Array.isArray(offering.courseTimes) ? offering.courseTimes : [],
    instructors: meetings.map((meeting, meetingIndex) => ({
      id: instructorId(courseIndex, offeringIndex, meetingIndex),
      instructorId: instructorId(courseIndex, offeringIndex, meetingIndex),
      courseOfferingId: offeringId(courseIndex, offeringIndex),
      instructor: mapInstructor(meeting, courseIndex, offeringIndex, meetingIndex),
    })),
  };
}

function mapCourse(course, index, offeringFilter = null) {
  const parsedCode = splitCode(course.code);
  const faculty = course.facultyPrefix || parsedCode.faculty || course.faculty || '';
  const deptAcronym = course.deptAcronym || parsedCode.deptAcronym || '';
  const courseCode = parsedCode.courseCode || String(course.code || '').split(/\s+/).pop() || '';
  const offerings = (Array.isArray(course.terms) ? course.terms : [])
    .map((offering, offeringIndex) => ({ offering, offeringIndex }))
    .filter(({ offering }) => !offeringFilter || offeringFilter(offering))
    .map(({ offering, offeringIndex }) => mapOffering(offering, index, offeringIndex));

  return {
    id: courseId(index),
    faculty,
    deptAcronym,
    courseCode,
    credit: toNumber(course.credits),
    name: course.title || '',
    desc: course.description || '',
    language: course.language || null,
    year: toNumber(course.year),
    prerequisites: [],
    prerequisiteFor: [],
    courseOfferings: offerings,
  };
}

function includesNumber(values, value) {
  if (!Array.isArray(values) || !values.length) return true;
  const number = toNumber(value);
  return values.map(Number).some((candidate) => Number.isFinite(candidate) && candidate === number);
}

function includesString(values, value) {
  if (!Array.isArray(values) || !values.length) return true;
  return values.map(String).includes(String(value));
}

function offeringMatches(offering, terms = [], types = []) {
  if (!includesString(terms, offering.term)) return false;
  if (!Array.isArray(types) || !types.length) return true;

  const meetingTypes = (offering.meetings || []).map((meeting) => normalizeMeetingType(meeting.type));
  return meetingTypes.some((type) => types.includes(type));
}

function sortCourseOfferings(course) {
  for (const offering of course.courseOfferings) {
    offering.courseTimes.sort((a, b) => {
      const dayOrder = { M: 1, T: 2, W: 3, R: 4, Th: 4, F: 5, S: 6, Sat: 6, U: 7, Sun: 7 };
      const da = dayOrder[a.dayOfWeek] ?? 99;
      const db = dayOrder[b.dayOfWeek] ?? 99;
      if (da !== db) return da - db;
      return String(a.startTime || '').localeCompare(String(b.startTime || ''));
    });

    offering.instructors.sort((a, b) =>
      (b.instructor?.popularity ?? -1) - (a.instructor?.popularity ?? -1)
    );
  }

  course.courseOfferings.sort((a, b) =>
    (b.instructors[0]?.instructor?.popularity ?? -1) -
    (a.instructors[0]?.instructor?.popularity ?? -1)
  );
}

export async function getPopularCoursesDb(terms, types, years, depts, faculties, credits, termAndYear) {
  const payload = await readElectivesPayload();
  const requestedTermAndYear = typeof termAndYear === 'string' ? termAndYear.trim() : '';
  if (requestedTermAndYear && payload.termAndYear && requestedTermAndYear !== payload.termAndYear) {
    return [];
  }

  const normalizedTypes = (Array.isArray(types) ? types : []).map((type) => normalizeMeetingType(type));
  const courses = payload.courses
    .map((course, index) => ({ course, index }))
    .filter(({ course }) =>
      includesNumber(years, course.year) &&
      includesString(depts, course.deptAcronym) &&
      includesString(faculties, course.facultyPrefix) &&
      includesNumber(credits, course.credits)
    )
    .map(({ course, index }) => mapCourse(course, index, (offering) => offeringMatches(offering, terms, normalizedTypes)))
    .filter((course) => course.courseOfferings.length > 0);

  for (const course of courses) sortCourseOfferings(course);

  courses.sort((a, b) => {
    const bestA = a.courseOfferings[0]?.instructors[0]?.instructor?.popularity ?? -1;
    const bestB = b.courseOfferings[0]?.instructors[0]?.instructor?.popularity ?? -1;
    if (bestB !== bestA) return bestB - bestA;

    const ratingsA = a.courseOfferings[0]?.instructors[0]?.instructor?.numberOfRatings ?? -1;
    const ratingsB = b.courseOfferings[0]?.instructors[0]?.instructor?.numberOfRatings ?? -1;
    if (ratingsB !== ratingsA) return ratingsB - ratingsA;

    return `${a.deptAcronym}${a.courseCode}`.localeCompare(`${b.deptAcronym}${b.courseCode}`);
  });

  return courses;
}

export async function getCourseFromIdDB(courseId) {
  const payload = await readElectivesPayload();
  const index = Number(courseId) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= payload.courses.length) return null;
  const course = mapCourse(payload.courses[index], index);
  sortCourseOfferings(course);
  return course;
}

function tokenMatchesCourse(course, token) {
  const t = token.toLowerCase();
  if (/^\d+$/.test(token) && String(splitCode(course.code).courseCode || '') === token) return true;
  return [
    course.title,
    course.deptAcronym,
    splitCode(course.code).courseCode,
    course.facultyPrefix,
    course.faculty,
  ].some((field) => String(field || '').toLowerCase().includes(t));
}

function courseMatchesSearch(course, query) {
  const tokens = String(query || '')
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/gi, ''))
    .filter(Boolean);

  return tokens.every((token) => tokenMatchesCourse(course, token));
}

function courseMatchesFilters(course, filters = {}) {
  const terms = Array.isArray(filters.terms) ? filters.terms.map(String) : [];
  const types = Array.isArray(filters.types) ? filters.types.map(normalizeMeetingType) : [];

  if (!includesString(filters.depts, course.deptAcronym)) return false;
  if (!includesString(filters.faculties, course.facultyPrefix)) return false;
  if (!includesString(filters.languages, course.language)) return false;
  if (!includesNumber(filters.years, course.year)) return false;
  if (!includesNumber(filters.credits, course.credits)) return false;
  if (filters.hasElectives === true && filters.hasNoElectives !== true) return false;

  if (terms.length || types.length) {
    return (course.terms || []).some((offering) => offeringMatches(offering, terms, types));
  }

  return true;
}

export async function searchCoursesDb(query, page = 1, pageSize = 50, filters = {}) {
  const payload = await readElectivesPayload();
  const matches = payload.courses
    .map((course, index) => ({ course, index }))
    .filter(({ course }) => courseMatchesSearch(course, query) && courseMatchesFilters(course, filters))
    .sort((a, b) => {
      const deptCompare = String(a.course.deptAcronym || '').localeCompare(String(b.course.deptAcronym || ''));
      if (deptCompare !== 0) return deptCompare;
      return String(splitCode(a.course.code).courseCode || '').localeCompare(
        String(splitCode(b.course.code).courseCode || ''),
        undefined,
        { numeric: true }
      );
    });

  const p = Math.max(1, Number(page) || 1);
  const size = Math.max(1, Number(pageSize) || 50);
  const paged = matches.slice((p - 1) * size, (p - 1) * size + size);

  return {
    total: matches.length,
    results: paged.map(({ course, index }) => {
      const parsedCode = splitCode(course.code);
      return {
        id: courseId(index),
        title: course.title,
        code: `${course.facultyPrefix || parsedCode.faculty || ''}/${course.deptAcronym || parsedCode.deptAcronym || ''} ${parsedCode.courseCode || ''}`.trim(),
        deptAcronym: course.deptAcronym || parsedCode.deptAcronym || '',
        year: toNumber(course.year),
        language: course.language || null,
        desc: course.description || '',
        faculty: course.facultyPrefix || parsedCode.faculty || '',
        credit: toNumber(course.credits),
      };
    }),
  };
}

function sortedStrings(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

function sortedNumbers(values, direction = 'asc') {
  return [...new Set(values.map(Number).filter(Number.isFinite))]
    .sort((a, b) => direction === 'desc' ? b - a : a - b);
}

export async function getCourseSearchFilterOptionsDb() {
  const payload = await readElectivesPayload();
  const courses = payload.courses;
  return {
    depts: sortedStrings(courses.map((course) => course.deptAcronym)),
    faculties: sortedStrings(courses.map((course) => course.facultyPrefix)),
    languages: sortedStrings(courses.map((course) => course.language)),
    terms: sortedStrings(courses.flatMap((course) => (course.terms || []).map((term) => term.term))),
    types: sortedStrings(courses.flatMap((course) =>
      (course.terms || []).flatMap((term) => (term.meetings || []).map((meeting) => normalizeMeetingType(meeting.type)))
    )),
    years: sortedNumbers(courses.map((course) => course.year), 'desc'),
    credits: sortedNumbers(courses.map((course) => course.credits)),
  };
}

export async function clearCoursePrereqsDB() {
  return { count: 0 };
}

export async function searchInstructorsDb(query, limit = 10) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];

  const payload = await readElectivesPayload();
  const seen = new Set();
  const results = [];

  for (const [courseIndex, course] of payload.courses.entries()) {
    for (const [offeringIndex, offering] of (course.terms || []).entries()) {
      for (const [meetingIndex, meeting] of (offering.meetings || []).entries()) {
        const instructor = mapInstructor(meeting, courseIndex, offeringIndex, meetingIndex);
        const fullName = `${instructor.firstname} ${instructor.lastname}`.trim();
        const key = fullName.toLowerCase();
        if (!key.includes(q) || seen.has(key) || fullName === 'TBA') continue;
        seen.add(key);
        results.push(instructor);
        if (results.length >= Number(limit)) return results;
      }
    }
  }

  return results;
}

export async function deletePrereq() { throw readonlyError('Deleting prerequisites'); }
export async function deletePrereqFromCourse() { throw readonlyError('Deleting prerequisites'); }
export async function updateCourseDB() { throw readonlyError('Updating courses'); }
export async function deleteCourseDB() { throw readonlyError('Deleting courses'); }
export async function createPrereqDB() { throw readonlyError('Creating prerequisites'); }
export async function createOfferingDB() { throw readonlyError('Creating offerings'); }
export async function updateOfferingDB() { throw readonlyError('Updating offerings'); }
export async function deleteOfferingDB() { throw readonlyError('Deleting offerings'); }
export async function createInstructorDB() { throw readonlyError('Creating instructors'); }
export async function updateInstructorDB() { throw readonlyError('Updating instructors'); }
export async function addInstructorToOfferingDB() { throw readonlyError('Attaching instructors'); }
export async function removeInstructorFromOfferingDB() { throw readonlyError('Removing instructors'); }
export async function recomputeInstructorPopularity() { throw readonlyError('Recomputing instructor popularity'); }
