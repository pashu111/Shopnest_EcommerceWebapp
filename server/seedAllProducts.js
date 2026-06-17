import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "./models/Product.js";
import { allProducts } from "./data/allProducts.js";

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

await Product.deleteMany();
await Product.insertMany(allProducts);

console.log("✅ ALL PRODUCTS ADDED SUCCESSFULLY");
process.exit();
    