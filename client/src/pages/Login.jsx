import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../redux/slices/authSlice";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error: serverError } = useSelector((state) => state.auth);

  const handleSubmit = (e) => {
    e.preventDefault();
    const loginData = { identifier, password, isAdmin: false };

    dispatch(loginUser(loginData)).then((res) => {
      if (res.meta.requestStatus === "fulfilled") {
        navigate("/home");
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#f7f5f2]">
      <div className="grid lg:grid-cols-2 min-h-screen">
        <div className="relative hidden lg:block">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-slate-900/50 to-emerald-900/40" />
          <div className="relative z-10 p-12 h-full flex flex-col justify-between text-white">
            <div className="text-sm font-semibold uppercase tracking-widest">
              ShopNest Select
            </div>
            <div>
              <h1 className="text-4xl font-extrabold leading-tight">
                Fresh groceries,
                <span className="block text-emerald-300">
                  delivered with care.
                </span>
              </h1>
              <p className="mt-4 text-white/80 max-w-md">
                Access exclusive deals, manage orders, and track deliveries from
                one premium dashboard.
              </p>
            </div>
            <div className="text-sm text-white/70">
              5K+ products • 30 min delivery • 4.8★ rating
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 sm:px-6 py-10">
          <div className="w-full max-w-md">
            <div className="lg:hidden mb-6 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              <div className="relative h-40">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=80')] bg-cover bg-center" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900/70 to-emerald-900/40" />
                <div className="relative z-10 p-4 text-white">
                  <p className="text-xs font-semibold uppercase tracking-widest">
                    Shopnest Select
                  </p>
                  <h1 className="text-xl font-extrabold mt-1">
                    Fresh groceries, delivered.
                  </h1>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Welcome Back
              </h2>
              <p className="text-slate-600 mt-1">Sign in to continue shopping</p>

              {serverError && (
                <p className="text-rose-600 text-sm mt-4 text-center font-semibold bg-rose-50 p-2 rounded">
                  {serverError}
                </p>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <input
                  type="text"
                  placeholder="Email or Mobile Number"
                  className="w-full border p-3 rounded-xl focus:ring-2 outline-none transition focus:ring-emerald-500 border-slate-200"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />

                <input
                  type="password"
                  placeholder="Password"
                  className="w-full border p-3 rounded-xl focus:ring-2 outline-none transition focus:ring-emerald-500 border-slate-200"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="flex justify-end">
                  <Link
                    to="/forgot-password"
                    state={identifier ? { identifier } : undefined}
                    className="text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl font-semibold text-white transition disabled:opacity-50 shadow-lg bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Login"}
                </button>
              </form>

              <p className="text-sm mt-6 text-center text-slate-600">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="text-emerald-700 font-semibold hover:underline"
                >
                  Register
                </Link>
              </p>
             
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
