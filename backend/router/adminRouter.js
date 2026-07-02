import express from 'express';
import * as db from '../database/dbJsonCourses.js';
import fs from 'fs/promises';
import path from 'path';
import { STEP13_FILE, STEP15_HIDE_FILE } from '../utils/paths.js';

const adminRouter = express.Router();

const STEP13_NOTES = [
  'Add courses here only after you have manually reviewed them.',
  'Step 13 removes all prerequisite rows for each listed course.',
  'Each course must match the Course unique key: faculty + deptAcronym + courseCode + credit.',
];

const STEP15_NOTES = [
  'Add courses here only after manual review.',
  'The static frontend export will never show courses listed here, even if the parser finds no prerequisite rows.',
  'Use this for courses that are restricted, program-only, permission-only, or missed by prerequisite/restriction parsing.',
  'Each course must match the course key: faculty + deptAcronym + courseCode + credit.',
];

function normalizeText(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeCredit(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : String(value || '').trim();
}

function normalizeCourseEntry(entry = {}) {
  return {
    ...entry,
    faculty: normalizeText(entry.faculty),
    deptAcronym: normalizeText(entry.deptAcronym),
    courseCode: normalizeText(entry.courseCode),
    credit: normalizeCredit(entry.credit),
  };
}

function courseKey(entry = {}) {
  const normalized = normalizeCourseEntry(entry);
  return `${normalized.faculty}/${normalized.deptAcronym} ${normalized.courseCode} (${normalized.credit})`;
}

function courseMatches(a = {}, b = {}) {
  return courseKey(a) === courseKey(b);
}

async function readManualCourseFile(filePath, defaultNotes) {
  try {
    const parsed = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    return {
      notes: Array.isArray(parsed.notes) ? parsed.notes : defaultNotes,
      courses: Array.isArray(parsed.courses) ? parsed.courses.map(normalizeCourseEntry) : [],
    };
  } catch (err) {
    if (err?.code !== 'ENOENT') throw err;
    return { notes: defaultNotes, courses: [] };
  }
}

async function writeManualCourseFile(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const courses = (payload.courses || [])
    .map(normalizeCourseEntry)
    .sort((a, b) => courseKey(a).localeCompare(courseKey(b), undefined, { numeric: true }));
  await fs.writeFile(
    filePath,
    `${JSON.stringify({ notes: payload.notes || [], courses }, null, 2)}\n`,
    'utf-8'
  );
}

async function appendCourseToManualFile(filePath, defaultNotes, course, reason) {
  const payload = await readManualCourseFile(filePath, defaultNotes);
  const normalizedCourse = normalizeCourseEntry(course);
  const existing = payload.courses.find((item) => courseMatches(item, normalizedCourse));
  if (existing) return { added: false, course: existing, payload };

  payload.courses.push({
    ...normalizedCourse,
    reason: String(reason || '').trim() || 'Added from admin UI. Fill in reason after manual review.',
    courseDescription: course.desc || course.courseDescription || '',
  });
  await writeManualCourseFile(filePath, payload);
  return { added: true, course: normalizedCourse, payload };
}

async function removeCourseFromManualFile(filePath, defaultNotes, key) {
  const payload = await readManualCourseFile(filePath, defaultNotes);
  const before = payload.courses.length;
  payload.courses = payload.courses.filter((course) => courseKey(course) !== key);
  if (payload.courses.length !== before) {
    await writeManualCourseFile(filePath, payload);
  }
  return before - payload.courses.length;
}

function courseFromManualForm(body = {}) {
  return normalizeCourseEntry({
    faculty: body.faculty,
    deptAcronym: body.deptAcronym,
    courseCode: body.courseCode,
    credit: body.credit,
    reason: body.reason,
    courseDescription: body.courseDescription,
  });
}

function validateManualCourse(course) {
  if (!course.faculty || !course.deptAcronym || !course.courseCode || course.credit === '') {
    return 'Faculty, department, course code, and credit are required.';
  }
  return null;
}

// Search page (EJS) - client-side will call /courses/search
adminRouter.get('/', async (req, res) => {
  try {
    const filterOptions = await db.getCourseSearchFilterOptionsDb();
    res.render('admin_search', { title: 'Course Admin - Search', filterOptions });
  } catch (err) {
    console.error('Failed loading admin search filters:', err);
    res.render('admin_search', {
      title: 'Course Admin - Search',
      filterOptions: {
        depts: [],
        faculties: [],
        years: [],
        credits: [],
        languages: [],
        terms: [],
        types: [],
      },
    });
  }
});

adminRouter.get('/manual-lists', async (req, res) => {
  try {
    const [step13, step15] = await Promise.all([
      readManualCourseFile(STEP13_FILE, STEP13_NOTES),
      readManualCourseFile(STEP15_HIDE_FILE, STEP15_NOTES),
    ]);

    res.render('admin_manual_lists', {
      title: 'Manual Course Lists',
      step13Courses: step13.courses.map((course) => ({ ...course, key: courseKey(course) })),
      step15Courses: step15.courses.map((course) => ({ ...course, key: courseKey(course) })),
      message: typeof req.query.message === 'string' ? req.query.message : '',
      error: typeof req.query.error === 'string' ? req.query.error : '',
    });
  } catch (err) {
    console.error('Failed loading manual course lists:', err);
    res.status(500).send('Failed to load manual lists');
  }
});

adminRouter.post('/manual-lists/hidden/add', async (req, res) => {
  try {
    const course = courseFromManualForm(req.body);
    const validationError = validateManualCourse(course);
    if (validationError) {
      return res.redirect(`/admin/manual-lists?error=${encodeURIComponent(validationError)}`);
    }

    const result = await appendCourseToManualFile(
      STEP15_HIDE_FILE,
      STEP15_NOTES,
      {
        ...course,
        desc: req.body.courseDescription || '',
        reason: req.body.reason || '',
      },
      req.body.reason
    );

    const message = result.added
      ? `${courseKey(course)} added to Step15 hide list. Run export or the full pipeline to refresh the frontend JSON.`
      : `${courseKey(course)} is already in the Step15 hide list.`;
    return res.redirect(`/admin/manual-lists?message=${encodeURIComponent(message)}`);
  } catch (err) {
    console.error('Failed adding hidden course:', err);
    return res.redirect('/admin/manual-lists?error=Failed%20to%20add%20course');
  }
});

adminRouter.post('/manual-lists/hidden/remove', async (req, res) => {
  try {
    const key = String(req.body.key || '').trim();
    if (!key) return res.redirect('/admin/manual-lists?error=Missing%20course%20key');
    const removed = await removeCourseFromManualFile(STEP15_HIDE_FILE, STEP15_NOTES, key);
    const message = removed
      ? `${key} removed from Step15 hide list. Run export or the full pipeline to refresh the frontend JSON.`
      : `${key} was not in the Step15 hide list.`;
    return res.redirect(`/admin/manual-lists?message=${encodeURIComponent(message)}`);
  } catch (err) {
    console.error('Failed removing hidden course:', err);
    return res.redirect('/admin/manual-lists?error=Failed%20to%20remove%20course');
  }
});

// Course detail page - server-side fetch and render
adminRouter.get('/course/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const course = await db.getCourseFromIdDB(id);
    if (!course) return res.status(404).send('Course not found');

    let isInNoRealPrereqList = false;
    let isInHiddenList = false;
    try {
      const [step13, step15] = await Promise.all([
        readManualCourseFile(STEP13_FILE, STEP13_NOTES),
        readManualCourseFile(STEP15_HIDE_FILE, STEP15_NOTES),
      ]);
      isInNoRealPrereqList = step13.courses.some((c) => courseMatches(c, course));
      isInHiddenList = step15.courses.some((c) => courseMatches(c, course));
    } catch (err) {
      console.warn('Could not check manual list membership:', err?.message || err);
    }

    const returnToRaw = typeof req.query.returnTo === 'string' ? req.query.returnTo : '';
    const returnTo = returnToRaw.startsWith('/admin') ? returnToRaw : '/admin';
    res.render('admin_course', {
      title: `Course ${course.deptAcronym} ${course.courseCode}`,
      course,
      returnTo,
      isInNoRealPrereqList,
      isInHiddenList,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Update course via form POST (HTML forms don't support PUT reliably)
adminRouter.post('/course/:id/update', express.urlencoded({ extended: true }), async (req, res) => {
  const id = parseInt(req.params.id);
  const payload = {
    faculty: req.body.faculty,
    deptAcronym: req.body.deptAcronym,
    courseCode: req.body.courseCode,
    credit: req.body.credit ? parseFloat(req.body.credit) : undefined,
    name: req.body.name,
    desc: req.body.desc,
    language: req.body.language,
    year: req.body.year ? parseInt(req.body.year) : undefined,
  };
  try {
    await db.updateCourseDB(id, payload);
    res.redirect(`/admin/course/${id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to update');
  }
});

// Delete course via form POST
adminRouter.post('/course/:id/delete', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await db.deleteCourseDB(id);
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to delete');
  }
});

// Append course to step13 "coursesWithoutRealPrereqs" list for manual review workflow
adminRouter.post('/course/:id/add-no-real-prereq', async (req, res) => {
  const id = parseInt(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ msg: 'Invalid course id' });
  }

  try {
    const course = await db.getCourseFromIdDB(id);
    if (!course) return res.status(404).json({ msg: 'Course not found' });

    const result = await appendCourseToManualFile(STEP13_FILE, STEP13_NOTES, course, req.body?.reason);
    return res.status(result.added ? 201 : 200).json({
      msg: result.added
        ? 'Course appended to step13 list. Run export or the full pipeline to refresh the frontend JSON.'
        : 'Course already in step13 list.',
      added: result.added,
    });
  } catch (err) {
    console.error('Failed appending course to step13 file:', err);
    return res.status(500).json({ msg: 'Failed to append course to file' });
  }
});

adminRouter.post('/course/:id/hide-from-frontend', async (req, res) => {
  const id = parseInt(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ msg: 'Invalid course id' });
  }

  try {
    const course = await db.getCourseFromIdDB(id);
    if (!course) return res.status(404).json({ msg: 'Course not found' });

    const result = await appendCourseToManualFile(STEP15_HIDE_FILE, STEP15_NOTES, course, req.body?.reason);
    return res.status(result.added ? 201 : 200).json({
      msg: result.added
        ? 'Course appended to step15 hide list. Run export or the full pipeline to refresh the frontend JSON.'
        : 'Course already in step15 hide list.',
      added: result.added,
    });
  } catch (err) {
    console.error('Failed appending course to step15 file:', err);
    return res.status(500).json({ msg: 'Failed to append course to hide list' });
  }
});

adminRouter.post('/course/:id/remove-hidden', async (req, res) => {
  const id = parseInt(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ msg: 'Invalid course id' });
  }

  try {
    const course = await db.getCourseFromIdDB(id);
    if (!course) return res.status(404).json({ msg: 'Course not found' });
    const removed = await removeCourseFromManualFile(STEP15_HIDE_FILE, STEP15_NOTES, courseKey(course));
    return res.status(200).json({
      msg: removed
        ? 'Course removed from step15 hide list. Run export or the full pipeline to refresh the frontend JSON.'
        : 'Course was not in step15 hide list.',
      removed,
    });
  } catch (err) {
    console.error('Failed removing course from step15 file:', err);
    return res.status(500).json({ msg: 'Failed to remove course from hide list' });
  }
});

export default adminRouter;
