import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaTrash } from "react-icons/fa";
import { removeFromWishlist } from "../redux/slices/wishlistSlice";
import { resolveAssetUrl } from "../utils/assetUrl";

// Helper function to get item ID (handles both 'id' and '_id' fields)
const getItemId = (item) => item.id ?? item._id;

const Wishlist = () => {
  const dispatch = useDispatch();
  const wishlist = useSelector((state) => state.wishlist.items);

  if (!wishlist || wishlist.length === 0) {
    return (
      <div className="min-h-screen bg-[#f7f5f2]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
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
          {wishlist.map((item) => {
            const itemId = getItemId(item);
            return (
              <div
                key={itemId}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-lg transition"
              >
                <div className="relative overflow-hidden rounded-xl bg-slate-50">
                  <img
                    src={resolveAssetUrl(item.image)}
                    alt={item.name}
                    className="h-44 w-full object-contain"
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
                    className="w-full flex items-center justify-center gap-2 bg-rose-600 text-white px-3 py-2 rounded-lg hover:bg-rose-700 font-semibold text-sm"
                  >
                    <FaTrash /> Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Wishlist;
