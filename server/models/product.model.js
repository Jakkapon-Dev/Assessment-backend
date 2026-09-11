import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Product name is required"] },
    price: { type: Number, required: [true, "Price is required"] },
    quantity: { type: Number, default: 1 },
  },
  { timestamps: true },
);

export const Product = mongoose.model("Product", productSchema);
