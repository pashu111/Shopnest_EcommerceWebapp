import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import ScratchCard from "../components/ScratchCard";
import { clearCart } from "../redux/slices/cartSlice";

export default function Confirmation() {
  const { width, height } = useWindowSize();
  const location = useLocation();
  const { name, phone, address, deliveryLocation, paymentMethod, rewardEligible, orderId, orderDbId } =
    location.state || {};
  const fullAddress = deliveryLocation?.fullAddress || address || "";
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const token = user?.token || null;
  const isLoggedIn =
    typeof token === "string" && token.split(".").length === 3;

  useEffect(() => {
    if (!orderId && !orderDbId) return;

    dispatch(clearCart());
    try {
      localStorage.removeItem("cartItems");
      localStorage.removeItem("cart");
      sessionStorage.removeItem("cartItems");
      sessionStorage.removeItem("cart");
    } catch {
      // Ignore storage failures; Redux state is already cleared.
    }
  }, [dispatch, orderDbId, orderId]);

  return (
    <div className="min-h-screen bg-[#f7f5f2]">
      <Confetti width={width} height={height} recycle={false} numberOfPieces={280} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
                Order Confirmed
              </p>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-1">
                Thank you for your purchase!
              </h1>
              <p className="text-slate-600 mt-2">
                Your order is now being processed. We ll notify you when it ships.
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-emerald-700">Order ID</p>
              <p className="font-semibold text-emerald-900">
                {orderId || "—"}
              </p>
            </div>
          </div>

          <div className="mt-6 grid sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Delivery To
              </p>
              <p className="font-semibold text-slate-900 mt-1">{name}</p>
              <p className="text-sm text-slate-600">{phone}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:col-span-2">
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Address
              </p>
              <p className="text-sm text-slate-700 mt-1">{fullAddress}</p>
              {deliveryLocation?.latitude && deliveryLocation?.longitude && (
                <p className="mt-2 text-xs text-slate-500">
                  {Number(deliveryLocation.latitude).toFixed(5)}, {Number(deliveryLocation.longitude).toFixed(5)}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Payment Method
              </p>
              <p className="font-semibold text-slate-900 mt-1">
                {paymentMethod || "N/A"}
              </p>
            </div>
            {/* <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">
                  Estimated Delivery
                </p>
                <p className="font-semibold text-slate-900 mt-1">Tomorrow</p>
              </div>
              <span className="text-xs font-semibold bg-emerald-600 text-white px-3 py-1 rounded-full">
                Express
              </span>
            </div> */}
          </div>

           <div className="mt-6 flex flex-wrap gap-3">
             <Link
                to={`/orders/${orderId || orderDbId}`}
               className="bg-slate-900 text-white px-5 py-3 rounded-xl font-semibold hover:bg-slate-800"
             >
               Track Order
             </Link>
             <Link
               to="/home"
               className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-emerald-700"
             >
               Continue Shopping
             </Link>
           </div>
        </motion.div>

        {rewardEligible && isLoggedIn && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-8"
          >
            <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50 border border-amber-200 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="text-center mb-2">
                <span className="inline-block text-xs font-bold uppercase tracking-widest text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                  Bonus Reward
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 text-center mt-3">
                Scratch to Reveal Your Reward
              </h2>
              <p className="text-sm text-slate-500 text-center mt-1">
                You earned a scratch card for this order!
              </p>
              <ScratchCard orderId={orderDbId || orderId} />
            </div>
          </motion.div>
        )}

        {rewardEligible && !isLoggedIn && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-8"
          >
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-amber-800 mb-2">
                Log in to claim your reward
              </h2>
              <p className="text-slate-700 mb-4">
                Rewards are saved to your account after you scratch.
              </p>
              <Link
                to="/login"
                className="inline-block bg-amber-600 text-white px-5 py-2 rounded-lg hover:bg-amber-700 transition"
              >
                Go to Login
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
