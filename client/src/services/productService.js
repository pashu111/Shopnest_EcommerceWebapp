// const API_URL = "http://localhost:5000/api/products";

// const getProducts = async () => {
//   const res = await fetch(API_URL);
//   if (!res.ok) throw new Error("Failed to fetch products");
//   return res.json();
// };

// export default { getProducts };


import API from "./api";

const getProducts = async () => {
  const res = await API.get("/products");
  return res.data;
};

const addProduct = async (product) => {
  const res = await API.post("/products/add", product);
  return res.data;
};

const removeMissingImageProducts = async () => {
  const res = await API.delete("/products/remove-missing-images");
  return res.data;
};

const removeAllProducts = async () => {
  const res = await API.delete("/products/remove-all");
  return res.data;
};

const updateProduct = async (id, product) => {
  const res = await API.put(`/products/${id}`, product);
  return res.data;
};

const deleteProduct = async (id) => {
  const res = await API.delete(`/products/${id}`);
  return res.data;
};

export default { getProducts, addProduct, removeMissingImageProducts, removeAllProducts, updateProduct, deleteProduct };
