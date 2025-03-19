import { Webhook } from "svix";
import User from "../models/User.js";
import Stripe from "stripe";
import { Purchase } from "../models/Purchase.js";
import Course from "../models/Course.js";

//API Controller function to Manage Clerk User with database

export const clerkWebhooks = async (req, res) => {
  try {
    console.log("Received Clerk webhook:", req.body.type);

    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

    try {
      await whook.verify(JSON.stringify(req.body), {
        "svix-id": req.headers["svix-id"],
        "svix-timestamp": req.headers["svix-timestamp"],
        "svix-signature": req.headers["svix-signature"],
      });
    } catch (error) {
      console.error("Webhook verification failed:", error);
      return res
        .status(400)
        .json({ success: false, message: "Webhook verification failed" });
    }

    const { data, type } = req.body;
    console.log("Webhook data:", JSON.stringify(data));

    switch (type) {
      case "user.created": {
        console.log("Creating new user in MongoDB:", data.id);

        // Check if user already exists to avoid duplicates
        const existingUser = await User.findById(data.id);
        if (existingUser) {
          console.log("User already exists in database");
          return res.json({});
        }

        // Create proper name from available data
        let name = "User";
        if (data.first_name || data.last_name) {
          name = `${data.first_name || ""} ${data.last_name || ""}`.trim();
        }

        // Get email if available
        let email = "";
        if (data.email_addresses && data.email_addresses.length > 0) {
          email = data.email_addresses[0].email_address;
        }

        const userData = {
          _id: data.id,
          email: email,
          name: name,
          imageUrl:
            data.image_url ||
            "https://ui-avatars.com/api/?name=" + encodeURIComponent(name),
        };

        console.log("Creating user with data:", userData);
        await User.create(userData);
        console.log("User created successfully");

        return res.json({});
      }

      case "user.updated": {
        console.log("Updating user in MongoDB:", data.id);

        // Check if user exists
        const existingUser = await User.findById(data.id);
        if (!existingUser) {
          // User doesn't exist, create it
          let name = "User";
          if (data.first_name || data.last_name) {
            name = `${data.first_name || ""} ${data.last_name || ""}`.trim();
          }

          let email = "";
          if (data.email_addresses && data.email_addresses.length > 0) {
            email = data.email_addresses[0].email_address;
          }

          const userData = {
            _id: data.id,
            email: email,
            name: name,
            imageUrl:
              data.image_url ||
              "https://ui-avatars.com/api/?name=" + encodeURIComponent(name),
          };

          console.log("User not found, creating with data:", userData);
          await User.create(userData);
          console.log("User created successfully");
        } else {
          // User exists, update it
          let name = existingUser.name;
          if (data.first_name || data.last_name) {
            name = `${data.first_name || ""} ${data.last_name || ""}`.trim();
          }

          let email = existingUser.email;
          if (data.email_addresses && data.email_addresses.length > 0) {
            email = data.email_addresses[0].email_address;
          }

          const userData = {
            email: email,
            name: name,
            imageUrl: data.image_url || existingUser.imageUrl,
          };

          console.log("Updating user with data:", userData);
          await User.findByIdAndUpdate(data.id, userData);
          console.log("User updated successfully");
        }

        return res.json({});
      }

      case "user.deleted": {
        console.log("Deleting user from MongoDB:", data.id);
        await User.findByIdAndDelete(data.id);
        console.log("User deleted successfully");
        return res.json({});
      }

      default:
        return res.json({});
    }
  } catch (error) {
    console.error("Error in webhook handler:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (request, response) => {
  const sig = request.headers["stripe-signature"];

  let event;

  try {
    event = Stripe.webhooks.constructEvent(
      request.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log("Received Stripe event:", event.type);

  try {
    //Handle the event
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        const paymentIntentId = paymentIntent.id;
        console.log(`Processing successful payment: ${paymentIntentId}`);

        const session = await stripeInstance.checkout.sessions.list({
          payment_intent: paymentIntentId,
          expand: ["data.line_items"],
        });

        if (!session.data.length) {
          console.log(
            `No session found for payment intent: ${paymentIntentId}`
          );
          return response.status(400).json({
            received: true,
            warning: "No session found for this payment intent",
          });
        }

        // Get metadata from the session
        const { purchaseId, userId, courseId, courseTitle } =
          session.data[0].metadata;
        console.log(
          `Found metadata: purchaseId=${purchaseId}, userId=${userId}, courseId=${courseId}, title=${courseTitle}`
        );

        // First verify the purchase
        const purchaseData = await Purchase.findById(purchaseId);
        if (!purchaseData) {
          console.log(
            `Purchase not found in database: ${purchaseId}, creating fallback record`
          );

          // If we have userId and courseId in metadata, we can proceed anyway
          if (!userId || !courseId) {
            console.error("Missing required user or course ID in metadata");
            return response.status(400).json({
              received: true,
              warning: "Purchase not found and no fallback IDs in metadata",
            });
          }

          console.log(
            "Using fallback user and course IDs from session metadata"
          );
        }

        // Get the user - either from purchase or directly from metadata
        const userIdToUse = purchaseData?.userId || userId;
        console.log(`Looking up user with ID: ${userIdToUse}`);

        const userData = await User.findById(userIdToUse);

        if (!userData) {
          console.error(`User not found in database: ${userIdToUse}`);
          return response.status(400).json({
            received: true,
            warning: "User not found in database",
          });
        }
        console.log(`Found user: ${userData.name} (${userData._id})`);

        // Get the course - either from purchase or directly from metadata
        const courseIdToUse = purchaseData?.courseId || courseId;
        console.log(`Looking up course with ID: ${courseIdToUse}`);

        const courseData = await Course.findById(courseIdToUse.toString());

        if (!courseData) {
          console.error(`Course not found in database: ${courseIdToUse}`);
          return response.status(400).json({
            received: true,
            warning: "Course not found in database",
          });
        }
        console.log(
          `Found course: ${courseData.courseTitle} (${courseData._id})`
        );

        console.log(
          `Enrolling user ${userData._id} in course ${courseData._id}`
        );

        try {
          // Ensure the userData.enrolledCourses is an array
          if (!Array.isArray(userData.enrolledCourses)) {
            console.log(
              "User enrolledCourses not an array, initializing as empty array"
            );
            userData.enrolledCourses = [];
          }

          // Ensure the courseData.enrolledStudents is an array
          if (!Array.isArray(courseData.enrolledStudents)) {
            console.log(
              "Course enrolledStudents not an array, initializing as empty array"
            );
            courseData.enrolledStudents = [];
          }

          // Add user to course's enrolled students if not already enrolled
          const userAlreadyInCourse = courseData.enrolledStudents.some(
            (studentId) => studentId.toString() === userData._id.toString()
          );

          if (!userAlreadyInCourse) {
            console.log(
              `Adding user ${userData._id} to course's enrolled students array`
            );
            courseData.enrolledStudents.push(userData._id);
            await courseData.save();
            console.log(
              `Successfully updated course ${courseData._id} enrolled students`
            );
          } else {
            console.log(
              `User ${userData._id} already in course's enrolled students array`
            );
          }

          // Add course to user's enrolled courses if not already enrolled
          const courseAlreadyEnrolled = userData.enrolledCourses.some(
            (courseId) => courseId.toString() === courseData._id.toString()
          );

          if (!courseAlreadyEnrolled) {
            console.log(
              `Adding course ${courseData._id} to user's enrolled courses array`
            );
            userData.enrolledCourses.push(courseData._id);
            await userData.save();
            console.log(
              `Successfully updated user ${userData._id} enrolled courses`
            );
          } else {
            console.log(
              `Course ${courseData._id} already in user's enrolled courses array`
            );
          }

          // Update or create the purchase
          if (purchaseData) {
            console.log(
              `Updating existing purchase: ${purchaseId} to completed status`
            );
            await Purchase.findByIdAndUpdate(purchaseId, {
              status: "completed",
              completedAt: new Date(),
            });
            console.log(`Payment completed for purchase: ${purchaseId}`);
          } else if (userId && courseId) {
            // Create a new purchase record as fallback
            console.log(
              `Creating new purchase record for user ${userId} and course ${courseId}`
            );
            const newPurchase = await Purchase.create({
              userId,
              courseId,
              amount: courseData.coursePrice,
              status: "completed",
              completedAt: new Date(),
            });
            console.log(`Created new purchase record: ${newPurchase._id}`);
          }

          // Double-check that the enrollment was successful
          console.log(`Verifying enrollment by querying user data again`);
          const updatedUser = await User.findById(userData._id);

          const isEnrolled = updatedUser.enrolledCourses.some(
            (id) => id.toString() === courseData._id.toString()
          );

          if (!isEnrolled) {
            console.error(
              `Enrollment verification failed - course not found in user's enrolledCourses after save`
            );
            // Force add the course one more time with a different method
            await User.findByIdAndUpdate(userData._id, {
              $addToSet: { enrolledCourses: courseData._id },
            });
            console.log(`Forced enrollment using $addToSet operator`);

            // Verify one more time
            const finalCheck = await User.findById(userData._id);
            const finalEnrolled = finalCheck.enrolledCourses.some(
              (id) => id.toString() === courseData._id.toString()
            );

            if (!finalEnrolled) {
              console.error(
                `CRITICAL: Final enrollment verification still failed!`
              );
            } else {
              console.log(
                `Final verification successful - user is now enrolled`
              );
            }
          } else {
            console.log(
              `Verification successful - user is properly enrolled in the course`
            );
          }

          console.log(
            `User ${userData._id} successfully enrolled in course ${courseData._id}`
          );
        } catch (error) {
          console.error(`Error updating enrollment data:`, error);
          // Still return success to Stripe, but log the error
          return response.json({
            received: true,
            warning: `Error updating enrollment: ${error.message}`,
          });
        }

        break;
      }
      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        const paymentIntentId = paymentIntent.id;
        console.log(`Processing failed payment: ${paymentIntentId}`);

        const session = await stripeInstance.checkout.sessions.list({
          payment_intent: paymentIntentId,
        });

        if (!session.data.length) {
          console.log(
            `No session found for payment intent: ${paymentIntentId}`
          );
          return response
            .status(400)
            .json({ received: true, warning: "Session not found" });
        }

        const { purchaseId } = session.data[0].metadata;
        const purchaseData = await Purchase.findById(purchaseId);

        if (!purchaseData) {
          console.log(`Purchase not found: ${purchaseId}`);
          return response
            .status(400)
            .json({ received: true, warning: "Purchase not found" });
        }

        purchaseData.status = "failed";
        await purchaseData.save();
        console.log(`Payment marked as failed for purchase: ${purchaseId}`);

        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    return response.json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook ${event.type}:`, error);
    return response.status(500).json({
      received: true,
      error: error.message,
    });
  }
};
