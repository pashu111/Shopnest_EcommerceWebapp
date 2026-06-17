import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { generateReward } from "../services/rewardService";
import { addReward } from "../redux/slices/rewardSlice";
import { useDispatch } from "react-redux";
import { clearCart } from "../redux/slices/cartSlice";

export default function OrderSuccess() {
  const dispatch = useDispatch();

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
        const reward = await generateReward();
        if (reward && reward.coins) {
          dispatch(addReward(reward.coins));
        }
      } catch (err) {
        console.error("Failed to generate reward:", err);
      }
    };
    handleReward();
  }, [dispatch]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f5f2]">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
        <h1 className="text-3xl font-extrabold text-slate-900">Order Successful!</h1>
        <p className="text-slate-600 mt-2">Your rewards have been updated.</p>
        <Link
          to="/home"
          className="mt-6 inline-block rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
