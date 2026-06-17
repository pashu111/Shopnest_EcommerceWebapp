import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const fixRewards = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const result = await User.updateMany(
      { rewardCoins: { $exists: false } },
      { $set: { rewardCoins: 0 } }
    );

    console.log("Rewards fixed:", result.modifiedCount);

    await mongoose.disconnect();
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

fixRewards();
