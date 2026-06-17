import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import API from "../services/api";

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = location.state?.token || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If no token is provided, show error
  if (!token) {
    return (
      <div className="min-h-screen bg-[#f7f5f2] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
          <h1 className="text-2xl font-extrabold text-slate-900">Invalid Link</h1>
          <p className="mt-2 text-sm text-slate-600">This password reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:underline">
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await API.post("/auth/reset-password", { token, newPassword });
      setMessage("Password reset successful! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f5f2] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900">Reset Password</h1>
        <p className="mt-2 text-sm text-slate-600">Enter your new password below.</p>

        {message && <p className="mt-4 p-2 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded text-center">{message}</p>}
        {error && <p className="mt-4 p-2 bg-rose-50 text-rose-700 text-sm font-semibold rounded text-center">{error}</p>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="password"
            placeholder="New Password"
            className="w-full border p-3 rounded-xl focus:ring-2 outline-none transition focus:ring-emerald-500 border-slate-200"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Confirm New Password"
            className="w-full border p-3 rounded-xl focus:ring-2 outline-none transition focus:ring-emerald-500 border-slate-200"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full py-3 rounded-xl font-semibold text-white transition bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-200"
            disabled={loading}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
          <div className="text-center">
            <Link to="/login" className="text-sm font-semibold text-emerald-700 hover:underline">
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
