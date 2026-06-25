import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { cancelOrder as cancelOrderLocal } from "../redux/slices/orderSlice";
import { setCredentials } from "../redux/slices/authSlice";
import { cancelOrder, getUserOrders } from "../services/orderService";
import { toast } from "react-toastify";
import API from "../services/api";
import { resolveAssetUrl } from "../utils/assetUrl";
import { 
  User, 
  Mail, 
  MapPin, 
  CreditCard, 
  HelpCircle, 
  Package, 
  Star, 
  TrendingDown, 
  Camera, 
  CheckCircle2, 
  Clock,
  Trash2
} from "lucide-react";

export default function ProfilePage() {
  const { user } = useSelector((state) => state.auth);
  const orders = useSelector((state) => state.orders.list);
  const dispatch = useDispatch();
  const [photoUrl, setPhotoUrl] = useState(user?.photo || user?.profilePhoto || "");
  const [dbOrders, setDbOrders] = useState([]);
  const [showAddressManager, setShowAddressManager] = useState(false);
  const [addresses, setAddresses] = useState(() => [
    {
      id: "home",
      label: "Home",
      name: "Guest User",
      phone: "99999 99999",
      line1: "221B, Baker Street",
      line2: "Near Central Park",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      isDefault: true,
    },
    {
      id: "work",
      label: "Work",
      name: "Guest User",
      phone: "88888 88888",
      line1: "10th Floor, Orion Business Park",
      line2: "MG Road",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      isDefault: false,
    },
  ]);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);

  // Keep photo in sync with user profile in Redux
  useEffect(() => {
    if (user?.photo || user?.profilePhoto) {
      setPhotoUrl(user.photo || user.profilePhoto);
    }
  }, [user?.photo]);

  const initials = useMemo(() => {
    if (!user?.name) return "U";
    const parts = String(user.name).trim().split(" ");
    const first = parts[0]?.[0] || "";
    const last = parts[1]?.[0] || "";
    return (first + last).toUpperCase() || "U";
  }, [user?.name]);

  const statusSteps = ["Processing", "Packed", "Out for Delivery", "Delivered"];
  const getDisplayStatus = (status) => {
    if (status === "Placed") return "Processing";
    return status || "Processing";
  };
  const getStepIndex = (status) => {
    if (status === "Cancelled") return -1;
    const idx = statusSteps.indexOf(getDisplayStatus(status));
    return idx === -1 ? 0 : idx;
  };

  const formatCurrency = (value) => {
    const num = Number(value || 0);
    return `\u20B9${num.toLocaleString("en-IN")}`;
  };

  const getOrderDate = (order) => {
    if (order?.createdAt) return new Date(order.createdAt);
    if (order?.date) return new Date(order.date);
    return null;
  };

  const getOrderSavings = (order) => {
    const direct = Number(
      order?.savings ??
        order?.discount ??
        order?.couponDiscount ??
        order?.totalDiscount ??
        0
    );
    if (direct > 0) return direct;
    const subtotal = Number(
      order?.subtotal ?? order?.totalBeforeDiscount ?? order?.mrpTotal ?? 0
    );
    const total = Number(order?.totalAmount ?? order?.total ?? 0);
    if (subtotal > 0 && total > 0) {
      return Math.max(0, subtotal - total);
    }
    return 0;
  };

  useEffect(() => {
    const token = user?.token || null;
    const isJwt = typeof token === "string" && token.split(".").length === 3;
    if (!isJwt) {
      setDbOrders([]);
      return;
    }
    const fetchOrders = async () => {
      try {
        const data = await getUserOrders(token);
        setDbOrders(Array.isArray(data) ? data : []);
      } catch {
        setDbOrders([]);
      }
    };
    fetchOrders();
  }, [user?.token]);

  const visibleOrders = dbOrders.length > 0 ? dbOrders : (orders || []);
  const monthlySavings = useMemo(() => {
    const now = new Date();
    return visibleOrders.reduce((sum, order) => {
      const date = getOrderDate(order);
      if (!date || Number.isNaN(date.getTime())) return sum;
      const sameMonth =
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();
      if (!sameMonth) return sum;
      return sum + getOrderSavings(order);
    }, 0);
  }, [visibleOrders]);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.token) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      try {
        // Call the backend to persist the photo to the database
        const { data } = await API.put("/auth/update-profile", 
          { photo: base64String },
          { headers: { Authorization: `Bearer ${user.token}` } }
        );
        
        // Sync updated user (with photo) to Redux/localStorage
        dispatch(setCredentials({ ...data.user, token: user.token }));
        setPhotoUrl(base64String);
        toast.success("Profile photo saved successfully!"); 
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to save photo to server");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCancel = async (orderId) => {
    const token = user?.token || null;
    const isJwt = typeof token === "string" && token.split(".").length === 3;
    if (!isJwt) {
      toast.error("Please log in again.");
      return;
    }
    try {
      await cancelOrder(orderId, token);
      const refreshed = await getUserOrders(token);
      setDbOrders(Array.isArray(refreshed) ? refreshed : []);
      dispatch(cancelOrderLocal(orderId));
      toast.success("Order cancelled");
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to cancel order";
      toast.error(message);
    }
  };

  const handleEditStart = (address) => {
    setEditingId(address.id);
    setDraft({ ...address });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setDraft(null);
  };

  const handleEditSave = () => {
    if (!draft) return;
    setAddresses((prev) =>
      prev.map((addr) => (addr.id === editingId ? { ...draft } : addr))
    );
    setEditingId(null);
    setDraft(null);
    toast.success("Address updated");
  };

  const handleDraftChange = (e) => {
    const { name, value } = e.target;
    setDraft((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-[10%] -right-[5%] w-96 h-96 rounded-full bg-emerald-100/40 blur-3xl" />
        <div className="absolute top-[20%] -left-[5%] w-80 h-80 rounded-full bg-sky-100/30 blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
          {/* Profile Header Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <User size={120} />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="relative">
                {photoUrl ? (
                  <img
                    src={resolveAssetUrl(photoUrl)}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover ring-4 ring-slate-100"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-linear-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center text-2xl font-bold ring-4 ring-white shadow-inner">
                    {initials}
                  </div>
                )}
                <label className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white text-slate-900 border border-slate-200 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full cursor-pointer shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-1">
                  <Camera size={12} />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </label>
              </div>

              <div className="flex-1">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  {user?.name || "Guest User"}
                </h2>
                <div className="flex items-center gap-2 mt-1 text-slate-600">
                  <Mail size={14} />
                  <span className="text-sm font-medium">{user?.email || "Not logged in"}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                    Premium Member
                  </span>
                  <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-sky-50 text-sky-700 border border-sky-100">
                    Rewards Enabled
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 grid sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center group hover:bg-white hover:shadow-md hover:border-emerald-200 transition-all">
                <Package className="mx-auto mb-2 text-slate-400 group-hover:text-emerald-500 transition-colors" size={20} />
                <p className="text-2xl font-bold">{visibleOrders.length}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Total Orders</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center group hover:bg-white hover:shadow-md hover:border-amber-200 transition-all">
                <Star className="mx-auto mb-2 text-slate-400 group-hover:text-amber-500 transition-colors" size={20} />
                <p className="text-2xl font-bold">4.8</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Avg Rating</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center group hover:bg-white hover:shadow-md hover:border-sky-200 transition-all">
                <TrendingDown className="mx-auto mb-2 text-slate-400 group-hover:text-sky-500 transition-colors" size={20} />
                <p className="text-2xl font-bold">
                  {formatCurrency(monthlySavings)}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Saved This Month</p>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Quick Actions</h3>
            <p className="text-slate-600 text-sm mt-1">
              Manage your account and track deliveries.
            </p>
            <div className="mt-4 grid gap-3">
              <button
                onClick={() => setShowAddressManager((prev) => !prev)}
                className={`w-full text-left border rounded-xl px-4 py-3 font-semibold transition ${
                  showAddressManager
                    ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <MapPin size={18} className={showAddressManager ? "text-emerald-400" : "text-slate-400"} />
                  <span>Manage Addresses</span>
                </div>
              </button>
              <button className="w-full text-left bg-white border border-slate-200 rounded-xl px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3">
                <CreditCard size={18} className="text-slate-400" />
                Payment Methods
              </button>
              <button className="w-full text-left bg-white border border-slate-200 rounded-xl px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3">
                <HelpCircle size={18} className="text-slate-400" />
                Help & Support
              </button>
            </div>
          </div>
        </div>

        {showAddressManager && (
          <div className="mt-8 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Manage Addresses
                </h3>
                <p className="text-sm text-slate-600">
                  Edit your saved delivery locations in real time.
                </p>
              </div>
              <div className="text-xs text-slate-500">
                Tip: Click Edit to update without leaving the page.
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              {addresses.map((address) => {
                const isEditing = editingId === address.id;
                return (
                  <div
                    key={address.id}
                    className={`border rounded-2xl p-5 transition ${
                      isEditing
                        ? "border-amber-300 bg-amber-50/60"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            {address.label}
                          </span>
                          {address.isDefault && (
                            <span className="text-[11px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 mt-2">
                          {address.name} · {address.phone}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          {address.line1}, {address.line2}
                        </p>
                        <p className="text-sm text-slate-600">
                          {address.city}, {address.state} - {address.pincode}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isEditing ? (
                          <button
                            onClick={() => handleEditStart(address)}
                            className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-white"
                          >
                            Edit
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={handleEditSave}
                              className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleEditCancel}
                              className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-white"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isEditing && draft && (
                      <div className="mt-4 grid sm:grid-cols-2 gap-3">
                        <input
                          name="name"
                          value={draft.name}
                          onChange={handleDraftChange}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                          placeholder="Full name"
                        />
                        <input
                          name="phone"
                          value={draft.phone}
                          onChange={handleDraftChange}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                          placeholder="Phone number"
                        />
                        <input
                          name="line1"
                          value={draft.line1}
                          onChange={handleDraftChange}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm sm:col-span-2"
                          placeholder="Address line 1"
                        />
                        <input
                          name="line2"
                          value={draft.line2}
                          onChange={handleDraftChange}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm sm:col-span-2"
                          placeholder="Address line 2"
                        />
                        <input
                          name="city"
                          value={draft.city}
                          onChange={handleDraftChange}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                          placeholder="City"
                        />
                        <input
                          name="state"
                          value={draft.state}
                          onChange={handleDraftChange}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                          placeholder="State"
                        />
                        <input
                          name="pincode"
                          value={draft.pincode}
                          onChange={handleDraftChange}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                          placeholder="Pincode"
                        />
                        <input
                          name="label"
                          value={draft.label}
                          onChange={handleDraftChange}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                          placeholder="Label (Home, Work)"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
              <Package className="text-emerald-600" />
              Your Orders
            </h3>
            <span className="w-fit text-xs font-bold uppercase tracking-wider text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-full">
              {visibleOrders.length} Orders
            </span>
          </div>

          {visibleOrders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 font-medium italic">
              No orders yet.
            </div>
          ) : (
            <div className="grid gap-6">
              {visibleOrders.map((order) => {
                const orderId = order.orderId || order.id || order._id;
                const stepIndex = getStepIndex(order.status);
                const isCancelled = order.status === "Cancelled";
                const displayStatus = getDisplayStatus(order.status);
                const showDeliveryOtp =
                  !isCancelled &&
                  displayStatus === "Out for Delivery" &&
                  Boolean(order.deliveryOtp);
                const items =
                  order.items ||
                  order.products?.map((p) => `${p.name} x${p.quantity}`) ||
                  [];
                const total = order.total || order.totalAmount || 0;
                const paymentMethod = order.paymentMethod || "N/A";
                const date = order.date
                  ? order.date
                  : order.createdAt
                  ? new Date(order.createdAt).toLocaleString()
                  : "";
                return (
                  <div
                    key={orderId}
                    className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow group"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Order ID
                        </p>
                        <p className="font-bold text-slate-900 tracking-tight break-all">
                          {orderId}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Clock size={12}/> {date}</p>
                      </div>

                      <div className="md:text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Total
                        </p>
                        <p className="text-2xl font-black text-slate-900">
                          ₹{total}
                        </p>
                        <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1 uppercase tracking-tighter">
                          Via {paymentMethod}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Order Items</p>
                      <div className="text-sm font-semibold text-slate-700">
                        {items.join(", ")}
                      </div>
                    </div>

                    <div className="mt-6 border-t border-slate-100 pt-6">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                        Delivery Status
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {statusSteps.map((step, idx) => {
                          const active = stepIndex >= idx;
                          return (
                            <div key={step} className="flex items-center gap-2">
                              <div
                                className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                                  isCancelled
                                    ? "bg-rose-100 text-rose-500"
                                    : active
                                    ? "bg-emerald-500 text-white"
                                    : "bg-slate-200"
                                }`}>
                                  {active && !isCancelled && <CheckCircle2 size={10} />}
                                </div>
                              <span
                                className={`text-[11px] font-bold tracking-tight ${
                                  isCancelled
                                    ? "text-rose-600"
                                    : active
                                    ? "text-emerald-700"
                                    : "text-slate-400"
                                }`}
                              >
                                {step}
                              </span>
                              {idx < statusSteps.length - 1 && (
                                <div className="hidden sm:block w-6 h-px bg-slate-200" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {isCancelled && (
                        <p className="text-xs font-bold text-rose-600 mt-3 flex items-center gap-1">
                          <Package size={14} />
                          This order has been cancelled.
                        </p>
                      )}
                      {showDeliveryOtp && (
                        <div className="mt-4 inline-flex items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/50 px-4 py-2.5 shadow-sm">
                          <span className="text-xs text-indigo-700 font-bold uppercase tracking-tight">
                            Share OTP with delivery partner:
                          </span>
                          <span className="text-lg font-black tracking-[0.2em] text-indigo-900 bg-white px-3 py-0.5 rounded-lg border border-indigo-100 shadow-inner">
                            {order.deliveryOtp}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                      <button
                        onClick={() => handleCancel(orderId)}
                        disabled={isCancelled || order.status === "Delivered"}
                        className="px-5 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Trash2 size={14} /> Cancel Order
                      </button>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${isCancelled ? 'bg-rose-100 text-rose-700' : 'bg-slate-900 text-white shadow-lg shadow-slate-200'}`}>
                        {displayStatus}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
