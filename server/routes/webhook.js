import express from "express";
import Stripe from "stripe";
import { Purchase } from "../models/Purchase.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

router.post(
  "/webhook",
  express.raw({ type: "application/json" }), // Important for raw request body
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const purchaseId = session.metadata.purchaseId;

      // ✅ Update the purchase status in MongoDB
      await Purchase.findByIdAndUpdate(purchaseId, { status: "completed" });

      console.log(`Payment successful for Purchase ID: ${purchaseId}`);
    }

    res.json({ received: true });
  }
);

export default router;
