import Razorpay from "razorpay";

const getEnv = (key) => String(process.env[key] || "").trim();

/**
 * Razorpay config helper (TEST MODE ONLY).
 * This project is meant for demo/UI flows — it intentionally blocks LIVE keys.
 */
export const requireRazorpayConfig = () => {
  const keyId = getEnv("RAZORPAY_KEY_ID");
  const keySecret = getEnv("RAZORPAY_KEY_SECRET");

  if (!keyId || !keySecret) {
    const error = new Error(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env"
    );
    error.statusCode = 500;
    throw error;
  }

  // Safety: ensure test mode keys only (rzp_test_*) to avoid real payments.
  if (!keyId.startsWith("rzp_test_")) {
    const error = new Error(
      "Only Razorpay TEST MODE keys are allowed (key must start with rzp_test_)."
    );
    error.statusCode = 400;
    throw error;
  }

  return { keyId, keySecret };
};

let cachedInstance = null;

export const getRazorpayInstance = () => {
  const { keyId, keySecret } = requireRazorpayConfig();
  if (cachedInstance) return cachedInstance;

  cachedInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return cachedInstance;
};

export const getRazorpayKeyId = () => requireRazorpayConfig().keyId;

