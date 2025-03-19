import { clerkClient } from "@clerk/express";

//Middleware ( Protect Educator Routes)
export const protectEducator = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    console.log("Checking educator access for user:", userId);

    // In development mode, we auto-create educators for testing
    if (process.env.NODE_ENV === "development") {
      console.log("Development mode: Auto-granting educator role");
      next();
      return;
    }

    const response = await clerkClient.users.getUser(userId);

    if (response.publicMetadata.role !== "educator") {
      console.log("Unauthorized access attempt: User is not an educator");
      return res.json({ success: false, message: "Unauthorized Access" });
    }

    console.log("Educator access granted");
    next();
  } catch (error) {
    console.error("Error in protectEducator middleware:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
