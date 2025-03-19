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
    response.status(400).send(`Webhook Error: ${err.message}`);
  }

  //Handle the event
  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object;
      const paymentIntentId = paymentIntent.id;

      const session = await stripeInstance.checkout.sessions.list({
        payment_intent: paymentIntentId,
      });

      const { purchaseId } = session.data[0].metadata;

      const purchaseData = await Purchase.findById(purchaseId);
      const userData = await User.findById(purchaseData.userId);
      const courseData = await Course.findById(
        purchaseData.courseId.toString()
      );
      courseData.enrolledStudents.push(userData);
      await courseData.save();

      userData.enrolledCourses.push(courseData._id);
      await userData.save();

      // purchaseData.status = 'completed'
      // await purchaseData.save()

      await Purchase.findByIdAndUpdate(purchaseId, { status: "completed" });

      break;
    }
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object;
      const paymentIntentId = paymentIntent.id;

      const session = await stripeInstance.checkout.sessions.list({
        payment_intent: paymentIntentId,
      });

      //extra
      if (!session.data.length) {
        console.log("No session found for this paymentIntentId");
        return res
          .status(400)
          .json({ success: false, message: "Session not found" });
      }

      const { purchaseId } = session.data[0].metadata;
      const purchaseData = await Purchase.findById(purchaseId);
      purchaseData.status = "failed";
      await purchaseData.save();

      break;
    }
    //...handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  //Return a response to acknowledge receipt of the event
  response.json({ received: true });
};