import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { generateReward, getRewardCoins } from "../services/rewardService";
import { setReward } from "../redux/slices/rewardSlice";
import { useSelector, useDispatch } from "react-redux";
import { clearCart } from "../redux/slices/cartSlice";
import { CheckCircle2 } from "lucide-react";

export default function OrderSuccess() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(clearCart());
    try {
      localStorage.removeItem("cartItems");
      localStorage.removeItem("cart");
      sessionStorage.removeItem("cartItems");
      sessionStorage.removeItem("cart");
    } catch {
      // Ignore storage failures; Redux state is already cleared.
    }

    const handleReward = async () => {
      try {
        const token = user?.token || null;
        const isJwt = typeof token === "string" && token.split(".").length === 3;
        if (!isJwt) return;

        const data = await getRewardCoins(token);
        if (data && typeof data.coins === "number") {
          dispatch(setReward(data.coins));
        }
      } catch (err) {
        console.error("Failed to fetch reward coins:", err);
      }
    };
    handleReward();
  }, [dispatch, user?.token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f5f2] px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 200 }}
        className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full"
      >
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <CheckCircle2 size={32} className="text-emerald-600" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Order Successful!</h1>
        <p className="text-slate-600 mt-2">Your rewards have been updated.</p>
        <Link
          to="/home"
          className="mt-6 inline-flex rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 transition shadow-lg shadow-emerald-200/50"
        >
          Continue Shopping
        </Link>
      </motion.div>
    </div>
  );
}
