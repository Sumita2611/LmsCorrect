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
    const userData = await User.findById(userId).populate("enrolledCourses");

    res.json({
      success: true,
      enrolledCourses: userData.enrolledCourses,
    });
  } catch (error) {
    res.json({
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

    // Check if user is already enrolled in this course
    if (userData.enrolledCourses.includes(courseId)) {
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

    // For development/testing, auto-enroll the user
    if (process.env.NODE_ENV === "development") {
      // Add course to user's enrolled courses
      userData.enrolledCourses.push(courseData._id);
      await userData.save();

      // Add user to course's enrolled students
      courseData.enrolledStudents.push(userId);
      await courseData.save();

      // Update purchase status
      newPurchase.status = "completed";
      await newPurchase.save();

      return res.status(200).json({
        success: true,
        message: "Enrollment successful",
        redirectUrl: "/my-enrollments",
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
          },
          unit_amount: Math.floor(newPurchase.amount) * 100,
        },
        quantity: 1,
      },
    ];

    console.log("Creating Stripe checkout session");
    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${origin}/loading/my-enrollments`,
      cancel_url: `${origin}/`,
      line_items: line_items,
      mode: "payment",
      metadata: {
        purchaseId: newPurchase._id.toString(),
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