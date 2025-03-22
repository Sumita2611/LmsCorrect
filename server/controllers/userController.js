import Course from "../models/Course.js";
import User from "../models/User.js";
import { Purchase } from "../models/Purchase.js";

import Stripe from "stripe";
import { clerkClient } from "@clerk/clerk-sdk-node";

//Get user data
export const getUserData = async (req, res) => {
  try {
    // Check if we have a userId from clerk auth
    let userId = req.auth?.userId;

    // If not, try to get from query parameters
    if (!userId && req.query.token) {
      try {
        // Verify the token and extract user ID
        const token = req.query.token;
        const verifiedToken = await clerkClient.verifyToken(token);
        userId = verifiedToken.sub;
        console.log("Using userId from query token:", userId);
      } catch (tokenError) {
        console.error("Token verification failed:", tokenError);
        return res.status(401).json({
          success: false,
          message: "Invalid authorization token",
        });
      }
    }

    // If we still don't have a userId, return unauthorized
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

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
    // Check if we have a userId from clerk auth
    let userId = req.auth?.userId;

    // If not, try to get from query parameters
    if (!userId && req.query.token) {
      try {
        // Verify the token and extract user ID
        const token = req.query.token;
        const verifiedToken = await clerkClient.verifyToken(token);
        userId = verifiedToken.sub;
        console.log("Using userId from query token:", userId);
      } catch (tokenError) {
        console.error("Token verification failed:", tokenError);
        return res.status(401).json({
          success: false,
          message: "Invalid authorization token",
        });
      }
    }

    // If we still don't have a userId, return unauthorized
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    console.log(`Fetching enrolled courses for user: ${userId}`);

    const userData = await User.findById(userId);

    if (!userData) {
      console.log(`User ${userId} not found`);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get directly enrolled courses (from user.enrolledCourses field)
    let enrolledCourseIds = userData.enrolledCourses || [];
    console.log(
      `User has ${enrolledCourseIds.length} directly enrolled courses`
    );

    // Also fetch courses from the purchases collection that are completed
    const completedPurchases = await Purchase.find({
      userId: userId,
      status: "completed",
    });

    console.log(
      `Found ${completedPurchases.length} completed purchases for user`
    );

    // Add course IDs from purchases (if not already in the list)
    const purchasedCourseIds = completedPurchases.map(
      (purchase) => purchase.courseId
    );

    // Combine both lists without duplicates
    const allCourseIds = [
      ...new Set([
        ...enrolledCourseIds.map((id) => id.toString()),
        ...purchasedCourseIds.map((id) => id.toString()),
      ]),
    ].map((id) => id.toString());

    console.log(
      `Combined total: ${allCourseIds.length} unique enrolled courses`
    );

    if (allCourseIds.length === 0) {
      console.log(`User ${userId} has no enrolled courses`);
      return res.json({
        success: true,
        enrolledCourses: [],
      });
    }

    try {
      // Get courses data for all course IDs
      const courses = await Course.find({
        _id: { $in: allCourseIds },
      })
        .populate({
          path: "educator",
          select: "name imageUrl",
        })
        .lean();

      console.log(`Successfully fetched ${courses.length} courses`);

      // Also look for pending purchases to inform the frontend
      const pendingPurchases = await Purchase.find({
        userId: userId,
        status: { $in: ["pending", "processing"] },
      }).select("courseId status createdAt");

      return res.json({
        success: true,
        enrolledCourses: courses,
        pendingPurchases: pendingPurchases,
      });
    } catch (error) {
      console.error(`Error fetching course data: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: `Error fetching course data: ${error.message}`,
      });
    }
  } catch (error) {
    console.error(`Error in userEnrolledCourses: ${error.message}`);
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

    // Calculate the course price after discount
    const discountedPrice = (
      courseData.coursePrice -
      (courseData.discount * courseData.coursePrice) / 100
    ).toFixed(2);

    const purchaseData = {
      courseId: courseData._id,
      userId,
      amount: discountedPrice,
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

    // Get the minimum price required based on currency
    let minimumAmount = 50; // Default 50 cents for USD
    let rawAmount = Math.floor(newPurchase.amount) * 100;

    // Check if the amount meets Stripe's minimum requirement (approx 50 cents USD)
    if (currency === "inr") {
      minimumAmount = 50; // ₹50 is safe for INR

      // If price is below minimum, adjust to the minimum
      if (rawAmount < minimumAmount) {
        console.log(
          `Adjusting price from ${rawAmount} to ${minimumAmount} to meet Stripe's minimum`
        );
        rawAmount = minimumAmount;

        // Update the purchase record with adjusted amount
        await Purchase.findByIdAndUpdate(newPurchase._id, {
          amount: (minimumAmount / 100).toFixed(2),
          originalAmount: newPurchase.amount,
          priceAdjusted: true,
        });

        console.log(
          `Updated purchase with adjusted amount: ${minimumAmount / 100}`
        );
      }
    }

    // For USD and other currencies
    if (currency === "usd" && rawAmount < 50) {
      console.log(
        `Adjusting price from ${rawAmount} to 50 cents to meet Stripe's minimum`
      );
      rawAmount = 50; // 50 cents minimum for USD

      // Update the purchase record
      await Purchase.findByIdAndUpdate(newPurchase._id, {
        amount: 0.5,
        originalAmount: newPurchase.amount,
        priceAdjusted: true,
      });
    }

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
          unit_amount: rawAmount,
        },
        quantity: 1,
      },
    ];

    // Add a timestamp to prevent caching issues
    const timestamp = new Date().getTime();

    console.log("Creating Stripe checkout session with amount:", rawAmount);
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
        priceAdjusted:
          rawAmount !== Math.floor(newPurchase.amount) * 100 ? "true" : "false",
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

    // If not enrolled, check for pending purchase
    let isPending = false;
    if (!isEnrolled) {
      const pendingPurchase = await Purchase.findOne({
        userId,
        courseId,
        status: { $in: ["pending", "processing"] },
      });

      isPending = !!pendingPurchase;

      // Also check completed purchases that might not have updated the user's enrolledCourses
      if (!isPending) {
        const completedPurchase = await Purchase.findOne({
          userId,
          courseId,
          status: "completed",
        });

        if (completedPurchase) {
          // If we found a completed purchase but the user wasn't marked as enrolled,
          // update the user's enrolledCourses
          console.log(
            `Found completed purchase ${completedPurchase._id} but user not marked as enrolled. Fixing...`
          );

          // Add to enrolledCourses if not already there
          if (!userData.enrolledCourses.includes(courseId)) {
            userData.enrolledCourses.push(courseId);
            await userData.save();
            console.log(`Added course ${courseId} to user's enrolledCourses`);
          }

          // Also update the course's enrolledStudents
          const courseData = await Course.findById(courseId);
          if (courseData && !courseData.enrolledStudents.includes(userId)) {
            courseData.enrolledStudents.push(userId);
            await courseData.save();
            console.log(`Added user ${userId} to course's enrolledStudents`);
          }

          // Now the user is enrolled
          return res.json({
            success: true,
            isEnrolled: true,
            fixedInconsistency: true,
          });
        }
      }
    }

    console.log(
      `Enrollment status: ${
        isEnrolled ? "Enrolled" : isPending ? "Pending" : "Not enrolled"
      }`
    );

    return res.json({
      success: true,
      isEnrolled,
      isPending,
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

    if (!user) {
      console.log(`User ${userId} not found`);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Normalize the course ID to string for comparison
    const courseIdStr = courseId.toString();

    // Check if the user is enrolled in this course - compare as strings to avoid ObjectId issues
    const enrolledCourseIds = user.enrolledCourses.map((id) => id.toString());
    const isEnrolled = enrolledCourseIds.includes(courseIdStr);

    console.log(`User has ${enrolledCourseIds.length} enrolled courses`);
    console.log(
      `Course ${courseIdStr} found in enrolled courses: ${isEnrolled}`
    );

    // If not directly enrolled, check if there's a purchase record
    if (!isEnrolled) {
      const purchaseRecord = await Purchase.findOne({
        userId,
        courseId,
        status: "completed",
      });

      if (!purchaseRecord) {
        console.log(
          `No purchase record found for user ${userId} and course ${courseId}`
        );
        return res.status(400).json({
          success: false,
          message: "You are not enrolled in this course",
        });
      }

      console.log(
        `Found purchase record for course ${courseId}, proceeding with removal`
      );
    }

    // Find the course - we'll do this regardless of enrollment status
    const course = await Course.findById(courseId);

    if (!course) {
      console.log(`Course ${courseId} not found`);
      // If the course doesn't exist but we have an enrollment record, still remove it
      console.log(
        `Removing non-existent course ${courseId} from user's enrollments`
      );
    } else {
      console.log(`Course found: ${course.courseTitle}`);
    }

    console.log(
      `Removing course ${courseId} from user ${userId}'s enrollments`
    );

    // Remove the course from user's enrolled courses - filter by string comparison
    if (user.enrolledCourses && user.enrolledCourses.length > 0) {
      user.enrolledCourses = user.enrolledCourses.filter(
        (id) => id.toString() !== courseIdStr
      );
    }

    // Remove any course progress data
    if (user.courseProgress) {
      user.courseProgress = user.courseProgress.filter(
        (progress) =>
          !progress.courseId || progress.courseId.toString() !== courseIdStr
      );
    }

    await user.save();
    console.log(`Updated user's enrolled courses list`);

    // Remove the user from course's enrolled students if the course exists
    if (course && course.enrolledStudents) {
      course.enrolledStudents = course.enrolledStudents.filter(
        (id) => id.toString() !== userId.toString()
      );

      await course.save();
      console.log(`Removed user from course's enrolled students list`);
    }

    // Delete any purchase records for this course and user
    try {
      const deletedPurchases = await Purchase.deleteMany({
        userId: userId,
        courseId: courseId,
      });

      console.log(
        `Deleted ${deletedPurchases.deletedCount} purchase records for course ${courseId}`
      );
    } catch (error) {
      console.error(`Error deleting purchase records: ${error.message}`);
      // Continue with the operation even if purchase deletion fails
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

// Direct Enrollment (bypassing payment)
export const directEnrollCourse = async (req, res) => {
  try {
    console.log("Direct enrollment request received:", req.body);
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course ID is required",
      });
    }

    const userId = req.auth.userId;
    console.log("User ID from auth:", userId);

    // Create user if not exists
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

    // Calculate the course price after discount
    const discountedPrice = (
      courseData.coursePrice -
      (courseData.discount * courseData.coursePrice) / 100
    ).toFixed(2);

    // Create a purchase record
    const purchaseData = {
      courseId: courseData._id,
      userId,
      amount: discountedPrice,
      status: "completed", // Mark as completed immediately
      completedAt: new Date(),
    };

    console.log("Creating completed purchase record:", purchaseData);
    const newPurchase = await Purchase.create(purchaseData);
    console.log("Purchase created:", newPurchase._id);

    try {
      // Add course to user's enrolled courses
      console.log(`Adding course ${courseId} to user's enrolled courses`);
      userData.enrolledCourses.push(courseData._id);
      await userData.save();

      // Add user to course's enrolled students
      console.log(`Adding user ${userId} to course's enrolled students`);
      courseData.enrolledStudents.push(userId);
      await courseData.save();

      console.log(
        `Direct enrollment complete for user ${userId} in course ${courseId}`
      );
    } catch (error) {
      console.error("Error during direct enrollment:", error);
      return res.status(500).json({
        success: false,
        message: "Error during enrollment: " + error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Enrollment successful",
    });
  } catch (error) {
    console.error("Direct enrollment error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
