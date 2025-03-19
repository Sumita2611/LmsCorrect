import express from "express";
import Stripe from "stripe";
import { Purchase } from "../models/Purchase.js";
import User from "../models/User.js";
import Course from "../models/Course.js";
import { dummyCourses } from "../data/dummyCourses.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

router.post(
  "/webhook",
  express.raw({ type: "application/json" }), // Important for raw request body
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`Received Stripe webhook event: ${event.type}`);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const purchaseId = session.metadata.purchaseId;
      const userId = session.metadata.userId;
      const courseId = session.metadata.courseId;

      console.log(
        `Processing completed checkout session for Purchase ID: ${purchaseId}`
      );
      console.log(`User ID: ${userId}, Course ID: ${courseId}`);

      try {
        // Update the purchase status in MongoDB
        await Purchase.findByIdAndUpdate(purchaseId, {
          status: "completed",
          completedAt: new Date(),
        });

        // Add the course to the user's enrolled courses
        const userData = await User.findById(userId);
        if (!userData) {
          console.error(`User ${userId} not found`);
          return res.status(400).json({
            received: true,
            error: "User not found",
          });
        }

        // Add course to user's enrolled courses if not already enrolled
        const courseAlreadyEnrolled = userData.enrolledCourses.some(
          (id) => id.toString() === courseId.toString()
        );

        if (!courseAlreadyEnrolled) {
          console.log(`Adding course ${courseId} to user's enrolled courses`);
          userData.enrolledCourses.push(courseId);
          await userData.save();
        }

        // Add user to course's enrolled students
        const courseData = await Course.findById(courseId);
        if (!courseData) {
          console.error(`Course ${courseId} not found`);
          return res.status(400).json({
            received: true,
            error: "Course not found",
          });
        }

        // Add user to course's enrolled students if not already enrolled
        const userAlreadyInCourse = courseData.enrolledStudents.some(
          (id) => id.toString() === userId.toString()
        );

        if (!userAlreadyInCourse) {
          console.log(`Adding user ${userId} to course's enrolled students`);
          courseData.enrolledStudents.push(userId);
          await courseData.save();
        }

        console.log(
          `Successfully enrolled user ${userId} in course ${courseId}`
        );
      } catch (error) {
        console.error(`Error processing webhook: ${error.message}`);
        return res.status(500).json({
          received: true,
          error: error.message,
        });
      }
    }

    res.json({ received: true });
  }
);

// Route to manually create users and courses for testing
router.post("/create-test-data", async (req, res) => {
  try {
    console.log("Creating test data for database");

    // Create courses
    const courseResults = [];

    for (const courseData of dummyCourses) {
      try {
        // Check if course already exists
        const existingCourse = await Course.findById(courseData._id);

        if (existingCourse) {
          courseResults.push({
            _id: courseData._id,
            status: "already exists",
          });
        } else {
          // Fix the educator field before creating
          const fixedCourseData = {
            ...courseData,
            educator: courseData.educator.value || "675ac1512100b91a6d9b8b24",
          };

          const newCourse = await Course.create(fixedCourseData);
          courseResults.push({
            _id: newCourse._id,
            status: "created",
          });
        }
      } catch (error) {
        console.error(`Error creating course ${courseData._id}:`, error);
        courseResults.push({
          _id: courseData._id,
          status: "error",
          message: error.message,
        });
      }
    }

    // Create a default educator if it doesn't exist
    let educatorResult = {};
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
        educatorResult = {
          _id: educatorData._id,
          status: "already exists",
        };
      } else {
        const newEducator = await User.create(educatorData);
        educatorResult = {
          _id: newEducator._id,
          status: "created",
        };
      }
    } catch (error) {
      console.error("Error creating educator:", error);
      educatorResult = {
        status: "error",
        message: error.message,
      };
    }

    // Sync current user if provided
    const clerkUserId = req.body.userId || "";
    let userResult = null;

    if (clerkUserId) {
      try {
        const existingUser = await User.findById(clerkUserId);

        if (existingUser) {
          userResult = {
            _id: clerkUserId,
            status: "already exists",
          };
        } else {
          const newUser = await User.create({
            _id: clerkUserId,
            name: "User",
            email: "user@example.com",
            imageUrl: "https://ui-avatars.com/api/?name=User",
          });

          userResult = {
            _id: newUser._id,
            status: "created",
          };
        }
      } catch (error) {
        console.error(`Error processing user ${clerkUserId}:`, error);
        userResult = {
          _id: clerkUserId,
          status: "error",
          message: error.message,
        };
      }
    }

    res.json({
      success: true,
      courses: courseResults,
      educator: educatorResult,
      user: userResult,
    });
  } catch (error) {
    console.error("Error in create-test-data endpoint:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
