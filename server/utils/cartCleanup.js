import mongoose from "mongoose";

export const clearUserCartData = async (userId) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return;

  try {
    await mongoose.connection.collection("users").updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      {
        $unset: {
          cart: "",
          cartItems: "",
          sessionCart: "",
          checkoutSession: "",
        },
      }
    );
  } catch (error) {
    console.warn("Failed to clear user cart data:", error);
  }
};
