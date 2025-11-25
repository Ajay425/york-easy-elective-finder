import express from 'express';
import * as courseController from '../controllers/courseController.js';

const courseRouter = express.Router();


courseRouter.get("/", courseController.getPopularCourses)

// search endpoint for autocomplete / suggestions
courseRouter.get("/search", courseController.searchCourses)

courseRouter.get("/:id", courseController.getCourseFromParams)

// update a course (partial update allowed)
courseRouter.put("/:id", courseController.updateCourse)

// delete a course and its related offerings/prereqs
courseRouter.delete("/:id", courseController.deleteCourse)

// offerings: create for a course
courseRouter.post('/:id/offering', courseController.createOffering)

// update/delete offering by offering id
courseRouter.put('/offering/:id', courseController.updateOffering)
courseRouter.delete('/offering/:id', courseController.deleteOffering)

// instructor management
courseRouter.post('/instructor', courseController.createInstructor)
courseRouter.put('/instructor/:id', courseController.updateInstructor)
// recompute popularity for an instructor
courseRouter.post('/instructor/:id/popularity', courseController.generateInstructorPopularity)
// fetch instructor info from RateMyProfessor (does not write DB)
courseRouter.get('/instructor/info', courseController.getInstructorInfo)
courseRouter.post('/offering/:id/instructor', courseController.addInstructorToOffering)
courseRouter.delete('/offering/:id/instructor/:instructorId', courseController.removeInstructorFromOffering)
courseRouter.get('/instructors/search', courseController.searchInstructors)




export default courseRouter;