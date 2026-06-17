import API from "./api";

export const getDeliveryPartners = async (tokenOverride) => {
  const config = tokenOverride
    ? { headers: { Authorization: `Bearer ${tokenOverride}` } }
    : undefined;
  const res = await API.get("/delivery/admin/partners", config);
  return res.data;
};

