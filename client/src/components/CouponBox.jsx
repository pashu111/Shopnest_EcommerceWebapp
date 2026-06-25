import { useDispatch } from "react-redux";
import { applyCoupon } from "../redux/slices/couponSlice";
import { useState } from "react";
import { TicketPercent } from "lucide-react";

export default function CouponBox() {
  const [code, setCode] = useState("");
  const dispatch = useDispatch();

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <TicketPercent size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" />
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter coupon code"
          className="w-full border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 rounded-xl text-sm font-semibold tracking-wide uppercase placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:bg-white transition"
        />
      </div>
      <button
        onClick={() => dispatch(applyCoupon(code))}
        className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-lg shadow-slate-900/15"
      >
        Apply
      </button>
    </div>
  );
}
