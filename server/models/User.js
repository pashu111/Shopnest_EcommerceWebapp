import mongoose from "mongoose";

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: Number,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    resetPasswordToken: {
      type: String,
      default: undefined,
    },
    resetPasswordExpires: {
      type: Date,
      default: undefined,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },

    rewardCoins: {
      type: Number,
      default: 0,
    },
    lastOrderScratched: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    photo: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
