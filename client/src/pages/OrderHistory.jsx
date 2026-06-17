import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { getUserOrders } from "../services/orderService";
import { Package, ChevronRight, Clock, Truck, CheckCircle } from "lucide-react";

export default function OrderHistory() {
  const { user } = useSelector((state) => state.auth);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = user?.token;
        if (!token) return;
        const data = await getUserOrders(token);
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching order history:", err);
        setOrders([]);
      }
    };

    fetchOrders();
  }, [user?.token]);

  const getDisplayStatus = (status) => {
    if (status === "Placed") return "Processing";
    return status || "Processing";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Delivered":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Out for Delivery":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Packed":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Cancelled":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Delivered":
        return <CheckCircle className="w-4 h-4" />;
      case "Out for Delivery":
        return <Truck className="w-4 h-4" />;
      case "Cancelled":
        return <Clock className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-[#f7f5f2]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">My Orders</h2>
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No orders found.</p>
            <Link
              to="/"
              className="inline-block mt-4 bg-emerald-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-emerald-700"
            >
              Start Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f5f2]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">My Orders</h2>
        <div className="space-y-4">
          {orders.map((order) => {
            if (!order) return null;
            return (
              <Link
                key={order._id || order.id}
                to={`/orders/${order._id}`}
                className="block bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-mono text-slate-500">
                        #{order._id?.slice(-8).toUpperCase()}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {getStatusIcon(order.status)}
                        {getDisplayStatus(order.status)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                      <span>
                        <span className="text-slate-500">Date:</span>{" "}
                        {formatDate(order.createdAt)}
                      </span>
                      <span>
                        <span className="text-slate-500">Total:</span>{" "}
                        <span className="font-semibold text-slate-900">
                          ₹{order.totalAmount}
                        </span>
                      </span>
                      <span className="text-slate-500">
                        {order.products?.length || 0} item
                        {(order.products?.length || 0) !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
