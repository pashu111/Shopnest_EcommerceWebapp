import { motion, AnimatePresence } from "motion/react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, X, ArrowRight, Truck } from "lucide-react";

export default function CartDrawer({ open, onClose }) {
  const cart = useSelector((state) => state.cart.items);
  const navigate = useNavigate();

  const DELIVERY_CHARGES = 30;
  const FREE_DELIVERY_THRESHOLD = 99;

  const subtotal = (cart || []).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const deliveryCharges = subtotal < FREE_DELIVERY_THRESHOLD ? DELIVERY_CHARGES : 0;
  const total = subtotal + deliveryCharges;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            className="fixed top-0 right-0 h-full w-[85%] sm:w-96 bg-white shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-emerald-600" />
                <h2 className="font-bold text-lg text-slate-900">
                  My Cart ({cart.length})
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <ShoppingBag size={48} className="mb-3 opacity-50" />
                  <p className="font-semibold">Your cart is empty</p>
                  <p className="text-sm mt-1">Add items to get started</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id || item._id}
                    className="flex items-center gap-3 bg-slate-50 rounded-xl p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        ₹{item.price} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-bold text-emerald-700 text-sm">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-slate-200 p-4 space-y-3 bg-white">
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <Truck size={14} /> Delivery
                    </span>
                    <span className={deliveryCharges === 0 ? "text-emerald-600 font-semibold" : "text-slate-900"}>
                      {deliveryCharges === 0 ? "Free" : `₹${deliveryCharges.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t border-slate-200 pt-2 mt-2">
                    <span>Total</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>

                {subtotal < FREE_DELIVERY_THRESHOLD && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-800 text-center font-medium">
                    Add ₹{(FREE_DELIVERY_THRESHOLD - subtotal).toFixed(2)} more for FREE delivery!
                  </div>
                )}

                <button
                  onClick={() => {
                    navigate("/cart");
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 py-2.5 rounded-xl font-semibold text-sm transition"
                >
                  View Cart <ArrowRight size={16} />
                </button>

                <button
                  onClick={() => {
                    navigate("/checkout");
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-semibold text-sm transition shadow-lg shadow-emerald-200/50"
                >
                  Checkout <ArrowRight size={16} />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}