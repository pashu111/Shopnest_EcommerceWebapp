import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/Product.js";

dotenv.config();

if (!process.env.MONGO_URI) {
  console.error("Missing MONGO_URI in environment.");
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);

const result = await Product.deleteMany({});
console.log(`✅ Removed ${result.deletedCount || 0} products.`);
process.exit(0);
