import User from "../models/User.js";
import mongoose from "mongoose";

export const generateReward = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    // This API expects a MongoDB Order `_id` so we can safely track "already scratched" per order.
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid orderId. Expected MongoDB _id." });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if this order was already scratched
    if (user.lastOrderScratched) {
      const lastOrderScratchedStr = user.lastOrderScratched.toString();
      const orderIdStr = orderId.toString();

      if (lastOrderScratchedStr === orderIdStr) {
        return res.status(400).json({ 
          message: "This order has already been scratched",
          alreadyScratched: true,
          coins: user.rewardCoins
        });
      }
    }

    // random reward (1 - 25), always generated on server
    const rewardCoins = Math.floor(Math.random() * 25) + 1;

    // add reward
    const currentCoins =
      typeof user.rewardCoins === "number" ? user.rewardCoins : 0;
    user.rewardCoins = currentCoins + rewardCoins;
    
    // Store as ObjectId reference
    user.lastOrderScratched = new mongoose.Types.ObjectId(orderId);

    await user.save();

    res.json({
      coins: rewardCoins,
      totalCoins: user.rewardCoins,
      alreadyScratched: false
    });

  } catch (error) {
    console.error("Reward generation error:", error);
    res.status(500).json({
      message: "Reward generation failed",
      error: error.message
    });

  }
};

export const getRewardCoins = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("rewardCoins");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ coins: user.rewardCoins || 0 });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch reward coins" });
  }
};

export const checkOrderScratched = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.query;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid orderId. Expected MongoDB _id." });
    }

    const user = await User.findById(userId).select("rewardCoins lastOrderScratched");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let isScratched = false;
    
    if (user.lastOrderScratched) {
      isScratched = user.lastOrderScratched.toString() === orderId.toString();
    }

    res.json({
      alreadyScratched: isScratched,
      coins: user.rewardCoins || 0
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to check scratch status" });
  }
};
