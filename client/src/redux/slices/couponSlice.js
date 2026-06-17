import { createSlice } from "@reduxjs/toolkit";

const couponSlice = createSlice({
  name: "coupon",

  initialState: {
    code: null,
    discount: 0,
  },

  reducers: {
    applyCoupon: (state, action) => {
      const { code, subtotal, isFirstOrder } = action.payload;
      state.code = null;
      state.discount = 0;

      if (code === "SAVE10" && subtotal >= 500) {
        state.discount = subtotal * 0.1;
        state.code = "SAVE10";
      }

      else if (code === "SAVE20" && subtotal >= 1000) {
        state.discount = subtotal * 0.2;
        state.code = "SAVE20";
      }

      else if (code === "FLAT50" && subtotal >= 1500) {
        state.discount = 50;
        state.code = "FLAT50";
      }

      else if (code === "WELCOME" && isFirstOrder) {
        state.discount = subtotal * 0.15;
        state.code = "WELCOME";
      }

      else if (code === "MEGA30" && subtotal >= 2500) {
        state.discount = subtotal * 0.3;
        state.code = "MEGA30";
      }

      else if (code === "PICK50" && subtotal >= 800) {
        state.discount = 50;
        state.code = "PICK50";
      }

      else if (code === "SNACK15" && subtotal >= 600) {
        state.discount = subtotal * 0.15;
        state.code = "SNACK15";
      }

      else if (code === "FRESH20" && subtotal >= 400) {
        state.discount = 20;
        state.code = "FRESH20";
      }
    },

    removeCoupon: (state) => {
      state.discount = 0;
      state.code = null;
    },
  },
});

export const { applyCoupon, removeCoupon } = couponSlice.actions;

export default couponSlice.reducer;