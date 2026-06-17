import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useEffect } from "react";
import { useWebSocket } from "./context/WebSocketContext";

// Layouts
import AdminLayout from "./layouts/AdminLayout";

// Shop Pages
import Home from "./pages/Home";
import RoleSelect from "./pages/RoleSelect";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Confirmation from "./pages/Confirmation";
import OrderSuccess from "./pages/OrderSuccess";
import Wishlist from "./pages/Wishlist";
import OrderHistory from "./pages/OrderHistory";
import OrderTracking from "./pages/OrderTracking";
import ProfilePage from "./pages/ProfilePage";
import Adminlogin from "./pages/admin/Adminlogin";
import DeliveryLogin from "./pages/delivery/DeliveryLogin";
import DeliveryRegister from "./pages/delivery/DeliveryRegister";
import DeliveryDashboard from "./pages/delivery/DeliveryDashboard";
import DeliveryForgotPassword from "./pages/delivery/DeliveryForgotPassword";
import DeliveryResetPassword from "./pages/delivery/DeliveryResetPassword";

// Shop Pages
import Rewards from "./pages/Rewards";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminProducts from "./pages/admin/Products";
import AdminOrders from "./pages/admin/Orders";
import AdminDeliveryPartners from "./pages/admin/DeliveryPartners";

// Context & Toast
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AIAssistant from "./components/AIAssistant";

// ⭐ Reward Imports
import { setReward } from "./redux/slices/rewardSlice";
import { getRewardCoins } from "./services/rewardService";

// ProtectedRoute
const ProtectedRoute = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.user?.isAdmin || user?.isAdmin;

  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const DeliveryProtectedRoute = ({ children }) => {
  const { deliveryPartner } = useSelector((state) => state.deliveryAuth);
  if (!deliveryPartner?.token) {
    return <Navigate to="/delivery/login" replace />;
  }
  return children;
};

export default function App() {

  const dispatch = useDispatch();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const { status: wsStatus, lastMessage, sendJson, url: wsUrl } = useWebSocket();
  const hideAIAssistant =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/delivery");

  // ⭐ LOAD REWARD COINS WHEN USER LOGS IN
  useEffect(() => {

    const loadCoins = async () => {

      if (!user) return;

      try {

        const data = await getRewardCoins();

        dispatch(setReward(data.coins));

      } catch (error) {

        console.log("Reward fetch error:", error);

      }

    };

    loadCoins();

  }, [user, dispatch]);

  useEffect(() => {
    if (wsStatus !== "open") return;
    sendJson({ type: "ping" });
    console.log("[ws] connected:", wsUrl);
  }, [sendJson, wsStatus, wsUrl]);

  useEffect(() => {
    if (!lastMessage) return;
    console.log("[ws] message:", lastMessage);
  }, [lastMessage]);

  return (
    <>
      <Routes>

        {/* PUBLIC ROUTES */}

<Route path="/" element={<RoleSelect />} />
        <Route path="/home" element={<Home />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin/login" element={<Adminlogin />} />
        <Route path="/delivery/login" element={<DeliveryLogin />} />
        <Route path="/delivery/forgot-password" element={<DeliveryForgotPassword />} />
        <Route path="/delivery/reset-password" element={<DeliveryResetPassword />} />
        <Route path="/delivery/register" element={<DeliveryRegister />} />
        <Route
          path="/delivery/dashboard"
          element={
            <DeliveryProtectedRoute>
              <DeliveryDashboard />
            </DeliveryProtectedRoute>
          }
        />
        <Route path="/register" element={<Register />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/confirmation" element={<Confirmation />} />
        <Route path="/order-success" element={<OrderSuccess />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/orders" element={<OrderHistory />} />
        <Route path="/orders/:orderId" element={<OrderTracking />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/rewards" element={<Rewards />} />

        {/* ADMIN ROUTES */}

        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Routes>
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="delivery-partners" element={<AdminDeliveryPartners />} />
                  <Route path="" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* 404 */}

        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>

      <ToastContainer theme="colored" autoClose={2000} />
      {!hideAIAssistant && <AIAssistant />}
    </>
  );
}
