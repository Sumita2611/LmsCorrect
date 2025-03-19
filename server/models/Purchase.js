import mongoose from "mongoose";
const { Schema } = mongoose;

const purchaseSchema = new Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    userId: {
      type: String,
      ref: "User",
      required: true,
    },
    amount: { type: Number, required: true },
    originalAmount: {
      type: Number,
      default: null,
    },
    priceAdjusted: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "refunded"],
      default: "pending",
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const Purchase = mongoose.model("Purchase", purchaseSchema);
