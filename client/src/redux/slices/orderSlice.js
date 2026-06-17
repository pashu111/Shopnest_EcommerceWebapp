import { createSlice } from "@reduxjs/toolkit";

const orderSlice = createSlice({
  name: "orders",
  initialState: {
    list: [], // array of orders
  },
  reducers: {
    addOrder: (state, action) => {
      // action.payload = { id, items, total, paymentMethod, date }
      state.list.push(action.payload);
    },
    setOrders: (state, action) => {
      state.list = action.payload;
    },
    cancelOrder: (state, action) => {
      const order = state.list.find((o) => o.id === action.payload);
      if (order && order.status !== "Cancelled") {
        order.status = "Cancelled";
      }
    },
    clearOrders: (state) => {
      state.list = [];
    },
  },
});

export const { addOrder, cancelOrder, clearOrders } = orderSlice.actions;
export default orderSlice.reducer;
