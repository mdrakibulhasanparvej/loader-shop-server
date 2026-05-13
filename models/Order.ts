import mongoose, { Schema, model } from "mongoose";

const OrderSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  orderItems: [
    {
      product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
      name: String,
      image: String,
      price: Number,
      quantity: { type: Number, required: true, min: 1 },
    },
  ],
  shippingAddress: {
    address: String,
    city: String,
    postalCode: String,
    country: String,
  },
  paymentMethod: { type: String, required: true },
  itemsPrice: Number,
  shippingPrice: Number,
  taxPrice: Number,
  couponDiscount: { type: Number, default: 0 },
  totalPrice: { type: Number, required: true },
  isPaid: { type: Boolean, default: false },
  paidAt: Date,
  paymentResult: {
    id: String,
    status: String,
    update_time: String,
    email_address: String,
  },
  orderStatus: {
    type: String,
    default: "Pending",
    enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
  },
  deliveredAt: Date,
  cancelledAt: Date,
  trackingNumber: String,
  createdAt: { type: Date, default: Date.now },
});

OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ orderStatus: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ isPaid: 1 });

export default model("Order", OrderSchema);
