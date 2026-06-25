import User from "../models/User.js";
import Reward from "../models/Reward.js";
import Order from "../models/Order.js";
import mongoose from "mongoose";

const resolveOrderObjectId = async (orderId) => {
  if (mongoose.Types.ObjectId.isValid(orderId)) {
    return new mongoose.Types.ObjectId(orderId);
  }
  const order = await Order.findOne({ orderId }).select("_id").lean();
  if (!order) {
    const msg = `No order found for orderId: ${orderId}`;
    console.error("[Rewards] " + msg);
    return null;
  }
  return order._id;
};

export const generateReward = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    console.log(`[Rewards] generateReward userId=${userId} orderId=${orderId}`);

    const orderObjectId = await resolveOrderObjectId(orderId);
    if (!orderObjectId) {
      return res.status(400).json({ message: "Invalid or unknown order ID" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.lastOrderScratched) {
      const lastStr = user.lastOrderScratched.toString();
      const currentStr = orderObjectId.toString();
      if (lastStr === currentStr) {
        console.log(`[Rewards] Duplicate scratch attempt for order ${currentStr}`);
        return res.status(400).json({
          message: "This order has already been scratched",
          alreadyScratched: true,
          coins: user.rewardCoins,
        });
      }
    }

    const rewardCoins = Math.floor(Math.random() * 25) + 1;
    console.log(`[Rewards] Generated ${rewardCoins} coins for user ${userId}`);

    user.rewardCoins = (user.rewardCoins || 0) + rewardCoins;
    user.lastOrderScratched = orderObjectId;
    await user.save();

    await Reward.create({
      userId,
      orderId: orderObjectId,
      rewardType: "coins",
      amount: rewardCoins,
      dateEarned: new Date(),
    });

    console.log(`[Rewards] User ${userId} total coins: ${user.rewardCoins}`);

    res.json({
      coins: rewardCoins,
      totalCoins: user.rewardCoins,
      alreadyScratched: false,
    });
  } catch (error) {
    console.error("[Rewards] Reward generation error:", error);
    res.status(500).json({
      message: "Reward generation failed",
      error: error.message,
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
    console.error("[Rewards] getRewardCoins error:", error);
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

    const orderObjectId = await resolveOrderObjectId(orderId);
    if (!orderObjectId) {
      return res.json({ alreadyScratched: false, coins: 0 });
    }

    const user = await User.findById(userId).select("rewardCoins lastOrderScratched");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isScratched = user.lastOrderScratched
      ? user.lastOrderScratched.toString() === orderObjectId.toString()
      : false;

    res.json({
      alreadyScratched: isScratched,
      coins: user.rewardCoins || 0,
    });
  } catch (error) {
    console.error("[Rewards] checkOrderScratched error:", error);
    res.status(500).json({ message: "Failed to check scratch status" });
  }
};
