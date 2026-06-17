import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import Admin from "../models/admin.js";

dotenv.config();

const { MONGO_URI, ADMIN_USERNAME, ADMIN_PASSWORD, RESET_ADMIN } = process.env;

if (!MONGO_URI) {
  console.error("Missing MONGO_URI in environment.");
  process.exit(1);
}

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error("Missing ADMIN_USERNAME or ADMIN_PASSWORD in environment.");
  process.exit(1);
}

await mongoose.connect(MONGO_URI);

const username = ADMIN_USERNAME.trim();
const password = ADMIN_PASSWORD;

const existing = await Admin.findOne({ username });

if (existing && RESET_ADMIN !== "true") {
  console.log("Admin already exists. Set RESET_ADMIN=true to update password.");
  process.exit(0);
}

const hashed = await bcrypt.hash(password, 10);

if (existing) {
  existing.password = hashed;
  await existing.save();
  console.log("✅ Admin password updated.");
} else {
  await Admin.create({ username, password: hashed });
  console.log("✅ Admin user created.");
}

process.exit(0);
