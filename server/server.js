import express from "express";
import dotenv from "dotenv";
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

dotenv.config();
console.log("Server starting...");

const app = express();

// ── Allowed origins ──
const FRONTEND_URL = (process.env.FRONTEND_URL || "").trim().replace(/\/$/, "");
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://shopnest-ecommerce-webapp.vercel.app",
  "https://shopnest-ecommerce-webapp.onrender.com",
];
if (FRONTEND_URL && !allowedOrigins.includes(FRONTEND_URL)) {
  allowedOrigins.push(FRONTEND_URL);
}

const originAllowed = (origin) => origin && allowedOrigins.includes(origin);

// ─────────────────────────────────────────────────────────────────────────
// HTTP server with CORS enforcement at the Node.js transport layer
//
// Express 5's response pipeline may drop headers set by middleware via
// res.setHeader().  The two strategies below operate OUTSIDE Express,
// intercepting the raw http.ServerResponse object.  This guarantees CORS
// headers are present on every HTTP response, including error paths.
// ─────────────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  const isAllowed = originAllowed(origin);

  // ── 1. OPTIONS preflight — handle at transport level, Express never runs ──
  if (req.method === "OPTIONS" && isAllowed) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    });
    res.end();
    return;
  }

  // ── 2. All other requests — patch writeHead to inject CORS at serialisation ──
  //     This fires AFTER all Express middleware + route handlers complete.
  if (isAllowed) {
    const originalWriteHead = res.writeHead.bind(res);
    res.writeHead = function (statusCode, statusMessage, headers) {
      if (!this.headersSent) {
        this.setHeader("Access-Control-Allow-Origin", origin);
        this.setHeader("Access-Control-Allow-Credentials", "true");
      }
      return originalWriteHead(statusCode, statusMessage, headers);
    };
  }

  // Forward to Express
  app(req, res);
});

// ── Body parser ──
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Health ──
app.get("/", (req, res) => res.status(200).send("API Running 🚀"));

// ── DB ──
connectDB().catch((err) => console.error("MongoDB connection failed:", err));

// ── Routes ──
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminAuthRoutes);
app.use("/api/products", ProductRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/delivery", deliveryPartnerRoutes);
app.use("/api/payments", paymentRoutes);

app.post("/create-order", createRazorpayOrder);

app.get("/api/delivery/admin/partners", authMiddleware, getDeliveryPartners);

// ── WebSocket server ──
const PORT = process.env.PORT || 5000;
const { getStats, publish } = attachWebSocketServer(server, { path: "/ws" });
app.set("wsPublish", publish);

// ── Debug & health routes ──
app.get("/api/debug/cors", (req, res) => {
  res.json({
    cors: true,
    yourOrigin: req.headers.origin || null,
    allowedOrigins,
    responseAccessControlAllowOrigin: res.getHeader("Access-Control-Allow-Origin"),
  });
});

app.get("/api/debug/ws", (req, res) => {
  try {
    res.json({ ws: true, clients: getStats().clients });
  } catch (err) {
    res.status(500).json({ ws: false, message: err.message });
  }
});

app.get("/api/ws/health", (req, res) => {
  try { res.json({ ok: true, ...getStats() }); }
  catch (err) { res.status(500).json({ ok: false, message: err.message }); }
});

// ── API 404 ──
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ── Start ──
console.log("[CORS ENABLED] origins:", allowedOrigins);
server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
  console.log("WebSocket path: /ws");
});
