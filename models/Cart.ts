import mongoose, { Schema, model } from "mongoose";

const CartSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  items: [
    {
      product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
      quantity: { type: Number, required: true, min: 1 },
    },
  ],
  coupon: {
    code: String,
    discount: Number,
  },
  updatedAt: { type: Date, default: Date.now },
});

CartSchema.index({ user: 1 });

export default model("Cart", CartSchema);
