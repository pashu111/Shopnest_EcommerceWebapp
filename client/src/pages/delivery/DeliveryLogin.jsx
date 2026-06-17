import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginDeliveryPartner } from "../../redux/slices/deliveryAuthSlice";

export default function DeliveryLogin() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, deliveryPartner } = useSelector(
    (state) => state.deliveryAuth
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginDeliveryPartner({ identifier, password })).then((res) => {
      if (res?.meta?.requestStatus === "fulfilled") {
        navigate("/delivery/dashboard", { replace: true });
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#f7f5f2] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="h-12 w-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
          D
        </div>
        <h1 className="mt-4 text-2xl font-extrabold text-slate-900">
          Delivery Partner
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in to view your assigned deliveries and update statuses.
        </p>

        {error && (
          <p className="text-rose-600 text-sm mt-4 text-center font-semibold bg-rose-50 p-2 rounded">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="text"
            placeholder="Mobile Number or Email"
            className="w-full border p-3 rounded-xl focus:ring-2 outline-none transition focus:ring-sky-500 border-slate-200"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="w-full border p-3 rounded-xl focus:ring-2 outline-none transition focus:ring-sky-500 border-slate-200"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                if (identifier) {
                  navigate("/delivery/forgot-password", { state: { identifier } });
                } else {
                  navigate("/delivery/forgot-password");
                }
              }}
              className="text-xs font-semibold text-sky-700 hover:underline"
            >
              Forgot Password?
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="w-full py-2 rounded-xl font-semibold text-sky-700 transition border border-sky-200 hover:bg-sky-50"
          >
            {showPassword ? "Hide Password" : "Show Password"}
          </button>
          <button
            type="submit"
            className="w-full py-3 rounded-xl font-semibold text-white transition shadow-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Verifying..." : "Login"}
          </button>
          <p className="text-sm text-center text-slate-600">
            New delivery partner?{" "}
            <Link
              to="/delivery/register"
              className="text-sky-700 font-semibold hover:underline"
            >
              Create account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
