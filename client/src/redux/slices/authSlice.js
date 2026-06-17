import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../services/api";

const bootstrapToken = () => {
  let token = null;
  const rawUser = localStorage.getItem("user");
  if (rawUser) {
    try {
      const user = JSON.parse(rawUser);
      token = user?.token || null;
    } catch {
      token = null;
    }
  }
  if (!token) {
    token = localStorage.getItem("token");
  }
  const isJwt = typeof token === "string" && token.split(".").length === 3;
  if (isJwt) {
    API.defaults.headers.common.Authorization = `Bearer ${token}`;
  }
};

bootstrapToken();

export const loginUser = createAsyncThunk("auth/login", async (data, thunkAPI) => {
  try {
    const endpoint = data.isAdmin ? "/admin/login" : "/auth/login";

    const res = await API.post(endpoint, data);
    const payload = data.isAdmin
      ? { user: { username: data.username, isAdmin: true }, token: res.data.token }
      : res.data;

    localStorage.setItem("user", JSON.stringify(payload));
    localStorage.setItem("token", payload.token);

    return payload;
  } catch (err) {
    // If backend is down, catch the network error specifically
    if (!err.response) {
      return thunkAPI.rejectWithValue("Server is offline. Check if your backend is running!");
    }
    const message = err.response?.data?.message || "Login failed. Please try again.";
    return thunkAPI.rejectWithValue(message);
  }
});


export const registerUser = createAsyncThunk("auth/register", async (data, thunkAPI) => {
  try {
    const res = await API.post("/auth/register", data);
    return res.data;
  } catch (err) {
    const message = err.response?.data?.message || "Registration failed.";
    return thunkAPI.rejectWithValue(message);
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: JSON.parse(localStorage.getItem("user")) || null,
    loading: false,
    error: null,
  },
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload;
      localStorage.setItem("user", JSON.stringify(action.payload));
      if (action.payload?.token) {
        API.defaults.headers.common.Authorization = `Bearer ${action.payload.token}`;
      }
    },
    logout: (state) => {
      state.user = null;
      state.error = null;
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      delete API.defaults.headers.common.Authorization;
    },
    // Useful for clearing errors when switching tabs
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
    .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = { ...action.payload, photo: action.payload.photo || '' };
        if (action.payload?.token) {
          API.defaults.headers.common.Authorization = `Bearer ${action.payload.token}`;
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setCredentials, logout, clearError } = authSlice.actions;
export default authSlice.reducer;
