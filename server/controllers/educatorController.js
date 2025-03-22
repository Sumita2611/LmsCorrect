import { clerkClient } from "@clerk/express";
import Course from "../models/Course.js";
import { v2 as cloudinary } from "cloudinary";
import { Purchase } from "../models/Purchase.js";
import User from "../models/User.js";

// update role to educator
export const updateRoleToEducator = async (req, res) => {
  try {
    const userId = req.auth.userId;

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: "educator",
      },
    });

    res.json({ success: true, message: "You can publish a course now" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

//Add new course
export const addCourse = async (req, res) => {
  try {
    console.log("Adding new course request received");
    const { courseData } = req.body;
    const imageFile = req.file;
    const educatorId = req.auth.userId;

    if (!imageFile) {
      console.error("No thumbnail image provided");
      return res
        .status(400)
        .json({ success: false, message: "Thumbnail Not Attached" });
    }

    if (!courseData) {
      console.error("No course data provided");
      return res
        .status(400)
        .json({ success: false, message: "Course data is required" });
    }

    console.log("Parsing course data...");
    let parsedCourseData;
    try {
      parsedCourseData = JSON.parse(courseData);
    } catch (error) {
      console.error("Error parsing course data:", error);
      return res
        .status(400)
        .json({ success: false, message: "Invalid course data format" });
    }

    // Add educator ID to course data
    parsedCourseData.educator = educatorId;

    // Ensure required fields are present
    if (!parsedCourseData.courseTitle) {
      return res
        .status(400)
        .json({ success: false, message: "Course title is required" });
    }

    if (
      !parsedCourseData.courseContent ||
      !Array.isArray(parsedCourseData.courseContent) ||
      parsedCourseData.courseContent.length === 0
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Course content is required" });
    }

    console.log("Uploading thumbnail to Cloudinary...");
    try {
      const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
        folder: "course_thumbnails",
        resource_type: "image",
      });

      // Add the thumbnail URL to the course data
      parsedCourseData.courseThumbnail = imageUpload.secure_url;

      console.log("Creating course in database...");
      // Create course with specific writeConcern to avoid the error
      const newCourse = new Course(parsedCourseData);
      await newCourse.save({ writeConcern: { w: 1 } });

      console.log("Course created successfully:", newCourse._id);
      return res.status(201).json({
        success: true,
        message: "Course Added Successfully",
        courseId: newCourse._id,
      });
    } catch (uploadError) {
      console.error("Error processing course:", uploadError);
      return res
        .status(500)
        .json({ success: false, message: uploadError.message });
    }
  } catch (error) {
    console.error("Error adding course:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//Get Educator Courses
export const getEducatorCourses = async (req, res) => {
  try {
    const educator = req.auth.userId;
    console.log(
      `========== Fetching courses for educator: ${educator} ==========`
    );

    // Add more detailed logging
    console.log("Querying database for educator courses...");

    // Try to find any courses with this educator ID
    const courses = await Course.find({ educator })
      .sort({ createdAt: -1 }) // Sort by newest first
      .lean();

    console.log(`Found ${courses.length} courses for educator ${educator}`);

    // Log each course for debugging
    if (courses.length > 0) {
      courses.forEach((course, index) => {
        console.log(
          `Course ${index + 1}: ${course.courseTitle}, ID: ${
            course._id
          }, Published: ${course.isPublished}`
        );
      });

      return res.status(200).json({
        success: true,
        courses,
        source: "database",
      });
    } else {
      console.warn(
        `No courses found for educator ${educator}. This could be normal if they haven't created any courses yet.`
      );

      // Return empty array
      return res.status(200).json({
        success: true,
        courses: [],
        message: "No courses found for this educator",
        source: "database-empty",
      });
    }
  } catch (error) {
    console.error(`Error getting educator courses: ${error.message}`);
    console.error("Error stack:", error.stack);

    // Return empty array instead of error
    return res.status(200).json({
      success: true,
      courses: [],
      message: "Error fetching courses, using empty array",
      error: error.message,
      source: "error-fallback",
    });
  }
};

//Get educator dashboard data (Total earning, enrolled students, no.of courses)

export const educatorDashboardData = async (req, res) => {
  try {
    const educator = req.auth.userId;
    const courses = await Course.find({ educator });
    const totalCourses = courses.length;

    const courseIds = courses.map((course) => course._id);

    //calculate total earnings from purchases
    const purchases = await Purchase.find({
      courseId: { $in: courseIds },
      status: "completed",
    });

    const totalEarnings = purchases.reduce(
      (sum, purchase) => sum + purchase.amount,
      0
    );

    // Collect unique enrolled student IDs with their course titles
    const enrolledStudentsData = [];
    for (const course of courses) {
      const students = await User.find(
        {
          _id: { $in: course.enrolledStudents },
        },
        "name imageUrl"
      );

      students.forEach((student) => {
        enrolledStudentsData.push({
          courseTitle: course.courseTitle,
          student,
        });
      });
    }

    res.json({
      success: true,
      dashboardData: {
        totalEarnings,
        enrolledStudentsData,
        totalCourses,
      },
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

//Get Enrolled Students Data with Purchase Data
export const getEnrolledStudentsData = async (req, res) => {
  try {
    const educator = req.auth.userId;
    const courses = await Course.find({ educator });
    const courseIds = courses.map((course) => course._id);

    const purchases = await Purchase.find({
      courseId: { $in: courseIds },
      status: "completed",
    })
      .populate("userId", "name imageUrl")
      .populate("courseId", "courseTitle");

    const enrolledStudents = purchases.map((purchase) => ({
      student: purchase.userId,
      courseTitle: purchase.courseId.courseTitle,
      purchaseDate: purchase.createdAt,
    }));

    res.json({
      success: true,
      enrolledStudents,
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};

// Delete a course
export const deleteCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const educatorId = req.auth.userId;

    console.log(
      `Attempting to delete course ${courseId} by educator ${educatorId}`
    );

    // Find the course and check if it belongs to the educator
    const course = await Course.findById(courseId);

    if (!course) {
      console.log(`Course ${courseId} not found`);
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Convert educator ID to string for comparison
    if (course.educator.toString() !== educatorId) {
      console.log(
        `Unauthorized deletion attempt: Course belongs to ${course.educator}, not ${educatorId}`
      );
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this course",
      });
    }

    // Check if there are enrolled students
    if (course.enrolledStudents && course.enrolledStudents.length > 0) {
      console.log(
        `Cannot delete course with ${course.enrolledStudents.length} enrolled students`
      );
      return res.status(400).json({
        success: false,
        message: "Cannot delete a course with enrolled students",
      });
    }

    // Delete the course
    await Course.findByIdAndDelete(courseId);
    console.log(`Course ${courseId} deleted successfully`);

    // If the course has a thumbnail, delete it from Cloudinary
    if (
      course.courseThumbnail &&
      course.courseThumbnail.includes("cloudinary")
    ) {
      try {
        // Extract public_id from the URL
        const urlParts = course.courseThumbnail.split("/");
        const filenameWithExtension = urlParts[urlParts.length - 1];
        const publicId = `course_thumbnails/${
          filenameWithExtension.split(".")[0]
        }`;

        await cloudinary.uploader.destroy(publicId);
        console.log(`Deleted thumbnail from Cloudinary: ${publicId}`);
      } catch (cloudinaryError) {
        console.error(
          "Error deleting thumbnail from Cloudinary:",
          cloudinaryError
        );
        // Continue with the response even if cloudinary deletion fails
      }
    }

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting course:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete course",
    });
  }
};
