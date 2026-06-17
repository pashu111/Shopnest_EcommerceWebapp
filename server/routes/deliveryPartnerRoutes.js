import express from "express";
import {
  loginDeliveryPartner,
  registerDeliveryPartner,
  getDeliveryPartners,
  forgotPasswordDeliveryPartner,
  resetPasswordDeliveryPartner,
  updateDeliveryPartnerLocation,
  updateDeliveryPartnerOnlineStatus,
} from "../controllers/deliveryPartnerController.js";
import {
  acceptAssignedOrder,
  acceptNearbyDeliveryOrder,
  declineAssignedOrder,
  generateDeliveryOtp,
  getDeliveryPartnerAssignedOrderById,
  getDeliveryPartnerAssignedOrders,
  getNearbyDeliveryOrders,
  rejectNearbyDeliveryOrder,
  verifyDeliveryOtp,
} from "../controllers/orderController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import deliveryPartnerAuthMiddleware from "../middleware/deliveryPartnerAuthMiddleware.js";

const router = express.Router();

router.post("/register", registerDeliveryPartner);
router.post("/login", loginDeliveryPartner);
router.post("/location/update", deliveryPartnerAuthMiddleware, updateDeliveryPartnerLocation);
router.patch("/location", deliveryPartnerAuthMiddleware, updateDeliveryPartnerLocation);
router.patch("/location/update", deliveryPartnerAuthMiddleware, updateDeliveryPartnerLocation);
router.patch("/online-status", deliveryPartnerAuthMiddleware, updateDeliveryPartnerOnlineStatus);

router.get("/nearby-orders", deliveryPartnerAuthMiddleware, getNearbyDeliveryOrders);
router.patch("/nearby-orders/:id/accept", deliveryPartnerAuthMiddleware, acceptNearbyDeliveryOrder);
router.patch("/nearby-orders/:id/reject", deliveryPartnerAuthMiddleware, rejectNearbyDeliveryOrder);
router.get("/assigned-orders", deliveryPartnerAuthMiddleware, getDeliveryPartnerAssignedOrders);
router.get("/assigned-orders/:id", deliveryPartnerAuthMiddleware, getDeliveryPartnerAssignedOrderById);
router.patch("/assigned-orders/:id/accept", deliveryPartnerAuthMiddleware, acceptAssignedOrder);
router.patch("/assigned-orders/:id/decline", deliveryPartnerAuthMiddleware, declineAssignedOrder);
router.patch("/assigned-orders/:id/get-otp", deliveryPartnerAuthMiddleware, generateDeliveryOtp);
router.patch("/assigned-orders/:id/verify-otp", deliveryPartnerAuthMiddleware, verifyDeliveryOtp);

router.get("/admin/partners", authMiddleware, getDeliveryPartners);
router.post("/forgot-password", forgotPasswordDeliveryPartner);
router.post("/reset-password", resetPasswordDeliveryPartner);

export default router;
