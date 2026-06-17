import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "../models/Order.js";

dotenv.config();

const { MONGO_URI } = process.env;
const isDryRun = process.argv.includes("--dry-run");

if (!MONGO_URI) {
  console.error("Missing MONGO_URI in environment.");
  process.exit(1);
}

const filter = {
  $and: [
    { address: { $exists: true, $type: "string", $ne: "" } },
    {
      $or: [
        { deliveryAddress: { $exists: false } },
        { deliveryAddress: null },
        { deliveryAddress: "" },
      ],
    },
  ],
};

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI);

    const totalMatched = await Order.countDocuments(filter);

    if (totalMatched === 0) {
      console.log("No legacy orders found. Nothing to migrate.");
      await mongoose.disconnect();
      process.exit(0);
    }

    if (isDryRun) {
      console.log(`Dry run: ${totalMatched} order(s) would be updated.`);
      await mongoose.disconnect();
      process.exit(0);
    }

    const result = await Order.updateMany(filter, [
      {
        $set: {
          deliveryAddress: "$address",
        },
      },
    ]);

    console.log(`Matched: ${result.matchedCount || 0}`);
    console.log(`Updated: ${result.modifiedCount || 0}`);
    console.log("Migration complete.");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error?.message || error);
    process.exit(1);
  }
};

run();
