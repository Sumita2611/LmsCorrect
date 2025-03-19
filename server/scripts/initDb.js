import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import Course from "../models/Course.js";
import { dummyCourses } from "../data/dummyCourses.js";

// Set up environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected!");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// Create educator
const createEducator = async () => {
  try {
    const educatorData = {
      _id: "675ac1512100b91a6d9b8b24",
      name: "GreatStack",
      email: "user.greatstack@gmail.com",
      imageUrl:
        "https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18yclFkaDBOMmFqWnBoTTRBOXZUanZxVlo0aXYifQ",
    };

    const existingEducator = await User.findById(educatorData._id);

    if (existingEducator) {
      console.log("Educator already exists:", educatorData._id);
      return existingEducator;
    } else {
      const newEducator = await User.create(educatorData);
      console.log("Educator created:", newEducator._id);
      return newEducator;
    }
  } catch (error) {
    console.error("Error creating educator:", error);
    throw error;
  }
};

// Create courses
const createCourses = async () => {
  try {
    console.log("Creating courses...");

    for (const courseData of dummyCourses) {
      try {
        // Check if course already exists
        const existingCourse = await Course.findById(courseData._id);

        if (existingCourse) {
          console.log(
            `Course already exists: ${courseData._id} - ${courseData.courseTitle}`
          );
        } else {
          // Fix the educator field before creating
          const fixedCourseData = {
            ...courseData,
            educator: courseData.educator.value || "675ac1512100b91a6d9b8b24",
          };

          const newCourse = await Course.create(fixedCourseData);
          console.log(
            `Course created: ${newCourse._id} - ${newCourse.courseTitle}`
          );
        }
      } catch (error) {
        console.error(`Error creating course ${courseData._id}:`, error);
      }
    }

    console.log("Finished creating courses!");
  } catch (error) {
    console.error("Error creating courses:", error);
    throw error;
  }
};

// Main function
const initDb = async () => {
  try {
    await connectDB();
    await createEducator();
    await createCourses();
    console.log("Database initialization complete!");
    process.exit(0);
  } catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1);
  }
};

// Run the script
initDb();
