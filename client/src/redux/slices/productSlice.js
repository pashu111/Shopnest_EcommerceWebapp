import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import productService from "../../services/productService";

// Async thunk to fetch products from backend
export const fetchProducts = createAsyncThunk("products/fetch", async () => {
  return await productService.getProducts();
});

const productSlice = createSlice({
  name: "products",
  initialState: { items: [], status: "idle", error: null },
  reducers: {
    setProducts: (state, action) => {
      state.items = Array.isArray(action.payload) ? action.payload : [];
      state.status = "succeeded";
      state.error = null;
    },
    addProduct: (state, action) => {
      const newProduct = action.payload;
      // Check if product already exists (by _id)
      const exists = state.items.find(p => p._id === newProduct._id);
      if (!exists) {
        state.items.unshift(newProduct); // Add to beginning of array
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      });
  },
});

export const { setProducts, addProduct } = productSlice.actions;
export default productSlice.reducer;
