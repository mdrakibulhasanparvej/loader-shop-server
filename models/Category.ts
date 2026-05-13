import mongoose, { Schema, Document, model } from "mongoose";

export interface ICategory extends Document {
  name: string;
  subCategories: string[];
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true },
    subCategories: { type: [String], default: [] },
  },
  { timestamps: true },
);

export default model<ICategory>("Category", CategorySchema);
