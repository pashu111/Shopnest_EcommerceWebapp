import Product from "../models/Product.js";

// ADMIN ADD PRODUCT
export const addProduct = async (req, res) => {
  try {

    const product = new Product(req.body);

    await product.save();

    // Broadcast new product to all connected clients via WebSocket
    const publish = req.app.get("wsPublish");
    if (publish) {
      publish("products", { event: "productAdded", product });
    }

    res.json(product);

  } catch (error) {

    res.status(500).json({
      message: "Product add failed"
    });

  }
};

// USER GET PRODUCTS
export const getProducts = async (req, res) => {

  try {

    const products = await Product.find().sort({ createdAt: -1 });

    res.json(products);

  } catch (error) {

    res.status(500).json({
      message: "Failed to fetch products"
    });

  }

};

// ADMIN REMOVE PRODUCTS WITH MISSING IMAGE FIELD
export const removeMissingImageProducts = async (req, res) => {
  try {
    const result = await Product.deleteMany({
      $or: [
        { image: { $exists: false } },
        { image: null },
        { image: "" },
      ],
    });

    res.json({ deletedCount: result.deletedCount || 0 });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove products" });
  }
};

// ADMIN REMOVE ALL PRODUCTS
export const removeAllProducts = async (req, res) => {
  try {
    const result = await Product.deleteMany({});
    res.json({ deletedCount: result.deletedCount || 0 });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove products" });
  }
};

// ADMIN UPDATE PRODUCT
export const updateProduct = async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Product update failed" });
  }
};

// ADMIN DELETE PRODUCT
export const deleteProduct = async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({ message: "Product deleted", id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: "Product delete failed" });
  }
};
