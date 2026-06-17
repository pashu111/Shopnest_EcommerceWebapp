import API from "./api";

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

export const updateDeliveryPartnerLocation = async ({ latitude, longitude, isOnline = true }) => {
  const payload = { latitude, longitude, isOnline };
  console.log("[delivery-location] sending location update", { latitude, longitude, isOnline });

  try {
    const res = await requestFirstAvailable([
      () => API.patch("/delivery/location/update", payload),
      () => API.patch("/delivery/location", payload),
      () => API.post("/delivery/location/update", payload),
      () => API.patch("/orders/delivery/location/update", payload),
      () => API.patch("/orders/delivery/location", payload),
      () => API.post("/orders/delivery/location/update", payload),
    ]);
    console.log("[delivery-location] backend response", res.data);
    return res.data;
  } catch (error) {
    if (!isRouteNotFound(error)) throw error;
    console.warn("[delivery-location] location API route is missing on this deployment", error);
    return {
      localOnly: true,
      message: "Location fetched locally. Deploy the backend update to save live location.",
      location: { latitude, longitude },
    };
  }
};

export const updateDeliveryPartnerOnlineStatus = async (isOnline) => {
  const payload = { isOnline };
  try {
    const res = await requestFirstAvailable([
      () => API.patch("/delivery/online-status", payload),
      () => API.patch("/orders/delivery/online-status", payload),
    ]);
    return res.data;
  } catch (error) {
    if (!isRouteNotFound(error)) throw error;
    console.warn("[delivery-status] online-status API route is missing on this deployment", error);
    return { localOnly: true, isOnline };
  }
};
