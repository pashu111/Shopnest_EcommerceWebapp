import mongoose from "mongoose";

const deliveryPartnerSchema = new mongoose.Schema(
  {
    // Basic Details
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    profilePhotoJpg: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer-not"],
      default: "prefer-not",
    },

    // Contact Information
    mobileNumber: {
      type: String,
      required: true,
      unique: true,
    },
    // mobileOtpVerified: {
    //   type: Boolean,
    //   default: false,
    // },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    currentAddress: {
      type: String,
      required: true,
    },

    // Identity & Verification
    aadhaarNumber: {
      type: String,
      required: true,
    },
    panNumber: {
      type: String,
      default: "",
    },

    // Vehicle Details
    vehicleType: {
      type: String,
      enum: ["bike", "cycle", "scooter", ""],
      default: "",
    },
    vehicleNumber: {
      type: String,
      default: "",
    },

    // Work Details
    deliveryCity: {
      type: String,
      required: true,
    },
    availability: {
      type: String,
      enum: ["full-time", "part-time"],
      required: true,
    },
    workingHours: {
      type: String,
      default: "",
    },

    // Account Security
    password: {
      type: String,
      required: true,
    },

    // Optional System Data
    liveLocationPermission: {
      type: Boolean,
      default: false,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    liveLocation: {
      latitude: {
        type: Number,
        default: null,
      },
      longitude: {
        type: Number,
        default: null,
      },
      updatedAt: {
        type: Date,
        default: null,
      },
    },
    location: {
      latitude: {
        type: Number,
        default: null,
      },
      longitude: {
        type: Number,
        default: null,
      },
    },
    ratingsAverage: {
      type: Number,
      default: 0,
    },
    ratingsCount: {
      type: Number,
      default: 0,
    },
    earningsWallet: {
      type: Number,
      default: 0,
    },

    // Password Reset
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  { timestamps: true }
);

export default mongoose.model("DeliveryPartner", deliveryPartnerSchema);
