import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// 🔹 Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
  });
};

// 🔹 Register User
export const registerUser = async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// 🔹 Login User
export const loginUser = async (req, res) => {
  const { email, identifier, password } = req.body;

  try {
    const rawIdentifier = String(identifier ?? email ?? "").trim();
    if (!rawIdentifier || !password) {
      return res.status(400).json({ message: "Email/mobile and password required" });
    }

    const identifierQuery = [{ email: rawIdentifier }];
    if (/^\d+$/.test(rawIdentifier)) {
      const asNumber = Number(rawIdentifier);
      if (Number.isFinite(asNumber)) {
        identifierQuery.push({ phone: asNumber });
      }
    }

    const user = await User.findOne({ $or: identifierQuery });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        photo: user.photo || "",
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const generateResetToken = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const forgotPasswordUser = async (req, res) => {
  const { email, identifier } = req.body || {};
  try {
    const rawIdentifier = String(identifier ?? email ?? "").trim();

    if (!rawIdentifier) {
      return res.status(400).json({ message: "Email or mobile number is required" });
    }

    const identifierQuery = [{ email: rawIdentifier }];
    if (/^\d+$/.test(rawIdentifier)) {
      const asNumber = Number(rawIdentifier);
      if (Number.isFinite(asNumber)) {
        identifierQuery.push({ phone: asNumber });
      }
    }

    const user = await User.findOne({ $or: identifierQuery });
    if (!user) {
      return res
        .status(404)
        .json({ message: "No user found with that email or mobile number" });
    }

    const resetToken = generateResetToken();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await user.save({ validateBeforeSave: false });

    return res.json({
      message: "Account verified successfully",
      resetToken,
    });
  } catch (error) {
    console.error("User forgot password error:", error);
    return res.status(500).json({ message: `Server error: ${error.message}` });
  }
};

export const verifyOTPUser = async (req, res) => {
  return res.status(410).json({ message: "OTP verification is no longer supported" });
};

export const resetPasswordUser = async (req, res) => {
  const { token, newPassword } = req.body || {};
  try {
    const cleanToken = String(token || "").trim();
    const cleanPassword = String(newPassword || "");

    if (!cleanToken || !cleanPassword) {
      return res.status(400).json({ message: "Token and new password required" });
    }

    const user = await User.findOne({
      resetPasswordToken: cleanToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(cleanPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save({ validateBeforeSave: false });

    return res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("User reset password error:", error);
    return res.status(500).json({ message: `Server error: ${error.message}` });
  }
};
