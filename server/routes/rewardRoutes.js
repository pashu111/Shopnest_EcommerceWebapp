// routes/rewardRoutes.js
import express from "express";
import { generateReward, getRewardCoins, checkOrderScratched } from "../controllers/rewardController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/generate", authMiddleware, generateReward);
router.get("/coins", authMiddleware, getRewardCoins);
router.get("/check-scratched", authMiddleware, checkOrderScratched);

export default router;
