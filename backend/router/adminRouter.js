import express from 'express';
import * as db from '../database/dbJsonCourses.js';
import fs from 'fs/promises';
import { STEP13_FILE } from '../utils/paths.js';

const adminRouter = express.Router();

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

// Course detail page - server-side fetch and render
adminRouter.get('/course/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const course = await db.getCourseFromIdDB(id);
    if (!course) return res.status(404).send('Course not found');

    let isInNoRealPrereqList = false;
    try {
      const raw = await fs.readFile(STEP13_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed.courses) ? parsed.courses : [];
      isInNoRealPrereqList = list.some((c) =>
        c.faculty === course.faculty &&
        c.deptAcronym === course.deptAcronym &&
        c.courseCode === course.courseCode &&
        Number(c.credit) === Number(course.credit)
      );
    } catch (err) {
      console.warn('Could not check step13 list membership:', err?.message || err);
    }

    const returnToRaw = typeof req.query.returnTo === 'string' ? req.query.returnTo : '';
    const returnTo = returnToRaw.startsWith('/admin') ? returnToRaw : '/admin';
    res.render('admin_course', {
      title: `Course ${course.deptAcronym} ${course.courseCode}`,
      course,
      returnTo,
      isInNoRealPrereqList,
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

    // First remove all prerequisite links for this course.
    const deleted = await db.clearCoursePrereqsDB(id);
    const deletedCount = deleted?.count ?? 0;

    const raw = await fs.readFile(STEP13_FILE, 'utf-8');
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed.courses)) parsed.courses = [];

    const alreadyExists = parsed.courses.some((c) =>
      c.faculty === course.faculty &&
      c.deptAcronym === course.deptAcronym &&
      c.courseCode === course.courseCode &&
      Number(c.credit) === Number(course.credit)
    );

    if (alreadyExists) {
      return res.status(200).json({
        msg: `Removed ${deletedCount} prerequisite link(s). Course already in list`,
        added: false,
        deletedPrereqs: deletedCount,
      });
    }

    parsed.courses.push({
      faculty: course.faculty,
      deptAcronym: course.deptAcronym,
      courseCode: course.courseCode,
      credit: course.credit,
      reason: 'Added from admin UI. Fill in reason after manual review.',
      courseDescription: course.desc || '',
    });

    await fs.writeFile(STEP13_FILE, `${JSON.stringify(parsed, null, 2)}\n`, 'utf-8');
    return res.status(201).json({
      msg: `Removed ${deletedCount} prerequisite link(s). Course appended to step13 list`,
      added: true,
      deletedPrereqs: deletedCount,
    });
  } catch (err) {
    console.error('Failed appending course to step13 file:', err);
    return res.status(500).json({ msg: 'Failed to append course to file' });
  }
});

export default adminRouter;
