import mongoose from "mongoose";

const generate8DigitId = () => {
  // Generate a random 8-digit number (10000000 to 99999999)
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

const orderSchema = new mongoose.Schema(
{
  orderId: {
    type: String,
    unique: true,
    default: generate8DigitId,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  deliveryPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DeliveryPartner",
    default: null,
  },
  deliveryPartnerAssignedAt: {
    type: Date,
    default: null,
  },
  currentDeliveryOfferPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DeliveryPartner",
    default: null,
  },
  currentDeliveryOfferDistanceKm: {
    type: Number,
    default: null,
  },
  nearbyOfferExpiresAt: {
    type: Date,
    default: null,
  },
  nearbyRejectedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryPartner",
    },
  ],

  products: [
    {
      productId: String,
      name: String,
      price: Number,
      quantity: Number,
      image: String
    }
  ],

  customerName: String,
  customerPhone: String,
  deliveryAddress: String,
  deliveryLocation: {
    latitude: Number,
    longitude: Number,
    fullAddress: String,
  },
  // Backward compatibility for older orders saved with `address`.
  address: String,

  totalAmount: Number,
  deliveryCharges: {
    type: Number,
    default: 0
  },

  paymentMethod: String,

  isPaid: {
    type: Boolean,
    default: false,
  },
  paidAt: {
    type: Date,
    default: null,
  },
  paymentResult: {
    provider: { type: String, default: "" },
    razorpayOrderId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },
    razorpaySignature: { type: String, default: "" },
  },

  status: {
    type: String,
    default: "Placed"
  },
  deliveryOtp: {
    type: String,
    default: "",
  },
  deliveryOtpExpiresAt: {
    type: Date,
    default: null,
  },
  deliveredAt: {
    type: Date,
    default: null,
  }

},
{ timestamps: true }
);

export default mongoose.model("Order", orderSchema);
