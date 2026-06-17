import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, User, Menu, X, Coins, Heart } from "lucide-react";
import logo from "../assets/ShopNest.png";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../redux/slices/authSlice";

export default function Navbar({ searchTerm, setSearchTerm }) {
  const { user } = useSelector((state) => state.auth);
  const cartItems = useSelector((state) => state.cart.items);
  const wishlistItems = useSelector((state) => state.wishlist.items);
  const rewardCoins = useSelector((state) => state.reward.coins);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // 🛒 Total Cart Count
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  // ❤️ Wishlist Count
  const wishlistCount = wishlistItems.length;

  // 🪙 reward animation
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (rewardCoins > 0) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [rewardCoins]);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <nav className="bg-white shadow sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">

        {/* Logo */}
        <Link to="/home" className="flex items-center gap-2 min-w-0 shrink">
          <img src={logo} alt="ShopNest" className="h-8 shrink-0" />
          <span className="text-lg sm:text-xl font-bold text-blue-700 truncate">
            ShopNest
          </span>
        </Link>

        {/* Desktop Search */}
        <div className="hidden md:flex flex-1 mx-4">
          <input
            type="text"
            placeholder="Search essentials, groceries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Desktop Right Section */}
        <div className="hidden md:flex items-center gap-4 lg:gap-5 min-w-0">

          {/* Auth */}
          {user ? (
            <>
              <Link to="/profile" className="flex items-center gap-1 text-sm min-w-0 max-w-40">
                <User size={18} className="shrink-0" />
                <span className="truncate">{user.name}</span>
              </Link>

              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition"
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="flex items-center gap-1 text-sm">
              <User size={18} className="shrink-0" />
              <span>Sign In</span>
            </Link>
          )}

          {/* Wishlist */}
          <Link to="/wishlist" className="relative">
            <Heart size={22} />
            {wishlistCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-pink-500 text-white text-xs px-1.5 rounded-full">
                {wishlistCount}
              </span>
            )}
          </Link>

          {/* Reward Coins */}
          
            <Link
              to="/rewards"
              className={`relative flex items-center gap-1 bg-yellow-300 text-black px-3 py-1 rounded-full shadow border border-yellow-500 hover:scale-105 transition ${
                animate ? "animate-pulse" : ""
              }`}
              title="Your Reward Coins"
            >
              <Coins size={18} className="text-yellow-700" />
              <span className="font-semibold text-sm">{rewardCoins}</span>
            </Link>
          

          {/* Cart */}
          <Link to="/cart" className="relative">
            <ShoppingCart size={22} />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-green-600 text-white text-xs px-1.5 rounded-full">
                {cartCount}
              </span>
            )}
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex md:hidden items-center gap-3 shrink-0">
          <button onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div className="md:hidden bg-gray-50 border-t px-4 py-3 space-y-3">

          {/* Mobile Search */}
          <input
            type="text"
            placeholder="Search essentials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Auth */}
          {user ? (
            <>
              <Link to="/profile" className="flex items-center gap-2 min-w-0">
                <User size={18} className="shrink-0" />
                <span className="truncate">{user.name}</span>
              </Link>

              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-3 py-1 rounded w-full"
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="flex items-center gap-2">
              <User size={18} />
              <span>Sign In</span>
            </Link>
          )}

          {/* Wishlist */}
          <Link to="/wishlist" className="flex items-center gap-2">
            <Heart size={22} />
            <span>Wishlist</span>

            {wishlistCount > 0 && (
              <span className="ml-auto bg-pink-500 text-white text-xs px-2 rounded-full">
                {wishlistCount}
              </span>
            )}
          </Link>

          
        {/* Reward Coins */}
<Link
  to="/rewards"
  className={`relative flex items-center gap-1 bg-yellow-300 text-black px-3 py-1 rounded-full shadow border border-yellow-500 hover:scale-105 transition ${
    animate ? "animate-pulse" : ""
  }`}
  title="Your Reward Coins"
>
  <Coins size={18} className="text-yellow-700" />
  <span className="font-semibold text-sm">{rewardCoins} Coins</span>
</Link>

          {/* Cart */}
          <Link to="/cart" className="flex items-center gap-2">
            <ShoppingCart size={22} />
            <span>Cart</span>

            {cartCount > 0 && (
              <span className="ml-auto bg-green-600 text-white text-xs px-2 rounded-full">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      )}
    </nav>
  );
}
