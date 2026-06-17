import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import { getOrderById, cancelOrder } from "../services/orderService";
import { useWebSocket } from "../context/WebSocketContext";
import { resolveAssetUrl } from "../utils/assetUrl";
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  User,
  CreditCard,
  ArrowLeft,
  XCircle,
  AlertCircle,
  Bell,
  Key,
  X,
  Maximize2,
} from "lucide-react";

const statusTimeline = [
  {
    key: "Placed",
    label: "Order Placed",
    icon: Package,
    description: "Your order has been received",
  },
  {
    key: "Packed",
    label: "Packed",
    icon: Package,
    description: "Order is being prepared",
  },
  {
    key: "Out for Delivery",
    label: "Out for Delivery",
    icon: Truck,
    description: "On the way to you",
  },
  {
    key: "Delivered",
    label: "Delivered",
    icon: CheckCircle,
    description: "Order delivered successfully",
  },
];

export default function OrderTracking() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [notification, setNotification] = useState(null);
  const [subscribed, setSubscribed] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const { lastMessage, sendJson, status: wsStatus } = useWebSocket();
  const processedEventIds = useRef(new Set());

  useEffect(() => {
    if (!user?.token || !orderId) return;

    if (wsStatus !== "open") {
      setSubscribed(false);
      return;
    }

    if (!subscribed) {
      const userId = user._id || user.id;
      sendJson({ type: "subscribe", topics: [`user:${userId}:orders`], token: user.token });
      setSubscribed(true);
    }
  }, [wsStatus, subscribed, sendJson, user, orderId]);

  useEffect(() => {
    if (!lastMessage || !user) return;

    const userId = user._id || user.id;
    const expectedTopic = `user:${userId}:orders`;

    if (lastMessage.topic !== expectedTopic || !lastMessage.payload) return;

    const {
      type,
      orderId: eventOrderId,
      order: updatedOrder,
      otp,
      expiresAt,
    } = lastMessage.payload;

    const eventMatchesCurrentOrder =
      String(eventOrderId || "") === String(orderId) ||
      String(updatedOrder?._id || "") === String(orderId) ||
      String(updatedOrder?.orderId || "") === String(orderId);
    if (!eventMatchesCurrentOrder) return;

    const eventId = `${type}-${eventOrderId}-${lastMessage.payload.timestamp || ""}`;
    if (processedEventIds.current.has(eventId)) return;
    processedEventIds.current.add(eventId);

    switch (type) {
      case "order_status_updated":
        setOrder(updatedOrder);
        setNotification({
          type: "status",
          message: `Order status updated to: ${updatedOrder.status}`,
        });
        setTimeout(() => setNotification(null), 3000);
        break;

      case "otp_generated":
        if (updatedOrder) setOrder(updatedOrder);
        setOtpValue(otp);
        setOtpExpiresAt(expiresAt);
        setShowOtp(true);
        setNotification({
          type: "otp",
          message:
            "Delivery OTP generated! Please share this OTP with the delivery partner.",
        });
        setTimeout(() => setNotification(null), 5000);
        break;

      case "order_delivered":
        setOrder(updatedOrder);
        setShowOtp(false);
        setOtpValue("");
        setOtpExpiresAt(null);
        setNotification({
          type: "delivered",
          message: "Order delivered successfully!",
        });
        setTimeout(() => setNotification(null), 5000);
        break;

      case "order_cancelled":
        setOrder(updatedOrder);
        setShowOtp(false);
        setOtpValue("");
        setOtpExpiresAt(null);
        setNotification({
          type: "status",
          message: "Order cancelled.",
        });
        setTimeout(() => setNotification(null), 5000);
        break;

      default:
        break;
    }
  }, [lastMessage, user, orderId]);

  // Initialize map when showMap is toggled
  useEffect(() => {
    if (showMap && mapContainerRef.current && !mapInstanceRef.current) {
      // Dynamically load Leaflet CSS and JS
      const loadLeaflet = async () => {
        // Load CSS
        if (!document.querySelector('link[href*="leaflet.css"]')) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
          link.crossOrigin = "";
          document.head.appendChild(link);
        }

        // Load JS
        if (!window.L) {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
          script.crossOrigin = "";
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        // Initialize map after Leaflet is loaded
        if (window.L && mapContainerRef.current) {
          // Default to India center, will geocode address if possible
          const defaultCoords = [20.5937, 78.9629]; // Center of India

          const map = window.L.map(mapContainerRef.current).setView(defaultCoords, 5);

          window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "© OpenStreetMap contributors",
          }).addTo(map);

          const marker = window.L.marker(defaultCoords).addTo(map);
          marker.bindPopup(`<strong>Delivery Location</strong><br>${order.deliveryAddress || order.address || "Address not available"}`).openPopup();

          mapInstanceRef.current = map;
          markerRef.current = marker;

          // Try to geocode the address using Nominatim (free, no API key needed)
          const address = order.deliveryAddress || order.address;
          if (address) {
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
              );
              const data = await response.json();
              if (data && data.length > 0) {
                const { lat, lon } = data[0];
                map.setView([parseFloat(lat), parseFloat(lon)], 14);
                marker.setLatLng([parseFloat(lat), parseFloat(lon)]);
                marker.openPopup();
              }
            } catch (err) {
              console.warn("Geocoding failed:", err);
            }
          }
        }
      };

      loadLeaflet();
    }

    return () => {
      // Don't destroy map on unmount, just hide - we want to keep it cached
    };
  }, [showMap, order]);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const token = user?.token;
        if (!token || !orderId) {
          setError("Invalid order ID");
          setLoading(false);
          return;
        }
        const data = await getOrderById(orderId, token);
        setOrder(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching order:", err);
        setError(err.response?.data?.message || "Failed to fetch order details");
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, user?.token]);

  const handleCancelOrder = async () => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;

    try {
      setCancelling(true);
      const token = user?.token;
      const data = await cancelOrder(orderId, token);
      setOrder(data);
    } catch (err) {
      console.error("Error cancelling order:", err);
      alert(err.response?.data?.message || "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  const getCurrentStatusIndex = (status) => {
    const index = statusTimeline.findIndex((step) => step.key === status);
    return index >= 0 ? index : -1;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f5f2] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="text-slate-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#f7f5f2] flex items-center justify-center">
        <div className="max-w-md px-4 text-center">
          <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h2 className="mb-2 text-2xl font-bold text-slate-900">
            Order Not Found
          </h2>
          <p className="mb-6 text-slate-600">
            {error || "The order you're looking for doesn't exist."}
          </p>
          <Link
            to="/orders"
            className="inline-block rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700"
          >
            View My Orders
          </Link>
        </div>
      </div>
    );
  }

  const currentStatusIndex = getCurrentStatusIndex(order.status);
  const isCancelled = order.status === "Cancelled";
  const isDelivered = order.status === "Delivered";
  const canCancel =
    !isCancelled && !isDelivered && order.status !== "Out for Delivery";
  const statusBadgeClass = isCancelled
    ? "bg-red-50 text-red-700 border border-red-200"
    : isDelivered
    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
    : order.status === "Out for Delivery"
    ? "bg-blue-50 text-blue-700 border border-blue-200"
    : order.status === "Packed"
    ? "bg-amber-50 text-amber-700 border border-amber-200"
    : "bg-slate-50 text-slate-700 border border-slate-200";

  return (
    <div className="min-h-screen bg-[#f7f5f2]">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="fixed left-4 right-4 top-4 z-50 animate-in slide-in-from-right fade-in duration-300 sm:left-auto sm:right-4 sm:w-auto">
          <div
            className={`flex items-start gap-3 rounded-xl px-4 py-4 shadow-lg sm:px-6 ${
              notification.type === "otp"
                ? "bg-amber-600 text-white"
                : notification.type === "delivered"
                ? "bg-emerald-600 text-white"
                : "bg-blue-600 text-white"
            }`}
          >
            <Bell className="shrink-0 animate-pulse" size={20} />
            <div className="min-w-0">
              <p className="break-words font-semibold">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="ml-auto opacity-80 transition hover:opacity-100"
              aria-label="Dismiss notification"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {showOtp && otpValue && (
        <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between bg-amber-500 px-6 py-4">
              <div className="flex items-center gap-2 text-white">
                <Key size={20} />
                <h3 className="font-bold">Delivery OTP</h3>
              </div>
              <button
                onClick={() => {
                  setShowOtp(false);
                  setOtpValue("");
                  setOtpExpiresAt(null);
                }}
                className="text-white/80 transition hover:text-white"
                aria-label="Close OTP"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 text-center">
              <p className="mb-4 text-slate-600">
                Share this OTP with your delivery partner
              </p>
              <div className="mb-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-6">
                <p className="font-mono text-4xl font-bold tracking-widest text-amber-700 sm:text-5xl">
                  {otpValue}
                </p>
              </div>
              {otpExpiresAt && (
                <p className="text-sm text-slate-500">
                  Valid until: {new Date(otpExpiresAt).toLocaleTimeString()}
                </p>
              )}
              <p className="mt-4 text-xs text-slate-400">
                Do not share this OTP with anyone except your delivery partner
              </p>
            </div>
          </motion.div>
        </div>
      )}

      <div className="mx-auto max-w-4xl px-4 pb-2 sm:px-6">
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              wsStatus === "open"
                ? "bg-emerald-500"
                : wsStatus === "connecting"
                ? "bg-amber-500"
                : wsStatus === "error"
                ? "bg-rose-500"
                : "bg-slate-400"
            }`}
          />
          <span className="text-slate-500">
            {wsStatus === "open"
              ? "Live updates active"
              : wsStatus === "connecting"
              ? "Connecting..."
              : wsStatus === "error"
              ? "Connection error"
              : "Disconnected"}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Order ID
              </p>
              <h1 className="mt-1 break-all text-2xl font-bold text-slate-900 sm:text-3xl">
                {order.orderId || order._id}
              </h1>
            </div>
            <div
              className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${statusBadgeClass}`}
            >
              {isCancelled ? (
                <XCircle className="h-5 w-5" />
              ) : isDelivered ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <Clock className="h-5 w-5" />
              )}
              <span>
                {isCancelled
                  ? "Cancelled"
                  : isDelivered
                  ? "Delivered"
                  : order.status === "Out for Delivery"
                  ? "Out for Delivery"
                  : order.status}
              </span>
            </div>
          </div>

          <div className="relative">
            {isCancelled ? (
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-red-900">Order Cancelled</p>
                  <p className="text-sm text-red-700">
                    This order has been cancelled
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {statusTimeline.map((status, index) => {
                  const Icon = status.icon;
                  const isCompleted = index < currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;

                  return (
                    <div key={status.key} className="relative flex flex-col items-center">
                      {index < statusTimeline.length - 1 && (
                        <div
                          className={`absolute left-1/2 top-6 hidden h-1 lg:block ${
                            index < currentStatusIndex
                              ? "bg-emerald-500"
                              : "bg-slate-200"
                          }`}
                          style={{ width: "calc(100% - 3rem)" }}
                        />
                      )}

                      <div
                        className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 ${
                          isCompleted
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : isCurrent
                            ? "border-emerald-500 bg-white text-emerald-600 animate-pulse"
                            : "border-slate-200 bg-white text-slate-400"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="mt-3 text-center">
                        <p
                          className={`text-xs font-semibold ${
                            isCompleted || isCurrent
                              ? "text-emerald-700"
                              : "text-slate-400"
                          }`}
                        >
                          {status.label}
                        </p>
                        <p
                          className={`mt-1 text-xs ${
                            isCompleted || isCurrent
                              ? "text-slate-600"
                              : "text-slate-400"
                          }`}
                        >
                          {status.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {order.deliveryPartner && !isCancelled && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">
                Delivery Partner
              </p>
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <User className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="break-words font-semibold text-slate-900">
                    {order.deliveryPartner.fullName}
                  </p>
                  {order.deliveryPartner.mobileNumber && (
                    <p className="break-all text-sm text-slate-600">
                      {order.deliveryPartner.mobileNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-slate-900">
                  Delivery Address
                </h2>
              </div>
              <button
                onClick={() => setShowMap(!showMap)}
                className="flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition"
              >
                {showMap ? "Hide Map" : "View on Map"}
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              <p className="break-words font-semibold text-slate-900">
                {order.customerName}
              </p>
              <p className="break-all text-slate-600">{order.customerPhone}</p>
              <p className="break-words text-slate-600">
                {order.deliveryAddress || order.address}
              </p>
            </div>

            {showMap && (
              <div className="mt-4">
                <div
                  ref={mapContainerRef}
                  className="w-full h-64 rounded-xl border border-slate-200 overflow-hidden"
                  style={{ minHeight: "256px" }}
                />
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900">Order Info</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <span className="text-slate-500">Payment Method</span>
                <span className="break-words text-right font-semibold text-slate-900">
                  {order.paymentMethod}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-slate-500">Total Amount</span>
                <span className="font-semibold text-slate-900">
                  Rs. {order.totalAmount}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-slate-500">Order Date</span>
                <span className="text-right font-semibold text-slate-900">
                  {formatDate(order.createdAt)}
                </span>
              </div>
              {order.deliveredAt && (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-slate-500">Delivered On</span>
                  <span className="text-right font-semibold text-emerald-600">
                    {formatDate(order.deliveredAt)}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-bold text-slate-900">Order Items</h2>
          <div className="space-y-4">
            {order.products?.map((product, index) => (
              <div
                key={index}
                className="flex flex-col items-start gap-4 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center"
              >
                {product.image ? (
                  <img
                    src={resolveAssetUrl(product.image)}
                    alt={product.name}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-200">
                    <Package className="h-6 w-6 text-slate-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="break-words font-semibold text-slate-900">
                    {product.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    Qty: {product.quantity}
                  </p>
                </div>
                <p className="font-semibold text-slate-900 sm:text-right">
                  Rs. {product.price * product.quantity}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-6 flex flex-wrap gap-3"
        >
          <Link
            to="/"
            className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700"
          >
            Continue Shopping
          </Link>
          <Link
            to="/orders"
            className="rounded-xl bg-slate-100 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            View All Orders
          </Link>
          {canCancel && (
            <button
              onClick={handleCancelOrder}
              disabled={cancelling}
              className="rounded-xl border border-red-200 bg-red-50 px-6 py-3 font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
            >
              {cancelling ? "Cancelling..." : "Cancel Order"}
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
