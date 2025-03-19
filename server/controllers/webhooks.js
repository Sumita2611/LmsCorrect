// import { Webhook } from "svix";
// import User from '../models/User.js'
// import Stripe from "stripe";
// import { Purchase } from "../models/Purchase.js";
// import Course from "../models/Course.js";

// //API Controller function to Manage Clerk User with database

// export const clerkWebhooks = async (req, res)=>{
//   try{
//     const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET)

//     await whook.verify(JSON.stringify(req.body), {
//       "svix-id": req.headers["svix-id"],
//       "svix-timestamp": req.headers["svix-timestamp"],
//       "svix-signature": req.headers["svix-signature"]
//     })

//     const {data, type} = req.body

//     switch (type) {
//       case 'user.created' : {
//         const userData = {
//           _id: data.id,
//           email: data.email_addresses[0].email_address,
//           name: data.first_name + " " + data.last_name,
//           imageUrl: data.image_url,
//         }
//         await User.create(userData)
//         res.json({})
//         break;
//       }

//       case 'user.updated': {
//         const userData = {
//           email: data.email_address[0].email_address,
//           name: data.first_name + " " + data.last_name,
//           imageUrl: data.image_url,
//         }
//         await User.findByIdAndUpdate(data.id, userData)
//         res.json({})
//         break;
//       }

//       case 'user.deleted' : {
//         await User.findByIdAndDelete(data.id)
//         res.json({})
//         break;
//       }

//       default:
//         break;
//     }

//   }catch (error) {
//     res.json({success: false, message: error.message})
//   }
// }

// const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

// export const stripeWebhooks = async(request, response)=>{
//   const sig = request.headers['stripe-signature'];

//   let event;

//   try{
//     event = Stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
//   }
//   catch (err){
//     response.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   //Handle the event
//   switch (event.type) {
//     case 'payment_intent.succeeded':{
//       const paymentIntent = event.data.object;
//       const paymentIntentId = paymentIntent.id;

//       const session = await stripeInstance.checkout.sessions.list({
//         payment_intent:paymentIntentId
//       })

//       const { purchaseId } = session.data[0].metadata;

//       const purchaseData = await Purchase.findById(purchaseId)
//       const userData = await User.findById(purchaseData.userId)
//       const courseData = await Course.findById(purchaseData.courseId.toString())
//       courseData.enrolledStudents.push(userData)
//       await courseData.save()

//       userData.enrolledCourses.push(courseData._id)
//       await userData.save()

//       // purchaseData.status = 'completed'
//       // await purchaseData.save()

//       await Purchase.findByIdAndUpdate(purchaseId, { status: 'completed' });

//       break;
//     }
//       case 'payment_intent.payment_failed':{
//       const paymentIntent = event.data.object;
//       const paymentIntentId = paymentIntent.id;

//       const session = await stripeInstance.checkout.sessions.list({
//         payment_intent:paymentIntentId
//       })

//       //extra
//       if (!session.data.length) {
//         console.log("No session found for this paymentIntentId");
//         return res.status(400).json({ success: false, message: "Session not found" });
//       }
      

//       const { purchaseId } = session.data[0].metadata;
//       const purchaseData = await Purchase.findById(purchaseId)
//       purchaseData.status = 'failed'
//       await purchaseData.save()

//         break;   
//       }
//     //...handle other event types
//     default:
//       console.log(`Unhandled event type ${event.type}`);  
//   }

//   //Return a response to acknowledge receipt of the event
//   response.json({received: true});
// }
import { Webhook } from "svix";
import User from "../models/User.js";
import Stripe from "stripe";
import { Purchase } from "../models/Purchase.js";
import Course from "../models/Course.js";
import express from "express";

// Middleware to use raw body for webhooks
const app = express();
app.use("/webhook/clerk", express.raw({ type: "application/json" }));
app.use("/webhook/stripe", express.raw({ type: "application/json" }));

// Clerk Webhook Handler
export const clerkWebhooks = async (req, res) => {
  try {
    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

    // Verify the webhook with raw body
    await whook.verify(req.body, {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    });

    const { data, type } = req.body;

    switch (type) {
      case "user.created": {
        const userData = {
          _id: data.id,
          email: data.email_addresses[0].email_address,
          name: `${data.first_name} ${data.last_name}`,
          imageUrl: data.image_url,
        };
        await User.create(userData);
        return res.status(201).json({ success: true, message: "User created" });
      }

      case "user.updated": {
        const userData = {
          email: data.email_addresses[0].email_address, // Fixed access to email
          name: `${data.first_name} ${data.last_name}`,
          imageUrl: data.image_url,
        };
        await User.findByIdAndUpdate(data.id, userData);
        return res.status(200).json({ success: true, message: "User updated" });
      }

      case "user.deleted": {
        await User.findByIdAndDelete(data.id);
        return res.status(200).json({ success: true, message: "User deleted" });
      }

      default:
        return res.status(400).json({ success: false, message: "Unhandled event" });
    }
  } catch (error) {
    console.error("Clerk Webhook Error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// Initialize Stripe
const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (request, response) => {
  const sig = request.headers["stripe-signature"];
  let event;

  try {
    // Use stripeInstance instead of Stripe
    event = stripeInstance.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe Webhook Error:", err);
    return response.status(400).json({ success: false, message: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        const paymentIntentId = paymentIntent.id;

        // Fetch session details
        const session = await stripeInstance.checkout.sessions.list({
          payment_intent: paymentIntentId,
        });

        if (!session.data.length) {
          console.log("No session found for this paymentIntentId");
          return response.status(400).json({ success: false, message: "Session not found" });
        }

        const { purchaseId } = session.data[0].metadata;

        const purchaseData = await Purchase.findById(purchaseId);
        if (!purchaseData) {
          console.log("Purchase data not found");
          return response.status(400).json({ success: false, message: "Purchase data not found" });
        }

        const userData = await User.findById(purchaseData.userId);
        const courseData = await Course.findById(purchaseData.courseId.toString());

        if (!userData || !courseData) {
          console.log("User or Course data not found");
          return response.status(400).json({ success: false, message: "User or Course not found" });
        }

        courseData.enrolledStudents.push(userData);
        await courseData.save();

        userData.enrolledCourses.push(courseData._id);
        await userData.save();

        await Purchase.findByIdAndUpdate(purchaseId, { status: "completed" });

        return response.status(200).json({ success: true, message: "Payment successful" });
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        const paymentIntentId = paymentIntent.id;

        // Fetch session details
        const session = await stripeInstance.checkout.sessions.list({
          payment_intent: paymentIntentId,
        });

        if (!session.data.length) {
          console.log("No session found for this paymentIntentId");
          return response.status(400).json({ success: false, message: "Session not found" });
        }

        const { purchaseId } = session.data[0].metadata;

        const purchaseData = await Purchase.findById(purchaseId);
        if (!purchaseData) {
          console.log("Purchase data not found");
          return response.status(400).json({ success: false, message: "Purchase data not found" });
        }

        purchaseData.status = "failed";
        await purchaseData.save();

        return response.status(200).json({ success: true, message: "Payment failed" });
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
        return response.status(400).json({ success: false, message: "Unhandled event type" });
    }
  } catch (error) {
    console.error("Stripe Webhook Processing Error:", error);
    return response.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
