import { useDispatch } from "react-redux";
import { applyCoupon } from "../redux/slices/couponSlice";
import { useState } from "react";

export default function CouponBox() {
  const [code, setCode] = useState("");
  const dispatch = useDispatch();

  return (
    <div className="flex gap-2">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Enter Coupon"
        className="border p-2 rounded w-full"
      />
      <button
        onClick={() => dispatch(applyCoupon(code))}
        className="bg-black text-white px-4 rounded"
      >
        Apply
      </button>
    </div>
  );
}
