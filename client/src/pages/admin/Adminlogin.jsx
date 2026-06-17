import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../../redux/slices/authSlice";
import { useNavigate } from "react-router-dom";

export default function Adminlogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginUser({ username, password, isAdmin: true })).then((res) => {
      if (res.meta.requestStatus === "fulfilled") {
        navigate("/admin/dashboard");
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#f7f5f2]">
      <div className="grid lg:grid-cols-2 min-h-screen">
        <div className="relative hidden lg:block">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-linear-to-br from-slate-900/70 via-slate-900/50 to-rose-900/40" />
          <div className="relative z-10 p-12 h-full flex flex-col justify-between text-white">
            <div className="text-sm font-semibold uppercase tracking-widest">
              Admin Console
            </div>
            <div>
              <h1 className="text-4xl font-extrabold leading-tight">
                Manage inventory,
                <span className="block text-rose-300">
                  orders, and insights.
                </span>
              </h1>
              <p className="mt-4 text-white/80 max-w-md">
                Secure access to analytics, products, and operations.
              </p>
            </div>
            <div className="text-sm text-white/70">
              Protected access • Role-based control • Real-time updates
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 sm:px-6 py-10">
          <div className="w-full max-w-md">
            <div className="lg:hidden mb-6 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              <div className="relative h-40">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1400&q=80')] bg-cover bg-center" />
                <div className="absolute inset-0 bg-linear-to-r from-slate-900/70 to-rose-900/40" />
                <div className="relative z-10 p-4 text-white">
                  <p className="text-xs font-semibold uppercase tracking-widest">
                    Admin Console
                  </p>
                  <h1 className="text-xl font-extrabold mt-1">
                    Secure Admin Login
                  </h1>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Admin Portal
              </h2>
              <p className="text-slate-600 mt-1">
                Authorized access only.
              </p>

              {error && (
                <p className="text-rose-600 text-sm mt-4 text-center font-semibold bg-rose-50 p-2 rounded">
                  {error}
                </p>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <input
                  type="text"
                  placeholder="Admin Username"
                  className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-rose-500 border-slate-200"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />

                <input
                  type="password"
                  placeholder="Password"
                  className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-rose-500 border-slate-200"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  className="w-full bg-rose-600 text-white py-3 rounded-xl font-semibold hover:bg-rose-700 transition disabled:opacity-50 shadow-lg shadow-rose-200/60"
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Login"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
