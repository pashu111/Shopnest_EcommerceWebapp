import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await API.post("/auth/forgot-password", { identifier });
      setMessage("Account verified! You can now set your new password.");
      setTimeout(() => {
        navigate("/reset-password", {
          state: { token: res.data.resetToken, identifier },
        });
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f5f2] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900">Forgot Password</h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter your registered email or mobile number to continue.
        </p>

        {message && (
          <p className="mt-4 p-2 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded text-center">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-4 p-2 bg-rose-50 text-rose-700 text-sm font-semibold rounded text-center">
            {error}
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
          <button
            type="submit"
            className="w-full py-3 rounded-xl font-semibold text-white transition bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-200"
            disabled={loading}
          >
            {loading ? "Processing..." : "Continue"}
          </button>
          <div className="text-center">
            <Link
              to="/login"
              className="text-sm font-semibold text-emerald-700 hover:underline"
            >
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
