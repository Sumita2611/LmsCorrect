import express from "express";
import {
  addCourse,
  deleteCourse,
  educatorDashboardData,
  getEducatorCourses,
  getEnrolledStudentsData,
  updateRoleToEducator,
} from "../controllers/educatorController.js";
import upload from "../configs/multer.js";
import { protectEducator } from "../middlewares/authMiddleware.js";
import { clerkClient } from "@clerk/clerk-sdk-node";

const educatorRouter = express.Router();

//Add Educator Role
educatorRouter.get("/update-role", updateRoleToEducator);
educatorRouter.post(
  "/add-course",
  upload.single("image"),
  protectEducator,
  addCourse
);

// Explicit CORS preflight handler for the courses endpoint
educatorRouter.options("/courses", (req, res) => {
  res.status(200).end();
});

// Use the actual controller function for fetching educator courses
educatorRouter.get("/courses", protectEducator, getEducatorCourses);

educatorRouter.delete("/courses/:id", protectEducator, deleteCourse);
educatorRouter.get("/dashboard", protectEducator, educatorDashboardData);
educatorRouter.get(
  "/enrolled-students",
  protectEducator,
  getEnrolledStudentsData
);

export default educatorRouter;
