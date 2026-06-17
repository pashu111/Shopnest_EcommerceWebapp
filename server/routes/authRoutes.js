import express from "express";
import {
  loginUser,
  registerUser,
  forgotPasswordUser,
  resetPasswordUser,
} from "../controllers/authController.js";
import { updateProfile } from "../controllers/userController.js";
import protect from "../middleware/authMiddleware.js"; 

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPasswordUser);
router.post("/reset-password", resetPasswordUser);
router.put("/update-profile", protect, updateProfile);

export default router;
