import { resolveAssetUrl } from "../utils/assetUrl";

export default function QuickViewModal({ product, onClose }) {
  if (!product) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl w-[90%] max-w-lg relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-xl"
        >
          ✕
        </button>

        <img
          src={resolveAssetUrl(product.image)}
          className="w-full h-52 object-cover rounded"
        />

        <h2 className="font-bold text-xl mt-3">{product.name}</h2>
        <p className="text-green-600 text-lg font-semibold">
          ₹{product.price}
        </p>
        <p className="text-gray-600 text-sm mt-2">
          Fresh quality guaranteed 🚀
        </p>
      </div>
    </div>
  );
}
