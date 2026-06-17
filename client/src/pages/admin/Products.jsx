import React, { useEffect, useMemo, useState } from "react";
import productService from "../../services/productService";
import { Plus, Search, Edit2, Trash2, ShoppingBasket, X, Save } from "lucide-react";
import { toast } from "react-toastify";
import { useWebSocket } from "../../context/WebSocketContext";
import { resolveAssetUrl } from "../../utils/assetUrl";

const DEFAULT_CATEGORIES = [
  "fruits",
  "vegetables",
  "grains",
  "pulses",
  "spices",
  "oils",
  "dairy",
  "snacks",
  "household",
  "personal",
  "meat",
  "health",
];

const normalizeCategory = (category) =>
  (category || "general").trim().toLowerCase();

const AdminProducts = () => {
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [imageErrors, setImageErrors] = useState({});

  // Default state for a new product
  const emptyProduct = {
    id: "",
    name: "",
    price: "",
    category: DEFAULT_CATEGORIES[0] || "general",
    image: "",
  };
  const [currentProduct, setCurrentProduct] = useState(emptyProduct);

  const categoryOptions = useMemo(() => {
    const categories = new Set(DEFAULT_CATEGORIES);
    inventory.forEach((item) => {
      const category = normalizeCategory(item.category);
      if (category) {
        categories.add(category);
      }
    });
    return Array.from(categories);
  }, [inventory]);

  useEffect(() => {
    let active = true;
    const loadProducts = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const data = await productService.getProducts();
        if (active) {
          setInventory(Array.isArray(data) ? data : []);
        }
      } catch {
        if (active) {
          setLoadError("Failed to load products.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadProducts();
    return () => {
      active = false;
    };
  }, []);

  // WebSocket for real-time product updates
  const { lastMessage, status: wsStatus } = useWebSocket();

  useEffect(() => {
    if (wsStatus !== "open") return;
    
    // Check if the message is a product update
    if (lastMessage?.topic === "products" && lastMessage?.payload?.event === "productAdded") {
      const newProduct = lastMessage.payload.product;
      setInventory((prev) => {
        // Check if product already exists (by _id)
        const exists = prev.find(p => p._id === newProduct._id);
        if (exists) return prev;
        return [newProduct, ...prev];
      });
    }
  }, [lastMessage, wsStatus]);

  // --- 2. ACTIONS ---
  const openAddModal = () => {
    setIsEditing(false);
    setCurrentProduct(emptyProduct);
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setIsEditing(true);
    setCurrentProduct({ ...product, id: product._id || product.id });
    setIsModalOpen(true);
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      productService
        .deleteProduct(id)
        .then(() => {
          setInventory((prev) => prev.filter((item) => (item._id || item.id) !== id));
          toast.error(`${name} removed from inventory`);
        })
        .catch(() => {
          toast.error("Failed to delete product.");
        });
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();

    // Ensure price is a valid number
    const finalProduct = {
      ...currentProduct,
      price: parseFloat(currentProduct.price) || 0,
      category: normalizeCategory(currentProduct.category),
    };

    if (isEditing) {
      const id = finalProduct.id || finalProduct._id;
      if (!id) {
        toast.error("Product update failed: missing ID.");
        return;
      }
      const updatePayload = {
        name: finalProduct.name,
        price: finalProduct.price,
        description: finalProduct.description,
        image: finalProduct.image,
        category: finalProduct.category,
        stock: finalProduct.stock,
      };
      try {
        const updated = await productService.updateProduct(id, updatePayload);
        setInventory((prev) =>
          prev.map((item) =>
            (item._id || item.id) === id ? updated : item
          )
        );
        toast.info("Product updated!");
      } catch {
        toast.error("Product update failed.");
        return;
      }
    } else {
      try {
        const created = await productService.addProduct({
          ...finalProduct,
          image: finalProduct.image || "https://placehold.co/100?text=No+Image",
        });
        setInventory((prev) => [created, ...prev]);
        toast.success("New product added!");
      } catch {
        toast.error("Product add failed.");
        return;
      }
    }

    setIsModalOpen(false);
  };

  // --- 3. FILTERING ---
  const filteredProducts = inventory.filter((item) =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ShoppingBasket className="text-red-600" /> Inventory Management
          </h2>
          <p className="text-sm text-gray-500">Total Products: {inventory.length}</p>
        </div>
        <button
          onClick={openAddModal}
          className="w-full sm:w-auto bg-red-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-red-700 transition flex items-center justify-center gap-2 shadow-lg shadow-red-100"
        >
          <Plus size={20} /> Add Product
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name or category..."
            className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition bg-gray-50/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 border-b">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr>
                  <td colSpan="4" className="px-6 py-6 text-center text-gray-400">
                    Loading products...
                  </td>
                </tr>
              )}
              {!isLoading && loadError && (
                <tr>
                  <td colSpan="4" className="px-6 py-6 text-center text-red-500">
                    {loadError}
                  </td>
                </tr>
              )}
              {filteredProducts.map((item) => {
                const key = item._id || item.id;
                const hasImage = Boolean(item.image) && !imageErrors[key];
                if (!hasImage) {
                  return null;
                }
                return (
                  <tr key={`${item.category}-${key}`} className="hover:bg-gray-50/80 transition group">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <img
                        src={resolveAssetUrl(item.image) || "https://placehold.co/100?text="}
                        alt=""
                        className="w-12 h-12 object-cover rounded-lg bg-gray-100 border border-gray-100"
                        onError={() =>
                          setImageErrors((prev) => ({
                            ...prev,
                            [key]: true,
                          }))
                        }
                      />
                      {hasImage && (
                        <span className="font-semibold text-gray-900">{item.name}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {hasImage && (
                        <span className="px-2.5 py-1 bg-red-50 text-red-600 text-[10px] font-black uppercase rounded-md tracking-wider">
                          {item.category}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {hasImage ? `₹${item.price}` : ""}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEditModal(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleDelete(item._id || item.id, item.name)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Delete">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredProducts.length === 0 && !isLoading && !loadError && (
            <div className="py-20 text-center text-gray-400 font-medium">
              No products match your search.
            </div>
          )}
        </div>
      </div>

      {/* --- ADD/EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-index[999] p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 border border-gray-100 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {isEditing ? "Edit Product" : "Add New Product"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Product Name</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-gray-50"
                  value={currentProduct.name}
                  onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                  placeholder="e.g. Alphonso Mango"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Price (₹)</label>
                  <input
                    required
                    type="number"
                    className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-gray-50"
                    value={currentProduct.price}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Category</label>
                  <input
                    required
                    list="admin-product-categories"
                    className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-gray-50 cursor-pointer"
                    value={currentProduct.category}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, category: e.target.value })}
                    placeholder="e.g. baby care"
                  />
                  <datalist id="admin-product-categories">
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">
                  Product Image
                </label>

                <div className="space-y-3">
                  {/* Image Preview / Upload Box */}
                  <div
                    onClick={() => document.getElementById("fileInput").click()}
                    className="relative h-40 w-full border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-red-400 hover:bg-red-50/30 transition-all overflow-hidden bg-gray-50"
                  >
                    {currentProduct.image ? (
                      <>
                        <img
                          src={resolveAssetUrl(currentProduct.image)}
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                          <p className="text-white text-xs font-bold">Change Image</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-3 bg-white rounded-full text-gray-400 shadow-sm">
                          <Plus size={24} />
                        </div>
                        <p className="text-xs text-gray-400 font-medium">Click to upload from computer</p>
                      </>
                    )}
                  </div>

                  {/* Hidden File Input */}
                  <input
                    id="fileInput"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setCurrentProduct({ ...currentProduct, image: reader.result });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />

                  {/* Manual URL Input (Optional Backup) */}
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full px-4 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-red-500 outline-none bg-white"
                      placeholder="Or paste image URL here..."
                      value={currentProduct.image.startsWith("data:") ? "" : currentProduct.image}
                      onChange={(e) => setCurrentProduct({ ...currentProduct, image: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 text-white font-bold py-3.5 rounded-xl hover:bg-red-700 transition flex items-center justify-center gap-2 mt-4 shadow-lg shadow-red-100"
              >
                <Save size={18} />
                {isEditing ? "Save Changes" : "Create Product"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
