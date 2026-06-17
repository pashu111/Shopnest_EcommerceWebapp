import { Link } from "react-router-dom";

export default function RoleSelect() {
  return (
    <div className="min-h-screen bg-[#f7f5f2]">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_55%)]" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
              Welcome to ShopNest
            </p>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900">
              Choose how you want to enter
            </h1>
            <p className="mt-3 text-slate-600">
              Pick your role to continue. You can always switch later.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <Link
              to="/home"
              className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition"
            >
              <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                U
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-900">
                User
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Shop groceries, track orders, and manage your profile.
              </p>
              <div className="mt-4 text-sm font-semibold text-emerald-700 group-hover:translate-x-1 transition">
                Continue as User →
              </div>
            </Link>

            <Link
              to="/admin/login"
              className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition"
            >
              <div className="h-12 w-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                A
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-900">
                Admin
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Manage products, orders, and store insights.
              </p>
              <div className="mt-4 text-sm font-semibold text-rose-700 group-hover:translate-x-1 transition">
                Go to Admin →
              </div>
            </Link>

            <Link
              to="/delivery/login"
              className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition"
            >
              <div className="h-12 w-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                D
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-900">
                Delivery Partner
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                View assigned deliveries and update order status.
              </p>
              <div className="mt-4 text-sm font-semibold text-sky-700 group-hover:translate-x-1 transition">
                Continue as Delivery →
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
