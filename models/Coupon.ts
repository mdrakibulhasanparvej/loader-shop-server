import mongoose, { Schema, model } from "mongoose";

const CouponSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  discountType: { type: String, enum: ["percentage", "fixed"], required: true },
  discountValue: { type: Number, required: true },
  minPurchase: { type: Number, default: 0 },
  maxDiscount: Number,
  expiresAt: Date,
  usageLimit: Number,
  usedCount: { type: Number, default: 0 },
  usedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  isActive: { type: Boolean, default: true },
  applicableProducts: [{ type: Schema.Types.ObjectId, ref: "Product" }],
  createdAt: { type: Date, default: Date.now },
});

CouponSchema.index({ code: 1, isActive: 1 });
CouponSchema.index({ expiresAt: 1 });

export default model("Coupon", CouponSchema);
