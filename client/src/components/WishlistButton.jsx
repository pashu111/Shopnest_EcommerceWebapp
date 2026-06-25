import { Heart } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toggleWishlist } from "../redux/slices/wishlistSlice";

const getItemId = (item) => item.id ?? item._id;

export default function WishlistButton({ product }) {
  const dispatch = useDispatch();
  const wishlist = useSelector((state) => state.wishlist.items);
  const liked = !!wishlist.find((p) => getItemId(p) === getItemId(product));

  return (
    <button
      onClick={() => dispatch(toggleWishlist(product))}
      className={`absolute top-3 right-3 p-2 rounded-full shadow-md backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-90 ${
        liked
          ? "bg-rose-50 text-rose-600"
          : "bg-white/90 text-slate-400 hover:text-rose-500 hover:bg-rose-50"
      }`}
      aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
    >
      <Heart
        size={16}
        className={`transition-all duration-200 ${
          liked ? "fill-rose-500 text-rose-500" : "text-current"
        }`}
      />
    </button>
  );
}
