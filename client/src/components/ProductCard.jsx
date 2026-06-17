import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";
import {
  addToCart,
  increaseQuantity,
  decreaseQuantity,
} from "../redux/slices/cartSlice";
import { toast } from "react-toastify";
import { ShoppingCart, Plus, Minus, Star, Image as ImageIcon } from "lucide-react";
import WishlistButton from "./WishlistButton";
import { resolveAssetUrl } from "../utils/assetUrl";

// ProductImage component with error handling for better mobile support
function ProductImage({ product }) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = resolveAssetUrl(product.image);

  if (imageError || !imageUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
        <div className="text-center">
          <ImageIcon size={48} className="mx-auto mb-2" />
          <span className="text-xs">Image unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={product.name}
      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      loading="lazy"
      onError={() => setImageError(true)}
    />
  );
}

export default function ProductCard({ product }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const cartItems = useSelector((state) => state.cart.items);
  const existingItem = cartItems.find(
    (item) => (item._id || item.id) === (product._id || product.id)
  );

  const handleAdd = () => {
    if (!user) {
      toast.error("Please login to add items to cart");
      return;
    }
    dispatch(addToCart(product));
    toast.success(`Added ${product.name}`);
  };

  const handleIncrease = () => {
    dispatch(increaseQuantity(product._id || product.id));
    toast.info(`Increased ${product.name} quantity`);
  };

  const handleDecrease = () => {
    dispatch(decreaseQuantity(product._id || product.id));
    toast.warn(`Decreased ${product.name} quantity`);
  };

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className="absolute top-3 right-3 z-10">
        <WishlistButton product={product} />
      </div>

      {product.discount && (
        <span className="absolute top-3 left-3 z-10 bg-rose-600 text-white text-xs font-semibold px-2 py-1 rounded-full shadow">
          {product.discount}% OFF
        </span>
      )}

      <div className="relative overflow-hidden bg-slate-50 aspect-4/3">
        <ProductImage product={product} />
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900 text-sm sm:text-base line-clamp-2">
            {product.name}
          </h3>
          <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
            Best
          </span>
        </div>

        <div className="flex items-center gap-1 text-yellow-500 text-xs mt-2">
          <Star size={14} fill="currentColor" />
          <span className="text-slate-600">{product.rating || "4.5"}</span>
          <span className="text-slate-400">(1.2k)</span>
        </div>

        <div className="flex items-center justify-between mt-3">
          <p className="font-extrabold text-emerald-700 text-base">
            ₹{product.price}
          </p>

          {product.mrp && (
            <p className="text-xs text-slate-400 line-through">
              ₹{product.mrp}
            </p>
          )}
        </div>

        {existingItem ? (
          <div className="mt-3 flex items-center justify-between bg-slate-50 border border-slate-200 rounded-full px-2 py-1">
            <button
              onClick={handleDecrease}
              className="bg-white p-1.5 rounded-full shadow hover:scale-110 transition"
            >
              <Minus size={14} />
            </button>

            <span className="font-semibold text-sm">
              {existingItem.quantity}
            </span>

            <button
              onClick={handleIncrease}
              className="bg-white p-1.5 rounded-full shadow hover:scale-110 transition"
            >
              <Plus size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleAdd}
            className="mt-3 w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-full text-sm font-semibold transition-all"
          >
            <ShoppingCart size={16} /> Add to Cart
          </button>
        )}
      </div>
    </div>
  );
}
