import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import cartReducer from "./slices/cartSlice";
import couponReducer from "./slices/couponSlice";
import productReducer from "./slices/productSlice";
import rewardReducer from "./slices/rewardSlice";
import orderReducer from "./slices/orderSlice";
import wishlistReducer from "./slices/wishlistSlice";
import deliveryAuthReducer from "./slices/deliveryAuthSlice";

const safeJsonParse = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const normalizeCartItems = (items) => {
  const list = Array.isArray(items) ? items : [];
  const merged = new Map();

  for (const rawItem of list) {
    if (!rawItem || typeof rawItem !== "object") continue;
    const key = rawItem._id || rawItem.id;
    if (!key) continue;

    const existing = merged.get(key);
    const qty = Number(rawItem.quantity) > 0 ? Number(rawItem.quantity) : 1;

    if (existing) {
      existing.quantity += qty;
    } else {
      merged.set(key, { ...rawItem, quantity: qty });
    }
  }

  return Array.from(merged.values());
};

const getStorage = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const loadCartFromStorage = () => {
  const storage = getStorage();
  if (!storage) return [];
  // Backward-compatible: older CartContext used "cart"
  const legacy = safeJsonParse(storage.getItem("cart") || "");
  const current = safeJsonParse(storage.getItem("cartItems") || "");
  return normalizeCartItems(current || legacy);
};

const saveCartToStorage = (items) => {
  const storage = getStorage();
  if (!storage) return;
  const normalized = normalizeCartItems(items);
  if (normalized.length === 0) {
    storage.removeItem("cartItems");
    storage.removeItem("cart");
    try {
      window.sessionStorage?.removeItem("cartItems");
      window.sessionStorage?.removeItem("cart");
    } catch {
      // ignore sessionStorage failures
    }
    return;
  }
  storage.setItem("cartItems", JSON.stringify(normalized));
  storage.setItem("cart", JSON.stringify(normalized));
};


// ✅ Single store definition
export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    coupon: couponReducer,
    products: productReducer,
    reward: rewardReducer, // include reward here
    orders: orderReducer,
    wishlist: wishlistReducer,
    deliveryAuth: deliveryAuthReducer,

  },
  preloadedState: {
    cart: { items: loadCartFromStorage() },
  },
});

let saveTimer = null;
let lastSavedJson = null;

store.subscribe(() => {
  if (saveTimer) return;

  // Debounce to coalesce multiple synchronous dispatches.
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const items = store.getState()?.cart?.items;
    try {
      const normalized = normalizeCartItems(items);
      const json = JSON.stringify(normalized);
      if (json === lastSavedJson) return;
      lastSavedJson = json;
      saveCartToStorage(normalized);
    } catch {
      // ignore storage failures (private mode/quota)
    }
  }, 0);
});
