import mongoose from "mongoose";

// Connect to the MongoDB database
const connectDB = async () => {
  mongoose.connection.on("connected", () => console.log("Database Connected"));

  try {
    // Connect to MongoDB without appending database name to the URI
    // This way we let MongoDB Atlas handle the database properly
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connection successful");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};
export default connectDB;
