import { Schema, model, Document, Types } from "mongoose";

export interface IReview {
  name: string;
  rating: number;
  comment: string;
  user?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  stock: number;
  category: string;
  subCategory?: string;
  images: string[];
  rating: number;
  numReviews: number;
  featured: boolean;
  sku: string;
  slug?: string;
  reviews: IReview[];
  // Extra field (not in BE-3 task):
  // seller?: Types.ObjectId;
}

const reviewSchema = new Schema<IReview>(
  {
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    discountPrice: { type: Number },
    stock: { type: Number, required: true },
    category: { type: String, required: true },
    subCategory: { type: String },
    images: { type: [String], required: true },
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    sku: { type: String, required: true, unique: true },
    slug: { type: String, unique: true, index: true },
    reviews: { type: [reviewSchema], default: [] },
    // Extra field (not in BE-3 task):
    // seller: { type: Schema.Types.ObjectId, ref: "Seller" },
  },
  { timestamps: true },
);

// Fast searching er jonno indexing
productSchema.index({ name: "text", category: "text", description: "text" });

export default model<IProduct>("Product", productSchema);
