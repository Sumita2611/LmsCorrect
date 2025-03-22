import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./configs/mongodb.js";
import { clerkWebhooks, stripeWebhooks } from "./controllers/webhooks.js";
import educatorRouter from "./routes/educatorRoutes.js";
import { clerkMiddleware } from "@clerk/express";
import connectCloudinary from "./configs/cloudinary.js";
import courseRouter from "./routes/courseRoutes.js";
import userRouter from "./routes/userRoutes.js";
import webhookRoutes from "./routes/webhook.js";
import User from "./models/User.js";
import Course from "./models/Course.js";
import allowCors from "./middlewares/cors.js";
import mongoose from "mongoose";

//Initialize express
const app = express();

// Enable CORS - simplified and most permissive configuration
app.use(
  cors({
    origin: true, // Allow any origin with credentials
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: "*", // Allow all headers
    credentials: true,
    maxAge: 86400,
  })
);

// Add a specific preflight handler for all routes
app.options("*", cors());

//connect to database
await connectDB();
await connectCloudinary();

app.use(express.json());
app.use(clerkMiddleware());

//Routes
app.get("/", (req, res) => {
  console.log("Root route accessed");
  return res.status(200).json({
    message: "API Working",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    mongoStatus:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.post("/clerk", express.json(), clerkWebhooks);
app.use("/api/educator", express.json(), educatorRouter);
app.use("/api/courses", courseRouter);
app.use("/api/user", express.json(), userRouter);

// Stripe webhooks need the raw body, not parsed JSON
app.post("/stripe", express.raw({ type: "application/json" }), stripeWebhooks);

app.use("/api/webhook", webhookRoutes);

// Test database route
app.get("/api/test-db", async (req, res) => {
  try {
    // Count courses and users to test db connection
    const courseCount = await Course.countDocuments();
    const userCount = await User.countDocuments();

    res.json({
      success: true,
      database: "Connected",
      counts: {
        courses: courseCount,
        users: userCount,
      },
    });
  } catch (error) {
    console.error("Database test failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/api/courses", async (req, res) => {
  try {
    const { courseTitle, courseDescription, courseThumbnail, coursePrice, isPublished, discount, courseContent, educator } = req.body;
    
    if (!courseTitle || !educator) {
      return res.status(400).json({ success: false, message: "Course title and educator are required" });
    }

    const newCourse = new Course({
      courseTitle,
      courseDescription,
      courseThumbnail,
      coursePrice,
      isPublished,
      discount,
      courseContent,
      educator,
      enrolledStudents: [],
      courseRatings: [],
    });

    await newCourse.save();
    res.status(201).json({ success: true, message: "Course added successfully", course: newCourse });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


//Port
const PORT = process.env.PORT || 5001;

// Wrap the entire Express app with CORS middleware for Vercel
const handler = app;
export default allowCors((req, res) => handler(req, res));

// Only listen in non-Vercel environments
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Test the API by visiting: http://localhost:${PORT}/`);
    console.log(`Try to fetch courses: http://localhost:${PORT}/api/courses`);
  });
} else {
  console.log(
    "Running in production mode on Vercel - not starting server directly"
  );
}

