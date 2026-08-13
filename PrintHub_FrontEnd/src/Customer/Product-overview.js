import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Product-overview.css";
import { buildApiUrl } from "../config/api";
import LoginRequiredModal from "../components/LoginRequiredModal.js";
import {
  categoryMapping,
  getProductCategory,
} from "../config/categoryDefaults";
import {
  hasGuestUsageRemaining,
} from "../utils/guestCustomization";

const fallbackImage = "https://via.placeholder.com/300x200?text=No+Image";

const categories = ["All", ...Object.keys(categoryMapping)];

const getCustomerUser = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem("user") || "null");
    const role = String(parsed?.role || "").toLowerCase();
    if (
      !parsed?.id ||
      role === "admin" ||
      role === "staff" ||
      role === "guest"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const formatProductPrice = (price) => {
  if (price === null || price === undefined || price === "")
    return "View price";
  const numeric = Number(price);
  return Number.isFinite(numeric)
    ? `₱${numeric.toLocaleString()}`
    : String(price);
};

function ProductOverview() {
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [modalVariant, setModalVariant] = useState("default");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchQuery(params.get("search") || "");
    const cat = params.get("category");
    if (cat) {
      setCategory(cat);
    } else {
      setCategory("All");
    }
  }, [location.search]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await fetch(buildApiUrl("/api/products?limit=100"));
        if (!res.ok) throw new Error("Failed to load products");
        const data = await res.json();
        const list = data.products || data;
        setProducts(Array.isArray(list) ? list : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filtered = useMemo(() => {
    return products.filter((product) => {
      const printType = product.print_type || "";
      const name = product.name || "";
      const matchesCategory =
        category === "All" ||
        categoryMapping[category]?.some(
          (item) =>
            printType.toLowerCase().includes(item.toLowerCase()) ||
            name.toLowerCase().includes(item.toLowerCase()),
        );
      const matchesSearch = name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [products, category, searchQuery]);

  const handleViewProduct = (id) => {
  const user = getCustomerUser();
  if (!user && !hasGuestUsageRemaining()) {
    setModalVariant("limitReached");
    setShowLoginModal(true);
    return;
  }
  navigate(`/product/${id}`); // guests with tries left proceed straight in
};

  return (
    <>
      <div className="po-page fade-in-up">
        <div className="po-shell">
          <div className="po-top">
            <div className="po-heading">
              <h1 className="po-title">
                Product <span>Overview</span>
              </h1>
              <p>Discover our complete collection</p>
            </div>
          </div>

          <div className="po-search-wrap">
            <span aria-hidden="true">⌕</span>
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="po-category-pills" aria-label="Product categories">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={category === item ? "active" : ""}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="po-controls">
            <select
              className="po-select"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          {/*
          {category === "Business" && (
            <div className="po-promo-banner business-banner">
              <div className="po-promo-content">
                <span className="po-promo-badge">PROMO</span>
                <h2>Grow Your Brand with Premium Business Prints</h2>
                <p>
                  Get up to 20% off on bulk orders of business cards,
                  brochures, and flyers.
                </p>
              </div>
              <button
                type="button"
                className="po-promo-btn"
                onClick={() => setSearchQuery("Business Card")}
              >
                Shop Business Essentials
              </button>
            </div>
          )}

          {category === "Clothing" && (
            <div className="po-promo-banner clothing-banner">
              <div className="po-promo-content">
                <span className="po-promo-badge">NEW ARRIVALS</span>
                <h2>Custom Apparel & Wearables</h2>
                <p>
                  Express your style with premium custom t-shirts,
                  jerseys, and caps.
                </p>
              </div>
              <button
                type="button"
                className="po-promo-btn"
                onClick={() => setSearchQuery("T-Shirt")}
              >
                Customize Apparel
              </button>
            </div>
          )}

          {category === "Labels" && (
            <div className="po-promo-banner labels-banner">
              <div className="po-promo-content">
                <span className="po-promo-badge">HOT DEAL</span>
                <h2>Stickers, Labels & Custom Notebooks</h2>
                <p>
                  High-quality adhesive prints and corporate giveaways
                  tailored for you.
                </p>
              </div>
              <button
                type="button"
                className="po-promo-btn"
                onClick={() => setSearchQuery("Stickers")}
              >
                Explore Labels
              </button>
            </div>
          )} */}

          {loading && <p className="po-state">Loading products...</p>}
          {error && <p className="po-state po-state-error">{error}</p>}

          <div className="po-grid">
            {filtered.map((product, index) => (
              <button
                key={product.id}
                type="button"
                className="po-card"
                onClick={() => handleViewProduct(product.id)}
              >
                <div className="po-img">
                  <img
                    src={product.images?.[0] || fallbackImage}
                    alt={product.name}
                    onError={(event) => {
                      event.currentTarget.src = fallbackImage;
                    }}
                  />
                </div>

                <div className="po-card-body">
                  <div className="po-card-meta">
                    <span>{getProductCategory(product)}</span>
                    <strong>★ {(4.4 + (index % 6) / 10).toFixed(1)}</strong>
                  </div>
                  <div className="po-name">{product.name}</div>
                  <div className="po-price">
                    {formatProductPrice(product.price)}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {!loading && !error && filtered.length === 0 && (
            <div className="po-empty">No products found</div>
          )}
        </div>
      </div>

      {showLoginModal && (
        <LoginRequiredModal
          variant={modalVariant}
          onClose={() => setShowLoginModal(false)}
          onLogin={() => {
            localStorage.removeItem("cart");
            localStorage.removeItem("cartItems");
            localStorage.removeItem("userCart");
            setShowLoginModal(false);
            navigate("/user-login", {
              state: { from: `${location.pathname}${location.search}` },
            });
          }}
          onRegister={() => {
            localStorage.removeItem("cart");
            localStorage.removeItem("cartItems");
            localStorage.removeItem("userCart");
            setShowLoginModal(false);
            navigate("/user-register");
          }}
        />
      )}
    </>
  );
}

export default ProductOverview;
