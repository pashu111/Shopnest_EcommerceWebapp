import Navbar from "../components/Navbar";
import ProductCard from "../components/ProductCard";
import Footer from "../components/Footer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProducts, addProduct, setProducts } from "../redux/slices/productSlice";
import { useWebSocket } from "../context/WebSocketContext";
import { toast } from "react-toastify";
import { products as fallbackCatalog } from "../data/Products";

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

// BannerSlide component with error handling for banner images
function BannerSlide({ slide }) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="min-w-full h-60 sm:h-80 md:h-96 relative">
      <div className={`absolute inset-0 bg-gradient-to-br ${slide.tone}`} />
      <div className="absolute inset-y-0 right-0 hidden sm:flex items-center pr-8 md:pr-12">
        {imageError ? (
          <div className="h-40 w-40 md:h-56 md:w-56 rounded-3xl bg-white/20 flex items-center justify-center">
            <span className="text-white/60 text-xs">Image unavailable</span>
          </div>
        ) : (
          <img
            src={slide.img}
            alt={slide.title}
            className="h-40 w-40 md:h-56 md:w-56 rounded-3xl object-cover shadow-2xl ring-8 ring-white/40"
            onError={() => setImageError(true)}
          />
        )}
      </div>
      <div className="absolute inset-0 bg-linear-to-r from-slate-900/70 via-slate-900/35 to-transparent flex flex-col justify-center px-6 sm:px-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-white">
          {slide.title}
        </h2>
        <p className="mt-2 text-sm sm:text-base text-white/90">
          {slide.desc}
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [current, setCurrent] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
  const intervalRef = useRef(null);
  const dispatch = useDispatch();
  const { items, status, error } = useSelector((state) => state.products);

  const flattenedFallbackProducts = useMemo(() => {
    return Object.entries(fallbackCatalog || {}).flatMap(([category, productList]) =>
      (Array.isArray(productList) ? productList : []).map((product) => ({
        ...product,
        _id: product._id || `offline-${category}-${product.id}`,
        category,
      }))
    );
  }, []);

  const banners = [
    {
      title: "Fresh Picks, Daily Deals",
      desc: "Fruits & veggies delivered fast — shop today’s freshest arrivals.",
      img: "/products/banner1.jpeg",
      tone: "from-emerald-700 via-teal-600 to-cyan-500",
    },
    {
      title: "Premium Quality, Better Prices",
      desc: "Stock up on pantry essentials — grains, pulses, oils & more.",
      img: "/products/mango.jpg",
      tone: "from-indigo-700 via-fuchsia-600 to-rose-500",
    },
    {
      title: "Snack Time Favorites",
      desc: "Chips, munchies & quick bites — add something tasty to your cart.",
      img: "/products/Kurkure.jpg",
      tone: "from-amber-700 via-orange-600 to-rose-500",
    },
  ];

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const prevSlide = () =>
    setCurrent((prev) =>
      prev === 0 ? banners.length - 1 : prev - 1
    );

  useEffect(() => {
    intervalRef.current = setInterval(nextSlide, 3500);
    return () => clearInterval(intervalRef.current);
  }, [nextSlide]);

  useEffect(() => {
    if (isOffline) {
      if (items.length === 0) {
        dispatch(setProducts(flattenedFallbackProducts));
      }
      return;
    }

    if (status === "idle") {
      dispatch(fetchProducts());
    }
  }, [dispatch, flattenedFallbackProducts, isOffline, items.length, status]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // WebSocket for real-time product updates
  const { lastMessage, status: wsStatus } = useWebSocket();

  useEffect(() => {
    if (wsStatus !== "open") return;
    
    // Check if the message is a product update
    if (lastMessage?.topic === "products" && lastMessage?.payload?.event === "productAdded") {
      const newProduct = lastMessage.payload.product;
      dispatch(addProduct(newProduct));
      toast.success(`New product added: ${newProduct.name}`);
    }
  }, [lastMessage, wsStatus, dispatch]);

  const productsByCategory = useMemo(() => {
    const grouped = {};
    (items || []).forEach((product) => {
      const category = (product.category || "general").toLowerCase();
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(product);
    });
    return grouped;
  }, [items]);

  const categoriesOrder = useMemo(() => {
    const dynamicCategories = Object.keys(productsByCategory).filter(
      (category) => !DEFAULT_CATEGORIES.includes(category)
    );
    return [...DEFAULT_CATEGORIES, ...dynamicCategories.sort()];
  }, [productsByCategory]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const visibleCategories = useMemo(() => {
    if (!normalizedSearch) {
      return categoriesOrder;
    }
    return categoriesOrder.filter((category) =>
      (productsByCategory[category] || []).some((product) =>
        (product.name || "").toLowerCase().includes(normalizedSearch)
      )
    );
  }, [categoriesOrder, normalizedSearch, productsByCategory]);

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const displayedCategories = useMemo(() => {
    if (!selectedCategory) {
      return visibleCategories;
    }
    return visibleCategories.includes(selectedCategory) ? [selectedCategory] : [];
  }, [selectedCategory, visibleCategories]);

  return (
    <div className="bg-[#f7f5f2] min-h-screen text-slate-900">
      <Navbar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

      <section className="relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute top-20 -left-20 w-72 h-72 rounded-full bg-amber-200/40 blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/80 border border-slate-200 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Fresh Picks in 30 min delivery
              </div>

              <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold leading-tight">
                Shop smarter.
                <span className="block text-emerald-700">
                  Fresh groceries delivered fast.
                </span>
              </h1>

              <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-xl">
                Curated essentials, seasonal favorites, and premium brands in
                one place. Quality checked and packed with care.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-200/60">
                  Start Shopping
                </button>
                <button className="bg-white border border-slate-200 px-5 py-3 rounded-xl font-semibold text-slate-700 hover:bg-slate-50">
                  Explore Deals
                </button>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                <div className="bg-white/80 border border-slate-200 rounded-xl p-3">
                  <p className="text-xl font-bold">5K+</p>
                  <p className="text-xs text-slate-500">Products</p>
                </div>
                <div className="bg-white/80 border border-slate-200 rounded-xl p-3">
                  <p className="text-xl font-bold">30 min</p>
                  <p className="text-xs text-slate-500">Avg delivery</p>
                </div>
                <div className="bg-white/80 border border-slate-200 rounded-xl p-3">
                  <p className="text-xl font-bold">4.8/5</p>
                  <p className="text-xs text-slate-500">Customer love</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative overflow-hidden rounded-3xl shadow-2xl">
                <div
                  className="flex transition-transform duration-700"
                  style={{ transform: `translateX(-${current * 100}%)` }}
                >
                  {banners.map((slide, index) => (
                    <BannerSlide key={index} slide={slide} />
                  ))}
                </div>

                <button
                  onClick={prevSlide}
                  type="button"
                  aria-label="Previous slide"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow"
                >
                  &#10094;
                </button>
                <button
                  onClick={nextSlide}
                  type="button"
                  aria-label="Next slide"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow"
                >
                  &#10095;
                </button>

                <div className="absolute bottom-4 w-full flex justify-center gap-2">
                  {banners.map((_, index) => (
                    <span
                      key={index}
                      onClick={() => setCurrent(index)}
                      className={`w-3 h-3 rounded-full cursor-pointer ${
                        index === current ? "bg-white" : "bg-white/50"
                      }`}
                    ></span>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {["Fresh", "Premium", "Value"].map((tag) => (
                  <div
                    key={tag}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-center text-xs font-semibold text-slate-700"
                  >
                    {tag} Picks
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Shop by Category</h2>
            <span className="text-sm text-slate-500">Curated for you</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                selectedCategory === null
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 hover:bg-slate-200"
              }`}
              onClick={() => setSelectedCategory(null)}
            >
              All
            </button>
            {categoriesOrder.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-semibold capitalize ${
                  selectedCategory === cat
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {status === "loading" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-6 text-slate-500">
          Loading products...
        </div>
      )}
      {isOffline && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-6 text-amber-700">
          You are offline. Showing bundled products until the connection returns.
        </div>
      )}
      {status === "failed" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-6 text-rose-600">
          {error || "Failed to load products."}
        </div>
      )}

      {displayedCategories.map((category) => (
        <section
          key={category}
          className="max-w-7xl mx-auto px-4 sm:px-6 py-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold capitalize">
              {category}
            </h2>
            {((productsByCategory[category] || []).length > 10) && (
              <button
                className="text-sm text-emerald-700 font-semibold hover:underline"
                onClick={() => toggleCategory(category)}
              >
                {expandedCategories[category] ? "Show less" : "View all"}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {productsByCategory[category]
              ?.filter((p) =>
                (p.name || "").toLowerCase().includes(normalizedSearch)
              )
              .slice(
                0,
                normalizedSearch || expandedCategories[category] ? undefined : 10
              )
              .map((p) => (
                <ProductCard key={p._id || p.id} product={p} />
              ))}
          </div>
        </section>
      ))}

      <Footer />
    </div>
  );
}
