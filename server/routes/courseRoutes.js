import express from "express";
import { getAllCourse, getCourseId } from "../controllers/courseController.js";

const courseRouter = express.Router();

// Add CORS headers directly to the route
courseRouter.get(
  "/",
  (req, res, next) => {
    // Set permissive CORS headers
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Max-Age", "86400");
    next();
  },
  getAllCourse
);

// Same for the /all route
courseRouter.get(
  "/all",
  (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Max-Age", "86400");
    next();
  },
  getAllCourse
);

// Add CORS headers for the course by ID route
courseRouter.get(
  "/:id",
  (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Max-Age", "86400");
    next();
  },
  getCourseId
);

// Add OPTIONS handler for preflight requests
courseRouter.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Max-Age", "86400");
  res.status(200).end();
});

export default courseRouter;
