import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Filter,
  ShoppingCart,
  CreditCard,
  User,
  MapPin,
  Phone,
  Package,
  ChevronDown,
  ChevronUp,
  Bell,
} from "lucide-react";
import { assignDeliveryPartner, getAllOrders } from "../../services/orderService";
import { getDeliveryPartners } from "../../services/deliveryPartnerService";
import { useWebSocket } from "../../context/WebSocketContext";
import { resolveAssetUrl } from "../../utils/assetUrl";
import { useSelector } from "react-redux";

const getApiErrorMessage = (error, fallback) => {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const message =
    (typeof data?.message === "string" && data.message) ||
    (typeof data?.error === "string" && data.error) ||
    (typeof error?.message === "string" && error.message) ||
    "";

  if (status === 401) return message || "Unauthorized. Please sign in again.";
  if (status) return message || `Request failed (${status}).`;
  return message || fallback || "Something went wrong.";
};

const STATUS_STYLES = {
  Placed: "bg-indigo-50 text-indigo-700",
  Packed: "bg-amber-50 text-amber-700",
  Processing: "bg-amber-50 text-amber-700",
  "Out for Delivery": "bg-blue-50 text-blue-700",
  Shipped: "bg-blue-50 text-blue-700",
  Delivered: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-rose-50 text-rose-700",
};

const formatCurrency = (value) => {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const normalizeStatus = (status) => status || "Placed";

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [expandedId, setExpandedId] = useState(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [partners, setPartners] = useState([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [partnersError, setPartnersError] = useState("");
  const [partnerSearch, setPartnerSearch] = useState("");
  const [assignError, setAssignError] = useState("");
  const [assigningPartnerId, setAssigningPartnerId] = useState("");
  const [newOrderNotification, setNewOrderNotification] = useState(null);
  const [subscribed, setSubscribed] = useState(false);

  const { user } = useSelector((state) => state.auth);
  const { lastMessage, sendJson, status: wsStatus } = useWebSocket();
  const processedOrderIds = useRef(new Set());

  // Subscribe to admin orders topic on mount
  useEffect(() => {
    if (wsStatus !== "open") {
      setSubscribed(false);
      return;
    }

    if (!subscribed) {
      sendJson({ type: "subscribe", topics: ["admin:orders"], token: user?.token });
      setSubscribed(true);
    }
  }, [wsStatus, subscribed, sendJson, user?.token]);

  // Handle incoming WebSocket messages for new orders
  useEffect(() => {
    if (!lastMessage) return;

    // Check if this is an admin:orders event
    if (lastMessage.topic === "admin:orders" && lastMessage.payload) {
      const { type, order } = lastMessage.payload;

      if ((type === "new_order" || type === "order_assigned" || type === "order_assignment_declined" || type === "order_status_updated" || type === "order_cancelled" || type === "order_delivered") && order) {
        const orderId = order._id || order.id;

        // Prevent duplicate processing
        const eventKey = `${type}:${orderId}:${lastMessage.payload.timestamp || ""}`;
        if (processedOrderIds.current.has(eventKey)) return;
        processedOrderIds.current.add(eventKey);

        if (type === "new_order") {
          setNewOrderNotification({
            message: `New order received: ${order.orderId || orderId.slice(-8).toUpperCase()}`,
            orderId,
            amount: order.totalAmount,
          });

          // Auto-dismiss notification after 5 seconds
          setTimeout(() => {
            setNewOrderNotification(null);
          }, 5000);
        }

        setOrders((prev) => {
          const exists = prev.some((o) => (o._id || o.id) === orderId);
          if (exists) {
            return prev.map((o) => ((o._id || o.id) === orderId ? order : o));
          }
          return [order, ...prev];
        });
      }
    }
  }, [lastMessage]);

  useEffect(() => {
    let active = true;
    const loadOrders = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const data = await getAllOrders();
        if (active) {
          setOrders(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (active) {
          console.error("Load orders error:", error);
          setLoadError(getApiErrorMessage(error, "Failed to load orders."));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadOrders();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isAssignOpen) return;
    let active = true;

    const loadPartners = async () => {
      setPartnersLoading(true);
      setPartnersError("");
      try {
        const data = await getDeliveryPartners();
        if (active) {
          setPartners(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (active) {
          console.error("Load delivery partners error:", error);
          setPartnersError(getApiErrorMessage(error, "Failed to load delivery partners."));
        }
      } finally {
        if (active) {
          setPartnersLoading(false);
        }
      }
    };

    loadPartners();
    return () => {
      active = false;
    };
  }, [isAssignOpen]);

  const openAssignModal = (orderId) => {
    setActiveOrderId(orderId);
    setPartnerSearch("");
    setAssignError("");
    setIsAssignOpen(true);
  };

  const closeAssignModal = () => {
    setIsAssignOpen(false);
    setActiveOrderId(null);
    setAssignError("");
    setAssigningPartnerId("");
  };

  const handleAssignPartner = async (partnerId) => {
    if (!activeOrderId) return;
    setAssigningPartnerId(partnerId);
    setAssignError("");
    try {
      const updated = await assignDeliveryPartner(activeOrderId, partnerId);
      setOrders((prev) =>
        prev.map((order) => ((order._id || order.id) === (updated._id || updated.id) ? updated : order))
      );
      closeAssignModal();
    } catch (error) {
      console.error("Assign delivery partner error:", error);
      setAssignError(getApiErrorMessage(error, "Failed to assign delivery partner."));
    } finally {
      setAssigningPartnerId("");
    }
  };

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce(
      (sum, order) => sum + (Number(order.totalAmount) || 0),
      0
    );
    const cancelledCount = orders.filter(
      (order) => normalizeStatus(order.status) === "Cancelled"
    ).length;
    const deliveredCount = orders.filter(
      (order) => normalizeStatus(order.status) === "Delivered"
    ).length;

    return {
      totalOrders: orders.length,
      totalRevenue,
      cancelledCount,
      deliveredCount,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return orders.filter((order) => {
      const status = normalizeStatus(order.status);
      const matchesStatus = statusFilter === "All" || status === statusFilter;
      if (!matchesStatus) return false;

      if (!term) return true;

      const userName = order.user?.name || "";
      const userEmail = order.user?.email || "";
      const customerName = order.customerName || "";
      const customerPhone = order.customerPhone || "";
      const address = order.deliveryAddress || "";
      const orderId = order._id || "";
      const orderNumber = order.orderId || "";
      const payment = order.paymentMethod || "";

      return [
        userName,
        userEmail,
        customerName,
        customerPhone,
        address,
        orderId,
        orderNumber,
        payment,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [orders, searchTerm, statusFilter]);

  const filteredPartners = useMemo(() => {
    const term = partnerSearch.trim().toLowerCase();
    if (!term) return partners;
    return partners.filter((partner) => {
      const name = partner.fullName || "";
      const mobile = partner.mobileNumber || "";
      const city = partner.deliveryCity || "";
      const availability = partner.availability || "";
      const email = partner.email || "";
      return [name, mobile, city, availability, email].join(" ").toLowerCase().includes(term);
    });
  }, [partners, partnerSearch]);

  return (
    <div className="space-y-6">
      {/* New Order Notification Toast */}
      {newOrderNotification && (
        <div className="fixed left-4 right-4 top-4 z-50 animate-in slide-in-from-right fade-in duration-300 sm:left-auto sm:right-4 sm:w-auto">
          <div className="bg-emerald-600 text-white px-4 py-4 rounded-xl shadow-lg flex items-start gap-3 sm:px-6">
            <Bell className="animate-pulse" size={20} />
            <div className="min-w-0">
              <p className="font-semibold break-words">{newOrderNotification.message}</p>
              <p className="text-sm text-emerald-100">
                Amount: {formatCurrency(newOrderNotification.amount)}
              </p>
            </div>
            <button
              onClick={() => setNewOrderNotification(null)}
              className="ml-4 text-emerald-200 hover:text-white transition"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* WebSocket Connection Status Indicator */}
      <div className="flex items-center gap-2 text-xs">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
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

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">
            Admin Console
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-1">
            Order Details
          </h1>
          <p className="text-slate-600 mt-2">
            Track customer purchases, payments, and fulfillment status.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <ShoppingCart size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Total Orders</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.totalOrders}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CreditCard size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Revenue</p>
            <h3 className="text-2xl font-bold text-slate-900">
              {formatCurrency(stats.totalRevenue)}
            </h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Package size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Delivered</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.deliveredCount}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <Filter size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Cancelled</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.cancelledCount}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="relative flex-1 w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by order id, customer, email, phone..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none transition bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 bg-white"
          >
            {["All", "Placed", "Packed", "Out for Delivery", "Delivered", "Cancelled"].map(
              (status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
            Loading orders...
          </div>
        )}

        {!isLoading && loadError && (
          <div className="bg-rose-50 rounded-2xl border border-rose-200 p-6 text-center text-rose-700 font-semibold">
            {loadError}
          </div>
        )}

        {!isLoading && !loadError && filteredOrders.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
            No orders match your search.
          </div>
        )}

        {!isLoading && !loadError &&
          filteredOrders.map((order) => {
            const orderId = order._id || order.id;
            const displayOrderId = order.orderId || order._id;
            const status = normalizeStatus(order.status);
            const badgeClass = STATUS_STYLES[status] || "bg-slate-100 text-slate-600";
            const createdAt = order.createdAt
              ? new Date(order.createdAt).toLocaleString()
              : "";
            const customerName = order.customerName || order.user?.name || "Guest";
            const customerEmail = order.user?.email || "";
            const customerPhone = order.customerPhone || "";
            const deliveryAddress = order.deliveryAddress || "";
            const productCount = Array.isArray(order.products) ? order.products.length : 0;
            const assignedPartner = order.deliveryPartner || null;
            const assignedAt = order.deliveryPartnerAssignedAt
              ? new Date(order.deliveryPartnerAssignedAt).toLocaleString()
              : "";
            const canAssign = status !== "Delivered" && status !== "Cancelled";

            const isExpanded = expandedId === orderId;

            return (
              <div
                key={orderId}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm"
              >
                <div className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-semibold uppercase text-slate-400">Order</span>
                      <span className="font-bold text-slate-900 break-all">{displayOrderId}</span>
                      {order._id && order.orderId && (
                        <span className="text-[10px] text-slate-400 font-mono" title="MongoDB _id">
                          {order._id}
                        </span>
                      )}
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}>
                        {status}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600">
                      Placed on {createdAt}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
                      <span className="inline-flex items-center gap-2">
                        <User size={14} className="text-slate-400" />
                        {customerName}
                      </span>
                      {customerEmail && (
                        <span className="text-slate-500">{customerEmail}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700">
                      {formatCurrency(order.totalAmount)}
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700">
                      {order.paymentMethod || "N/A"}
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700">
                      {productCount} items
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : orderId)}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-rose-600 hover:text-rose-700"
                  >
                    {isExpanded ? "Hide details" : "View details"}
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 p-5 bg-slate-50/60">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                          Customer Details
                        </p>
                        <div className="text-sm text-slate-700 font-semibold">{customerName}</div>
                        {customerPhone && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone size={14} className="text-slate-400" />
                            {customerPhone}
                          </div>
                        )}
                        {deliveryAddress && (
                          <div className="flex items-start gap-2 text-sm text-slate-600">
                            <MapPin size={14} className="mt-0.5 text-slate-400" />
                            <span>{deliveryAddress}</span>
                          </div>
                        )}
                        {!customerPhone && !deliveryAddress && (
                          <p className="text-sm text-slate-400">No delivery info captured.</p>
                        )}

                        <div className="pt-3 mt-3 border-t border-slate-100 space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            Delivery Partner
                          </p>
                          {assignedPartner ? (
                            <div className="flex items-start gap-3">
                              {assignedPartner.profilePhotoJpg ? (
                                <img
                                  src={resolveAssetUrl(assignedPartner.profilePhotoJpg)}
                                  alt=""
                                  className="h-10 w-10 rounded-full object-cover border border-slate-200"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                                  <User size={16} />
                                </div>
                              )}
                              <div className="space-y-0.5 min-w-0">
                                <div className="text-sm font-semibold text-slate-800 truncate">
                                  {assignedPartner.fullName || "Assigned partner"}
                                </div>
                                {assignedPartner.mobileNumber && (
                                  <div className="text-xs text-slate-600">
                                    {assignedPartner.mobileNumber}
                                  </div>
                                )}
                                {(assignedPartner.deliveryCity || assignedPartner.availability) && (
                                  <div className="text-xs text-slate-500 truncate">
                                    {[assignedPartner.deliveryCity, assignedPartner.availability]
                                      .filter(Boolean)
                                      .join(" • ")}
                                  </div>
                                )}
                              {assignedAt && (
                                <div className="text-xs text-slate-400">
                                  Assigned on {assignedAt}
                                </div>
                              )}
                            </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">Not assigned yet.</p>
                          )}

                          <button
                            type="button"
                            onClick={() => openAssignModal(orderId)}
                            disabled={!canAssign}
                            className="w-full mt-1 px-3 py-2 rounded-xl text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {assignedPartner ? "Change Partner" : "Assign Partner"}
                          </button>
                          {!canAssign && (
                            <p className="text-xs text-slate-400">
                              Assignment disabled for {status} orders.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
                          Products
                        </p>
                        <div className="space-y-3">
                          {(order.products || []).map((product, index) => (
                            <div
                              key={`${orderId}-product-${index}`}
                            className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center"
                          >
                              <div className="flex items-center gap-3 min-w-0">
                                {product.image && (
                                  <img
                                    src={resolveAssetUrl(product.image)}
                                    alt=""
                                    className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                                  />
                                )}
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-slate-800 break-words">
                                    {product.name}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {formatCurrency(product.price)} x {product.quantity}
                                  </div>
                                </div>
                              </div>
                              <div className="text-sm font-semibold text-slate-700 sm:text-right">
                                {formatCurrency(
                                  (Number(product.price) || 0) * (Number(product.quantity) || 0)
                                )}
                              </div>
                            </div>
                          ))}
                          {(!order.products || order.products.length === 0) && (
                            <p className="text-sm text-slate-400">No products recorded.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {isAssignOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={closeAssignModal}
            aria-label="Close"
          />

          <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Assign Delivery Partner
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Select a partner to assign this order.
                </p>
              </div>
              <button
                type="button"
                onClick={closeAssignModal}
                className="px-3 py-1.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 border border-slate-200"
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-4">
              {assignError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-sm font-semibold">
                  {assignError}
                </div>
              )}
              {partnersError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-sm font-semibold">
                  {partnersError}
                </div>
              )}

              <input
                type="text"
                value={partnerSearch}
                onChange={(e) => setPartnerSearch(e.target.value)}
                placeholder="Search by name, mobile, city..."
                className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-rose-500"
              />

              <div className="max-h-[52vh] overflow-auto space-y-2 pr-1">
                {partnersLoading && (
                  <div className="text-sm text-slate-500 py-6 text-center">
                    Loading partners...
                  </div>
                )}

                {!partnersLoading && filteredPartners.length === 0 && (
                  <div className="text-sm text-slate-500 py-6 text-center">
                    No delivery partners found.
                  </div>
                )}

                {!partnersLoading &&
                  filteredPartners.map((partner) => {
                    const partnerId = partner._id || partner.id;
                    const isAssigning = assigningPartnerId === partnerId;
                    return (
                      <div
                        key={partnerId}
                        className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {partner.profilePhotoJpg ? (
                            <img
                              src={resolveAssetUrl(partner.profilePhotoJpg)}
                              alt=""
                              className="h-10 w-10 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                              <User size={16} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">
                              {partner.fullName || "Delivery Partner"}
                            </div>
                            <div className="text-sm text-slate-600 truncate">
                              {[partner.mobileNumber, partner.deliveryCity]
                                .filter(Boolean)
                                .join(" • ")}
                            </div>
                            {partner.availability && (
                              <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold">
                                {partner.availability}
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAssignPartner(partnerId)}
                          disabled={isAssigning}
                          className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 transition disabled:opacity-60"
                        >
                          {isAssigning ? "Assigning..." : "Assign"}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
