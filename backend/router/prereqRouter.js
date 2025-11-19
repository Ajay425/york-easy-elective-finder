import express from 'express';
import * as prereqController from '../controllers/prereqController.js';

const prereqRouter = express.Router();


// prereqRouter.get("/", courseController.getPopularCourses)

// prereqRouter.get("/:id", courseController.getPreqreq)

prereqRouter.delete("/:id", prereqController.deletePrereq) // deletes a specific pre req for a given course

export default prereqRouter;