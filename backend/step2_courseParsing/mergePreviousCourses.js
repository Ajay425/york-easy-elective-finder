import fs from 'fs/promises';
import path from 'path';

const DEFAULT_LOW_FRESH_RATIO = 0.98;
const DEFAULT_ARCHIVE_BASE_RATIO = 0.98;

export function courseKey(course) {
  return [
    String(course?.facultyPrefix || course?.faculty || '').trim(),
    String(course?.dept || course?.deptAcronym || '').trim(),
    String(course?.code || course?.courseCode || '').trim(),
    String(Number(course?.credit ?? course?.credits)),
  ].join('|');
}

function safeTerm(value) {
  return String(value || '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '');
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (err) {
    if (fallback !== null) return fallback;
    throw err;
  }
}

async function writeReport(filePath, report) {
  if (!filePath) return;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

async function courseFileInfo(filePath) {
  const courses = await readJson(filePath, []);
  const stat = await fs.stat(filePath);
  return {
    filePath,
    mtimeMs: stat.mtimeMs,
    count: Array.isArray(courses) ? courses.length : 0,
    courses: Array.isArray(courses) ? courses : [],
  };
}

export async function newestStableArchive(archiveDir, termAndYear, options = {}) {
  const baseRatio = Number(options.baseRatio ?? DEFAULT_ARCHIVE_BASE_RATIO);
  const wantedTerm = safeTerm(termAndYear);
  let entries;

  try {
    entries = await fs.readdir(archiveDir, { withFileTypes: true });
  } catch {
    return null;
  }

  const candidates = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.startsWith('all_courses_') || !entry.name.endsWith('.json')) continue;
    if (entry.name.endsWith('_unique_lists.json')) continue;
    if (wantedTerm && !entry.name.includes(wantedTerm)) continue;

    try {
      candidates.push(await courseFileInfo(path.join(archiveDir, entry.name)));
    } catch {
      // Ignore unreadable archives; another archive can still be a valid base.
    }
  }

  if (!candidates.length) return null;

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const maxCount = Math.max(...candidates.map((candidate) => candidate.count));
  const minimumStableCount = maxCount >= 500
    ? Math.max(100, Math.floor(maxCount * baseRatio))
    : 0;

  return candidates.find((candidate) => candidate.count >= minimumStableCount) || candidates[0];
}

export async function loadScrapeFailureReport(reportPath) {
  const report = await readJson(reportPath, null);
  if (!report || typeof report !== 'object') {
    return {
      exists: false,
      failedSubjects: [],
      failedCourses: [],
    };
  }

  return {
    exists: true,
    generatedAt: report.generatedAt || null,
    failedSubjects: Array.isArray(report.failedSubjects) ? report.failedSubjects : [],
    failedCourses: Array.isArray(report.failedCourses) ? report.failedCourses : [],
  };
}

export function mergeWithPreviousCourses(freshCourses, previousCourses, failureReport = {}, options = {}) {
  const lowFreshRatio = Number(options.lowFreshRatio ?? DEFAULT_LOW_FRESH_RATIO);
  const freshRows = Array.isArray(freshCourses) ? freshCourses : [];
  const previousRows = Array.isArray(previousCourses) ? previousCourses : [];
  const failedSubjects = Array.isArray(failureReport.failedSubjects) ? failureReport.failedSubjects : [];
  const failedCourses = Array.isArray(failureReport.failedCourses) ? failureReport.failedCourses : [];
  const hasFailureReportRows = failedSubjects.length > 0 || failedCourses.length > 0;
  const lowFreshCount = previousRows.length >= 500 && freshRows.length < Math.floor(previousRows.length * lowFreshRatio);
  const shouldCarryForward = hasFailureReportRows || lowFreshCount;
  const freshByKey = new Map();
  const duplicateFreshKeys = [];

  for (const course of freshRows) {
    const key = courseKey(course);
    if (!key || key.includes('NaN')) continue;
    if (freshByKey.has(key)) duplicateFreshKeys.push(key);
    freshByKey.set(key, course);
  }

  if (!shouldCarryForward) {
    return {
      courses: freshRows,
      report: {
        merged: false,
        reasons: [],
        freshCourseCount: freshRows.length,
        previousCourseCount: previousRows.length,
        carriedForwardCount: 0,
        duplicateFreshKeys: [...new Set(duplicateFreshKeys)],
      },
    };
  }

  const carriedForward = [];
  for (const previousCourse of previousRows) {
    const key = courseKey(previousCourse);
    if (!key || key.includes('NaN') || freshByKey.has(key)) continue;
    carriedForward.push(previousCourse);
  }

  const reasons = [];
  if (hasFailureReportRows) reasons.push('scrape-failure-report');
  if (lowFreshCount) reasons.push('low-fresh-course-count');

  return {
    courses: [...freshRows, ...carriedForward],
    report: {
      merged: carriedForward.length > 0,
      reasons,
      freshCourseCount: freshRows.length,
      previousCourseCount: previousRows.length,
      mergedCourseCount: freshRows.length + carriedForward.length,
      carriedForwardCount: carriedForward.length,
      failedSubjectCount: failedSubjects.length,
      failedCourseCount: failedCourses.length,
      duplicateFreshKeys: [...new Set(duplicateFreshKeys)],
      carriedForwardCourses: carriedForward.map((course) => ({
        key: courseKey(course),
        facultyPrefix: course.facultyPrefix || '',
        dept: course.dept || '',
        code: course.code || '',
        credit: Number(course.credit),
        title: course.title || '',
      })),
    },
  };
}

export async function mergeFreshCoursesWithArchive(freshCourses, options) {
  const {
    archiveDir,
    termAndYear,
    failureReportPath,
    outputReportPath,
    lowFreshRatio,
    archiveBaseRatio,
  } = options || {};

  if (!archiveDir || !termAndYear) {
    const report = {
      generatedAt: new Date().toISOString(),
      merged: false,
      reasons: [],
      freshCourseCount: Array.isArray(freshCourses) ? freshCourses.length : 0,
      previousCourseCount: 0,
      carriedForwardCount: 0,
      skippedReason: 'missing-archive-dir-or-term',
    };
    await writeReport(outputReportPath, report);
    return {
      courses: freshCourses,
      report,
    };
  }

  const [archive, failureReport] = await Promise.all([
    newestStableArchive(archiveDir, termAndYear, { baseRatio: archiveBaseRatio }),
    failureReportPath ? loadScrapeFailureReport(failureReportPath) : {
      exists: false,
      failedSubjects: [],
      failedCourses: [],
    },
  ]);

  if (!archive) {
    const report = {
      generatedAt: new Date().toISOString(),
      termAndYear,
      merged: false,
      reasons: [],
      freshCourseCount: Array.isArray(freshCourses) ? freshCourses.length : 0,
      previousCourseCount: 0,
      carriedForwardCount: 0,
      skippedReason: 'no-previous-archive',
    };
    await writeReport(outputReportPath, report);
    return {
      courses: freshCourses,
      report,
    };
  }

  const result = mergeWithPreviousCourses(freshCourses, archive.courses, failureReport, { lowFreshRatio });
  const report = {
    ...result.report,
    generatedAt: new Date().toISOString(),
    termAndYear,
    previousArchive: archive.filePath,
    previousArchiveCourseCount: archive.count,
    scrapeFailureReport: failureReportPath || null,
    scrapeFailureReportExists: failureReport.exists === true,
    scrapeFailureReportGeneratedAt: failureReport.generatedAt || null,
  };

  await writeReport(outputReportPath, report);

  return {
    courses: result.courses,
    report,
  };
}
