import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { registerUser } from "../redux/slices/authSlice";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(registerUser({ name, phone, email, password })).then((res) => {
      if (res.meta.requestStatus === "fulfilled") {
        navigate("/login");
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#f7f5f2]">
      <div className="grid lg:grid-cols-2 min-h-screen">
        <div className="relative hidden lg:block">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506617420156-8e4536971650?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-slate-900/50 to-emerald-900/40" />
          <div className="relative z-10 p-12 h-full flex flex-col justify-between text-white">
            <div className="text-sm font-semibold uppercase tracking-widest">
              Shopnest Select
            </div>
            <div>
              <h1 className="text-4xl font-extrabold leading-tight">
                Create your account.
                <span className="block text-emerald-300">
                  Start saving today.
                </span>
              </h1>
              <p className="mt-4 text-white/80 max-w-md">
                Fast checkout, exclusive offers, and delivery tracking in one
                place.
              </p>
            </div>
            <div className="text-sm text-white/70">
              Secure payments • Fresh picks • 4.8★ rating
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 sm:px-6 py-10">
          <div className="w-full max-w-md">
            <div className="lg:hidden mb-6 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              <div className="relative h-40">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506617420156-8e4536971650?auto=format&fit=crop&w=1400&q=80')] bg-cover bg-center" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900/70 to-emerald-900/40" />
                <div className="relative z-10 p-4 text-white">
                  <p className="text-xs font-semibold uppercase tracking-widest">
                    shopnest Select
                  </p>
                  <h1 className="text-xl font-extrabold mt-1">
                    Create your account
                  </h1>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Join ShopNest today
              </h2>
              <p className="text-slate-600 mt-1">
                Start shopping premium groceries today.
              </p>

              {error && (
                <p className="text-rose-600 text-sm mt-4 text-center font-semibold bg-rose-50 p-2 rounded">
                  {error}
                </p>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <input
                  type="text"
                  placeholder="Full Name"
                  className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 border-slate-200"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                <input
                  type="tel"
                  placeholder="Phone Number"
                  className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 border-slate-200"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />

                <input
                  type="email"
                  placeholder="Email"
                  className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 border-slate-200"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <input
                  type="password"
                  placeholder="Password"
                  className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 border-slate-200"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition disabled:opacity-50 shadow-lg shadow-emerald-200/60"
                  disabled={loading}
                >
                  {loading ? "Registering..." : "Create Account"}
                </button>
              </form>

              <p className="text-sm mt-6 text-center text-slate-600">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-emerald-700 font-semibold hover:underline"
                >
                  Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
