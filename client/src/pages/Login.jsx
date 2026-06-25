import { useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginUser, clearError } from "../redux/slices/authSlice";
import { Link, useNavigate } from "react-router-dom";

const GMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
const MOBILE_REGEX = /^[0-9]{10}$/;

function validateIdentifier(val) {
  if (!val) return "";
  if (GMAIL_REGEX.test(val) || MOBILE_REGEX.test(val)) return "";
  return "Enter a valid Gmail address or 10-digit mobile number.";
}

function validatePassword(val) {
  if (!val) return "Password cannot be empty.";
  return "";
}

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error: serverError } = useSelector((state) => state.auth);

  const errors = useMemo(() => {
    const e = {};
    const ie = validateIdentifier(identifier);
    if (ie) e.identifier = ie;
    const pe = validatePassword(password);
    if (pe) e.password = pe;
    return e;
  }, [identifier, password]);

  const isClientValid = Object.keys(errors).length === 0;
  const canSubmit = identifier.trim() !== "" && password !== "";

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleIdentifierChange = (e) => {
    setIdentifier(e.target.value);
    if (serverError) dispatch(clearError());
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (serverError) dispatch(clearError());
  };

  const inputClass = (field) => {
    const showErr = (touched[field] || submitted) && errors[field];
    return `w-full border p-3 rounded-xl focus:ring-2 outline-none transition focus:ring-emerald-500 ${
      showErr ? "border-rose-500" : "border-slate-200"
    }`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (!isClientValid) return;
    dispatch(loginUser({ identifier, password, isAdmin: false })).then((res) => {
      if (res.meta.requestStatus === "fulfilled") {
        navigate("/home");
      }
    });
  };

  const isAccountNotFound =
    serverError === "Account not found. Please register first.";
  const isPasswordWrong =
    serverError === "Invalid password. Please try again.";

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

              <form
                onSubmit={handleSubmit}
                className="mt-6 space-y-4"
                noValidate
              >
                <div>
                  <input
                    type="text"
                    placeholder="Email or Mobile Number"
                    className={inputClass("identifier")}
                    value={identifier}
                    onChange={handleIdentifierChange}
                    onBlur={() => handleBlur("identifier")}
                  />
                  {(touched.identifier || submitted) && errors.identifier && (
                    <p className="text-rose-500 text-sm mt-1">
                      {errors.identifier}
                    </p>
                  )}
                  {isAccountNotFound && (
                    <p className="text-rose-500 text-sm mt-1">
                      {serverError}{" "}
                      <Link
                        to="/register"
                        className="font-semibold underline hover:text-rose-700"
                      >
                        Register Now
                      </Link>
                    </p>
                  )}
                </div>

                <div>
                  <input
                    type="password"
                    placeholder="Password"
                    className={inputClass("password")}
                    value={password}
                    onChange={handlePasswordChange}
                    onBlur={() => handleBlur("password")}
                  />
                  {(touched.password || submitted) && errors.password && (
                    <p className="text-rose-500 text-sm mt-1">
                      {errors.password}
                    </p>
                  )}
                  {isPasswordWrong && (
                    <p className="text-rose-500 text-sm mt-1">{serverError}</p>
                  )}
                </div>

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
                  disabled={!canSubmit || loading}
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
