import fs from 'fs/promises';
import * as cheerio from 'cheerio';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import {
  decodeHtml,
  flattenCourseTimeComponents,
  parseCourseTimeHtml,
  parseTypeAndComponent,
  sortCourseTimes,
} from '../lib/courseTimeHtmlParser.js';
import { hydrateCourseTimesLookup } from '../step2_courseParsing/jsonPipelineArtifacts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(backendRoot, '..');
const frontendDataDir = path.join(projectRoot, 'frontend', 'yorku-elective-tracker', 'public', 'data');

const SOURCE_COURSES = path.join(backendRoot, 'data', 'all_courses.json');
const STEP2_DIR = path.join(backendRoot, 'step2_courseParsing');
const STEP2_ARCHIVE_DIR = path.join(STEP2_DIR, 'archive');
const STEP2_COURSES = path.join(STEP2_DIR, 'all_courses.json');
const RUNTIME_PIPELINE_DIR = path.join(backendRoot, 'runtime', 'pipeline');
const COURSE_TIMES_HTML_DIR = path.join(STEP2_DIR, 'courseTimesHtml');
const RAW_YORK_COURSES_DIR = path.join(backendRoot, 'step1_PythonCourseScraper', 'york_courses');
const SOURCE_RMP = path.join(backendRoot, 'data', 'profs', 'yorku_RMP_data.json');
const SOURCE_RMP_MATCHES = path.join(STEP2_DIR, 'logs', 'matches.json');
const STEP13_APPROVED_NO_PREREQS = path.join(STEP2_DIR, 'step13_coursesWithoutRealPrereqs.json');
const STEP15_HIDE_FROM_FRONTEND = path.join(STEP2_DIR, 'step15_coursesToHideFromFrontend.json');
const SESSION_META = path.join(backendRoot, 'step1_PythonCourseScraper', 'session_meta.json');
const COURSE_TIMES_SIDECAR = path.join(RUNTIME_PIPELINE_DIR, 'courseTimes.json');
const OUT_COURSES = path.join(frontendDataDir, 'electives.json');
const OUT_META = path.join(frontendDataDir, 'course_meta.json');

const FACULTY_NAMES = {
  SB: 'Schulich School of Business',
  AP: 'Faculty of Liberal Arts & Professional Studies',
  SC: 'Faculty of Science',
  LE: 'Lassonde School of Engineering',
  ED: 'Faculty of Education',
};

const TERM_LABELS = {
  F: 'Fall',
  W: 'Winter',
  Y: 'Full Year',
  M: 'Full Year',
  N: 'Fall/Winter',
  A: 'Summer',
  B: 'Summer First Half',
  C: 'Summer Second Half',
  S1: 'Summer First Half',
  S2: 'Summer Second Half',
  S3: 'Summer Full',
  SU: 'Summer',
};

const FALL_WINTER_TERMS = new Set(['F', 'W', 'Y', 'M', 'N']);
const COURSE_TYPE_ORDER = [
  'LECT',
  'SEMR',
  'TUTR',
  'LAB',
  'BLEN',
  'ONLN',
  'ONCA',
  'HYFX',
  'STDO',
  'PRAC',
  'DIRD',
  'ISTY',
  'FDEX',
  'FIEL',
  'INSP',
  'LGCL',
  'RESP',
  'REEV',
  'THES',
  'WKSP',
  'COOP',
  'IDS',
];

function seasonYears(termAndYear) {
  const match = String(termAndYear || '').match(/(\d{4})(?:-(\d{4}))?/);
  if (!match) return {};
  const startYear = match[1];
  const endYear = match[2] || String(Number(startYear) + 1);
  return { startYear, endYear };
}

function labelTerm(term, termAndYear) {
  const { startYear, endYear } = seasonYears(termAndYear);

  if (/fall\/winter/i.test(String(termAndYear || ''))) {
    if (term === 'F') return `Fall ${startYear || ''}`.trim();
    if (term === 'W') return `Winter ${endYear || ''}`.trim();
    if (term === 'Y') return `Full Year ${startYear && endYear ? `${startYear}-${endYear}` : ''}`.trim();
    if (term === 'N') return `Fall/Winter ${startYear && endYear ? `${startYear}-${endYear}` : ''}`.trim();
  }

  return TERM_LABELS[term] || term;
}

function normalizeName(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^\w\s]|_/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeCourseType(value) {
  const raw = String(value || '').trim().toUpperCase();
  const match = raw.match(/[A-Z]+/);
  return match ? match[0] : raw;
}

function inferYear(code) {
  const match = String(code || '').match(/\d/);
  if (!match) return null;
  const year = Number(match[0]);
  return Number.isFinite(year) ? year : null;
}

function toNumber(value) {
  if (value === '' || value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function computePopularity(rating, ratingCount) {
  const avg = toNumber(rating);
  const count = Math.max(0, Number(ratingCount) || 0);
  if (!avg || count === 0) return 0;

  const priorRating = 3;
  const priorStrength = 10;
  const adjustedRating = ((priorStrength * priorRating) + (count * avg)) / (priorStrength + count);
  return Math.round(Math.max(0, Math.min(100, ((adjustedRating - 1) / 4) * 100)));
}

function courseTimeKey({ faculty, dept, code, credit, term, section }) {
  return [
    String(faculty || '').trim(),
    String(dept || '').trim(),
    String(code || '').trim(),
    String(Number(credit)),
    String(term || '').trim(),
    String(section || '').trim(),
  ].join('|');
}

function approvedCourseKey(entry) {
  return [
    String(entry?.faculty || entry?.facultyPrefix || '').trim(),
    String(entry?.deptAcronym || entry?.dept || '').trim(),
    String(entry?.courseCode || entry?.code || '').trim(),
    String(Number(entry?.credit)),
  ].join('|');
}

async function loadApprovedNoRealPrereqKeys() {
  const approved = await readJson(STEP13_APPROVED_NO_PREREQS, { courses: [] });
  return new Set(
    (Array.isArray(approved?.courses) ? approved.courses : [])
      .map(approvedCourseKey)
      .filter((key) => !key.startsWith('|') && !key.endsWith('|') && !key.includes('NaN'))
  );
}

async function loadHiddenCourseKeys() {
  const hidden = await readJson(STEP15_HIDE_FROM_FRONTEND, { courses: [] });
  return new Set(
    (Array.isArray(hidden?.courses) ? hidden.courses : [])
      .map(approvedCourseKey)
      .filter((key) => !key.startsWith('|') && !key.endsWith('|') && !key.includes('NaN'))
  );
}

function applyApprovedNoRealPrereqs(courses, approvedKeys) {
  let clearedCourses = 0;
  let clearedPrereqRows = 0;

  const normalizedCourses = courses.map((course) => {
    if (!approvedKeys.has(approvedCourseKey(course))) return course;

    const prereqs = Array.isArray(course.prereqs) ? course.prereqs : [];
    clearedCourses++;
    clearedPrereqRows += prereqs.length;
    return { ...course, prereqs: [] };
  });

  return { courses: normalizedCourses, clearedCourses, clearedPrereqRows };
}

function applyHiddenCourses(courses, hiddenKeys) {
  const visibleCourses = [];
  let hiddenCourses = 0;

  for (const course of courses) {
    if (hiddenKeys.has(approvedCourseKey(course))) {
      hiddenCourses++;
      continue;
    }
    visibleCourses.push(course);
  }

  return { courses: visibleCourses, hiddenCourses };
}

async function loadCourseTimesSidecar() {
  try {
    const serialized = await readJson(COURSE_TIMES_SIDECAR);
    return hydrateCourseTimesLookup(serialized);
  } catch {
    return null;
  }
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (err) {
    if (fallback !== null) return fallback;
    throw err;
  }
}

async function statFile(filePath) {
  try {
    return await fs.stat(filePath);
  } catch {
    return null;
  }
}

function isoFromMs(ms) {
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

async function courseFileInfo(filePath) {
  const stat = await statFile(filePath);
  if (!stat) {
    return {
      exists: false,
      filePath,
      count: 0,
      termAndYears: new Set(),
      mtimeMs: null,
      mtime: null,
    };
  }

  const courses = await readJson(filePath, []);
  const rows = Array.isArray(courses) ? courses : [];
  return {
    exists: true,
    filePath,
    count: rows.length,
    termAndYears: new Set(rows.map((course) => course?.termAndYear).filter(Boolean)),
    mtimeMs: stat.mtimeMs,
    mtime: isoFromMs(stat.mtimeMs),
  };
}

function courseFileMatchesTerm(info, termAndYear) {
  const wanted = String(termAndYear || '').trim();
  if (!wanted) return true;
  if (!info.termAndYears?.size) return true;
  return info.termAndYears.has(wanted);
}

async function newestArchivedCourseFile(termAndYear) {
  try {
    const entries = await fs.readdir(STEP2_ARCHIVE_DIR, { withFileTypes: true });
    const wantedTerm = String(termAndYear || '')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '');

    const candidates = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!entry.name.startsWith('all_courses_') || !entry.name.endsWith('.json')) continue;
      if (entry.name.endsWith('_unique_lists.json')) continue;
      if (wantedTerm && !entry.name.includes(wantedTerm)) continue;

      const filePath = path.join(STEP2_ARCHIVE_DIR, entry.name);
      const info = await courseFileInfo(filePath);
      candidates.push({ filePath, mtimeMs: info.mtimeMs, count: info.count });
    }

    candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
    if (!candidates.length) return null;

    const maxCount = Math.max(...candidates.map((candidate) => candidate.count));
    const minimumCompleteCount = maxCount >= 500 ? Math.max(100, Math.floor(maxCount * 0.8)) : 0;
    const selected = candidates.find((candidate) => candidate.count >= minimumCompleteCount) || candidates[0];

    if (selected.filePath !== candidates[0].filePath) {
      console.warn(
        `Warning: newest archive ${candidates[0].filePath} has only ${candidates[0].count} courses; using ${selected.filePath} with ${selected.count} courses instead.`
      );
    }

    return selected.filePath;
  } catch {
    return null;
  }
}

async function resolveCourseSource(termAndYear) {
  const activeInfo = await courseFileInfo(STEP2_COURSES);
  const archiveFile = await newestArchivedCourseFile(termAndYear);
  const archiveInfo = archiveFile ? await courseFileInfo(archiveFile) : null;

  if (activeInfo.exists && courseFileMatchesTerm(activeInfo, termAndYear)) {
    const archiveCount = archiveInfo?.count || 0;
    const minimumActiveCount = archiveCount >= 500 ? Math.max(100, Math.floor(archiveCount * 0.8)) : 0;
    if (minimumActiveCount && activeInfo.count < minimumActiveCount) {
      console.warn(
        `Warning: active step2 output ${STEP2_COURSES} has only ${activeInfo.count} courses; falling back to archive ${archiveFile} with ${archiveCount} courses.`
      );
    } else {
      return {
        filePath: STEP2_COURSES,
        kind: 'active-step2-output',
        info: activeInfo,
      };
    }
  }

  if (archiveFile) {
    return {
      filePath: archiveFile,
      kind: 'latest-completed-archive',
      info: archiveInfo,
    };
  }

  if (activeInfo.exists) {
    return {
      filePath: STEP2_COURSES,
      kind: 'active-step2-output-term-mismatch',
      info: activeInfo,
    };
  }

  return {
    filePath: SOURCE_COURSES,
    kind: 'legacy-backend-data',
    info: await courseFileInfo(SOURCE_COURSES),
  };
}

async function newestFileInDir(dirPath) {
  const stack = [dirPath];
  let newest = null;

  while (stack.length) {
    const currentDir = stack.pop();
    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }
      if (!entry.isFile()) continue;

      const stat = await statFile(entryPath);
      if (!stat) continue;

      if (!newest || stat.mtimeMs > newest.mtimeMs) {
        newest = {
          filePath: entryPath,
          mtimeMs: stat.mtimeMs,
          mtime: isoFromMs(stat.mtimeMs),
        };
      }
    }
  }

  return newest;
}

async function listCourseTimeHtmlFiles() {
  try {
    const entries = await fs.readdir(COURSE_TIMES_HTML_DIR, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.html'))
      .map((entry) => path.join(COURSE_TIMES_HTML_DIR, entry.name))
      .sort();
  } catch {
    return [];
  }
}

async function parseCourseTimeHtmlFile(filePath) {
  const html = decodeHtml(await fs.readFile(filePath));
  const $ = cheerio.load(html);
  return parseCourseTimeHtml($);
}

function componentKey({ faculty, dept, code, credit, term, section, type, componentNumber }) {
  return [
    courseTimeKey({ faculty, dept, code, credit, term, section }),
    String(type || '').trim(),
    String(componentNumber || '').trim(),
  ].join('|');
}

function sectionCatKey(sectionKey, catNumber) {
  return [sectionKey, String(catNumber || '').trim()].join('|');
}

function dedupePushTime(map, key, time, seen, seenPrefix = key) {
  const dedupeKey = [
    seenPrefix,
    time.type,
    time.componentNumber || '',
    time.catNumber || '',
    time.dayOfWeek,
    time.startTime,
    time.durationMinutes,
  ].join('|');
  if (seen.has(dedupeKey)) return;
  seen.add(dedupeKey);

  if (!map.has(key)) map.set(key, []);
  map.get(key).push({
    type: time.type,
    componentNumber: time.componentNumber,
    catNumber: time.catNumber,
    dayOfWeek: time.dayOfWeek,
    startTime: time.startTime,
    durationMinutes: time.durationMinutes,
    endTime: time.endTime,
  });
}

async function buildCourseTimesLookup() {
  const files = await listCourseTimeHtmlFiles();
  const allBySection = new Map();
  const commonBySection = new Map();
  const byCat = new Map();
  const componentMeta = new Map();
  const catsBySection = new Map();
  const seen = new Set();
  let parsedRows = 0;
  let parsedComponents = 0;

  for (const file of files) {
    const components = await parseCourseTimeHtmlFile(file);
    parsedComponents += components.length;
    const rows = flattenCourseTimeComponents(components);
    parsedRows += rows.length;

    for (const component of components) {
      const key = componentKey(component);
      if (!componentMeta.has(key)) {
        componentMeta.set(key, {
          type: component.type,
          componentNumber: component.componentNumber,
          catNumber: component.catNumber,
        });
      }
    }

    for (const row of rows) {
      const sectionKey = courseTimeKey(row);
      dedupePushTime(allBySection, sectionKey, row, seen, `all|${sectionKey}`);

      if (row.catNumber) {
        const catKey = sectionCatKey(sectionKey, row.catNumber);
        if (!catsBySection.has(sectionKey)) catsBySection.set(sectionKey, new Set());
        catsBySection.get(sectionKey).add(row.catNumber);
        dedupePushTime(byCat, catKey, row, seen, `cat|${catKey}`);
      } else {
        dedupePushTime(commonBySection, sectionKey, row, seen, `common|${sectionKey}`);
      }
    }
  }

  for (const times of [...allBySection.values(), ...commonBySection.values(), ...byCat.values()]) {
    sortCourseTimes(times);
  }

  return {
    allBySection,
    commonBySection,
    byCat,
    componentMeta,
    catsBySection,
    fileCount: files.length,
    parsedRows,
    parsedComponents,
    matchedKeys: allBySection.size,
  };
}

async function loadResolvedCourseTimes() {
  const sidecar = await loadCourseTimesSidecar();
  if (sidecar) return sidecar;
  return buildCourseTimesLookup();
}

function buildRmpLookup(rmpRows, matchRows) {
  const lookup = new Map();

  for (const row of Array.isArray(rmpRows) ? rmpRows : []) {
    const key = `${normalizeName(row.first)}|${normalizeName(row.last)}`;
    if (!key.startsWith('|') && !key.endsWith('|')) lookup.set(key, row);
  }

  for (const match of Array.isArray(matchRows) ? matchRows : []) {
    const first = match?.requested?.firstname;
    const last = match?.requested?.lastname;
    const fields = match?.updatedFields || {};
    const key = `${normalizeName(first)}|${normalizeName(last)}`;
    if (key.startsWith('|') || key.endsWith('|')) continue;
    const existing = lookup.get(key) || {};

    lookup.set(key, {
      ...existing,
      first,
      last,
      overall_rating: fields.avgRating ?? existing.overall_rating,
      avgRating: fields.avgRating ?? existing.avgRating,
      avgDifficulty: fields.avgDifficulty ?? existing.avgDifficulty,
      wouldTakeAgainPercent: fields.wouldTakeAgainPercent ?? existing.wouldTakeAgainPercent,
      numratings: fields.numberOfRatings ?? existing.numratings,
      department: fields.department ?? existing.department,
      rateMyProfLink: fields.rateMyProfLink ?? existing.rateMyProfLink,
    });
  }
  return lookup;
}

function getInstructorRmp(rmpLookup, firstName, lastName) {
  const key = `${normalizeName(firstName)}|${normalizeName(lastName)}`;
  return rmpLookup.get(key) || null;
}

function mapMeeting(meeting, rmpLookup) {
  const parsedType = parseTypeAndComponent(meeting?.type);
  const type = parsedType.type || normalizeCourseType(meeting?.type);
  const instructors = Array.isArray(meeting?.instructors) && meeting.instructors.length
    ? meeting.instructors
    : [{ firstName: 'TBA', lastName: '' }];

  return instructors.map((instructor) => {
    const firstName = instructor?.firstName || 'TBA';
    const lastName = instructor?.lastName || '';
    const rmp = getInstructorRmp(rmpLookup, firstName, lastName);
    const avgRating = toNumber(rmp?.overall_rating);
    const numberOfRatings = rmp?.numratings == null ? null : Number(rmp.numratings) || 0;
    const storedPopularity = toNumber(rmp?.popularity);

    return {
      type,
      componentNumber: parsedType.componentNumber,
      rawType: parsedType.rawType || meeting?.type || null,
      catNumber: meeting?.catNumber || null,
      firstName,
      lastName,
      avgRating,
      avgDifficulty: toNumber(rmp?.avgDifficulty),
      wouldTakeAgainPercent: toNumber(rmp?.wouldTakeAgainPercent),
      numberOfRatings,
      rateMyProfLink: rmp?.rateMyProfLink || null,
      popularity: storedPopularity ?? computePopularity(avgRating, numberOfRatings),
    };
  });
}

function dedupeMeetings(meetings) {
  const seen = new Set();
  const deduped = [];

  for (const meeting of meetings) {
    const key = [
      meeting.type || '',
      meeting.componentNumber || '',
      meeting.catNumber || '',
      normalizeName(meeting.firstName),
      normalizeName(meeting.lastName),
    ].join('|');

    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(meeting);
  }

  return deduped;
}

function sortTypes(types) {
  return [...types].sort((a, b) => {
    const ia = COURSE_TYPE_ORDER.indexOf(a);
    const ib = COURSE_TYPE_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    return a.localeCompare(b);
  });
}

function isRelevantTerm(term, termAndYear) {
  if (!termAndYear || !/fall\/winter/i.test(termAndYear)) return true;
  return FALL_WINTER_TERMS.has(term);
}

function rawCatNumber(value) {
  const text = String(value || '').trim();
  return text || null;
}

function sortedCatNumbers(values) {
  return [...values].filter(Boolean).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
}

function getSectionKey(course, term) {
  return courseTimeKey({
    faculty: course.facultyPrefix,
    dept: course.dept,
    code: course.code,
    credit: course.credit,
    term: term.term,
    section: term.section,
  });
}

function getMeetingComponentMeta(courseTimes, course, term, meeting) {
  return courseTimes.componentMeta.get(componentKey({
    faculty: course.facultyPrefix,
    dept: course.dept,
    code: course.code,
    credit: course.credit,
    term: term.term,
    section: term.section,
    type: meeting.type,
    componentNumber: meeting.componentNumber,
  }));
}

function isMeetingForCat(courseTimes, course, term, meeting, selectedCatNumber) {
  const meetingCat = rawCatNumber(meeting.catNumber);
  const meta = getMeetingComponentMeta(courseTimes, course, term, meeting);
  const htmlCat = rawCatNumber(meta?.catNumber);

  if (htmlCat) return htmlCat === selectedCatNumber;
  if (meta && !htmlCat) return true;
  if (!meetingCat) return true;
  return meetingCat === selectedCatNumber;
}

function courseTimesForCat(courseTimes, sectionKey, selectedCatNumber) {
  if (!selectedCatNumber) return courseTimes.allBySection.get(sectionKey) || [];

  const common = courseTimes.commonBySection.get(sectionKey) || [];
  const selected = courseTimes.byCat.get(sectionCatKey(sectionKey, selectedCatNumber)) || [];
  return sortCourseTimes([...common, ...selected]);
}

function buildTermOfferings(course, term, meetings, courseTimes) {
  const sectionKey = getSectionKey(course, term);
  const rawMeetingCats = new Set(meetings.map((meeting) => rawCatNumber(meeting.catNumber)).filter(Boolean));
  const htmlCats = courseTimes.catsBySection.get(sectionKey) || new Set();
  const catNumbers = sortedCatNumbers(htmlCats.size ? htmlCats : rawMeetingCats);

  if (!catNumbers.length) {
    return [{
      term: term.term,
      section: term.section,
      catNumber: null,
      courseTimes: courseTimes.allBySection.get(sectionKey) || term.courseTimes || [],
      meetings,
    }];
  }

  return catNumbers.map((catNumber) => {
    const optionMeetings = meetings.filter((meeting) =>
      isMeetingForCat(courseTimes, course, term, meeting, catNumber)
    ).map((meeting) => {
      const meta = getMeetingComponentMeta(courseTimes, course, term, meeting);
      return meta && !rawCatNumber(meta.catNumber)
        ? { ...meeting, catNumber: null }
        : meeting;
    });

    return {
      term: term.term,
      section: term.section,
      catNumber,
      optionLabel: `CAT ${catNumber}`,
      courseTimes: courseTimesForCat(courseTimes, sectionKey, catNumber),
      meetings: optionMeetings.length ? optionMeetings : meetings.filter((meeting) => !rawCatNumber(meeting.catNumber)),
    };
  });
}

function bestPopularity(course) {
  return Math.max(
    0,
    ...course.terms.flatMap((term) =>
      (term.meetings || []).map((meeting) => Number(meeting.popularity) || 0)
    )
  );
}

async function main() {
  const sessionMeta = await readJson(SESSION_META, {});
  const courseSource = await resolveCourseSource(sessionMeta?.termAndYear);
  const [rawCourses, rmpRows, rmpMatchRows, newestRawYorkCourseFile, approvedNoRealPrereqKeys, hiddenCourseKeys] = await Promise.all([
    readJson(courseSource.filePath),
    readJson(SOURCE_RMP, []),
    readJson(SOURCE_RMP_MATCHES, []),
    newestFileInDir(RAW_YORK_COURSES_DIR),
    loadApprovedNoRealPrereqKeys(),
    loadHiddenCourseKeys(),
  ]);
  const courseTimes = await loadResolvedCourseTimes();

  if (!Array.isArray(rawCourses)) {
    throw new Error(`${courseSource.filePath} must contain an array`);
  }

  const generatedAt = new Date().toISOString();
  const termAndYear = sessionMeta?.termAndYear || null;
  const rmpLookup = buildRmpLookup(rmpRows, rmpMatchRows);
  const approvedNoRealPrereqResult = applyApprovedNoRealPrereqs(rawCourses, approvedNoRealPrereqKeys);
  const hiddenCourseResult = applyHiddenCourses(approvedNoRealPrereqResult.courses, hiddenCourseKeys);
  const effectiveRawCourses = hiddenCourseResult.courses;
  const termSet = new Set();
  const typeSet = new Set();
  let offeringsWithCatNumbers = 0;
  let offeringsWithTimes = 0;
  let instructorsWithRmpLinks = 0;

  const courses = effectiveRawCourses
    .filter((course) => Array.isArray(course.prereqs) && course.prereqs.length === 0)
    .map((course) => {
      const year = inferYear(course.code);
      if (!year || year < 1 || year > 4) return null;

      const terms = (course.terms || [])
        .filter((term) => isRelevantTerm(term.term, termAndYear))
        .flatMap((term) => {
          const meetings = dedupeMeetings((term.meetings || []).flatMap((meeting) => mapMeeting(meeting, rmpLookup)));
          for (const meeting of meetings) {
            if (meeting.type) typeSet.add(meeting.type);
            if (meeting.rateMyProfLink) instructorsWithRmpLinks++;
          }
          if (term.term) termSet.add(term.term);

          const offerings = buildTermOfferings(course, term, meetings, courseTimes);
          for (const offering of offerings) {
            if (offering.catNumber) offeringsWithCatNumbers++;
            if (offering.courseTimes?.length) offeringsWithTimes++;
          }

          return offerings;
        })
        .filter((term) => term.term && term.meetings.length > 0);

      if (!terms.length) return null;

      const credits = Number(course.credit);
      return {
        code: `${course.facultyPrefix}/${course.dept} ${course.code}`,
        title: course.title || '',
        credits: Number.isFinite(credits) ? credits.toFixed(2) : String(course.credit || ''),
        faculty: FACULTY_NAMES[course.facultyPrefix] || course.facultyPrefix || 'Other',
        facultyPrefix: course.facultyPrefix,
        year,
        deptAcronym: course.dept,
        description: course.description || '',
        topInstructorPopularity: null,
        topInstructorName: null,
        terms,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const popDiff = bestPopularity(b) - bestPopularity(a);
      if (popDiff !== 0) return popDiff;
      return a.code.localeCompare(b.code);
    })
    .map((course) => {
      const bestMeeting = course.terms
        .flatMap((term) => term.meetings || [])
        .sort((a, b) => (Number(b.popularity) || 0) - (Number(a.popularity) || 0))[0];

      return {
        ...course,
        topInstructorPopularity: bestMeeting?.popularity ?? null,
        topInstructorName: bestMeeting && bestMeeting.firstName !== 'TBA'
          ? `${bestMeeting.firstName} ${bestMeeting.lastName}`.trim()
          : null,
      };
    });

  const terms = [...termSet].sort().map((term) => ({
    term,
    label: labelTerm(term, termAndYear),
  }));
  const sourceMtimeMs = courseSource.info?.mtimeMs;
  const rawYorkCoursesNewerThanSource = Boolean(
    newestRawYorkCourseFile?.mtimeMs &&
    sourceMtimeMs &&
    newestRawYorkCourseFile.mtimeMs > sourceMtimeMs + 60_000
  );

  const payload = {
    msg: 'success',
    format: 'frontend.v1',
    generatedAt,
    termAndYear,
    source: path.relative(projectRoot, courseSource.filePath),
    sourceKind: courseSource.kind,
    courseCount: courses.length,
    terms,
    courseTypes: sortTypes(typeSet),
    hasTimingData: offeringsWithTimes > 0,
    courses,
  };

  const meta = {
    msg: 'success',
    generatedAt,
    termAndYear,
    source: payload.source,
    sourceKind: payload.sourceKind,
    sourceMtime: courseSource.info?.mtime || null,
    sourceCourseCount: courseSource.info?.count || rawCourses.length,
    approvedNoRealPrereqCourses: approvedNoRealPrereqResult.clearedCourses,
    approvedNoRealPrereqRowsCleared: approvedNoRealPrereqResult.clearedPrereqRows,
    manuallyHiddenCourses: hiddenCourseResult.hiddenCourses,
    rawYorkCoursesNewestFile: newestRawYorkCourseFile
      ? path.relative(projectRoot, newestRawYorkCourseFile.filePath)
      : null,
    rawYorkCoursesNewestMtime: newestRawYorkCourseFile?.mtime || null,
    rawYorkCoursesNewerThanSource,
    courseCount: courses.length,
    terms,
    courseTypes: payload.courseTypes,
    hasTimingData: payload.hasTimingData,
    stats: {
      offeringsWithCatNumbers,
      offeringsWithTimes,
      instructorsWithRmpLinks,
      courseTimeHtmlFiles: courseTimes.fileCount,
      courseTimeComponentsParsed: courseTimes.parsedComponents,
      courseTimeRowsParsed: courseTimes.parsedRows,
      courseTimeSectionKeys: courseTimes.matchedKeys,
    },
  };

  await fs.mkdir(frontendDataDir, { recursive: true });
  await Promise.all([
    fs.writeFile(OUT_COURSES, `${JSON.stringify(payload)}\n`, 'utf8'),
    fs.writeFile(OUT_META, `${JSON.stringify(meta, null, 2)}\n`, 'utf8'),
  ]);

  console.log(`Exported ${courses.length} static elective courses`);
  console.log(`Term/year: ${termAndYear || 'unknown'}`);
  console.log(`Source: ${courseSource.filePath}`);
  console.log(`Source kind: ${courseSource.kind}`);
  console.log(`Source modified: ${courseSource.info?.mtime || 'unknown'}`);
  console.log(`Approved no-real-prereq courses applied: ${approvedNoRealPrereqResult.clearedCourses} (${approvedNoRealPrereqResult.clearedPrereqRows} prereq row(s) cleared in export)`);
  console.log(`Manually hidden courses applied: ${hiddenCourseResult.hiddenCourses}`);
  if (newestRawYorkCourseFile) {
    console.log(`Newest york_courses file: ${newestRawYorkCourseFile.filePath}`);
    console.log(`Newest york_courses modified: ${newestRawYorkCourseFile.mtime}`);
  }
  if (rawYorkCoursesNewerThanSource) {
    console.warn('Warning: york_courses contains files newer than the selected course JSON. Run the parser/pipeline before exporting if those raw files should be reflected.');
  }
  console.log(`Terms: ${terms.map((term) => term.term).join(', ')}`);
  console.log(`Course types: ${payload.courseTypes.join(', ')}`);
  console.log(`Offerings with CAT numbers: ${offeringsWithCatNumbers}`);
  console.log(`Offerings with class times: ${offeringsWithTimes}`);
  console.log(`Instructor rows with RMP links: ${instructorsWithRmpLinks}`);
  console.log(`Course time HTML files: ${courseTimes.fileCount}`);
  console.log(`Course time components parsed: ${courseTimes.parsedComponents}`);
  console.log(`Course time rows parsed: ${courseTimes.parsedRows}`);
  console.log(`Wrote ${OUT_COURSES}`);
  console.log(`Wrote ${OUT_META}`);
}

export {
  buildCourseTimesLookup,
  buildTermOfferings,
  courseTimeKey,
  applyApprovedNoRealPrereqs,
  applyHiddenCourses,
  mapMeeting,
  newestArchivedCourseFile,
  loadApprovedNoRealPrereqKeys,
  loadHiddenCourseKeys,
  parseCourseTimeHtmlFile,
};

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
