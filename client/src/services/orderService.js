import API from "./api";

const authConfig = (tokenOverride) => {
  let token = null;
  if (tokenOverride) {
    token = tokenOverride;
  } else {
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
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

const isRouteNotFound = (error) => error?.response?.status === 404;

const requestFirstAvailable = async (requests) => {
  let lastRouteNotFound = null;

  for (const request of requests) {
    try {
      return await request();
    } catch (error) {
      if (!isRouteNotFound(error)) throw error;
      lastRouteNotFound = error;
    }
  }

  throw lastRouteNotFound;
};

const requestFirstAvailableOrEmpty = async (requests) => {
  try {
    const res = await requestFirstAvailable(requests);
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    if (!isRouteNotFound(error)) throw error;
    console.warn("[delivery-orders] delivery route is missing on this deployment", error);
    return [];
  }
};

export const createOrder = async (data, tokenOverride) => {
  const res = await API.post("/orders/create", data, authConfig(tokenOverride));
  return res.data;
};

export const getUserOrders = async (tokenOverride) => {
  const res = await API.get("/orders/my-orders", authConfig(tokenOverride));
  return res.data;
};

export const getOrderById = async (orderId, tokenOverride) => {
  const res = await API.get(`/orders/${orderId}`, authConfig(tokenOverride));
  return res.data;
};

export const cancelOrder = async (orderId, tokenOverride) => {
  const res = await API.patch(
    `/orders/${orderId}/cancel`,
    undefined,
    authConfig(tokenOverride)
  );
  return res.data;
};

export const getAllOrders = async (tokenOverride) => {
  const res = await API.get("/orders/admin/orders", authConfig(tokenOverride));
  return res.data;
};

export const assignDeliveryPartner = async (
  orderId,
  deliveryPartnerId,
  tokenOverride
) => {
  const res = await API.patch(
    `/orders/admin/orders/${orderId}/assign-delivery-partner`,
    { deliveryPartnerId },
    authConfig(tokenOverride)
  );
  return res.data;
};

// DELIVERY PARTNER
export const getDeliveryAssignedOrders = async () => {
  return requestFirstAvailableOrEmpty([
    () => API.get("/orders/delivery/assigned-orders"),
    () => API.get("/delivery/assigned-orders"),
  ]);
};

export const getNearbyDeliveryOrders = async () => {
  return requestFirstAvailableOrEmpty([
    () => API.get("/orders/delivery/nearby-orders"),
    () => API.get("/delivery/nearby-orders"),
  ]);
};

export const acceptNearbyDeliveryOrder = async (orderId) => {
  const res = await requestFirstAvailable([
    () => API.patch(`/orders/delivery/nearby-orders/${orderId}/accept`, {}),
    () => API.patch(`/delivery/nearby-orders/${orderId}/accept`, {}),
  ]);
  return res.data;
};

export const rejectNearbyDeliveryOrder = async (orderId) => {
  const res = await requestFirstAvailable([
    () => API.patch(`/orders/delivery/nearby-orders/${orderId}/reject`, {}),
    () => API.patch(`/delivery/nearby-orders/${orderId}/reject`, {}),
  ]);
  return res.data;
};

export const getDeliveryAssignedOrderById = async (orderId) => {
  const res = await requestFirstAvailable([
    () => API.get(`/orders/delivery/assigned-orders/${orderId}`),
    () => API.get(`/delivery/assigned-orders/${orderId}`),
  ]);
  return res.data;
};

export const acceptDeliveryAssignedOrder = async (orderId) => {
  const res = await requestFirstAvailable([
    () => API.patch(`/orders/delivery/assigned-orders/${orderId}/accept`, {}),
    () => API.patch(`/delivery/assigned-orders/${orderId}/accept`, {}),
  ]);
  return res.data;
};

export const generateDeliveryOtp = async (orderId) => {
  const res = await requestFirstAvailable([
    () => API.patch(`/orders/delivery/assigned-orders/${orderId}/get-otp`, {}),
    () => API.patch(`/delivery/assigned-orders/${orderId}/get-otp`, {}),
  ]);
  return res.data;
};

export const verifyDeliveryOtp = async (orderId, otp) => {
  const res = await requestFirstAvailable([
    () => API.patch(`/orders/delivery/assigned-orders/${orderId}/verify-otp`, { otp }),
    () => API.patch(`/delivery/assigned-orders/${orderId}/verify-otp`, { otp }),
  ]);
  return res.data;
};

export const declineDeliveryAssignedOrder = async (orderId) => {
  const res = await requestFirstAvailable([
    () => API.patch(`/orders/delivery/assigned-orders/${orderId}/decline`, {}),
    () => API.patch(`/delivery/assigned-orders/${orderId}/decline`, {}),
  ]);
  return res.data;
};
