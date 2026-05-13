import mongoose, { Schema, Document } from "mongoose";

export interface ITransactionLog extends Document {
  user?: mongoose.Types.ObjectId;
  order?: mongoose.Types.ObjectId;
  type: "payment" | "refund" | "withdrawal";
  gateway: "sslcommerz" | "bkash" | "stripe" | "cod";
  transactionId: string;
  amount: number;
  status: "success" | "failed" | "pending";
  details?: string;
  createdAt: Date;
}

const transactionLogSchema = new Schema<ITransactionLog>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
    },
    type: {
      type: String,
      enum: ["payment", "refund", "withdrawal"],
      required: true,
    },
    gateway: {
      type: String,
      enum: ["sslcommerz", "bkash", "stripe", "cod"],
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "failed", "pending"],
      required: true,
    },
    details: {
      type: String,
    },
  },
  { timestamps: true },
);

transactionLogSchema.index({ user: 1 });
transactionLogSchema.index({ order: 1 });
transactionLogSchema.index({ transactionId: 1 });
transactionLogSchema.index({ createdAt: -1 });

export default mongoose.model<ITransactionLog>(
  "TransactionLog",
  transactionLogSchema,
);
