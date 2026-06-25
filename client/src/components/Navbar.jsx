import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, User, Menu, X, Coins, Heart, Search } from "lucide-react";
import logo from "../assets/ShopNest.png";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../redux/slices/authSlice";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar({ searchTerm, setSearchTerm }) {
  const { user } = useSelector((state) => state.auth);
  const cartItems = useSelector((state) => state.cart.items);
  const wishlistItems = useSelector((state) => state.wishlist.items);
  const rewardCoins = useSelector((state) => state.reward.coins);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const wishlistCount = wishlistItems.length;

  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (rewardCoins > 0) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [rewardCoins]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const navLinkClass =
    "relative flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-emerald-700 transition-colors";

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/80 backdrop-blur-xl shadow-lg shadow-slate-200/50"
          : "bg-white shadow-sm"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link to="/home" className="flex items-center gap-2 shrink-0">
            <img src={logo} alt="ShopNest" className="h-8 w-auto" />
            <span className="text-xl font-extrabold text-emerald-700 hidden sm:inline">
              ShopNest
            </span>
          </Link>

          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 max-w-lg mx-4">
            <div className="relative w-full">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search essentials, groceries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Desktop Right */}
          <div className="hidden md:flex items-center gap-3 lg:gap-5">
            {user ? (
              <Link to="/profile" className={navLinkClass}>
                <User size={18} />
                <span className="max-w-24 truncate">{user.name}</span>
              </Link>
            ) : (
              <Link to="/login" className={navLinkClass}>
                <User size={18} />
                <span>Sign In</span>
              </Link>
            )}

            <Link to="/wishlist" className="relative p-1.5 hover:text-pink-600 transition-colors">
              <Heart size={20} />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full ring-2 ring-white">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <Link
              to="/rewards"
              className={`flex items-center gap-1.5 bg-amber-50 text-amber-800 px-3 py-1.5 rounded-full text-xs font-bold border border-amber-200 hover:bg-amber-100 transition-all ${
                animate ? "animate-pulse ring-2 ring-amber-400" : ""
              }`}
            >
              <Coins size={16} className="text-amber-600" />
              <span>{rewardCoins}</span>
            </Link>

            <Link to="/cart" className="relative p-1.5 hover:text-emerald-600 transition-colors">
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full ring-2 ring-white">
                  {cartCount}
                </span>
              )}
            </Link>

            {user && (
              <button
                onClick={handleLogout}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
              >
                Logout
              </button>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-slate-200 bg-white overflow-hidden"
          >
            <div className="px-4 py-4 space-y-3">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search essentials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              {user ? (
                <>
                  <Link
                    to="/profile"
                    className="flex items-center gap-3 py-2 text-sm font-medium text-slate-700"
                    onClick={() => setMobileOpen(false)}
                  >
                    <User size={18} />
                    {user.name}
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setMobileOpen(false); }}
                    className="w-full text-left py-2 text-sm font-medium text-rose-600"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-3 py-2 text-sm font-medium text-slate-700"
                  onClick={() => setMobileOpen(false)}
                >
                  <User size={18} />
                  Sign In
                </Link>
              )}

              <Link
                to="/wishlist"
                className="flex items-center justify-between py-2 text-sm font-medium text-slate-700"
                onClick={() => setMobileOpen(false)}
              >
                <span className="flex items-center gap-3">
                  <Heart size={18} />
                  Wishlist
                </span>
                {wishlistCount > 0 && (
                  <span className="bg-pink-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              <Link
                to="/rewards"
                className="flex items-center gap-3 py-2 text-sm font-medium text-amber-700"
                onClick={() => setMobileOpen(false)}
              >
                <Coins size={18} />
                Rewards ({rewardCoins} coins)
              </Link>

              <Link
                to="/cart"
                className="flex items-center justify-between py-2 text-sm font-medium text-slate-700"
                onClick={() => setMobileOpen(false)}
              >
                <span className="flex items-center gap-3">
                  <ShoppingCart size={18} />
                  Cart
                </span>
                {cartCount > 0 && (
                  <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
