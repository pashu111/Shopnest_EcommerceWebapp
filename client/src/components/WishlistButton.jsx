import { Heart } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toggleWishlist } from "../redux/slices/wishlistSlice";

// Helper function to get item ID (handles both 'id' and '_id' fields)
const getItemId = (item) => item.id ?? item._id;

export default function WishlistButton({ product }) {
  const dispatch = useDispatch();
  const wishlist = useSelector((state) => state.wishlist.items);
  const liked = wishlist.find((p) => getItemId(p) === getItemId(product));

  return (
    <button
      onClick={() => dispatch(toggleWishlist(product))}
      className="absolute top-3 right-3 bg-white p-1.5 rounded-full shadow"
    >
      <Heart
        size={18}
        className={liked ? "fill-red-500 text-red-500" : "text-gray-500"}
      />
    </button>
  );
}
