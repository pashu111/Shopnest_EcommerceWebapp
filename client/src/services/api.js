import axios from "axios";

const getBaseURL = () => {
  const configured = (import.meta.env.VITE_API_URL || "").trim();
  if (!configured) return "/api";

  if (configured.startsWith("/")) {
    return configured.replace(/\/$/, "");
  }

  return configured.replace(/\/api\/?$/, "").replace(/\/$/, "") + "/api";
};

const baseURL = getBaseURL();

const API = axios.create({ baseURL });

API.interceptors.request.use((req) => {
  // Avoid noisy `net::ERR_INTERNET_DISCONNECTED` console errors by not
  // attempting requests while the browser is offline.
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    const error = new Error("You are offline. Please check your internet connection.");
    // Common pattern used by apps to branch on network errors
    error.code = "OFFLINE";
    return Promise.reject(error);
  }

  const url = typeof req?.url === "string" ? req.url : "";
  const isPublicDeliveryAuthRequest =
    url === "/delivery/login" ||
    url === "/delivery/register" ||
    url === "/delivery/forgot-password" ||
    url === "/delivery/reset-password";
  const isDeliveryRequest =
    url.startsWith("/orders/delivery") ||
    (url.startsWith("/delivery") && !url.startsWith("/delivery/admin"));

  let token = null;

  if (isPublicDeliveryAuthRequest) {
    delete req.headers.Authorization;
    return req;
  }

  if (isDeliveryRequest) {
    // Always prefer delivery token for delivery endpoints.
    token = localStorage.getItem("deliveryToken");
    if (!token) {
      const rawPartner = localStorage.getItem("deliveryPartner");
      if (rawPartner) {
        try {
          const partner = JSON.parse(rawPartner);
          token = partner?.token || null;
        } catch {
          token = null;
        }
      }
    }

    if (token) {
      req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
  }

  // If the caller explicitly set Authorization (per-request), keep it.
  if (req?.headers?.Authorization) {
    return req;
  }

  if (!token) {
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
  }
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }

  return req;
});

API.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
      console.error(
        "[api] Network error — likely CORS or backend unreachable. Check:",
        "VITE_API_URL =" + import.meta.env.VITE_API_URL,
        "baseURL =" + baseURL
      );
    }
    return Promise.reject(error);
  }
);

export default API;
