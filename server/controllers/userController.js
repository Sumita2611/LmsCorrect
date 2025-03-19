import Course from "../models/Course.js";
import User from "../models/User.js";
import { Purchase } from "../models/Purchase.js";

import Stripe from "stripe";

//Get user data
export const getUserData = async (req, res) => {
  try {
    const userId = req.auth.userId;
    console.log("Fetching data for user:", userId);

    // Create user if it doesn't exist yet (useful for development)
    let user = await User.findById(userId);

    if (!user) {
      console.log("User not found in database, creating new user");
      user = await User.create({
        _id: userId,
        name: "User",
        email: "user@example.com",
        imageUrl: "https://ui-avatars.com/api/?name=User",
      });
      console.log("Created new user:", user._id);
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//User Enrolled Course with lecture Links
export const userEnrolledCourses = async (req, res) => {
  try {
    const userId = req.auth.userId;
    console.log(`Fetching enrolled courses for user: ${userId}`);

    const userData = await User.findById(userId);

    if (!userData) {
      console.log(`User ${userId} not found`);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!userData.enrolledCourses || userData.enrolledCourses.length === 0) {
      console.log(`User ${userId} has no enrolled courses`);
      return res.json({
        success: true,
        enrolledCourses: [],
      });
    }

    console.log(
      `User has ${userData.enrolledCourses.length} enrolled courses. Populating course data...`
    );

    // Make sure enrolledCourses is an array of valid ObjectIds
    const validCourseIds = userData.enrolledCourses.filter(
      (id) => id && id.toString()
    );
    console.log(`Found ${validCourseIds.length} valid course IDs`);

    try {
      // Use populate with a detailed path to ensure we get all course data
      const populatedUser = await User.findById(userId)
        .populate({
          path: "enrolledCourses",
          populate: {
            path: "educator",
            select: "name imageUrl",
          },
        })
        .lean(); // Use lean for better performance

      console.log(
        `Successfully fetched and populated ${
          populatedUser.enrolledCourses
            ? populatedUser.enrolledCourses.length
            : 0
        } courses`
      );

      // Check for any null values in populated courses
      const validCourses = populatedUser.enrolledCourses.filter(
        (course) => course !== null
      );

      if (validCourses.length < validCourseIds.length) {
        console.warn(
          `Some courses (${
            validCourseIds.length - validCourses.length
          }) could not be populated properly`
        );

        // Get the courses directly as a backup method
        const directCourses = await Course.find({
          _id: { $in: validCourseIds },
        })
          .populate({
            path: "educator",
            select: "name imageUrl",
          })
          .lean();

        console.log(`Found ${directCourses.length} courses with direct query`);

        return res.json({
          success: true,
          enrolledCourses:
            directCourses.length > 0 ? directCourses : validCourses,
        });
      }

      return res.json({
        success: true,
        enrolledCourses: validCourses,
      });
    } catch (populateError) {
      console.error(`Error during population: ${populateError.message}`);

      // Fallback to direct course lookup
      try {
        const directCourses = await Course.find({
          _id: { $in: validCourseIds },
        })
          .populate({
            path: "educator",
            select: "name imageUrl",
          })
          .lean();

        console.log(
          `Found ${directCourses.length} courses with fallback query`
        );

        return res.json({
          success: true,
          enrolledCourses: directCourses,
        });
      } catch (fallbackError) {
        console.error(`Fallback query failed: ${fallbackError.message}`);
        throw fallbackError;
      }
    }
  } catch (error) {
    console.error(`Error fetching enrolled courses: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Purchase Course
export const purchaseCourse = async (req, res) => {
  try {
    console.log("Purchase request received:", req.body);
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course ID is required",
      });
    }

    const { origin } = req.headers;
    const userId = req.auth.userId;

    console.log("User ID from auth:", userId);

    // Create user if not exists (for development)
    let userData = await User.findById(userId);
    if (!userData) {
      console.log("User not found, creating new user");
      userData = await User.create({
        _id: userId,
        name: "User",
        email: "user@example.com",
        imageUrl: "https://ui-avatars.com/api/?name=User",
      });
    }

    const courseData = await Course.findById(courseId);

    console.log("User found:", !!userData);
    console.log("Course found:", !!courseData);

    if (!courseData) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Use string comparison to check enrollment properly
    const isEnrolled = userData.enrolledCourses.some(
      (id) => id.toString() === courseId.toString()
    );

    // Check if user is already enrolled in this course
    if (isEnrolled) {
      console.log(`User ${userId} is already enrolled in course ${courseId}`);
      return res.status(400).json({
        success: false,
        message: "You are already enrolled in this course",
      });
    }

    const purchaseData = {
      courseId: courseData._id,
      userId,
      amount: (
        courseData.coursePrice -
        (courseData.discount * courseData.coursePrice) / 100
      ).toFixed(2),
    };

    console.log("Creating purchase with data:", purchaseData);

    const newPurchase = await Purchase.create(purchaseData);
    console.log("Purchase created:", newPurchase._id);

    // Bypass payment in development mode if SKIP_PAYMENT=true
    if (
      process.env.NODE_ENV === "development" &&
      process.env.SKIP_PAYMENT === "true"
    ) {
      console.log("Skipping payment in development mode");

      try {
        // Add course to user's enrolled courses if not already enrolled
        if (
          !userData.enrolledCourses.some(
            (id) => id.toString() === courseId.toString()
          )
        ) {
          console.log(`Adding course ${courseId} to user's enrolled courses`);
          userData.enrolledCourses.push(courseData._id);
          await userData.save();
        }

        // Add user to course's enrolled students if not already enrolled
        if (
          !courseData.enrolledStudents.some(
            (id) => id.toString() === userId.toString()
          )
        ) {
          console.log(`Adding user ${userId} to course's enrolled students`);
          courseData.enrolledStudents.push(userId);
          await courseData.save();
        }

        // Update purchase status
        newPurchase.status = "completed";
        newPurchase.completedAt = new Date();
        await newPurchase.save();

        console.log(
          `Development mode enrollment complete for user ${userId} in course ${courseId}`
        );
      } catch (error) {
        console.error("Error during development mode enrollment:", error);
        return res.status(500).json({
          success: false,
          message: "Error during enrollment: " + error.message,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Enrollment successful",
        redirectUrl: "/loading/my-enrollments",
      });
    }

    //Stripe Gateway Initialize
    const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

    if (!process.env.CURRENCY) {
      console.error("CURRENCY environment variable is not set");
      return res.status(500).json({
        success: false,
        message: "Payment configuration error",
      });
    }

    const currency = process.env.CURRENCY.toLowerCase();
    console.log("Using currency:", currency);

    //Creating line items to for Stripe
    const line_items = [
      {
        price_data: {
          currency,
          product_data: {
            name: courseData.courseTitle,
            description: `Enrollment for course: ${courseData.courseTitle}`,
            images: [courseData.courseThumbnail],
          },
          unit_amount: Math.floor(newPurchase.amount) * 100,
        },
        quantity: 1,
      },
    ];

    // Add a timestamp to prevent caching issues
    const timestamp = new Date().getTime();

    console.log("Creating Stripe checkout session");
    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${origin}/loading/my-enrollments?t=${timestamp}`,
      cancel_url: `${origin}/course/${courseId}`,
      line_items: line_items,
      mode: "payment",
      metadata: {
        purchaseId: newPurchase._id.toString(),
        userId: userId,
        courseId: courseId,
        courseTitle: courseData.courseTitle,
        timestamp: timestamp.toString(),
      },
    });

    console.log("Stripe session created, returning URL");
    return res.status(200).json({
      success: true,
      session_url: session.url,
    });
  } catch (error) {
    console.error("Purchase error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Check enrollment status for a specific course
export const checkEnrollmentStatus = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { courseId } = req.params;

    console.log(
      `Checking enrollment status for user ${userId}, course ${courseId}`
    );

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course ID is required",
      });
    }

    // Get user data
    const userData = await User.findById(userId);
    if (!userData) {
      console.log(`User ${userId} not found`);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is enrolled in this course
    const isEnrolled = userData.enrolledCourses.some(
      (id) => id.toString() === courseId.toString()
    );

    console.log(
      `User ${userId} enrollment status for course ${courseId}: ${
        isEnrolled ? "Enrolled" : "Not enrolled"
      }`
    );

    // Check purchase status if not enrolled
    if (!isEnrolled) {
      const purchase = await Purchase.findOne({
        userId,
        courseId,
        status: { $in: ["pending", "processing"] },
      });

      const isPending = !!purchase;
      console.log(
        `Purchase status for course ${courseId}: ${
          isPending ? purchase.status : "No pending purchase"
        }`
      );

      return res.json({
        success: true,
        isEnrolled,
        isPending,
      });
    }

    return res.json({
      success: true,
      isEnrolled,
    });
  } catch (error) {
    console.error(`Error checking enrollment status: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Unenroll from a course
export const unenrollFromCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.auth.userId;

    console.log(
      `User ${userId} requesting to unenroll from course ${courseId}`
    );

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course ID is required",
      });
    }

    // Find the user and course
    const user = await User.findById(userId);
    const course = await Course.findById(courseId);

    if (!user) {
      console.log(`User ${userId} not found`);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!course) {
      console.log(`Course ${courseId} not found`);
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if the user is enrolled in this course
    const isEnrolled = user.enrolledCourses.some(
      (id) => id.toString() === courseId
    );
    if (!isEnrolled) {
      console.log(`User ${userId} is not enrolled in course ${courseId}`);
      return res.status(400).json({
        success: false,
        message: "You are not enrolled in this course",
      });
    }

    console.log(
      `Removing course ${courseId} from user ${userId}'s enrollments`
    );

    // Remove the course from user's enrolled courses
    user.enrolledCourses = user.enrolledCourses.filter(
      (id) => id.toString() !== courseId
    );

    // Remove any course progress data
    if (user.courseProgress) {
      user.courseProgress = user.courseProgress.filter(
        (progress) =>
          progress.courseId && progress.courseId.toString() !== courseId
      );
    }

    await user.save();

    // Remove the user from course's enrolled students
    if (course.enrolledStudents) {
      course.enrolledStudents = course.enrolledStudents.filter(
        (id) => id.toString() !== userId
      );

      await course.save();
    }

    console.log(
      `Successfully unenrolled user ${userId} from course ${courseId}`
    );

    return res.status(200).json({
      success: true,
      message: "Successfully unenrolled from the course",
    });
  } catch (error) {
    console.error("Error unenrolling from course:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to unenroll from course",
    });
  }
};
