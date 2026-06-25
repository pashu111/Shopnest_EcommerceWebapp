import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", damping: 20, stiffness: 200 } },
};

export default function RoleSelect() {
  return (
    <div className="min-h-screen bg-[#f7f5f2]">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_55%)]" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl mx-auto"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
              Welcome to ShopNest
            </p>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              Choose how you want to enter
            </h1>
            <p className="mt-3 text-slate-600">
              Pick your role to continue. You can always switch later.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-10 grid gap-6 md:grid-cols-3"
          >
            <motion.div variants={cardVariants}>
              <Link
                to="/home"
                className="group block bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                  U
                </div>
                <h2 className="mt-4 text-xl font-bold text-slate-900">
                  User
                </h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Shop groceries, track orders, and manage your profile.
                </p>
                <div className="mt-4 text-sm font-semibold text-emerald-700 group-hover:translate-x-1 transition inline-flex items-center gap-1">
                  Continue as User →
                </div>
              </Link>
            </motion.div>

            <motion.div variants={cardVariants}>
              <Link
                to="/admin/login"
                className="group block bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="h-12 w-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                  A
                </div>
                <h2 className="mt-4 text-xl font-bold text-slate-900">
                  Admin
                </h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Manage products, orders, and store insights.
                </p>
                <div className="mt-4 text-sm font-semibold text-rose-700 group-hover:translate-x-1 transition inline-flex items-center gap-1">
                  Go to Admin →
                </div>
              </Link>
            </motion.div>

            <motion.div variants={cardVariants}>
              <Link
                to="/delivery/login"
                className="group block bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="h-12 w-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                  D
                </div>
                <h2 className="mt-4 text-xl font-bold text-slate-900">
                  Delivery Partner
                </h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  View assigned deliveries and update order status.
                </p>
                <div className="mt-4 text-sm font-semibold text-sky-700 group-hover:translate-x-1 transition inline-flex items-center gap-1">
                  Continue as Delivery →
                </div>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
