import { createSlice } from "@reduxjs/toolkit";

// Helper function to get item ID (handles both 'id' and '_id' fields)
const getItemId = (item) => item.id ?? item._id;

// Helper function to check if two items have the same ID
const isSameItem = (item1, item2) => getItemId(item1) === getItemId(item2);

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState: {
    items: JSON.parse(localStorage.getItem("wishlist")) || [],
  },
  reducers: {
    toggleWishlist: (state, action) => {
      const exists = state.items.find(
        (item) => isSameItem(item, action.payload)
      );

      if (exists) {
        state.items = state.items.filter(
          (item) => !isSameItem(item, action.payload)
        );
      } else {
        state.items.push(action.payload);
      }

      localStorage.setItem("wishlist", JSON.stringify(state.items));
    },

    addToWishlist: (state, action) => {
      const exists = state.items.find(
        (item) => isSameItem(item, action.payload)
      );
      if (!exists) {
        state.items.push(action.payload);
        localStorage.setItem("wishlist", JSON.stringify(state.items));
      }
    },

    removeFromWishlist: (state, action) => {
      state.items = state.items.filter(
        (item) => getItemId(item) !== action.payload
      );
      localStorage.setItem("wishlist", JSON.stringify(state.items));
    },

    clearWishlist: (state) => {
      state.items = [];
      localStorage.removeItem("wishlist");
    },
  },
});

export const {
  toggleWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
} = wishlistSlice.actions;

export default wishlistSlice.reducer;