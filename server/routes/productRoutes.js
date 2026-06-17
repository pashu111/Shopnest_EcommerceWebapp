// import express from "express";
// import Product from "../models/Product.js";

// const router = express.Router();

// // GET all products
// router.get("/", async (req, res) => {
//   try {
//     const products = await Product.find();
//     res.json(products);
//   } catch (err) {
//     res.status(500).json({ error: "Server error" });
//   }
// });

// // POST a new product
// router.post("/",async (req,res)=>{
//   try{
//     const product = new Product(req.body);
//     await product.save();
//     res.status(201).json(product);
//   }catch(err){
//     res.status(500).json({ error: "Invalid Product data" });
//   }
// });




// export default router;


import express from "express";
import { addProduct, getProducts, removeMissingImageProducts, removeAllProducts, updateProduct, deleteProduct } from "../controllers/productController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// admin add product
router.post("/add", authMiddleware, addProduct);
// admin update product
router.put("/:id", authMiddleware, updateProduct);
// admin delete product
router.delete("/:id", authMiddleware, deleteProduct);
// admin remove products missing images
router.delete("/remove-missing-images", authMiddleware, removeMissingImageProducts);
// admin remove all products
router.delete("/remove-all", authMiddleware, removeAllProducts);

// user get products
router.get("/", getProducts);

export default router;
