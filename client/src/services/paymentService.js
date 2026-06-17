import API from "./api";

/**
 * Creates a Razorpay order on the backend (TEST MODE).
 * Backend route: POST /api/payments/create-order (alias: /api/payments/razorpay/order)
 */
export const createRazorpayOrder = async (amountPaise, notes) => {
  const res = await API.post("/payments/create-order", {
    amount: amountPaise,
    currency: "INR",
    notes: notes && typeof notes === "object" ? notes : undefined,
  });
  return res.data;
};

/**
 * Demo flow: verifies Razorpay signature on backend and saves order in MongoDB.
 * Route: POST /api/payments/razorpay/verify
 */
export const verifyRazorpayPaymentAndCreateOrder = async (paymentDetails, orderPayload) => {
  const res = await API.post("/payments/razorpay/verify", {
    ...paymentDetails,
    orderPayload,
  });
  return res.data;
};
