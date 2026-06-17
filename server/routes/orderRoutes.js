import express from "express";
import {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  assignDeliveryPartner,
  acceptNearbyDeliveryOrder,
  getDeliveryPartnerAssignedOrders,
  getDeliveryPartnerAssignedOrderById,
  getNearbyDeliveryOrders,
  rejectNearbyDeliveryOrder,
  acceptAssignedOrder,
  declineAssignedOrder,
  generateDeliveryOtp,
  verifyDeliveryOtp,
} from "../controllers/orderController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import deliveryPartnerAuthMiddleware from "../middleware/deliveryPartnerAuthMiddleware.js";
import {
  updateDeliveryPartnerLocation,
  updateDeliveryPartnerOnlineStatus,
} from "../controllers/deliveryPartnerController.js";

const router = express.Router();

//admin routes (for admin dashboard)
router.get("/admin/orders", authMiddleware, getAllOrders);
router.patch(
  "/admin/orders/:id/assign-delivery-partner",
  authMiddleware,
  assignDeliveryPartner
);

// delivery partner routes
router.post(
  "/delivery/location/update",
  deliveryPartnerAuthMiddleware,
  updateDeliveryPartnerLocation
);
router.patch(
  "/delivery/location/update",
  deliveryPartnerAuthMiddleware,
  updateDeliveryPartnerLocation
);
router.patch(
  "/delivery/location",
  deliveryPartnerAuthMiddleware,
  updateDeliveryPartnerLocation
);
router.patch(
  "/delivery/online-status",
  deliveryPartnerAuthMiddleware,
  updateDeliveryPartnerOnlineStatus
);
router.get(
  "/delivery/nearby-orders",
  deliveryPartnerAuthMiddleware,
  getNearbyDeliveryOrders
);
router.patch(
  "/delivery/nearby-orders/:id/accept",
  deliveryPartnerAuthMiddleware,
  acceptNearbyDeliveryOrder
);
router.patch(
  "/delivery/nearby-orders/:id/reject",
  deliveryPartnerAuthMiddleware,
  rejectNearbyDeliveryOrder
);
router.get(
  "/delivery/assigned-orders",
  deliveryPartnerAuthMiddleware,
  getDeliveryPartnerAssignedOrders
);
router.get(
  "/delivery/assigned-orders/:id",
  deliveryPartnerAuthMiddleware,
  getDeliveryPartnerAssignedOrderById
);
router.patch(
  "/delivery/assigned-orders/:id/accept",
  deliveryPartnerAuthMiddleware,
  acceptAssignedOrder
);
router.patch(
  "/delivery/assigned-orders/:id/decline",
  deliveryPartnerAuthMiddleware,
  declineAssignedOrder
);
router.patch(
  "/delivery/assigned-orders/:id/get-otp",
  deliveryPartnerAuthMiddleware,
  generateDeliveryOtp
);
router.patch(
  "/delivery/assigned-orders/:id/verify-otp",
  deliveryPartnerAuthMiddleware,
  verifyDeliveryOtp
);

// user routes
// Keep parameterized routes last so paths like /delivery/nearby-orders
// are not accidentally treated as an order id.
router.post("/create", authMiddleware, createOrder);
router.get("/my-orders", authMiddleware, getUserOrders);
router.get("/:id", authMiddleware, getOrderById);
router.patch("/:id/cancel", authMiddleware, cancelOrder);

export default router;
