import Order from "../models/Order.js";
import DeliveryPartner from "../models/DeliveryPartner.js";
import { clearUserCartData } from "../utils/cartCleanup.js";
import {
  NEARBY_ORDER_TTL_MINUTES,
  assignNearestDeliveryPartnerOffer,
  getNearbyOrdersForPartner,
  publishNearbyOrderToEligiblePartners,
} from "../utils/deliveryMatching.js";

const pickAddress = (data) => {
  if (!data || typeof data !== "object") return "";

  const direct =
    data.deliveryAddress ||
    data.address ||
    data.shippingAddress ||
    data.dropAddress ||
    "";

  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const nestedCandidates = [
    data.deliveryDetails?.address,
    data.shipping?.address,
    data.customerAddress?.address,
    data.customer?.address,
    data.user?.address,
  ];

  for (const value of nestedCandidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
};

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

const stripDeliveryOtpFields = (orderLike) => {
  const plain =
    typeof orderLike?.toObject === "function" ? orderLike.toObject() : orderLike;
  if (!plain || typeof plain !== "object") return plain;
  const clone = { ...plain };
  delete clone.deliveryOtp;
  delete clone.deliveryOtpExpiresAt;
  return clone;
};

// CREATE ORDER
export const createOrder = async (req, res) => {
  try {
    const {
      products,
      totalAmount,
      deliveryCharges,
      paymentMethod,
      customerName,
      customerPhone,
      deliveryAddress,
      address,
      deliveryLocation,
    } = req.body;
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
      user: req.user.id,
      products,
      totalAmount,
      deliveryCharges: deliveryCharges || 0,
      paymentMethod,
      customerName,
      customerPhone,
      deliveryAddress: normalizedDeliveryAddress,
      deliveryLocation: normalizedDeliveryLocation,
      address: normalizedDeliveryAddress,
      nearbyOfferExpiresAt: new Date(Date.now() + NEARBY_ORDER_TTL_MINUTES * 60 * 1000),
    });

    await order.save();
    await clearUserCartData(req.user.id);

    // Publish WebSocket event for real-time notification to admin
    const publish = req.app.get("wsPublish");
    if (typeof publish === "function") {
      try {
        const populatedOrder = await Order.findById(order._id)
          .populate("user", "name email");
        
        publish("admin:orders", {
          type: "new_order",
          order: stripDeliveryOtpFields(populatedOrder),
          timestamp: new Date().toISOString()
        });
        await publishNearbyOrderToEligiblePartners(req.app, order._id);
      } catch (wsError) {
        console.warn("WebSocket publish failed for new order:", wsError);
      }
    }

    res.json(order);
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ message: error.message || "Order save failed" });
  }
};

export const getNearbyDeliveryOrders = async (req, res) => {
  try {
    const partnerId = req.deliveryPartner?.id;
    if (!partnerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const orders = await getNearbyOrdersForPartner(partnerId);
    return res.json(orders);
  } catch (error) {
    console.error("Get nearby delivery orders error:", error);
    return res.status(500).json({ message: "Failed to fetch nearby orders" });
  }
};

export const acceptNearbyDeliveryOrder = async (req, res) => {
  try {
    const partnerId = req.deliveryPartner?.id;
    const { id } = req.params;

    if (!partnerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const order = await Order.findOneAndUpdate(
      {
        _id: id,
        deliveryPartner: null,
        currentDeliveryOfferPartner: partnerId,
        status: { $nin: ["Cancelled", "Delivered", "Out for Delivery"] },
        nearbyRejectedBy: { $ne: partnerId },
        $or: [
          { nearbyOfferExpiresAt: null },
          { nearbyOfferExpiresAt: { $gt: new Date() } },
        ],
      },
      {
        $set: {
          deliveryPartner: partnerId,
          deliveryPartnerAssignedAt: new Date(),
          currentDeliveryOfferPartner: null,
          currentDeliveryOfferDistanceKm: null,
          status: "Packed",
          deliveryOtp: "",
          deliveryOtpExpiresAt: null,
        },
      },
      { new: true }
    )
      .populate("user", "name email phone")
      .populate("deliveryPartner", "fullName mobileNumber profilePhotoJpg deliveryCity availability");

    if (!order) {
      return res
        .status(409)
        .json({ message: "This order is no longer available for nearby assignment" });
    }

    const publish = req.app.get("wsPublish");
    if (typeof publish === "function") {
      try {
        publish(`delivery_partner:${partnerId}`, {
          type: "order_assigned",
          orderId: order._id.toString(),
          deliveryPartnerId: String(partnerId),
          order: stripDeliveryOtpFields(order),
          timestamp: new Date().toISOString(),
        });
        publish("admin:orders", {
          type: "order_assigned",
          orderId: order._id.toString(),
          deliveryPartnerId: String(partnerId),
          order: stripDeliveryOtpFields(order),
          timestamp: new Date().toISOString(),
        });
      } catch (wsError) {
        console.warn("WebSocket publish failed for nearby accept:", wsError);
      }
    }

    return res.json(stripDeliveryOtpFields(order));
  } catch (error) {
    console.error("Accept nearby delivery order error:", error);
    return res.status(500).json({ message: "Failed to accept nearby order" });
  }
};

export const rejectNearbyDeliveryOrder = async (req, res) => {
  try {
    const partnerId = req.deliveryPartner?.id;
    const { id } = req.params;

    if (!partnerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const order = await Order.findOneAndUpdate(
      {
        _id: id,
        deliveryPartner: null,
        currentDeliveryOfferPartner: partnerId,
      },
      {
        $addToSet: { nearbyRejectedBy: partnerId },
        $set: {
          currentDeliveryOfferPartner: null,
          currentDeliveryOfferDistanceKm: null,
        },
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order offer not found" });
    }

    const reassigned = await assignNearestDeliveryPartnerOffer(req.app, order._id);

    return res.json({
      message: reassigned
        ? "Nearby order rejected and reassigned"
        : "Nearby order rejected. No other online partner found.",
      orderId: id,
      reassigned: Boolean(reassigned),
    });
  } catch (error) {
    console.error("Reject nearby delivery order error:", error);
    return res.status(500).json({ message: "Failed to reject nearby order" });
  }
};

// GET USER ORDERS (for user profile)
export const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({
      createdAt: -1,
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

// GET SINGLE ORDER BY ID (for order tracking)
// Supports both MongoDB _id and 8-digit orderId
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    // Build query to match either _id or orderId
    const query = { user: req.user.id };
    if (/^\d{8}$/.test(id)) {
      // If id is exactly 8 digits, it's likely an orderId
      query.orderId = id;
    } else {
      query._id = id;
    }

    const order = await Order.findOne(query).populate("deliveryPartner", "fullName mobileNumber");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(stripDeliveryOtpFields(order));
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch order" });
  }
};

// CANCEL ORDER
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status === "Delivered") {
      return res
        .status(400)
        .json({ message: "Delivered orders cannot be cancelled" });
    }

    order.status = "Cancelled";
    order.deliveryOtp = "";
    order.deliveryOtpExpiresAt = null;

    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate("user", "name email phone")
      .populate("deliveryPartner", "fullName mobileNumber profilePhotoJpg deliveryCity availability");

    const publish = req.app.get("wsPublish");
    if (typeof publish === "function") {
      try {
        const userId = order.user?._id?.toString?.() || order.user?.toString?.();
        if (userId) {
          publish(`user:${userId}:orders`, {
            type: "order_cancelled",
            orderId: order._id.toString(),
            order: stripDeliveryOtpFields(updatedOrder),
            timestamp: new Date().toISOString(),
          });
        }
        publish("admin:orders", {
          type: "order_cancelled",
          orderId: order._id.toString(),
          order: stripDeliveryOtpFields(updatedOrder),
          timestamp: new Date().toISOString(),
        });
      } catch (wsError) {
        console.warn("WebSocket publish failed for cancel order:", wsError);
      }
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Failed to cancel order" });
  }
};

// ⭐ ADMIN: GET ALL ORDERS
export const getAllOrders = async (req, res) => {
  try {

    const orders = await Order
      .find()
      .populate("user", "name email")
      .populate("deliveryPartner", "fullName mobileNumber profilePhotoJpg deliveryCity availability")
      .sort({ createdAt: -1 });

    res.json(orders.map(stripDeliveryOtpFields));

  } catch (error) {

    res.status(500).json({
      message: "Failed to fetch orders"
    });

  }
};

// ⭐ ADMIN: ASSIGN DELIVERY PARTNER TO ORDER
export const assignDeliveryPartner = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryPartnerId } = req.body || {};

    if (!deliveryPartnerId) {
      return res.status(400).json({ message: "deliveryPartnerId is required" });
    }

    const [order, partner] = await Promise.all([
      Order.findById(id),
      DeliveryPartner.findById(deliveryPartnerId).select(
        "fullName mobileNumber profilePhotoJpg deliveryCity availability"
      ),
    ]);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!partner) {
      return res.status(404).json({ message: "Delivery partner not found" });
    }

    if (order.status === "Delivered" || order.status === "Cancelled") {
      return res
        .status(400)
        .json({ message: "Cannot assign partner to this order status" });
    }

    order.deliveryPartner = partner._id;
    order.deliveryPartnerAssignedAt = new Date();
    order.deliveryOtp = "";
    order.deliveryOtpExpiresAt = null;
    // Business rule: once admin assigns a delivery partner,
    // the order should move to Packed for customer tracking.
    if (order.status !== "Out for Delivery") {
      order.status = "Packed";
    }
    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate("user", "name email")
      .populate("deliveryPartner", "fullName mobileNumber profilePhotoJpg deliveryCity availability");

    // Publish WebSocket event for real-time notification to delivery partners
    const publish = req.app.get("wsPublish");
    if (typeof publish === "function") {
      try {
        publish(`delivery_partner:${partner._id.toString()}`, {
          type: "order_assigned",
          orderId: order._id.toString(),
          deliveryPartnerId: partner._id.toString(),
          order: stripDeliveryOtpFields(updatedOrder),
          timestamp: new Date().toISOString()
        });
        publish("admin:orders", {
          type: "order_assigned",
          orderId: order._id.toString(),
          deliveryPartnerId: partner._id.toString(),
          order: stripDeliveryOtpFields(updatedOrder),
          timestamp: new Date().toISOString()
        });
      } catch (wsError) {
        console.warn("WebSocket publish failed:", wsError);
      }
    }

    return res.json(stripDeliveryOtpFields(updatedOrder));
  } catch (error) {
    console.error("Assign delivery partner error:", error);
    return res.status(500).json({ message: "Failed to assign delivery partner" });
  }
};

// DELIVERY PARTNER: GET ASSIGNED ORDERS (dashboard)
export const getDeliveryPartnerAssignedOrders = async (req, res) => {
  try {
    const partnerId = req.deliveryPartner?.id;
    if (!partnerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const orders = await Order.find({ deliveryPartner: partnerId })
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });

    const normalizedOrders = orders.map((order) => {
      const plain = stripDeliveryOtpFields(order);
      if (!plain.deliveryAddress && plain.address) {
        plain.deliveryAddress = plain.address;
      }
      return plain;
    });

    return res.json(normalizedOrders);
  } catch (error) {
    console.error("Get delivery partner assigned orders error:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch assigned orders" });
  }
};

// DELIVERY PARTNER: GET SINGLE ASSIGNED ORDER (details)
export const getDeliveryPartnerAssignedOrderById = async (req, res) => {
  try {
    const partnerId = req.deliveryPartner?.id;
    const { id } = req.params;

    if (!partnerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const order = await Order.findOne({ _id: id, deliveryPartner: partnerId })
      .populate("user", "name email phone");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const plain = stripDeliveryOtpFields(order);
    let normalizedAddress = pickAddress(plain);

    // For very old orders, address key may exist only in raw Mongo doc.
    if (!normalizedAddress) {
      const rawOrder = await Order.collection.findOne({ _id: order._id });
      normalizedAddress = pickAddress(rawOrder);
    }

    if (normalizedAddress) {
      plain.deliveryAddress = normalizedAddress;
    }

    return res.json(plain);
  } catch (error) {
    console.error("Get delivery partner assigned order error:", error);
    return res.status(500).json({ message: "Failed to fetch order details" });
  }
};

// DELIVERY PARTNER: ACCEPT ASSIGNED ORDER -> OUT FOR DELIVERY
export const acceptAssignedOrder = async (req, res) => {
  try {
    const partnerId = req.deliveryPartner?.id;
    const { id } = req.params;

    if (!partnerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const assignedPartnerId = order.deliveryPartner
      ? String(order.deliveryPartner)
      : "";
    if (!assignedPartnerId || assignedPartnerId !== String(partnerId)) {
      return res.status(403).json({ message: "This order is not assigned to you" });
    }

    if (order.status === "Cancelled") {
      return res.status(400).json({ message: "Cancelled order cannot be accepted" });
    }
    if (order.status === "Delivered") {
      return res.status(400).json({ message: "Delivered order cannot be accepted" });
    }

    order.status = "Out for Delivery";
    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate("user", "name email")
      .populate("deliveryPartner", "fullName mobileNumber profilePhotoJpg deliveryCity availability");

    // Publish WebSocket event for real-time notification
    const publish = req.app.get("wsPublish");
    if (typeof publish === "function") {
      try {
        // Notify delivery partner
        publish(`delivery_partner:${partnerId}`, {
          type: "order_status_updated",
          orderId: order._id.toString(),
          deliveryPartnerId: partnerId,
          order: stripDeliveryOtpFields(updatedOrder),
          timestamp: new Date().toISOString()
        });

        // Notify user (customer) about status change
        const userId = order.user?._id?.toString?.() || order.user?.toString?.();
        if (userId) {
          publish(`user:${userId}:orders`, {
            type: "order_status_updated",
            orderId: order._id.toString(),
            status: "Out for Delivery",
            order: stripDeliveryOtpFields(updatedOrder),
            timestamp: new Date().toISOString()
          });
        }
        publish("admin:orders", {
          type: "order_status_updated",
          orderId: order._id.toString(),
          status: "Out for Delivery",
          order: stripDeliveryOtpFields(updatedOrder),
          timestamp: new Date().toISOString()
        });
      } catch (wsError) {
        console.warn("WebSocket publish failed:", wsError);
      }
    }

    return res.json(stripDeliveryOtpFields(updatedOrder));
  } catch (error) {
    console.error("Accept assigned order error:", error);
    return res.status(500).json({ message: "Failed to accept assigned order" });
  }
};

// DELIVERY PARTNER: DECLINE ASSIGNED ORDER
export const declineAssignedOrder = async (req, res) => {
  try {
    const partnerId = req.deliveryPartner?.id;
    const { id } = req.params;

    if (!partnerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const assignedPartnerId = order.deliveryPartner
      ? String(order.deliveryPartner)
      : "";
    if (!assignedPartnerId || assignedPartnerId !== String(partnerId)) {
      return res.status(403).json({ message: "This order is not assigned to you" });
    }

    // Remove the assignment
    order.deliveryPartner = null;
    order.deliveryPartnerAssignedAt = null;

    // Revert status to Placed so it appears back in the admin's unassigned pool
    if (order.status === "Packed" || order.status === "Out for Delivery") {
      order.status = "Placed";
    }

    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate("user", "name email phone")
      .populate("deliveryPartner", "fullName mobileNumber profilePhotoJpg deliveryCity availability");

    const publish = req.app.get("wsPublish");
    if (typeof publish === "function") {
      try {
        publish("admin:orders", {
          type: "order_assignment_declined",
          orderId: order._id.toString(),
          deliveryPartnerId: String(partnerId),
          order: stripDeliveryOtpFields(updatedOrder),
          timestamp: new Date().toISOString(),
        });
      } catch (wsError) {
        console.warn("WebSocket publish failed for assignment decline:", wsError);
      }
    }

    return res.json({ message: "Assignment declined successfully", orderId: id });
  } catch (error) {
    console.error("Decline assigned order error:", error);
    return res.status(500).json({ message: "Failed to decline assignment" });
  }
};

// DELIVERY PARTNER: GENERATE OTP (VISIBLE ONLY TO USER SIDE)
export const generateDeliveryOtp = async (req, res) => {
  try {
    const partnerId = req.deliveryPartner?.id;
    const { id } = req.params;

    if (!partnerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (String(order.deliveryPartner || "") !== String(partnerId)) {
      return res.status(403).json({ message: "This order is not assigned to you" });
    }

    if (order.status === "Cancelled" || order.status === "Delivered") {
      return res.status(400).json({ message: "OTP cannot be generated for this order status" });
    }

    const otp = String(Math.floor(1000 + Math.random() * 9000));
    order.deliveryOtp = otp;
    order.deliveryOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    if (order.status !== "Out for Delivery") {
      order.status = "Out for Delivery";
    }
    await order.save();

    // Publish WebSocket event to notify user about OTP
    const publish = req.app.get("wsPublish");
    if (typeof publish === "function") {
      try {
        const updatedOrder = await Order.findById(order._id)
          .populate("user", "name email phone")
          .populate("deliveryPartner", "fullName mobileNumber profilePhotoJpg deliveryCity availability");
        const userId = order.user?._id?.toString?.() || order.user?.toString?.();
        if (userId) {
          publish(`user:${userId}:orders`, {
            type: "otp_generated",
            orderId: order._id.toString(),
            otp: otp,
            order: stripDeliveryOtpFields(updatedOrder),
            expiresAt: order.deliveryOtpExpiresAt,
            timestamp: new Date().toISOString()
          });
        }
        publish("admin:orders", {
          type: "order_status_updated",
          orderId: order._id.toString(),
          status: order.status,
          order: stripDeliveryOtpFields(updatedOrder),
          timestamp: new Date().toISOString()
        });
      } catch (wsError) {
        console.warn("WebSocket publish failed for OTP:", wsError);
      }
    }

    return res.json({
      message: "OTP generated successfully",
      otpSentToUser: true,
      expiresAt: order.deliveryOtpExpiresAt,
      orderId: order._id,
    });
  } catch (error) {
    console.error("Generate delivery OTP error:", error);
    return res.status(500).json({ message: "Failed to generate OTP" });
  }
};

// DELIVERY PARTNER: VERIFY USER OTP -> DELIVERED
export const verifyDeliveryOtp = async (req, res) => {
  try {
    const partnerId = req.deliveryPartner?.id;
    const { id } = req.params;
    const { otp } = req.body || {};

    if (!partnerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!otp) {
      return res.status(400).json({ message: "OTP is required" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (String(order.deliveryPartner || "") !== String(partnerId)) {
      return res.status(403).json({ message: "This order is not assigned to you" });
    }

    if (order.status === "Cancelled") {
      return res.status(400).json({ message: "Cancelled order cannot be delivered" });
    }
    if (order.status === "Delivered") {
      return res.status(400).json({ message: "Order is already delivered" });
    }

    if (!order.deliveryOtp || !order.deliveryOtpExpiresAt) {
      return res.status(400).json({ message: "No active OTP for this order" });
    }

    if (new Date(order.deliveryOtpExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({ message: "OTP has expired. Please generate a new OTP." });
    }

    if (String(order.deliveryOtp) !== String(otp).trim()) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    order.status = "Delivered";
    order.deliveredAt = new Date();
    order.deliveryOtp = "";
    order.deliveryOtpExpiresAt = null;
    await order.save();

    // Credit 40/- earnings to delivery partner for successful delivery
    const updatedPartner = await DeliveryPartner.findByIdAndUpdate(
      partnerId,
      { $inc: { earningsWallet: 40 } },
      { new: true, runValidators: true }
    );

    const updatedOrder = await Order.findById(order._id)
      .populate("user", "name email phone")
      .populate("deliveryPartner", "fullName mobileNumber profilePhotoJpg deliveryCity availability earningsWallet");

    // Publish WebSocket event to notify user about delivery completion
    const publish = req.app.get("wsPublish");
    if (typeof publish === "function") {
      try {
        const userId = order.user?._id?.toString?.() || order.user?.toString?.();
        if (userId) {
          publish(`user:${userId}:orders`, {
            type: "order_delivered",
            orderId: order._id.toString(),
            deliveredAt: order.deliveredAt,
            order: stripDeliveryOtpFields(updatedOrder),
            timestamp: new Date().toISOString()
          });
        }
        publish(`delivery_partner:${partnerId}`, {
          type: "order_status_updated",
          orderId: order._id.toString(),
          deliveryPartnerId: String(partnerId),
          order: stripDeliveryOtpFields(updatedOrder),
          timestamp: new Date().toISOString()
        });
        publish("admin:orders", {
          type: "order_delivered",
          orderId: order._id.toString(),
          order: stripDeliveryOtpFields(updatedOrder),
          timestamp: new Date().toISOString()
        });
      } catch (wsError) {
        console.warn("WebSocket publish failed for delivery:", wsError);
      }
    }

    return res.json({
      order: stripDeliveryOtpFields(updatedOrder),
      updatedEarnings: updatedPartner?.earningsWallet || 0
    });
  } catch (error) {
    console.error("Verify delivery OTP error:", error);
    return res.status(500).json({ message: "Failed to verify OTP" });
  }
};
