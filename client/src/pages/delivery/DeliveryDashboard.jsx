import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { 
  deliveryLogout, 
} from "../../redux/slices/deliveryAuthSlice";
import {
  acceptNearbyDeliveryOrder,
  acceptDeliveryAssignedOrder,
  declineDeliveryAssignedOrder,
  generateDeliveryOtp,
  getDeliveryAssignedOrderById,
  getDeliveryAssignedOrders,
  getNearbyDeliveryOrders,
  rejectNearbyDeliveryOrder,
  verifyDeliveryOtp,
} from "../../services/orderService";
import {
  updateDeliveryPartnerLocation,
  updateDeliveryPartnerOnlineStatus,
} from "../../services/deliveryPartnerServiceClient";
import { useWebSocket } from "../../context/WebSocketContext";
import { resolveAssetUrl } from "../../utils/assetUrl";
import { toast } from "react-toastify";

const RouteMapPreview = ({ partnerLocation, orderLocation, address }) => {
  const hasPartner =
    Number.isFinite(Number(partnerLocation?.latitude)) &&
    Number.isFinite(Number(partnerLocation?.longitude));
  const hasOrder =
    Number.isFinite(Number(orderLocation?.latitude)) &&
    Number.isFinite(Number(orderLocation?.longitude));

  if (!hasPartner || !hasOrder) {
    return (
      <div className="h-48 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-sm text-slate-500">
        Location map will appear when both GPS points are available.
      </div>
    );
  }

  const mapHref = `https://www.google.com/maps/dir/${partnerLocation.latitude},${partnerLocation.longitude}/${orderLocation.latitude},${orderLocation.longitude}`;

  return (
    <a
      href={mapHref}
      target="_blank"
      rel="noreferrer"
      className="block rounded-xl border border-slate-200 overflow-hidden bg-slate-950 group"
      title="Open route in Google Maps"
    >
      <div className="relative h-48">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <svg viewBox="0 0 420 190" className="absolute inset-0 h-full w-full">
          <path
            d="M64 138 C128 64, 222 164, 356 48"
            fill="none"
            stroke="rgb(56 189 248)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="10 10"
          />
          <circle cx="64" cy="138" r="12" fill="rgb(16 185 129)" />
          <circle cx="356" cy="48" r="12" fill="rgb(244 63 94)" />
        </svg>
        <div className="absolute left-4 bottom-4 rounded-lg bg-white/95 px-3 py-2 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase">You</p>
          <p className="text-xs text-slate-800">
            {Number(partnerLocation.latitude).toFixed(4)}, {Number(partnerLocation.longitude).toFixed(4)}
          </p>
        </div>
        <div className="absolute right-4 top-4 max-w-[210px] rounded-lg bg-white/95 px-3 py-2 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Customer</p>
          <p className="text-xs text-slate-800 truncate">{address || "Delivery location"}</p>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slate-950/80 to-transparent opacity-0 group-hover:opacity-100 transition" />
      </div>
    </a>
  );
};

export default function DeliveryDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { deliveryPartner } = useSelector((state) => state.deliveryAuth);

  // Initialize local earnings from Redux state to ensure UI is reactive
  const [localEarnings, setLocalEarnings] = useState(null);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Normalize partner object structure to handle flat/nested responses
  const p = useMemo(() => deliveryPartner?.deliveryPartner || deliveryPartner, [deliveryPartner]);

  // Generate initials for fallback if photo is missing
  const partnerInitials = useMemo(() => {
    const name = p?.fullName || "";
    if (!name) return "D";
    const parts = name.trim().split(" ");
    const first = parts[0]?.[0] || "";
    const last = parts[parts.length - 1]?.[0] || "";
    return (first + last).toUpperCase() || "D";
  }, [p?.fullName]);

  // Initialize or Sync local earnings with Redux state
  useEffect(() => {
    setLocalEarnings(p?.earningsWallet ?? p?.earningWallet ?? 0);
  }, [p]);

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  const [activeOrderId, setActiveOrderId] = useState("");
  const [activeOrder, setActiveOrder] = useState(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const [orderDetailsError, setOrderDetailsError] = useState("");
  const [acceptingOrderId, setAcceptingOrderId] = useState("");
  const [decliningOrderId, setDecliningOrderId] = useState("");
  const [otpLoadingOrderId, setOtpLoadingOrderId] = useState("");
  const [verifyLoadingOrderId, setVerifyLoadingOrderId] = useState("");
  const [otpInputs, setOtpInputs] = useState({});
  const [nearbyOrders, setNearbyOrders] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState("");
  const [nearbyNotice, setNearbyNotice] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [partnerLocation, setPartnerLocation] = useState(p?.liveLocation || p?.location || null);
  const [locationStatus, setLocationStatus] = useState("Waiting for GPS permission...");
  const [locationLoading, setLocationLoading] = useState(false);

  const partnerName = p?.fullName || "";
  const partnerMobile = p?.mobileNumber || "";
  const partnerPhoto = p?.profilePhotoJpg || "";
  const partnerId = p?._id || p?.id || "";

  // WebSocket integration for real-time order updates
  const { status: wsStatus, lastMessage, sendJson } = useWebSocket();
  const wsConnectedRef = useRef(false);
  const watchIdRef = useRef(null);
  const locationSyncInFlightRef = useRef(false);
  const nearbyFetchInFlightRef = useRef(false);
  const processedOrderIdsRef = useRef(new Set());
  const lastLocationSentRef = useRef({ latitude: null, longitude: null, at: 0 });

  const geolocationOptions = useMemo(
    () => ({
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000,
    }),
    []
  );

  const extractApiError = (error, fallback) =>
    String(
      error?.response?.data?.message || error?.message || fallback || "Failed."
    );

  const hasValidLocation = (location) =>
    Number.isFinite(Number(location?.latitude)) &&
    Number.isFinite(Number(location?.longitude));

  const normalizeBrowserLocation = (position) => ({
    latitude: Number(position?.coords?.latitude),
    longitude: Number(position?.coords?.longitude),
  });

  const getGeolocationErrorMessage = (error) => {
    if (error?.code === 1) return "Location permission denied";
    if (error?.code === 2) return "Location unavailable. Please check GPS and network.";
    if (error?.code === 3) return "Location request timed out. Try again.";
    return error?.message || "Could not fetch current location.";
  };

  const resolveAddress = (order) => {
    if (!order || typeof order !== "object") return "";

    const direct =
      order?.deliveryAddress ||
      order?.address ||
      order?.shippingAddress ||
      order?.dropAddress ||
      "";
    if (typeof direct === "string" && direct.trim()) return direct.trim();

    const nestedCandidates = [
      order?.deliveryDetails?.address,
      order?.shipping?.address,
      order?.customerAddress?.address,
      order?.customer?.address,
      order?.user?.address,
    ];
    for (const value of nestedCandidates) {
      if (typeof value === "string" && value.trim()) return value.trim();
    }

    return "";
  };

  const handleLogout = () => {
    updateDeliveryPartnerOnlineStatus(false).catch(() => {});
    dispatch(deliveryLogout());
    navigate("/delivery/login", { replace: true });
  };

  const loadOrders = async () => {
    setLoadingOrders(true);
    setOrdersError("");
    try {
      const data = await getDeliveryAssignedOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        handleLogout();
        return;
      }
      if (status === 404) {
        console.warn("[delivery-orders] assigned orders route is missing; showing empty list", error);
        setOrders([]);
        return;
      }
      setOrdersError(extractApiError(error, "Failed to fetch assigned orders."));
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadNearbyOrders = async (locationOverride = null) => {
    const effectiveLocation = locationOverride || partnerLocation;
    if (!isOnline) {
      setNearbyOrders([]);
      setNearbyError("");
      return;
    }

    if (!hasValidLocation(effectiveLocation)) {
      setNearbyOrders([]);
      setNearbyError("Fetch your current location before scanning nearby orders.");
      console.log("[delivery-location] nearby orders skipped: missing coordinates", effectiveLocation);
      return;
    }

    if (nearbyFetchInFlightRef.current) return;
    nearbyFetchInFlightRef.current = true;
    setNearbyLoading(true);
    setNearbyError("");
    try {
      console.log("[delivery-nearby] fetching orders with partner location", effectiveLocation);
      const data = await getNearbyDeliveryOrders();
      console.log("[delivery-nearby] backend response", data);
      setNearbyOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("[delivery-nearby] fetch failed", error);
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        handleLogout();
        return;
      }
      if (status === 404) {
        console.warn("[delivery-nearby] nearby orders route is missing; showing empty list", error);
        setNearbyOrders([]);
        setNearbyError("");
        return;
      }
      const message = extractApiError(error, "Failed to fetch nearby orders.");
      setNearbyError(message);
      toast.error(message);
    } finally {
      nearbyFetchInFlightRef.current = false;
      setNearbyLoading(false);
    }
  };

  const syncPartnerLocation = async (nextLocation, { force = false } = {}) => {
    if (!hasValidLocation(nextLocation)) {
      setLocationStatus("Latitude and longitude are missing.");
      console.warn("[delivery-location] invalid browser coordinates", nextLocation);
      return;
    }

    const normalizedLocation = {
      latitude: Number(nextLocation.latitude),
      longitude: Number(nextLocation.longitude),
    };

    setPartnerLocation(normalizedLocation);
    setLocationStatus("Location fetched successfully");
    console.log("[delivery-location] fetched coordinates", normalizedLocation);

    const last = lastLocationSentRef.current;
    const movedEnough =
      last.latitude === null ||
      Math.abs(Number(last.latitude) - normalizedLocation.latitude) > 0.0001 ||
      Math.abs(Number(last.longitude) - normalizedLocation.longitude) > 0.0001;
    const enoughTimePassed = Date.now() - Number(last.at || 0) > 7000;
    if (!force && !movedEnough && !enoughTimePassed) return;
    if (locationSyncInFlightRef.current) return;

    locationSyncInFlightRef.current = true;
    lastLocationSentRef.current = { ...normalizedLocation, at: Date.now() };

    try {
      const response = await updateDeliveryPartnerLocation({
        ...normalizedLocation,
        isOnline: true,
      });
      console.log("[delivery-location] update API success", response);
      setLocationStatus("Location fetched successfully");
      await loadNearbyOrders(normalizedLocation);
    } catch (error) {
      console.error("[delivery-location] update API failed", error);
      const status = error?.response?.status;
      if (status === 404) {
        setLocationStatus("Location fetched successfully");
        setNearbyError("");
        return;
      }
      const message = extractApiError(error, "Could not sync live location.");
      setLocationStatus(message);
      setNearbyError(message);
      if (status === 401 || status === 403) {
        setIsOnline(false);
        toast.error("Your delivery session expired. Please log in again.");
        handleLogout();
      }
    } finally {
      locationSyncInFlightRef.current = false;
      setLocationLoading(false);
    }
  };

  const requestCurrentLocation = ({ force = false } = {}) => {
    if (!("geolocation" in navigator)) {
      setLocationLoading(false);
      setLocationStatus("Location services are not supported in this browser.");
      setNearbyError("Location services are not supported in this browser.");
      return;
    }

    setLocationLoading(true);
    setLocationStatus("Fetching current location...");
    setNearbyError("");
    console.log("[delivery-location] requesting current browser location");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        syncPartnerLocation(normalizeBrowserLocation(position), { force: true });
      },
      (error) => {
        const message = getGeolocationErrorMessage(error);
        console.error("[delivery-location] getCurrentPosition error", error);
        setLocationLoading(false);
        setLocationStatus(message);
        setNearbyError(message);
      },
      force
        ? { ...geolocationOptions, maximumAge: 0 }
        : geolocationOptions
    );
  };

  const stopLocationWatch = () => {
    if (watchIdRef.current === null) return;
    navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
  };

  const startLocationWatch = () => {
    if (!("geolocation" in navigator)) {
      setLocationStatus("Location services are not supported in this browser.");
      return;
    }
    if (watchIdRef.current !== null) return;

    console.log("[delivery-location] starting live location watcher");
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        syncPartnerLocation(normalizeBrowserLocation(position));
      },
      (error) => {
        const message = getGeolocationErrorMessage(error);
        console.error("[delivery-location] watchPosition error", error);
        setLocationLoading(false);
        setLocationStatus(message);
        setNearbyError(message);
      },
      geolocationOptions
    );
  };

  const handleOnlineToggle = async () => {
    const nextOnline = !isOnline;
    setIsOnline(nextOnline);
    setNearbyError("");
    setLocationStatus(nextOnline ? "Starting live location..." : "You are offline.");
    try {
      await updateDeliveryPartnerOnlineStatus(nextOnline);
      if (!nextOnline) {
        setNearbyOrders([]);
      }
    } catch (error) {
      setIsOnline(!nextOnline);
      const message = extractApiError(error, "Failed to update online status.");
      setNearbyError(message);
      toast.error(message);
    }
  };

  const handleAcceptNearbyOrder = async (orderId) => {
    if (!orderId) return;
    setAcceptingOrderId(orderId);
    setNearbyError("");
    try {
      const updated = await acceptNearbyDeliveryOrder(orderId);
      const updatedId = String(updated?._id || updated?.id || orderId);
      setNearbyOrders((prev) =>
        prev.filter((order) => String(order?._id || order?.id) !== updatedId)
      );
      setOrders((prev) => {
        const exists = prev.some((order) => String(order?._id || order?.id) === updatedId);
        return exists
          ? prev.map((order) => (String(order?._id || order?.id) === updatedId ? updated : order))
          : [updated, ...prev];
      });
      setNearbyNotice(null);
      setOrdersError(`Nearby order #${formatOrderId(updatedId)} accepted.`);
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        handleLogout();
        return;
      }
      setNearbyOrders((prev) =>
        prev.filter((order) => String(order?._id || order?.id) !== String(orderId))
      );
      const message = extractApiError(error, "This order is no longer available.");
      setNearbyError(message);
      toast.error(message);
    } finally {
      setAcceptingOrderId("");
    }
  };

  const handleRejectNearbyOrder = async (orderId) => {
    if (!orderId) return;
    setDecliningOrderId(orderId);
    setNearbyError("");
    try {
      await rejectNearbyDeliveryOrder(orderId);
      setNearbyOrders((prev) =>
        prev.filter((order) => String(order?._id || order?.id) !== String(orderId))
      );
      setNearbyNotice((prev) =>
        String(prev?._id || prev?.id || "") === String(orderId) ? null : prev
      );
    } catch (error) {
      const message = extractApiError(error, "Failed to reject nearby order.");
      setNearbyError(message);
      toast.error(message);
    } finally {
      setDecliningOrderId("");
    }
  };

  const openOrderDetails = async (orderId) => {
    if (!orderId) return;
    setActiveOrderId(orderId);
    setActiveOrder(null);
    setLoadingOrderDetails(true);
    setOrderDetailsError("");
    try {
      const data = await getDeliveryAssignedOrderById(orderId);
      const normalized = data?.order || data?.data || data || null;
      setActiveOrder(normalized);
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        handleLogout();
        return;
      }
      setOrderDetailsError(extractApiError(error, "Failed to load order details."));
    } finally {
      setLoadingOrderDetails(false);
    }
  };

  const closeOrderDetails = () => {
    setActiveOrderId("");
    setActiveOrder(null);
    setLoadingOrderDetails(false);
    setOrderDetailsError("");
  };

  const handleAcceptOrder = async (orderId) => {
    if (!orderId) return;
    setAcceptingOrderId(orderId);
    setOrdersError("");
    setOrderDetailsError("");
    try {
      const updated = await acceptDeliveryAssignedOrder(orderId);
      const updatedId = String(updated?._id || updated?.id || "");

      setOrders((prev) =>
        prev.map((order) => {
          const currentId = String(order?._id || order?.id || "");
          return currentId === updatedId ? updated : order;
        })
      );

      if (String(activeOrderId || "") === updatedId) {
        setActiveOrder(updated);
      }
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        handleLogout();
        return;
      }
      const message = extractApiError(error, "Failed to accept this order.");
      setOrderDetailsError(message);
      setOrdersError(message);
    } finally {
      setAcceptingOrderId("");
    }
  };

  const handleDeclineOrder = async (orderId) => {
    if (!orderId) return;
    if (!window.confirm("Are you sure you want to decline this delivery assignment?")) return;

    setDecliningOrderId(orderId);
    setOrdersError("");
    setOrderDetailsError("");
    try {
      await declineDeliveryAssignedOrder(orderId);
      setOrders((prev) =>
        prev.filter((order) => {
          const currentId = String(order?._id || order?.id || "");
          return currentId !== String(orderId);
        })
      );
      if (String(activeOrderId || "") === String(orderId)) {
        closeOrderDetails();
      }
      setOrdersError("Order assignment declined.");
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        handleLogout();
        return;
      }
      const message = extractApiError(error, "Failed to decline this order.");
      setOrdersError(message);
      setOrderDetailsError(message);
    } finally {
      setDecliningOrderId("");
    }
  };

  const handleGetOtp = async (orderId) => {
    if (!orderId) return;
    setOtpLoadingOrderId(orderId);
    setOrdersError("");
    setOrderDetailsError("");
    try {
      const result = await generateDeliveryOtp(orderId);
      const orderIdFromResponse = String(result?.orderId || orderId);

      setOrders((prev) =>
        prev.map((order) => {
          const currentId = String(order?._id || order?.id || "");
          if (currentId !== orderIdFromResponse) return order;
          return { ...order, status: "Out for Delivery" };
        })
      );

      if (String(activeOrderId || "") === orderIdFromResponse && activeOrder) {
        setActiveOrder({ ...activeOrder, status: "Out for Delivery" });
      }

      const message = result?.message || "OTP generated and shown to user.";
      setOrdersError(message);
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        handleLogout();
        return;
      }
      const message = extractApiError(error, "Failed to generate OTP.");
      setOrderDetailsError(message);
      setOrdersError(message);
    } finally {
      setOtpLoadingOrderId("");
    }
  };

  const handleVerifyOtp = async (orderId) => {
    const otp = String(otpInputs[orderId] || "").trim();
    if (!orderId || !otp) {
      setOrderDetailsError("Please enter OTP.");
      return;
    }

    setVerifyLoadingOrderId(orderId);
    setOrdersError("");
    setOrderDetailsError("");
    try {
      const response = await verifyDeliveryOtp(orderId, otp);
      const updated = response?.order || response;
      const updatedId = String(updated?._id || updated?.id || orderId);
      const newEarnings = response?.updatedEarnings;

      setOrders((prev) =>
        prev.map((order) => {
          const currentId = String(order?._id || order?.id || "");
          return currentId === updatedId ? updated : order;
        })
      );

      if (String(activeOrderId || "") === updatedId) {
        setActiveOrder(updated);
      }

      if (newEarnings !== undefined) {
        setLocalEarnings(newEarnings);
        // Dispatch action to update Redux so it persists after restart/navigation
        // dispatch(updatePartnerEarnings(newEarnings)); 
        setOrdersError(`Success! Wallet updated: ₹${newEarnings}`);
      }

      setOtpInputs((prev) => ({ ...prev, [updatedId]: "" }));
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        handleLogout();
        return;
      }
      const message = extractApiError(error, "Failed to verify OTP.");
      setOrderDetailsError(message);
      setOrdersError(message);
    } finally {
      setVerifyLoadingOrderId("");
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!partnerId || !isOnline) {
      stopLocationWatch();
      if (!isOnline) setLocationStatus("You are offline.");
      return undefined;
    }

    requestCurrentLocation({ force: true });
    startLocationWatch();

    return () => {
      stopLocationWatch();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, partnerId]);

  useEffect(() => {
    if (!nearbyNotice) return undefined;
    const timer = window.setTimeout(() => setNearbyNotice(null), 12000);
    return () => window.clearTimeout(timer);
  }, [nearbyNotice]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNearbyOrders((prev) =>
        prev.filter((order) => {
          if (!order?.nearby?.expiresAt) return true;
          return new Date(order.nearby.expiresAt).getTime() > Date.now();
        })
      );
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  // Subscribe to delivery partner-specific topic when WebSocket is connected
  useEffect(() => {
    if (wsStatus !== "open") {
      wsConnectedRef.current = false;
      return;
    }

    if (partnerId && !wsConnectedRef.current) {
      wsConnectedRef.current = true;
      const topic = `delivery_partner:${partnerId}`;
      sendJson({ type: "subscribe", topics: [topic], token: deliveryPartner?.token });
    }
  }, [wsStatus, partnerId, sendJson, deliveryPartner?.token]);

  // Handle incoming WebSocket messages for real-time order updates
  useEffect(() => {
    if (!lastMessage || !partnerId) return;

    const { type, topic, payload } = lastMessage;
    if (type !== "event") return;

    // Check if this message is for this delivery partner
    const expectedTopic = `delivery_partner:${partnerId}`;
    if (topic !== expectedTopic) return;

    const eventType = payload?.type;
    if (eventType === "nearby_orders_snapshot") {
      setNearbyOrders(Array.isArray(payload?.orders) ? payload.orders : []);
      return;
    }

    const orderData = payload?.order;

    if (!eventType || !orderData) return;

    const orderId = String(orderData._id || orderData.id || "");

    // Prevent duplicate processing
    if (processedOrderIdsRef.current.has(`${eventType}:${orderId}`)) return;
    processedOrderIdsRef.current.add(`${eventType}:${orderId}`);

    // Clean up old processed IDs to prevent memory leak (keep last 100)
    if (processedOrderIdsRef.current.size > 100) {
      const arr = Array.from(processedOrderIdsRef.current);
      processedOrderIdsRef.current = new Set(arr.slice(-50));
    }

    if (eventType === "nearby_order_available") {
      setNearbyOrders((prev) => {
        const exists = prev.some((o) => String(o._id || o.id) === orderId);
        return exists
          ? prev.map((o) => (String(o._id || o.id) === orderId ? orderData : o))
          : [orderData, ...prev];
      });
      setNearbyNotice(orderData);
    } else if (eventType === "order_assigned") {
      // New order assigned - add to the beginning of the list
      setNearbyOrders((prev) =>
        prev.filter((o) => String(o._id || o.id) !== orderId)
      );
      setOrders((prev) => {
        const exists = prev.some((o) => String(o._id || o.id) === orderId);
        if (exists) {
          // Update existing order
          return prev.map((o) => String(o._id || o.id) === orderId ? orderData : o);
        }
        setOrdersError(`🔔 New order assigned! Order #${orderData?.orderId || formatOrderId(orderId)}`);
        return [orderData, ...prev];
      });
    } else if (eventType === "order_status_updated") {
      // Order status updated - update existing order in the list
      setOrders((prev) =>
        prev.map((o) => String(o._id || o.id) === orderId ? orderData : o)
      );
    }
  }, [lastMessage, partnerId]);

  const counts = useMemo(() => {
    const list = Array.isArray(orders) ? orders : [];
    const completed = list.filter((o) => o?.status === "Delivered").length;
    const active = list.filter(
      (o) => o?.status !== "Delivered" && o?.status !== "Cancelled"
    ).length;
    const cancelled = list.filter((o) => o?.status === "Cancelled").length;

    const walletBalance = localEarnings;

    return {
      active,
      completed,
      cancelled,
      total: list.length,
      walletBalance,
      nearby: nearbyOrders.length,
    };
  }, [orders, localEarnings, nearbyOrders.length]);

  const recentOrders = useMemo(() => {
    const list = Array.isArray(orders) ? orders : [];
    return list.slice(0, 6);
  }, [orders]);

  const statusBadge = (status) => {
    const value = status || "Placed";
    if (value === "Delivered") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    if (value === "Cancelled") return "bg-rose-50 text-rose-700 border border-rose-200";
    if (value === "Out for Delivery") return "bg-indigo-50 text-indigo-700 border border-indigo-200";
    if (value === "Packed") return "bg-amber-50 text-amber-700 border border-amber-200";
    return "bg-sky-50 text-sky-700 border border-sky-200";
  };

  const formatOrderId = (id) => {
    if (!id) return "—";
    const str = String(id);
    return str.length > 8 ? str.slice(-8).toUpperCase() : str.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.25),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(99,102,241,0.15),transparent_45%)]" />
      </div>

      <div className="relative px-4 py-8 sm:py-10">
        <div className="max-w-6xl mx-auto">
          <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div 
              className="flex items-start gap-4 cursor-pointer group" 
              onClick={() => setIsProfileModalOpen(true)}
              title="View Full Profile"
            >
              {partnerPhoto ? (
                <div className="relative group">
                  <img
                    src={resolveAssetUrl(partnerPhoto)}
                    alt="Profile"
                    className="h-14 w-14 rounded-full object-cover border-2 border-white shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-105"
                  />
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 border-2 border-white shadow-md flex items-center justify-center">
                    <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="relative group">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center border-2 border-white shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-105">
                    <span className="font-bold text-white text-lg tracking-tight">{partnerInitials}</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 border-2 border-white shadow-md flex items-center justify-center">
                    <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Delivery Partner</p>
                <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                  Partner Dashboard
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  {partnerName ? `Welcome back, ${partnerName}.` : "Welcome back."}{" "}
                  {partnerMobile ? (
                    <span className="text-slate-500">({partnerMobile})</span>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <button
                type="button"
                onClick={handleOnlineToggle}
                className={`group px-5 py-3 rounded-2xl font-semibold transition-all duration-300 border shadow-sm ${
                  isOnline
                    ? "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                    : "text-slate-700 bg-white border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                    }`}
                  />
                  <span>{isOnline ? "Online" : "Go Online"}</span>
                </div>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="group px-6 py-3 rounded-2xl font-semibold text-white transition-all duration-300 transform hover:scale-105 active:scale-95 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-lg hover:shadow-xl border border-rose-500/20"
              >
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                  </svg>
                  <span>Logout</span>
                </div>
              </button>
            </div>
          </header>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="group rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-200/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Active Assignments</p>
                  <p className="text-xs text-slate-500 mt-1">{loadingOrders ? "Syncing..." : "Currently assigned"}</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky-100 to-sky-200 border border-sky-200/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 7H17V17H7V7Z" stroke="currentColor" className="text-sky-600" strokeWidth="2" />
                    <path d="M4 4H20V20H4V4Z" stroke="currentColor" className="text-sky-500/60" strokeWidth="2" opacity="0.6" />
                  </svg>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-extrabold bg-gradient-to-r from-sky-600 to-sky-800 bg-clip-text text-transparent">{counts.active}</p>
              </div>
            </div>

            <div className="group rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-200/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Nearby Orders</p>
                  <p className="text-xs text-slate-500 mt-1">{nearbyLoading ? "Scanning..." : "Within 5 km"}</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-100 to-violet-200 border border-violet-200/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 21s7-5.2 7-11A7 7 0 105 10c0 5.8 7 11 7 11Z" stroke="currentColor" className="text-violet-600" strokeWidth="2" />
                    <circle cx="12" cy="10" r="2.5" stroke="currentColor" className="text-violet-500" strokeWidth="2" />
                  </svg>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-extrabold bg-gradient-to-r from-violet-600 to-violet-800 bg-clip-text text-transparent">{counts.nearby}</p>
              </div>
            </div>

            <div className="group rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-200/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Completed Deliveries</p>
                  <p className="text-xs text-slate-500 mt-1">Lifetime total</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 border border-emerald-200/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" className="text-emerald-600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-extrabold bg-gradient-to-r from-emerald-600 to-emerald-800 bg-clip-text text-transparent">{counts.completed}</p>
              </div>
            </div>

            <div className="group rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-200/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Cancelled Orders</p>
                  <p className="text-xs text-slate-500 mt-1">Lifetime total</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-100 to-rose-200 border border-rose-200/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18" stroke="currentColor" className="text-rose-600" strokeWidth="2" strokeLinecap="round" />
                    <path d="M6 6L18 18" stroke="currentColor" className="text-rose-500/60" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                  </svg>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-extrabold bg-gradient-to-r from-rose-600 to-rose-800 bg-clip-text text-transparent">{counts.cancelled}</p>
              </div>
            </div>

            <div className="group rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-200/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Total Earnings</p>
                  <p className="text-xs text-slate-500 mt-1">Wallet balance</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-200/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2V22M17 5H9.5C8.11929 5 7 6.11929 7 7.5C7 8.88071 8.11929 10 9.5 10H14.5C15.8807 10 17 11.1193 17 12.5C17 13.8807 15.8807 15 14.5 15H7M17 19H7" stroke="currentColor" className="text-amber-600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-extrabold bg-gradient-to-r from-amber-600 to-amber-800 bg-clip-text text-transparent">₹{counts.walletBalance}</p>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-3">
            <aside className="rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-200/50 p-6 shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">Nearby Order Found</h2>
                  <p className="text-sm text-slate-600 mt-1">Only orders assigned to you by nearest-distance matching appear here.</p>
                </div>
                <button
                  type="button"
                  onClick={() => loadNearbyOrders()}
                  disabled={nearbyLoading || !isOnline}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 disabled:opacity-50"
                >
                  {nearbyLoading ? "Scanning..." : "Refresh"}
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                  <p className="text-sm font-semibold text-slate-800">
                    {isOnline ? "Online for smart assignment" : "Offline"}
                  </p>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {locationLoading ? "Fetching GPS..." : locationStatus}
                </p>
                {hasValidLocation(partnerLocation) ? (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Lat {Number(partnerLocation.latitude).toFixed(5)}, Lng {Number(partnerLocation.longitude).toFixed(5)}
                  </p>
                ) : null}
                {isOnline ? (
                  <button
                    type="button"
                    onClick={() => requestCurrentLocation({ force: true })}
                    disabled={locationLoading}
                    className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
                  >
                    {locationLoading ? "Fetching..." : "Retry Location"}
                  </button>
                ) : null}
              </div>

              {nearbyError ? (
                <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
                  {nearbyError}
                </div>
              ) : null}

              <div className="mt-4 space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {!isOnline ? (
                  <div className="rounded-xl bg-white border border-slate-200 p-5 text-center">
                    <p className="text-sm font-semibold text-slate-800">Go online to receive nearby orders.</p>
                    <p className="mt-1 text-xs text-slate-500">GPS permission is required for smart matching.</p>
                  </div>
                ) : null}

                {isOnline && nearbyLoading && nearbyOrders.length === 0 ? (
                  <div className="rounded-xl bg-white border border-slate-200 p-5 text-center">
                    <div className="mx-auto h-8 w-8 rounded-full border-4 border-sky-100 border-t-sky-500 animate-spin" />
                    <p className="mt-3 text-sm text-slate-600">Scanning nearby orders...</p>
                  </div>
                ) : null}

                {isOnline && !nearbyLoading && !hasValidLocation(partnerLocation) ? (
                  <div className="rounded-xl bg-white border border-slate-200 p-5 text-center">
                    <p className="text-sm font-semibold text-slate-800">Location required</p>
                    <p className="mt-1 text-xs text-slate-500">Allow GPS permission to load nearby orders.</p>
                  </div>
                ) : null}

                {isOnline && !nearbyLoading && hasValidLocation(partnerLocation) && nearbyOrders.length === 0 ? (
                  <div className="rounded-xl bg-white border border-slate-200 p-5 text-center">
                    <p className="text-sm font-semibold text-slate-800">No nearby orders right now</p>
                    <p className="mt-1 text-xs text-slate-500">New matching orders will appear instantly.</p>
                  </div>
                ) : null}

                {nearbyOrders.map((order) => {
                  const id = order?._id || order?.id;
                  const customer = order?.customerName || order?.user?.name || "Customer";
                  const address = resolveAddress(order);
                  const distance = order?.nearby?.distanceKm;
                  const eta = order?.nearby?.estimatedMinutes;
                  const expiresAt = order?.nearby?.expiresAt ? new Date(order.nearby.expiresAt) : null;

                  return (
                    <div key={id} className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{customer}</p>
                          <p className="mt-1 text-xs text-slate-600 line-clamp-2">{address || "Address not available"}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700 border border-violet-100">
                          {Number(distance || 0).toFixed(2)} km
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-slate-50 p-2">
                          <p className="text-slate-500">ETA</p>
                          <p className="font-bold text-slate-900">{eta || "—"} min</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-2">
                          <p className="text-slate-500">Amount</p>
                          <p className="font-bold text-slate-900">₹{Number(order?.totalAmount || 0).toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="mt-3 rounded-lg bg-slate-50 p-2">
                        <p className="text-xs font-semibold text-slate-500">Order Items</p>
                        <p className="mt-1 text-xs text-slate-800 line-clamp-2">
                          {(Array.isArray(order?.products) ? order.products : [])
                            .map((item) => `${item?.name || "Item"} x${item?.quantity || 1}`)
                            .join(", ") || "Items not available"}
                        </p>
                      </div>
                      {expiresAt ? (
                        <p className="mt-2 text-[11px] text-slate-500">
                          Expires at {expiresAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      ) : null}
                      <div className="mt-3">
                        <RouteMapPreview
                          partnerLocation={partnerLocation}
                          orderLocation={order?.deliveryLocation}
                          address={address}
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleAcceptNearbyOrder(id)}
                          disabled={!id || acceptingOrderId === id}
                          className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {acceptingOrderId === id ? "Accepting..." : "Accept Order"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectNearbyOrder(id)}
                          disabled={!id || decliningOrderId === id}
                          className="px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 disabled:opacity-50"
                        >
                          {decliningOrderId === id ? "Rejecting..." : "Reject"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>

            <div className="lg:col-span-2 rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-200/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">Assigned Orders</h2>
                  <p className="text-sm text-slate-600 mt-1">Orders assigned by admin appear here.</p>
                </div>
                <button
                  type="button"
                  className="group px-4 py-2 rounded-xl font-semibold text-slate-700 transition-all duration-300 transform hover:scale-105 bg-white hover:bg-slate-50 border border-slate-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={loadOrders}
                  disabled={loadingOrders}
                >
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    <span>{loadingOrders ? "Refreshing..." : "Refresh"}</span>
                  </div>
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {ordersError ? (
                  <div className="rounded-xl bg-gradient-to-r from-rose-50 to-rose-100 border border-rose-200/50 p-4 text-sm text-rose-700 shadow-sm">
                    {ordersError}
                  </div>
                ) : null}

                {!loadingOrders && recentOrders.length === 0 ? (
                  <div className="rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200/50 p-6 text-center shadow-sm">
                    <div className="flex justify-center mb-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                        <svg className="h-6 w-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">No assigned orders yet</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Once admin assigns an order, it will show up here automatically.
                    </p>
                  </div>
                ) : null}

                {recentOrders.map((order) => {
                  const id = order?._id || order?.id;
                  const customer =
                    order?.customerName || order?.user?.name || "Customer";
                  const phone =
                    order?.customerPhone || order?.user?.phone || "";
                  const address = resolveAddress(order);
                  const status = order?.status || "Placed";
                  const canAccept =
                    status !== "Delivered" &&
                    status !== "Cancelled" &&
                    status !== "Out for Delivery";
                  const canGetOtp =
                    status !== "Delivered" && status !== "Cancelled";
                  const assignedAt = order?.deliveryPartnerAssignedAt
                    ? new Date(order.deliveryPartnerAssignedAt).toLocaleString()
                    : "";

                  return (
                    <div
                      key={id || `${customer}-${Math.random()}`}
                      className="group rounded-xl bg-gradient-to-r from-white to-slate-50 border border-slate-200/50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse"></span>
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            Order #{order?.orderId || formatOrderId(id)} · {customer}
                          </p>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 truncate">
                          {address ? `📍 ${address}` : "📍 Drop: —"}
                          {phone ? ` · 📞 ${phone}` : ""}
                        </p>
                        {assignedAt ? (
                          <p className="text-[11px] text-slate-500 mt-1">📅 Assigned: {assignedAt}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          className="group px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 border border-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handleAcceptOrder(id)}
                          disabled={!id || !canAccept || acceptingOrderId === id}
                        >
                          <div className="flex items-center gap-1">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            <span>{acceptingOrderId === id ? "Accepting..." : "Accept"}</span>
                          </div>
                        </button>
                        <button
                          type="button"
                          className="group px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 border border-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handleDeclineOrder(id)}
                          disabled={!id || !canAccept || decliningOrderId === id}
                        >
                          <div className="flex items-center gap-1">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                            <span>{decliningOrderId === id ? "Declining..." : "Decline"}</span>
                          </div>
                        </button>
                        <button
                          type="button"
                          className="group px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 border border-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handleGetOtp(id)}
                          disabled={!id || !canGetOtp || otpLoadingOrderId === id}
                        >
                          <div className="flex items-center gap-1">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                            </svg>
                            <span>{otpLoadingOrderId === id ? "Generating..." : "Get OTP"}</span>
                          </div>
                        </button>
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${statusBadge(status)} transition-all duration-300 transform group-hover:scale-105`}>
                          {status}
                        </span>
                        <button
                          type="button"
                          className="group px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-white to-slate-50 hover:from-slate-50 hover:to-slate-100 border border-slate-300 shadow-sm disabled:opacity-50"
                          onClick={() => openOrderDetails(id)}
                          disabled={!id}
                        >
                          <div className="flex items-center gap-1">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                            <span>View</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-200/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <h2 className="text-lg font-bold tracking-tight text-slate-900">Quick Actions</h2>
              <p className="text-sm text-slate-600 mt-1">Common tasks you’ll use often.</p>

              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  className="group w-full px-4 py-3 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 border border-sky-500/20 shadow-md hover:shadow-lg"
                  onClick={() => setIsProfileModalOpen(true)}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    <span>View My Profile</span>
                  </div>
                </button>
                <button
                  type="button"
                  className="group w-full px-4 py-3 rounded-xl font-semibold text-slate-700 transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-white to-slate-50 hover:from-slate-50 hover:to-slate-100 border border-slate-300 shadow-sm hover:shadow-md"
                  onClick={() => {}}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                    <span>Update Availability</span>
                  </div>
                </button>
                <button
                  type="button"
                  className="group w-full px-4 py-3 rounded-xl font-semibold text-slate-700 transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-white to-slate-50 hover:from-slate-50 hover:to-slate-100 border border-slate-300 shadow-sm hover:shadow-md"
                  onClick={() => {}}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728"></path>
                    </svg>
                    <span>Open Support</span>
                  </div>
                </button>
              </div>

              <div className="mt-6 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200/50 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-amber-100 border border-amber-200/50 flex items-center justify-center flex-shrink-0">
                    <svg className="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pro Tip</p>
                    <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                      Keep your live location on during active deliveries for faster tracking and fewer support calls. 
                      <span className="text-amber-600 font-medium">Enable GPS</span> for optimal performance.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <footer className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200/50 shadow-sm">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <p className="text-xs text-slate-500 font-medium">
                Secure session active{deliveryPartner?.token ? "" : " (guest)"}. Last synced: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </footer>
        </div>
      </div>

      {nearbyNotice ? (
        <div className="fixed right-4 top-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl bg-white border border-emerald-200 shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
          <div className="bg-emerald-600 px-4 py-3 text-white flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold">Nearby Order Found</p>
              <p className="text-xs text-emerald-50">
                {Number(nearbyNotice?.nearby?.distanceKm || 0).toFixed(2)} km away · ETA {nearbyNotice?.nearby?.estimatedMinutes || "—"} min
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNearbyNotice(null)}
              className="rounded-lg px-2 py-1 text-sm font-bold hover:bg-white/10"
            >
              ×
            </button>
          </div>
          <div className="p-4">
            <p className="text-sm font-bold text-slate-900">
              {nearbyNotice.customerName || nearbyNotice.user?.name || "Customer"}
            </p>
            <p className="mt-1 text-xs text-slate-600 line-clamp-2">
              {resolveAddress(nearbyNotice) || "Address not available"}
            </p>
            <p className="mt-2 text-sm font-bold text-slate-900">
              ₹{Number(nearbyNotice.totalAmount || 0).toFixed(2)}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleAcceptNearbyOrder(nearbyNotice._id || nearbyNotice.id)}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => handleRejectNearbyOrder(nearbyNotice._id || nearbyNotice.id)}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activeOrderId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={closeOrderDetails}
            className="absolute inset-0 bg-gradient-to-br from-slate-900/60 to-slate-800/40 backdrop-blur-sm"
            aria-label="Close"
          />

          <div className="relative w-full max-w-2xl rounded-3xl bg-gradient-to-br from-white to-slate-50 border border-slate-200/50 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-200/50 bg-gradient-to-r from-white to-slate-50">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Order Details</p>
                <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">
                  #{activeOrder?.orderId || formatOrderId(activeOrderId)}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeOrderDetails}
                className="group px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-sm transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                  <span>Close</span>
                </div>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {orderDetailsError ? (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
                  {orderDetailsError}
                </div>
              ) : null}

              {loadingOrderDetails ? (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-center text-sm text-slate-600">
                  Loading details...
                </div>
              ) : null}

                      {!loadingOrderDetails && activeOrder ? (
                <>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                      <p className="text-xs font-semibold text-slate-500">Customer</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {activeOrder.customerName || activeOrder.user?.name || "—"}
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        {activeOrder.customerPhone || activeOrder.user?.phone || "—"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                      <p className="text-xs font-semibold text-slate-500">Status</p>
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${statusBadge(activeOrder.status)}`}>
                          {activeOrder.status || "Placed"}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(activeOrder.status || "Placed") !== "Delivered" &&
                          (activeOrder.status || "Placed") !== "Cancelled" &&
                          (activeOrder.status || "Placed") !== "Out for Delivery" && (
                            <button
                              type="button"
                              onClick={() =>
                                handleAcceptOrder(activeOrder._id || activeOrder.id)
                              }
                              disabled={acceptingOrderId === (activeOrder._id || activeOrder.id)}
                              className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 border border-sky-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {acceptingOrderId === (activeOrder._id || activeOrder.id)
                                ? "Accepting..."
                                : "Accept & Start Delivery"}
                            </button>
                          )}
                        {(activeOrder.status || "Placed") !== "Delivered" &&
                          (activeOrder.status || "Placed") !== "Cancelled" &&
                          (activeOrder.status || "Placed") !== "Out for Delivery" && (
                            <button
                              type="button"
                              onClick={() => handleDeclineOrder(activeOrder._id || activeOrder.id)}
                              disabled={decliningOrderId === (activeOrder._id || activeOrder.id)}
                              className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 border border-rose-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {decliningOrderId === (activeOrder._id || activeOrder.id) ? "Declining..." : "Decline Assignment"}
                            </button>
                          )}
                        {(activeOrder.status || "Placed") !== "Delivered" &&
                          (activeOrder.status || "Placed") !== "Cancelled" && (
                            <button
                              type="button"
                              onClick={() =>
                                handleGetOtp(activeOrder._id || activeOrder.id)
                              }
                              disabled={otpLoadingOrderId === (activeOrder._id || activeOrder.id)}
                              className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {otpLoadingOrderId === (activeOrder._id || activeOrder.id)
                                ? "Generating..."
                                : "Get OTP"}
                            </button>
                          )}
                      </div>
                      {(activeOrder.status || "Placed") === "Out for Delivery" && (
                        <div className="mt-3 flex flex-col gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="Enter customer OTP"
                            value={otpInputs[activeOrder._id || activeOrder.id] || ""}
                            onChange={(e) =>
                              setOtpInputs((prev) => ({
                                ...prev,
                                [activeOrder._id || activeOrder.id]: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleVerifyOtp(activeOrder._id || activeOrder.id)
                            }
                            disabled={verifyLoadingOrderId === (activeOrder._id || activeOrder.id)}
                            className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {verifyLoadingOrderId === (activeOrder._id || activeOrder.id)
                              ? "Verifying..."
                              : "Verify OTP & Deliver"}
                          </button>
                        </div>
                      )}
                      <p className="mt-2 text-xs text-slate-500">
                        Created:{" "}
                        {activeOrder.createdAt ? new Date(activeOrder.createdAt).toLocaleString() : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                    <p className="text-xs font-semibold text-slate-500">Delivery Address</p>
                    <p className="mt-2 text-sm text-slate-800 whitespace-pre-line">
                      {resolveAddress(activeOrder) || "—"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                    <p className="text-xs font-semibold text-slate-500 mb-3">Route Preview</p>
                    <RouteMapPreview
                      partnerLocation={partnerLocation}
                      orderLocation={activeOrder.deliveryLocation}
                      address={resolveAddress(activeOrder)}
                    />
                  </div>

                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-xs font-semibold text-slate-500">Order Items</p>
                      <p className="text-xs text-slate-500">
                        Total: ₹{Number(activeOrder.totalAmount || 0).toFixed(2)}
                      </p>
                    </div>

                    <div className="mt-3 space-y-2">
                      {(Array.isArray(activeOrder.products) ? activeOrder.products : []).map((p, idx) => (
                        <div
                          key={`${p?.productId || "p"}-${idx}`}
                          className="flex items-center justify-between gap-3 rounded-lg bg-white border border-slate-200 p-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {p?.name || "Item"}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Qty: {p?.quantity || 1}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-slate-800">
                            ₹{Number(p?.price || 0).toFixed(2)}
                          </p>
                        </div>
                      ))}
                      {(!Array.isArray(activeOrder.products) || activeOrder.products.length === 0) && (
                        <p className="text-sm text-slate-600">No items captured.</p>
                      )}
                    </div>

                    <p className="mt-3 text-xs text-slate-500">
                      Payment: {activeOrder.paymentMethod || "—"}
                    </p>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Profile Details Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={() => setIsProfileModalOpen(false)}
            className="absolute inset-0 bg-gradient-to-br from-slate-900/60 to-slate-800/40 backdrop-blur-sm"
            aria-label="Close"
          />

          <div className="relative w-full max-w-lg rounded-3xl bg-gradient-to-br from-white to-slate-50 border border-slate-200/50 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between p-6 border-b border-slate-200/50 bg-gradient-to-r from-white to-slate-50">
              <h3 className="text-xl font-bold text-slate-900">Partner Profile</h3>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="group p-2 rounded-full hover:bg-slate-100 transition text-slate-500"
              >
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                  <span className="text-xs font-semibold">Close</span>
                </div>
              </button>
            </div>

            <div className="p-8 max-h-[75vh] overflow-y-auto">
              <div className="flex flex-col items-center mb-8">
                <div className="relative group">
                  {partnerPhoto ? (
                    <img
                      src={resolveAssetUrl(partnerPhoto)}
                      alt="Full Profile"
                      className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-xl group-hover:brightness-90 transition-all"
                    />
                  ) : (
                    <div className="h-32 w-32 rounded-full bg-sky-600 flex items-center justify-center text-4xl font-bold text-white shadow-xl">
                      {partnerInitials}
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black/60 text-white text-[9px] font-black uppercase px-2 py-1 rounded-full backdrop-blur-sm border border-white/20">
                      Edit Photo
                    </div>
                  </div>
                  <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-emerald-500 border-4 border-white shadow-sm" title="Verified Partner" />
                </div>
                <h4 className="mt-5 text-2xl font-extrabold text-slate-900">{p?.fullName || "Partner"}</h4>
                <p className="text-sm font-semibold text-sky-600 bg-sky-50 px-3 py-1 rounded-full mt-2 capitalize">
                  {p?.availability || "Status N/A"} · {p?.vehicleType || "Vehicle"}
                </p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mobile Number</p>
                    <p className="text-sm font-semibold text-slate-800">{p?.mobileNumber || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</p>
                    <p className="text-sm font-semibold text-slate-800 truncate">{p?.email || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vehicle Number</p>
                    <p className="text-sm font-semibold text-slate-800 uppercase">{p?.vehicleNumber || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Delivery Area</p>
                    <p className="text-sm font-semibold text-slate-800">{p?.deliveryCity || "—"}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Residential Address</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{p?.currentAddress || "—"}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aadhaar ID</p>
                    <p className="text-sm font-semibold text-slate-600">•••• •••• {String(p?.aadhaarNumber || "").slice(-4)}</p>
                  </div>
                  {p?.panNumber && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PAN Card</p>
                      <p className="text-sm font-semibold text-slate-600 uppercase">{p?.panNumber}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
              <p className="text-[11px] text-slate-400 font-medium">Profile data is verified and encrypted.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
