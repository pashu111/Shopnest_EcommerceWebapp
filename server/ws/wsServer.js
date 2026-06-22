import crypto from "crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { WebSocketServer } from "ws";
import Admin from "../models/Admin.js";
import DeliveryPartner from "../models/DeliveryPartner.js";
import User from "../models/User.js";

const safeJsonParse = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const sendJson = (socket, data) => {
  if (!socket || socket.readyState !== socket.OPEN) return;
  socket.send(JSON.stringify(data));
};

const getBearerToken = (value) => {
  const token = typeof value === "string" ? value.trim() : "";
  if (!token) return "";
  return token.startsWith("Bearer ") ? token.slice(7).trim() : token;
};

const verifyToken = (token) => {
  const cleanToken = getBearerToken(token);
  if (!cleanToken || !process.env.JWT_SECRET) return null;

  try {
    return jwt.verify(cleanToken, process.env.JWT_SECRET);
  } catch {
    return null;
  }
};

const canSubscribeToTopic = async (topic, tokenPayload) => {
  try {
    if (topic === "public" || topic === "products") return true;
    if (!tokenPayload) return false;

    const tokenId = String(tokenPayload.id || tokenPayload._id || "");
    if (!tokenId) return false;

    if (topic === "admin:orders") {
      if (tokenPayload.isAdmin) return true;
      if (!mongoose.isValidObjectId(tokenId)) return false;
      return Boolean(await Admin.exists({ _id: tokenId }));
    }

    const userMatch = topic.match(/^user:([^:]+):orders$/);
    if (userMatch) {
      if (!mongoose.isValidObjectId(tokenId)) return false;
      return userMatch[1] === tokenId && Boolean(await User.exists({ _id: tokenId }));
    }

    const deliveryMatch = topic.match(/^delivery_partner:([^:]+)$/);
    if (deliveryMatch) {
      if (!mongoose.isValidObjectId(tokenId)) return false;
      return (
        deliveryMatch[1] === tokenId &&
        Boolean(await DeliveryPartner.exists({ _id: tokenId }))
      );
    }

    return false;
  } catch (error) {
    console.error("[ws] canSubscribeToTopic error:", error?.message);
    return false;
  }
};

export const attachWebSocketServer = (httpServer, { path = "/ws" } = {}) => {
  let wss;
  try {
    wss = new WebSocketServer({ server: httpServer, path });
    console.log("[ws] WebSocketServer created on path:", path);
  } catch (err) {
    console.error("[ws] failed to create WebSocket server:", err?.message);
    return { wss: null, publish: () => {}, getStats: () => ({ clients: 0 }) };
  }

  const clientMeta = new Map();

  const publish = (topic, message) => {
    if (!wss || !wss.clients) return;

    const payload = {
      type: "event",
      topic,
      payload: message,
      ts: Date.now(),
    };

    for (const socket of wss.clients) {
      const meta = clientMeta.get(socket);
      if (!meta?.topics?.has(topic)) continue;
      sendJson(socket, payload);
    }
  };

  wss.on("error", (err) => {
    console.error("[ws] server error:", err?.message);
  });

  wss.on("connection", (socket, req) => {
    const id =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : crypto.randomBytes(16).toString("hex");

    clientMeta.set(socket, { id, topics: new Set(["public"]) });

    socket.isAlive = true;
    socket.on("pong", () => {
      socket.isAlive = true;
    });

    sendJson(socket, { type: "ready", clientId: id, path, ts: Date.now() });

    socket.on("message", async (raw) => {
      const msg = safeJsonParse(raw?.toString?.() ?? "");
      if (!msg || typeof msg.type !== "string") {
        sendJson(socket, { type: "error", message: "Invalid JSON message" });
        return;
      }

      const meta = clientMeta.get(socket);

      try {
        switch (msg.type) {
          case "ping":
            sendJson(socket, { type: "pong", ts: Date.now() });
            break;
          case "echo":
            sendJson(socket, { type: "echo", payload: msg.payload ?? null, ts: Date.now() });
            break;
          case "subscribe": {
            const topics = Array.isArray(msg.topics) ? msg.topics : [];
            const tokenPayload = verifyToken(msg.token || msg.authorization);
            const accepted = [];
            const rejected = [];

            for (const topic of topics) {
              const normalizedTopic = typeof topic === "string" ? topic.trim() : "";
              if (!normalizedTopic) continue;

              if (await canSubscribeToTopic(normalizedTopic, tokenPayload)) {
                meta?.topics?.add(normalizedTopic);
                accepted.push(normalizedTopic);
              } else {
                rejected.push(normalizedTopic);
              }
            }

            sendJson(socket, {
              type: "subscribed",
              topics: Array.from(meta?.topics ?? []),
              accepted,
              rejected,
              ts: Date.now(),
            });
            break;
          }
          case "unsubscribe": {
            const topics = Array.isArray(msg.topics) ? msg.topics : [];
            for (const topic of topics) {
              if (typeof topic === "string") meta?.topics?.delete(topic);
            }
            meta?.topics?.add("public");
            sendJson(socket, {
              type: "subscribed",
              topics: Array.from(meta?.topics ?? []),
              ts: Date.now(),
            });
            break;
          }
          case "publish":
            // For safety, do not allow clients to broadcast to others by default.
            sendJson(socket, { type: "error", message: "Client publish disabled" });
            break;
          default:
            sendJson(socket, { type: "error", message: `Unknown type: ${msg.type}` });
            break;
        }
      } catch (error) {
        console.warn("[ws] message handling failed:", error?.message || error);
        sendJson(socket, { type: "error", message: "WebSocket message failed" });
      }
    });

    socket.on("close", () => {
      clientMeta.delete(socket);
    });

    socket.on("error", () => {
      clientMeta.delete(socket);
    });

    const ip =
      req?.headers?.["x-forwarded-for"] ||
      req?.socket?.remoteAddress ||
      "unknown";
    console.log(`[ws] client connected ${id} from ${ip}`);
  });

  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (socket.isAlive === false) {
        clientMeta.delete(socket);
        try { socket.terminate(); } catch { /* ignore */ }
        continue;
      }
      socket.isAlive = false;
      try { socket.ping(); } catch { /* socket already closed */ }
    }
  }, 30000);

  wss.on("close", () => clearInterval(heartbeat));

  const getStats = () => ({ clients: wss.clients.size });

  return { wss, publish, getStats };
};

