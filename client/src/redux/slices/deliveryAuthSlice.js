import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../services/api";

const bootstrapDeliveryToken = () => {
  let token = null;
  const rawPartner = localStorage.getItem("deliveryPartner");
  if (rawPartner) {
    try {
      const partner = JSON.parse(rawPartner);
      token = partner?.token || null;
    } catch {
      token = null;
    }
  }
  const isJwt = typeof token === "string" && token.split(".").length === 3;
  if (isJwt) {
    API.defaults.headers.common.Authorization = `Bearer ${token}`;
  }
};

bootstrapDeliveryToken();

export const loginDeliveryPartner = createAsyncThunk(
  "deliveryAuth/login",
  async (data, thunkAPI) => {
    try {
      localStorage.removeItem("deliveryToken");
      localStorage.removeItem("deliveryPartner");
      delete API.defaults.headers.common.Authorization;

      const res = await API.post("/delivery/login", data);
      const payload = res.data;

      if (!payload?.token) {
        return thunkAPI.rejectWithValue("Login failed: delivery token was not returned.");
      }

      localStorage.setItem("deliveryPartner", JSON.stringify(payload));
      localStorage.setItem("deliveryToken", payload.token);
      API.defaults.headers.common.Authorization = `Bearer ${payload.token}`;

      return payload;
    } catch (err) {
      if (!err.response) {
        return thunkAPI.rejectWithValue(
          "Server is offline. Check if your backend is running!"
        );
      }
      const message = err.response?.data?.message || "Login failed. Please try again.";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const registerDeliveryPartner = createAsyncThunk(
  "deliveryAuth/register",
  async (data, thunkAPI) => {
    try {
      const res = await API.post("/delivery/register", data);
      return res.data;
    } catch (err) {
      if (!err.response) {
        return thunkAPI.rejectWithValue(
          "Network error. Please check your internet connection."
        );
      }
      const message = err.response?.data?.message || "Registration failed.";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const deliveryAuthSlice = createSlice({
  name: "deliveryAuth",
  initialState: {
    deliveryPartner: JSON.parse(localStorage.getItem("deliveryPartner")) || null,
    loading: false,
    error: null,
    registered: false,
  },
  reducers: {
    deliveryLogout: (state) => {
      state.deliveryPartner = null;
      state.error = null;
      state.registered = false;
      localStorage.removeItem("deliveryPartner");
      localStorage.removeItem("deliveryToken");
      delete API.defaults.headers.common.Authorization;
    },
    clearDeliveryError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginDeliveryPartner.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginDeliveryPartner.fulfilled, (state, action) => {
        state.loading = false;
        state.deliveryPartner = action.payload;
        if (action.payload?.token) {
          API.defaults.headers.common.Authorization = `Bearer ${action.payload.token}`;
        }
      })
      .addCase(loginDeliveryPartner.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(registerDeliveryPartner.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.registered = false;
      })
      .addCase(registerDeliveryPartner.fulfilled, (state) => {
        state.loading = false;
        state.registered = true;
      })
      .addCase(registerDeliveryPartner.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { deliveryLogout, clearDeliveryError } = deliveryAuthSlice.actions;
export default deliveryAuthSlice.reducer;
