import DeliveryPartner from "../models/DeliveryPartner.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  assignOpenOrdersToNearestDeliveryPartners,
  isValidCoordinatePair,
  publishNearbyOrdersForPartner,
} from "../utils/deliveryMatching.js";

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {});
};

export const registerDeliveryPartner = async (req, res) => {
  const {
    fullName,
    profilePhotoJpg,
    dateOfBirth,
    gender,
    mobileNumber,
    email,
    currentAddress,
    aadhaarNumber,
    panNumber,
    vehicleType,
    vehicleNumber,
    deliveryCity,
    availability,
    workingHours,
    password,
    liveLocationPermission,
    otpVerified,
    createEarningsWallet,
  } = req.body;

  try {
    if (
      !fullName ||
      !profilePhotoJpg ||
      !mobileNumber ||
      !email ||
      !dateOfBirth ||
      !currentAddress ||
      !aadhaarNumber ||
      !deliveryCity ||
      !availability ||
      !password
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existingByMobile = await DeliveryPartner.findOne({ mobileNumber });
    if (existingByMobile) {
      return res.status(400).json({ message: "Mobile number already in use" });
    }

    const existingByEmail = await DeliveryPartner.findOne({ email });
    if (existingByEmail) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) {
      return res.status(400).json({ message: "Invalid date of birth" });
    }

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age -= 1;
    }

    if (age < 18) {
      return res.status(400).json({ message: "Minimum age is 18" });
    }

    const partner = await DeliveryPartner.create({
      fullName,
      profilePhotoJpg,
      dateOfBirth: dob,
      gender,
      mobileNumber,
      email,
      currentAddress,
      aadhaarNumber,
      panNumber: panNumber || "",
      vehicleType: vehicleType || "",
      vehicleNumber: vehicleNumber || "",
      deliveryCity,
      availability,
      workingHours: workingHours || "",
      password: hashedPassword,
      liveLocationPermission: Boolean(liveLocationPermission),
      mobileOtpVerified: Boolean(otpVerified),
      earningsWallet: createEarningsWallet ? 0 : 0, // Ensure field exists
    });

    res.status(201).json({
      _id: partner._id,
      fullName: partner.fullName,
      mobileNumber: partner.mobileNumber,
      email: partner.email,
      profilePhotoJpg: partner.profilePhotoJpg,
      currentAddress: partner.currentAddress,
      deliveryCity: partner.deliveryCity,
      availability: partner.availability,
      vehicleType: partner.vehicleType,
      vehicleNumber: partner.vehicleNumber,
      isOnline: partner.isOnline,
      liveLocation: partner.liveLocation,
      location: partner.location,
      earningsWallet: partner.earningsWallet || 0,
      token: generateToken(partner._id),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const loginDeliveryPartner = async (req, res) => {
  const { identifier, password } = req.body;

  try {
    if (!identifier || !password) {
      return res.status(400).json({ message: "Identifier and password required" });
    }

    const partner = await DeliveryPartner.findOne({
      $or: [{ mobileNumber: identifier }, { email: identifier }],
    });

    if (partner && (await bcrypt.compare(password, partner.password))) {
      res.json({
        _id: partner._id,
        fullName: partner.fullName,
        mobileNumber: partner.mobileNumber,
        email: partner.email,
        profilePhotoJpg: partner.profilePhotoJpg,
        currentAddress: partner.currentAddress,
        deliveryCity: partner.deliveryCity,
        availability: partner.availability,
        vehicleType: partner.vehicleType,
        vehicleNumber: partner.vehicleNumber,
        isOnline: partner.isOnline,
        liveLocation: partner.liveLocation,
        location: partner.location,
        earningsWallet: partner.earningsWallet,
        token: generateToken(partner._id),
      });
    } else {
      console.warn("[delivery-login] invalid credentials for identifier:", identifier);
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    console.error("[delivery-login] server error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateDeliveryPartnerLocation = async (req, res) => {
  try {
    const partnerId = req.deliveryPartner?.id;
    const { latitude, longitude, isOnline = true } = req.body || {};
    const numericLatitude = Number(latitude);
    const numericLongitude = Number(longitude);

    if (!partnerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidCoordinatePair(latitude, longitude)) {
      console.warn("[delivery-location] invalid coordinates", {
        partnerId: String(partnerId),
        latitude,
        longitude,
      });
      return res.status(400).json({ message: "Valid latitude and longitude are required" });
    }

    console.log("[delivery-location] updating partner location", {
      partnerId: String(partnerId),
      latitude: numericLatitude,
      longitude: numericLongitude,
      method: req.method,
    });

    const updated = await DeliveryPartner.findByIdAndUpdate(
      partnerId,
      {
        isOnline: Boolean(isOnline),
        liveLocationPermission: true,
        liveLocation: {
          latitude: numericLatitude,
          longitude: numericLongitude,
          updatedAt: new Date(),
        },
        location: {
          latitude: numericLatitude,
          longitude: numericLongitude,
        },
      },
      { new: true, runValidators: true }
    ).select("_id fullName isOnline liveLocation location");

    if (!updated) {
      return res.status(404).json({ message: "Delivery partner not found" });
    }

    publishNearbyOrdersForPartner(req.app, partnerId).catch((error) => {
      console.warn("Nearby order publish failed after location update:", error);
    });
    assignOpenOrdersToNearestDeliveryPartners(req.app).catch((error) => {
      console.warn("Nearest partner reassignment failed after location update:", error);
    });

    console.log("[delivery-location] update successful", {
      partnerId: String(partnerId),
      latitude: updated.liveLocation?.latitude,
      longitude: updated.liveLocation?.longitude,
    });

    return res.json({
      message: "Location updated successfully",
      deliveryPartner: updated,
      location: updated.location,
      liveLocation: updated.liveLocation,
    });
  } catch (error) {
    console.error("Update delivery partner location error:", error);
    return res.status(500).json({ message: "Failed to update live location" });
  }
};

export const updateDeliveryPartnerOnlineStatus = async (req, res) => {
  try {
    const partnerId = req.deliveryPartner?.id;
    const { isOnline } = req.body || {};

    if (!partnerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const updated = await DeliveryPartner.findByIdAndUpdate(
      partnerId,
      { isOnline: Boolean(isOnline) },
      { new: true, runValidators: true }
    ).select("_id fullName isOnline liveLocation");

    if (!updated) {
      return res.status(404).json({ message: "Delivery partner not found" });
    }

    if (updated.isOnline) {
      publishNearbyOrdersForPartner(req.app, partnerId).catch((error) => {
        console.warn("Nearby order publish failed after online toggle:", error);
      });
      assignOpenOrdersToNearestDeliveryPartners(req.app).catch((error) => {
        console.warn("Nearest partner reassignment failed after online toggle:", error);
      });
    }

    return res.json(updated);
  } catch (error) {
    console.error("Update delivery partner online status error:", error);
    return res.status(500).json({ message: "Failed to update online status" });
  }
};

// ⭐ ADMIN: LIST DELIVERY PARTNERS (for assignment)
export const getDeliveryPartners = async (req, res) => {
  try {
    const partners = await DeliveryPartner.find()
      .select(
        "fullName mobileNumber email profilePhotoJpg deliveryCity availability ratingsAverage ratingsCount earningsWallet createdAt"
      )
      .sort({ createdAt: -1 });

    return res.json(partners);
  } catch (error) {
    console.error("Get delivery partners error:", error);
    return res.status(500).json({ message: "Failed to fetch delivery partners" });
  }
};

// FORGOT PASSWORD
export const forgotPasswordDeliveryPartner = async (req, res) => {
  const { identifier } = req.body;
  try {
    const partner = await DeliveryPartner.findOne({
      $or: [
        { email: identifier },
        { mobileNumber: identifier }
      ]
    });
    if (!partner) {
      return res.status(404).json({ message: "No delivery partner found with that email or mobile number" });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    partner.resetPasswordToken = resetToken;
    partner.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await partner.save();

    // Simulation: returning token. In production, send via email service.
    return res.json({ message: "Reset token generated", resetToken });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// RESET PASSWORD
export const resetPasswordDeliveryPartner = async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const partner = await DeliveryPartner.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!partner) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const salt = await bcrypt.genSalt(10);
    partner.password = await bcrypt.hash(newPassword, salt);
    partner.resetPasswordToken = undefined;
    partner.resetPasswordExpires = undefined;
    await partner.save();

    return res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
