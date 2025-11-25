import express from 'express';
import * as db from '../database/dbPrismaCourses.js';

const adminRouter = express.Router();

// Search page (EJS) - client-side will call /courses/search
adminRouter.get('/', (req, res) => {
  res.render('admin_search', { title: 'Course Admin - Search' });
});

// Course detail page - server-side fetch and render
adminRouter.get('/course/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const course = await db.getCourseFromIdDB(id);
    if (!course) return res.status(404).send('Course not found');
    res.render('admin_course', { title: `Course ${course.deptAcronym} ${course.courseCode}`, course });
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

export default adminRouter;
