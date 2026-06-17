// import mongoose from "mongoose";

// const productSchema = new mongoose.Schema(
//   {
//     name: String,
//     category: String,
//     subCategory: String,
//     price: Number,
//     mrp: Number,
//     unit: String,
//     brand: String,
//     image: String,
//     inStock: { type: Boolean, default: true },
//   },
//   { timestamps: true }
// );

// export default mongoose.model("Product", productSchema);
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    price: {
      type: Number,
      required: true
    },

    description: String,

    image: String,

    category: String,

    stock: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);