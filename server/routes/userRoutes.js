import express from "express";
import {
  getUserData,
  purchaseCourse,
  userEnrolledCourses,
  unenrollFromCourse,
  checkEnrollmentStatus,
} from "../controllers/userController.js";

const userRouter = express.Router();

userRouter.get("/data", getUserData);
userRouter.get("/enrolled-courses", userEnrolledCourses);
userRouter.post("/purchase", purchaseCourse);
userRouter.post("/unenroll", unenrollFromCourse);
userRouter.get("/enrollment-status/:courseId", checkEnrollmentStatus);

// userRouter.post('/update-course-progress', updateUserCourseProgress)
// userRouter.post('/get-course-progress', getUserCourseProgress)
// userRouter.post('/add-rating', addUserRating)

export default userRouter;
