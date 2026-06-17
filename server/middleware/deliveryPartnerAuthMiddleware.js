import jwt from "jsonwebtoken";
import DeliveryPartner from "../models/DeliveryPartner.js";

const deliveryPartnerAuthMiddleware = async (req, res, next) => {
  const authHeader =
    req.headers.authorization ||
    req.headers.Authorization ||
    req.headers["x-access-token"];

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: "JWT secret not configured" });
  }

  if (!authHeader) {
    console.warn("[delivery-auth] missing token", req.method, req.originalUrl);
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader;

  if (!token || token === "null" || token === "undefined") {
    console.warn("[delivery-auth] invalid token value", req.method, req.originalUrl);
    return res.status(401).json({ message: "Invalid token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const deliveryPartnerId = decoded.id || decoded._id;

    if (!deliveryPartnerId) {
      console.warn("[delivery-auth] token missing partner id", req.method, req.originalUrl);
      return res.status(401).json({ message: "Invalid token payload" });
    }

    const partner = await DeliveryPartner.findById(deliveryPartnerId).select(
      "_id fullName mobileNumber deliveryCity availability"
    );

    if (!partner) {
      console.warn("[delivery-auth] partner not found", deliveryPartnerId, req.method, req.originalUrl);
      return res.status(403).json({ message: "Delivery partner not authorized" });
    }

    req.deliveryPartner = { id: partner._id };
    req.deliveryPartnerDoc = partner;
    return next();
  } catch (error) {
    console.warn("[delivery-auth] token verification failed", req.method, req.originalUrl, error?.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default deliveryPartnerAuthMiddleware;

