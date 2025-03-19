import express from "express";
import { getAllCourse, getCourseId } from "../controllers/courseController.js";

const courseRouter = express.Router();

// Route to get all courses
courseRouter.get("/", getAllCourse);
courseRouter.get("/all", getAllCourse);
courseRouter.get("/:id", getCourseId);

export default courseRouter;
