import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import adminAuthRoutes from "./routes/adminAuth.js";
import ProductRoutes from "./routes/productRoutes.js";
import rewardRoutes from "./routes/rewardRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import deliveryPartnerRoutes from "./routes/deliveryPartnerRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import authMiddleware from "./middleware/authMiddleware.js";
import { getDeliveryPartners } from "./controllers/deliveryPartnerController.js";
import { createRazorpayOrder } from "./controllers/paymentController.js";
import { attachWebSocketServer } from "./ws/wsServer.js";

console.log("server file loaded / restarted");

dotenv.config();

// ✅ Connect to MongoDB Atlas using your config/db.js helper
connectDB();

const app = express();

app.use(cors());
// Increase payload limit to support base64-encoded profile photos.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminAuthRoutes);
app.use("/api/products", ProductRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/delivery", deliveryPartnerRoutes);
app.use("/api/payments", paymentRoutes);
// Alias endpoint to match requested spec: POST /create-order
// (Still uses Razorpay TEST MODE only; see server/config/razorpay.js)
app.post("/create-order", createRazorpayOrder);
// Backstop route (some setups were missing the GET handler via router reloads)
app.get("/api/delivery/admin/partners", authMiddleware, getDeliveryPartners);

app.get("/", (req, res) => {
  res.send("API Running 🚀");
});

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);
const { getStats, publish } = attachWebSocketServer(httpServer, { path: "/ws" });

app.get("/api/ws/health", (req, res) => {
  res.json({ ok: true, ...getStats() });
});

app.use("/api", (req, res) => {
  console.warn("[api-404]", req.method, req.originalUrl);
  res.status(404).json({ message: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Make publish available to controllers for real-time updates
app.set("wsPublish", publish);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket listening on ws://localhost:${PORT}/ws`);
});
