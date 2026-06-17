import { createSlice } from "@reduxjs/toolkit";

const rewardSlice = createSlice({
  name: "reward",
  initialState: { coins: 0 },
  reducers: {
    setReward: (state, action) => {
      state.coins = action.payload;
    },
    addReward: (state, action) => {
      state.coins += action.payload;
    },
  },
});

export const { setReward, addReward } = rewardSlice.actions;
export default rewardSlice.reducer;
