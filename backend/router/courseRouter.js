import express from 'express';
import * as courseController from '../controllers/courseController.js';

const courseRouter = express.Router();


courseRouter.get("/", courseController.getPopularCourses)

courseRouter.get("/:id", courseController.getCourseFromParams)




export default courseRouter;