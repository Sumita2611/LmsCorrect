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

//Initialize express
const app = express();

//connect to database
await connectDB();
await connectCloudinary();

//Middlewares
app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

//Routes
app.get("/", (req, res) => res.send("API Working"));
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

//Port
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
