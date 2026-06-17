import User from "../models/User.js";

export const updateProfile = async (req, res) => {
  try {
    const { photo } = req.body;

    if (!photo) {
      return res.status(400).json({ message: "No photo data provided" });
    }

    // Find the user by ID (provided by your auth middleware) and update the photo field
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { photo }, 
      { new: true, runValidators: true }
    ).select("-password").lean();

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};