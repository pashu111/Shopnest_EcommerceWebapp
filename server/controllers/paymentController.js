import crypto from "crypto";
import Order from "../models/Order.js";
import { getRazorpayInstance, getRazorpayKeyId, requireRazorpayConfig } from "../config/razorpay.js";
import { clearUserCartData } from "../utils/cartCleanup.js";
import {
  NEARBY_ORDER_TTL_MINUTES,
  publishNearbyOrderToEligiblePartners,
} from "../utils/deliveryMatching.js";

const normalizeDeliveryLocation = (data) => {
  const location = data?.deliveryLocation || {};
  const parseCoordinate = (value) =>
    value === null || value === "" || typeof value === "undefined"
      ? NaN
      : Number(value);
  const fullAddress = String(
    location.fullAddress ||
      data?.deliveryAddress ||
      data?.address ||
      ""
  ).trim();
  const latitude = parseCoordinate(location.latitude);
  const longitude = parseCoordinate(location.longitude);

  return {
    latitude,
    longitude,
    fullAddress,
  };
};

const validateDeliveryLocation = (location) => {
  if (!location.fullAddress || location.fullAddress.length < 12) {
    return "A complete delivery address is required";
  }
  if (!Number.isFinite(location.latitude) || location.latitude < -90 || location.latitude > 90) {
    return "A valid delivery latitude is required";
  }
  if (!Number.isFinite(location.longitude) || location.longitude < -180 || location.longitude > 180) {
    return "A valid delivery longitude is required";
  }

  return "";
};

export const getRazorpayKey = async (req, res) => {
  try {
    return res.json({ keyId: getRazorpayKeyId() });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ message: error.message || "Server error" });
  }
};

export const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, currency, receipt, notes } = req.body || {};

    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return res.status(400).json({ message: "Valid amount (in paise) is required" });
    }

    const payload = {
      amount: Math.round(normalizedAmount),
      currency: String(currency || "INR").toUpperCase(),
      receipt: String(receipt || `rcpt_${Date.now()}`),
      payment_capture: 1,
      notes: notes && typeof notes === "object" ? notes : undefined,
    };

    // Uses Razorpay Node SDK. With TEST MODE keys, no real money is processed.
    const razorpay = getRazorpayInstance();
    const created = await razorpay.orders.create(payload);

    return res.json({
      keyId: getRazorpayKeyId(),
      orderId: created.id,
      amount: created.amount,
      currency: created.currency,
    });
  } catch (error) {
    console.error("Create Razorpay order error:", error);
    const status = error.statusCode || 500;
    return res.status(status).json({ message: error.message || "Server error" });
  }
};

export const verifyRazorpayAndCreateOrder = async (req, res) => {
  try {
    const { keySecret } = requireRazorpayConfig();
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderPayload,
    } = req.body || {};

    const orderId = String(razorpay_order_id || "").trim();
    const paymentId = String(razorpay_payment_id || "").trim();
    const signature = String(razorpay_signature || "").trim();

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ message: "Missing Razorpay payment details" });
    }

    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (expected !== signature) {
      return res.status(400).json({ message: "Payment signature verification failed" });
    }

    const existingOrder = await Order.findOne({
      user: userId,
      $or: [
        { "paymentResult.razorpayPaymentId": paymentId },
        { "paymentResult.razorpayOrderId": orderId },
      ],
    });

    if (existingOrder) {
      await clearUserCartData(userId);
      return res.json(existingOrder);
    }

    const {
      products,
      totalAmount,
      deliveryCharges,
      customerName,
      customerPhone,
      deliveryAddress,
      address,
      deliveryLocation,
    } = orderPayload || {};

    if (!Array.isArray(products) || !products.length) {
      return res.status(400).json({ message: "Order products are required" });
    }

    const amountNumber = Number(totalAmount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return res.status(400).json({ message: "Valid totalAmount is required" });
    }

    const normalizedDeliveryLocation = normalizeDeliveryLocation({
      deliveryLocation,
      deliveryAddress,
      address,
    });
    const locationError = validateDeliveryLocation(normalizedDeliveryLocation);
    if (locationError) {
      return res.status(400).json({ message: locationError });
    }
    const normalizedDeliveryAddress = normalizedDeliveryLocation.fullAddress;

    const order = new Order({
      user: userId,
      products,
      totalAmount: amountNumber,
      deliveryCharges: Number.isFinite(Number(deliveryCharges)) ? Number(deliveryCharges) : 0,
      paymentMethod: "Razorpay",
      isPaid: true,
      paidAt: new Date(),
      paymentResult: {
        provider: "razorpay",
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
      },
      customerName: String(customerName || "").trim(),
      customerPhone: String(customerPhone || "").trim(),
      deliveryAddress: normalizedDeliveryAddress,
      deliveryLocation: normalizedDeliveryLocation,
      address: normalizedDeliveryAddress,
      nearbyOfferExpiresAt: new Date(Date.now() + NEARBY_ORDER_TTL_MINUTES * 60 * 1000),
    });

    await order.save();
    await clearUserCartData(userId);

    const publish = req.app.get("wsPublish");
    if (typeof publish === "function") {
      try {
        const populatedOrder = await Order.findById(order._id).populate("user", "name email");
        publish("admin:orders", {
          type: "new_order",
          order: populatedOrder,
          timestamp: new Date().toISOString(),
        });
        await publishNearbyOrderToEligiblePartners(req.app, order._id);
      } catch (wsError) {
        console.warn("WebSocket publish failed for Razorpay order:", wsError);
      }
    }

    return res.json(order);
  } catch (error) {
    console.error("Verify Razorpay payment error:", error);
    const status = error.statusCode || 500;
    return res.status(status).json({ message: error.message || "Server error" });
  }
};
