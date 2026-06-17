import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { CreditCard, MapPinned, Phone, ShieldCheck, ShoppingBag, UserRound } from "lucide-react";
import { addOrder } from "../redux/slices/orderSlice";
import { clearCart } from "../redux/slices/cartSlice";
import AddressForm from "../components/AddressForm";
import { createOrder } from "../services/orderService";
import {
  createRazorpayOrder,
  verifyRazorpayPaymentAndCreateOrder,
} from "../services/paymentService";

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);

    // Razorpay Checkout is hosted on Razorpay's CDN, so internet access is required
    // even in TEST MODE. If the browser is offline, fail fast with a clean error path.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return resolve(false);
    }

    const src = "https://checkout.razorpay.com/v1/checkout.js";
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function Checkout() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cart = useSelector((state) => state.cart.items);
  const { user } = useSelector((state) => state.auth);
  const isSubmittingRef = useRef(false);
  const handledPaymentIdsRef = useRef(new Set());

  const [isPaying, setIsPaying] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");

  const clearPersistedCart = () => {
    try {
      localStorage.removeItem("cartItems");
      localStorage.removeItem("cart");
      sessionStorage.removeItem("cartItems");
      sessionStorage.removeItem("cart");
    } catch {
      // Storage can fail in private browsing; Redux state is still cleared.
    }
  };

  const saveLocalOrderAndNavigate = async (createdOrder, formData, items, total) => {
    // `orderId` is a human-friendly 8-digit id in this project.
    // `_id` is the MongoDB ObjectId (needed for APIs like scratch reward / order tracking).
    const orderDbId = createdOrder?._id || "";
    const orderId = createdOrder?.orderId || orderDbId || Date.now().toString();

    dispatch(
      addOrder({
        id: orderId,
        items: items.map((i) => `${i.name} x${i.quantity}`),
        total,
        paymentMethod: createdOrder?.paymentMethod || formData.paymentMethod,
        date: new Date(createdOrder?.createdAt || Date.now()).toLocaleString(),
        status: createdOrder?.status || "Placed",
      })
    );
    dispatch(clearCart());
    clearPersistedCart();

    const result = await Swal.fire({
      title: "Order Placed Successfully",
      text: "Your order has been placed successfully.",
      icon: "success",
      showCancelButton: true,
      confirmButtonText: "Scratch Reward",
      cancelButtonText: "Later",
    });

    navigate("/confirmation", {
      state: {
        ...formData,
        orderId,
        orderDbId,
        rewardEligible: Boolean(result.isConfirmed),
      },
    });
  };

  const DELIVERY_CHARGES = 30; // Rs 30 delivery fee for orders below Rs 99
  const FREE_DELIVERY_THRESHOLD = 99;
  const formatMoney = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    phone: "",
  });
  const [deliveryLocation, setDeliveryLocation] = useState({
    latitude: null,
    longitude: null,
    fullAddress: "",
  });

  const validateDeliveryLocation = (location) => {
    const fullAddress = String(location?.fullAddress || "").trim();
    const latitude =
      location?.latitude === null || location?.latitude === ""
        ? NaN
        : Number(location?.latitude);
    const longitude =
      location?.longitude === null || location?.longitude === ""
        ? NaN
        : Number(location?.longitude);

    if (fullAddress.length < 12) {
      return "Please enter a complete delivery address.";
    }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      return "Please select or validate a valid latitude.";
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return "Please select or validate a valid longitude.";
    }

    return "";
  };

  const handleOrder = async (formData) => {
    if (isSubmittingRef.current || isPaying) return;

    if (!Array.isArray(cart) || cart.length === 0) {
      await Swal.fire({
        title: "Cart is empty",
        text: "Please add items to your cart before placing an order.",
        icon: "warning",
      });
      navigate("/cart");
      return;
    }

    const addressError = validateDeliveryLocation(formData.deliveryLocation);
    if (addressError) {
      isSubmittingRef.current = false;
      await Swal.fire({
        title: "Check delivery address",
        text: addressError,
        icon: "warning",
      });
      return;
    }

    isSubmittingRef.current = true;
    const token = user?.token || null;
    const isJwt = typeof token === "string" && token.split(".").length === 3;
    if (!isJwt) {
      isSubmittingRef.current = false;
      await Swal.fire({
        title: "Login required",
        text: "Please log in to place your order.",
        icon: "warning",
        confirmButtonText: "Go to Login",
      });
      navigate("/login");
      return;
    }

    const subtotal = (cart || []).reduce((sum, item) => sum + item.price * item.quantity, 0);
    // Delivery charges: Rs 30 if subtotal < Rs 99, else free
    const deliveryCharges = subtotal < FREE_DELIVERY_THRESHOLD ? DELIVERY_CHARGES : 0;
    const total = subtotal + deliveryCharges;
    
    const items = (cart || []).map((item) => ({
      productId: item._id || item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity || 1,
      image: item.image,
    }));

    const orderPayload = {
      products: items,
      totalAmount: total,
      deliveryCharges: deliveryCharges,
      paymentMethod: formData.paymentMethod,
      customerName: formData.name,
      customerPhone: formData.phone,
      deliveryAddress: formData.deliveryLocation.fullAddress,
      deliveryLocation: formData.deliveryLocation,
    };

    try {
      if (formData.paymentMethod === "Razorpay") {
        setIsPaying(true);
        const ok = await loadRazorpayScript();
        if (!ok) {
          throw new Error(
            "Razorpay checkout failed to load. Check your internet connection (or firewall/proxy) and try again."
          );
        }

        const razorpay = await createRazorpayOrder(Math.round(total * 100), {
          userId: user?._id || user?.id || "",
          app: "shopnest",
        });

        const keyFromApi = String(razorpay?.keyId || "").trim();
        if (!keyFromApi) {
          throw new Error(
            "Razorpay key was not returned by the server. Ensure RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET are set in server/.env."
          );
        }

        // Optional: keep a client-side key for visibility, but never let it override the server key.
        // If these mismatch, Razorpay Checkout can show "Oops! Something went wrong." while opening.
        const envKeyId = String(import.meta.env.VITE_RAZORPAY_KEY_ID || "").trim();
        if (envKeyId && envKeyId !== keyFromApi) {
          console.warn(
            "[Razorpay] VITE_RAZORPAY_KEY_ID does not match server keyId. Using server keyId.",
            { envKeyId, keyFromApi }
          );
        }

        const orderId = String(razorpay?.orderId || "").trim();
        if (!orderId) {
          throw new Error("Razorpay orderId was not returned by the server. Please try again.");
        }

        const options = {
          key: keyFromApi,
          amount: razorpay.amount,
          currency: razorpay.currency,
          name: "ShopNest",
          description: "Order Payment",
          order_id: orderId,
          prefill: {
            name: formData.name,
            email: user?.email || "",
            contact: String(formData.phone || ""),
          },
          theme: { color: "#16a34a" },
          handler: async (response) => {
            try {
              const paymentId = response?.razorpay_payment_id;
              if (paymentId && handledPaymentIdsRef.current.has(paymentId)) {
                setIsPaying(false);
                return;
              }
              if (paymentId) {
                handledPaymentIdsRef.current.add(paymentId);
              }

              const created = await verifyRazorpayPaymentAndCreateOrder(
                {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
                orderPayload
              );
              await saveLocalOrderAndNavigate(created, formData, items, total);
            } catch (err) {
              isSubmittingRef.current = false;
              const message =
                err?.response?.data?.message ||
                err?.message ||
                "Payment verified but order could not be saved. Please contact support.";
              Swal.fire({ title: "Payment Failed", text: message, icon: "error" });
            }
            setIsPaying(false);
          },
          modal: {
            ondismiss: () => {
              isSubmittingRef.current = false;
              Swal.fire({
                title: "Payment Failed",
                text: "You closed the payment window. No order was placed.",
                icon: "error",
              });
              setIsPaying(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);

        // Failure callback (declines, invalid OTP, etc.)
        rzp.on("payment.failed", (response) => {
          isSubmittingRef.current = false;
          const description =
            response?.error?.description ||
            response?.error?.reason ||
            "Your payment could not be completed.";

          const looksLikeInternationalCardError =
            typeof description === "string" &&
            /international cards?/i.test(description);

          Swal.fire({
            title: "Payment Failed",
            text: looksLikeInternationalCardError
              ? "Razorpay is blocking this card because International Cards are disabled on your Razorpay account. Use a domestic test card / UPI, or enable International Payments in your Razorpay Dashboard settings."
              : description,
            icon: "error",
          });
          setIsPaying(false);
        });

        rzp.open();
        return;
      }

      setIsPaying(true);
      const created = await createOrder(orderPayload, token);
      await saveLocalOrderAndNavigate(created, formData, items, total);
    } catch (err) {
      isSubmittingRef.current = false;
      const message =
        err?.code === "OFFLINE"
          ? "You are offline. Please connect to the internet and try again."
          :
        err?.response?.data?.message ||
        err?.message ||
        "Could not place your order. Please try again.";
      Swal.fire({
        title: formData.paymentMethod === "Razorpay" ? "Payment Failed" : "Order Failed",
        text: message,
        icon: "error",
      });
      setIsPaying(false);
    } finally {
      // For Razorpay, keep loading state until popup success/failure/dismiss callbacks.
      if (formData.paymentMethod !== "Razorpay") {
        isSubmittingRef.current = false;
        setIsPaying(false);
      }
    }
  };

  const subtotal = (cart || []).reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryCharges = subtotal < FREE_DELIVERY_THRESHOLD ? DELIVERY_CHARGES : 0;
  const total = subtotal + deliveryCharges;

  return (
    <div className="min-h-screen bg-[#f7f5f2] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
              Secure Checkout
            </p>
            <h1 className="mt-1 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Confirm your order
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Select an accurate delivery location, edit the address if needed, and choose your payment method.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700">
            <ShieldCheck size={16} />
            Encrypted payment
          </div>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleOrder({
              name: customerDetails.name,
              phone: customerDetails.phone,
              paymentMethod: selectedPaymentMethod,
              deliveryLocation: {
                latitude:
                  deliveryLocation.latitude === null || deliveryLocation.latitude === ""
                    ? null
                    : Number(deliveryLocation.latitude),
                longitude:
                  deliveryLocation.longitude === null || deliveryLocation.longitude === ""
                    ? null
                    : Number(deliveryLocation.longitude),
                fullAddress: String(deliveryLocation.fullAddress || "").trim(),
              },
            });
          }}
          className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]"
        >
          <div className="space-y-5">
            <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <UserRound size={18} className="text-emerald-700" />
                <h2 className="text-lg font-bold text-slate-900">Contact details</h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Full name
                  </span>
                  <input
                    name="name"
                    value={customerDetails.name}
                    onChange={(event) =>
                      setCustomerDetails((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="Enter your name"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/30"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Phone size={15} />
                    Phone number
                  </span>
                  <input
                    name="phone"
                    value={customerDetails.phone}
                    onChange={(event) =>
                      setCustomerDetails((prev) => ({ ...prev, phone: event.target.value }))
                    }
                    placeholder="10 digit mobile number"
                    pattern="[0-9]{10}"
                    inputMode="numeric"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/30"
                    required
                  />
                </label>
              </div>
            </section>

            <AddressForm
              value={deliveryLocation}
              onChange={setDeliveryLocation}
              disabled={isPaying}
            />

            <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <CreditCard size={18} className="text-emerald-700" />
                <h2 className="text-lg font-bold text-slate-900">Payment method</h2>
              </div>

              <select
                name="paymentMethod"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/30"
                required
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              >
                <option value="">Select Payment Method</option>
                <option value="Razorpay">Razorpay</option>
                <option value="COD">Cash on Delivery</option>
              </select>
            </section>
          </div>

          <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-20">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Summary
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Order total</h2>
              </div>
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                <ShoppingBag size={20} />
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between text-slate-700">
                <span>Items</span>
                <span>{(cart || []).reduce((sum, item) => sum + (item.quantity || 1), 0)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Subtotal</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Delivery</span>
                <span className={deliveryCharges === 0 ? "font-semibold text-emerald-700" : ""}>
                  {deliveryCharges === 0 ? "Free" : formatMoney(deliveryCharges)}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-3">
                <div className="flex justify-between text-lg font-bold text-slate-900">
                  <span>Total</span>
                  <span>{formatMoney(total)}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
              <div className="flex gap-2">
                <MapPinned size={18} className="mt-0.5 shrink-0 text-emerald-700" />
                <p className="text-sm text-emerald-900">
                  We save your selected address and coordinates with this order for faster delivery assignment.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPaying}
              className="mt-5 w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200/70 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPaying
                ? "Processing..."
                : selectedPaymentMethod === "Razorpay"
                  ? "Pay Now"
                  : "Place Order"}
            </button>
          </aside>
        </form>
      </div>
    </div>
  );
}
