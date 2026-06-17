import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

export default function CartDrawer({ open, onClose }) {
  const cart = useSelector((state) => state.cart.items);
  const navigate = useNavigate();

  const DELIVERY_CHARGES = 30; // Rs 30 delivery fee for orders below Rs 99
  const FREE_DELIVERY_THRESHOLD = 99;

  const subtotal = (cart || []).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const deliveryCharges = subtotal < FREE_DELIVERY_THRESHOLD ? DELIVERY_CHARGES : 0;
  const total = subtotal + deliveryCharges;

  return (
    <div
      className={`fixed top-0 right-0 h-full w-[85%] sm:w-96 bg-white shadow-xl z-50 transform transition ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="p-4 border-b flex justify-between">
        <h2 className="font-bold text-lg">My Cart</h2>
        <button onClick={onClose}>✕</button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto h-[70%]">
        {cart.length === 0 ? (
          <p>Your cart is empty</p>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>{item.name}</span>
              <span>
                {item.quantity} × ₹{item.price}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t space-y-3">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery</span>
            <span className={deliveryCharges === 0 ? "text-green-600" : "text-slate-900"}>
              {deliveryCharges === 0 ? "Free" : `₹${deliveryCharges.toFixed(2)}`}
            </span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
            <span>Total</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
        </div>

        {subtotal < FREE_DELIVERY_THRESHOLD && cart.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800">
            Add ₹{(FREE_DELIVERY_THRESHOLD - subtotal).toFixed(2)} more for FREE delivery!
          </div>
        )}

        <button
          onClick={() => {
            navigate("/cart");
            onClose();
          }}
          className="w-full bg-gray-200 py-2 rounded"
        >
          View Cart
        </button>

        <button
          onClick={() => {
            navigate("/checkout");
            onClose();
          }}
          className="w-full bg-green-600 text-white py-2 rounded"
        >
          Checkout
        </button>
      </div>
    </div>
  );
}