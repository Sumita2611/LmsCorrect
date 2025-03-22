import mongoose from "mongoose";
import "dotenv/config";
import Course from "../models/Course.js";

// Connect to the database
async function testDB() {
  try {
    console.log("Connecting to MongoDB...");
    console.log("MongoDB URI:", process.env.MONGODB_URI);

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("MongoDB connected successfully!");

    // Check if courses exist
    console.log("Checking for courses...");
    const courses = await Course.find().lean();

    console.log(`Found ${courses.length} courses in the database`);

    if (courses.length > 0) {
      // Print details of each course
      courses.forEach((course, index) => {
        console.log(`\nCourse ${index + 1}: ${course.courseTitle}`);
        console.log(`ID: ${course._id}`);
        console.log(`Educator: ${course.educator}`);
        console.log(`Published: ${course.isPublished}`);
        console.log(`Description: ${course.courseDescription}`);
      });
    } else {
      console.log("No courses found in the database");

      // Create a test course
      console.log("\nCreating a test course...");
      const newCourse = new Course({
        courseTitle: "Test Database Course",
        courseDescription:
          "This is a test course to verify database connectivity",
        coursePrice: 999,
        discount: 10,
        isPublished: true,
        educator: "test-educator-id",
        courseContent: [
          {
            chapterId: "chapter1",
            chapterOrder: 1,
            chapterTitle: "Introduction",
            chapterContent: [
              {
                lectureId: "lecture1",
                lectureTitle: "Welcome",
                lectureDuration: 5,
                lectureUrl: "https://example.com/video.mp4",
                isPreviewFree: true,
                lectureOrder: 1,
              },
            ],
          },
        ],
      });

      try {
        await newCourse.save();
        console.log("Test course created successfully!");
        console.log("Course ID:", newCourse._id);
      } catch (saveError) {
        console.error("Error creating test course:", saveError);
      }
    }
  } catch (error) {
    console.error("Database connection error:", error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log("Database connection closed");
  }
}

// Run the test
testDB();
