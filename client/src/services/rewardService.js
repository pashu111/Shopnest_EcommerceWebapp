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

export const generateReward = async (tokenOverride, orderId) => {
  const res = await API.post(
    "/rewards/generate",
    { orderId },
    authConfig(tokenOverride)
  );
  return res.data;
};

export const getRewardCoins = async (tokenOverride) => {
  const res = await API.get("/rewards/coins", authConfig(tokenOverride));
  return res.data;
};

export const checkOrderScratched = async (orderId, tokenOverride) => {
  const res = await API.get(`/rewards/check-scratched?orderId=${orderId}`, authConfig(tokenOverride));
  return res.data;
};
