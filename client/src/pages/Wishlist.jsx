import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { Trash2, Heart } from "lucide-react";
import { removeFromWishlist } from "../redux/slices/wishlistSlice";
import { resolveAssetUrl } from "../utils/assetUrl";

const getItemId = (item) => item.id ?? item._id;

const Wishlist = () => {
  const dispatch = useDispatch();
  const wishlist = useSelector((state) => state.wishlist.items);

  if (!wishlist || wishlist.length === 0) {
    return (
      <div className="min-h-screen bg-[#f7f5f2]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
            <Heart size={48} className="mx-auto text-slate-300 mb-4" />
            <h2 className="text-2xl font-semibold text-slate-900">
              Your Wishlist is empty
            </h2>
            <p className="text-slate-600 mt-2">
              Add your favorite products to keep them here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f5f2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">
              Saved For Later
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              My Wishlist
            </h1>
            <p className="text-slate-600 mt-1">
              Keep track of items you love and revisit anytime.
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold">
            {wishlist.length} items
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {wishlist.map((item, index) => {
            const itemId = getItemId(item);
            return (
              <motion.div
                key={itemId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="relative overflow-hidden rounded-xl bg-slate-50 aspect-square">
                  <img
                    src={resolveAssetUrl(item.image)}
                    alt={item.name}
                    className="h-full w-full object-contain p-4"
                  />
                </div>

                <div className="mt-4">
                  <h3 className="font-semibold text-lg text-slate-900 line-clamp-1">
                    {item.name}
                  </h3>
                  <p className="text-emerald-600 font-bold mt-1">
                    ₹{item.price}
                  </p>
                </div>

                <div className="mt-4">
                  <button
                    onClick={() => dispatch(removeFromWishlist(itemId))}
                    className="w-full flex items-center justify-center gap-2 bg-rose-50 text-rose-600 border border-rose-200 px-3 py-2.5 rounded-xl hover:bg-rose-600 hover:text-white hover:border-rose-600 font-semibold text-sm transition-all"
                  >
                    <Trash2 size={16} /> Remove
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Wishlist;
