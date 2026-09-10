import React, {
  useEffect,
  useState,
  useMemo,
} from "react";

import {
  useNavigate,
  useLocation,
} from "react-router-dom";

import "./Product-overview.css";

import { buildApiUrl } from "../config/api";

import LoginRequiredModal from "../components/LoginRequiredModal.js";

import { getProductCategory } from "../config/categoryDefaults";

import {
  hasGuestUsageRemaining,
} from "../utils/guestCustomization";


const fallbackImage =
  "https://via.placeholder.com/300x200?text=No+Image";


/* =========================================================
   MAIN PRODUCT CATEGORIES
   ========================================================= */

const productCategories = [
  {
    id: "apparel",
    name: "Apparel",
    products: [
      "Hoodie",
      "Sweatshirt",
      "T-shirt",
      "Jersey",
    ],
  },

  {
    id: "wearables",
    name: "Wearables & Accessories",
    products: [
      "Cap",
    ],
  },

  {
    id: "stickers",
    name: "Stickers & Labels",
    products: [
      "Stickers & Labels",
      "Product Hang Tags",
    ],
  },

  {
    id: "paper",
    name: "Paper & Cards",
    products: [
      "Business Card",
      "Flyers",
      "Notebook",
      "Note Cards / Thank You Cards",
      "Brochures",
    ],
  },

  {
    id: "large-format",
    name: "Large Format & Signage",
    products: [
      "Posters",
      "Banners",
      "Tarpaulin / Banners",
    ],
  },

  {
    id: "promotional",
    name: "Promotional & Personalized Items",
    products: [
      "Mug",
    ],
  },
];


/* =========================================================
   CUSTOMER CHECK
   ========================================================= */

const getCustomerUser = () => {
  try {
    const parsed = JSON.parse(
      localStorage.getItem("user") || "null"
    );

    const role = String(
      parsed?.role || ""
    ).toLowerCase();

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


/* =========================================================
   PRICE FORMAT
   ========================================================= */

const formatProductPrice = (price) => {
  if (
    price === null ||
    price === undefined ||
    price === ""
  ) {
    return "View price";
  }

  const numeric = Number(price);

  return Number.isFinite(numeric)
    ? `₱${numeric.toLocaleString()}`
    : String(price);
};


/* =========================================================
   NORMALIZE PRODUCT NAME
   Used to determine which MAIN CATEGORY a product belongs to.
   ========================================================= */

const normalizeProductName = (product) => {
  const name = String(
    product?.name || ""
  ).toLowerCase();

  const printType = String(
    product?.print_type || ""
  ).toLowerCase();

  const combined =
    `${name} ${printType}`.trim();

  return combined;
};


/* =========================================================
   GET MAIN CATEGORY FOR PRODUCT
   ========================================================= */

const getMainProductCategory = (
  product
) => {
  const value =
    normalizeProductName(product);


  /* =========================
     APPAREL
     ========================= */

  if (
    value.includes("hoodie")
  ) {
    return "apparel";
  }

  if (
    value.includes("sweatshirt")
  ) {
    return "apparel";
  }

  if (
    value.includes("t-shirt") ||
    value.includes("t shirt") ||
    value.includes("shirt")
  ) {
    return "apparel";
  }

  if (
    value.includes("jersey")
  ) {
    return "apparel";
  }


  /* =========================
     WEARABLES & ACCESSORIES
     ========================= */

  if (
    /\bcap\b/.test(value) ||
    value.includes("caps")
  ) {
    return "wearables";
  }


  /* =========================
     STICKERS & LABELS
     ========================= */

  if (
    value.includes("sticker") ||
    value.includes("label") ||
    value.includes("hang tag") ||
    value.includes("hangtag") ||
    value.includes("product tag")
  ) {
    return "stickers";
  }


  /* =========================
     PAPER & CARDS
     ========================= */

  if (
    value.includes("business card")
  ) {
    return "paper";
  }

  if (
    value.includes("flyer")
  ) {
    return "paper";
  }

  if (
    value.includes("notebook")
  ) {
    return "paper";
  }

  if (
    value.includes("note card") ||
    value.includes("thank you card")
  ) {
    return "paper";
  }

  if (
    value.includes("brochure")
  ) {
    return "paper";
  }


  /* =========================
     LARGE FORMAT & SIGNAGE
     ========================= */

  if (
    value.includes("poster")
  ) {
    return "large-format";
  }

  if (
    value.includes("banner")
  ) {
    return "large-format";
  }

  if (
    value.includes("tarpaulin")
  ) {
    return "large-format";
  }


  /* =========================
     PROMOTIONAL & PERSONALIZED
     ========================= */

  if (
    value.includes("mug")
  ) {
    return "promotional";
  }


  return "";
};


/* =========================================================
   PRODUCT OVERVIEW
   ========================================================= */

function ProductOverview() {

  const navigate =
    useNavigate();

  const location =
    useLocation();


  /* =======================================================
     STATE
     ======================================================= */

  const [products, setProducts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(null);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState("all");

  const [
    selectedPriceRange,
    setSelectedPriceRange,
  ] = useState("all");

  const [
    showLoginModal,
    setShowLoginModal,
  ] = useState(false);

  const [
    modalVariant,
    setModalVariant,
  ] = useState("default");


  /* =======================================================
     READ SEARCH FROM URL
     ======================================================= */

  useEffect(() => {

    const params =
      new URLSearchParams(
        location.search
      );

    setSearchQuery(
      params.get("search") || ""
    );

  }, [
    location.search,
  ]);


  /* =======================================================
     FETCH PRODUCTS
     ======================================================= */

  useEffect(() => {

    const fetchProducts =
      async () => {

        try {

          setLoading(true);

          const res =
            await fetch(
              buildApiUrl(
                "/api/products?limit=100"
              )
            );


          if (!res.ok) {

            throw new Error(
              "Failed to load products"
            );

          }


          const data =
            await res.json();


          const list =
            data.products || data;


          setProducts(
            Array.isArray(list)
              ? list
              : []
          );


        } catch (err) {

          setError(
            err.message
          );

        } finally {

          setLoading(false);

        }

      };


    fetchProducts();

  }, []);


  /* =======================================================
     FILTER PRODUCTS
     ======================================================= */

  const filtered =
    useMemo(() => {

      return products.filter(
        (product) => {

          const name =
            String(
              product?.name || ""
            );


          const matchesSearch =
            name
              .toLowerCase()
              .includes(
                searchQuery
                  .toLowerCase()
              );


          const productCategory =
            getMainProductCategory(
              product
            );


            const matchesCategory =
            selectedCategory ===
              "all" ||
            productCategory ===
              selectedCategory;
          
          
          /* =================================================
             PRICE RANGE FILTER
             ================================================= */
          
          const price = Number(
            product?.price || 0
          );
          
          let matchesPrice = true;
          
          if (selectedPriceRange === "under100") {
            matchesPrice = price < 100;
          }
          
          if (selectedPriceRange === "100-250") {
            matchesPrice =
              price >= 100 &&
              price <= 250;
          }
          
          if (selectedPriceRange === "250-500") {
            matchesPrice =
              price > 250 &&
              price <= 500;
          }
          
          if (selectedPriceRange === "500-1000") {
            matchesPrice =
              price > 500 &&
              price <= 1000;
          }
          
          if (selectedPriceRange === "1000plus") {
            matchesPrice = price > 1000;
          }
          
          
          return (
            matchesSearch &&
            matchesCategory &&
            matchesPrice
          );

        }
      );

    }, [
      products,
      searchQuery,
      selectedCategory,
      selectedPriceRange,
    ]);


  /* =======================================================
     CATEGORY SELECT
     ======================================================= */

  const handleCategorySelect =
    (categoryId) => {

      setSelectedCategory(
        categoryId
      );

    };


  /* =======================================================
     VIEW PRODUCT
     ======================================================= */

  const handleViewProduct =
    (id) => {

      const user =
        getCustomerUser();


      if (
        !user &&
        !hasGuestUsageRemaining()
      ) {

        setModalVariant(
          "limitReached"
        );

        setShowLoginModal(
          true
        );

        return;

      }


      navigate(
        `/product/${id}`
      );

    };


  /* =======================================================
     GET SELECTED CATEGORY NAME
     ======================================================= */

  const selectedCategoryData =
    productCategories.find(
      (category) =>
        category.id ===
        selectedCategory
    );


  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <>

      <div className="po-page fade-in-up">

        <div className="po-shell">

          <div className="po-layout">


            {/* =================================================
                LEFT SIDEBAR
            ================================================= */}

            <aside className="po-sidebar">


              {/* SEARCH */}

              <div className="po-sidebar-search">

                <span
                  aria-hidden="true"
                >
                  ⌕
                </span>

                <input
                  type="text"
                  placeholder="Search products..."
                  value={
                    searchQuery
                  }
                  onChange={(
                    event
                  ) =>
                    setSearchQuery(
                      event.target.value
                    )
                  }
                  aria-label="Search products"
                />

              </div>


              {/* DIVIDER */}

              <div className="po-sidebar-divider" />


              {/* CATEGORY */}

              <div className="po-category-heading">
                Category
              </div>


              <div className="po-category-list">


                {/* ALL PRODUCTS */}

                <button
                  type="button"
                  className={`po-category-item ${
                    selectedCategory ===
                    "all"
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    handleCategorySelect(
                      "all"
                    )
                  }
                >

                  <span className="po-category-icon">
                   
                  </span>

                  <span>
                    All Products
                  </span>

                </button>


                {/* MAIN CATEGORIES */}

                {productCategories.map(
                  (category) => (

                    <button
                      key={
                        category.id
                      }
                      type="button"
                      className={`po-category-item ${
                        selectedCategory ===
                        category.id
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        handleCategorySelect(
                          category.id
                        )
                      }
                    >

                      <span className="po-category-icon">
                        {
                          category.icon
                        }
                      </span>

                      <span>
                        {
                          category.name
                        }
                      </span>

                    </button>

                  )
                )}

              </div>

              {/* =================================================
    PRICE RANGE
================================================= */}

<div className="po-price-section">

<div className="po-price-divider" />

<div className="po-price-heading">
  Price Range
</div>


<div className="po-price-options">

  <label
    className={`po-price-option ${
      selectedPriceRange === "all"
        ? "active"
        : ""
    }`}
  >

    <input
      type="radio"
      name="priceRange"
      value="all"
      checked={
        selectedPriceRange === "all"
      }
      onChange={() =>
        setSelectedPriceRange(
          "all"
        )
      }
    />

    <span className="po-radio"></span>

    <span>
      Any price
    </span>

  </label>


  <label
    className={`po-price-option ${
      selectedPriceRange === "under100"
        ? "active"
        : ""
    }`}
  >

    <input
      type="radio"
      name="priceRange"
      value="under100"
      checked={
        selectedPriceRange ===
        "under100"
      }
      onChange={() =>
        setSelectedPriceRange(
          "under100"
        )
      }
    />

    <span className="po-radio"></span>

    <span>
      Under ₱100
    </span>

  </label>


  <label
    className={`po-price-option ${
      selectedPriceRange === "100-250"
        ? "active"
        : ""
    }`}
  >

    <input
      type="radio"
      name="priceRange"
      value="100-250"
      checked={
        selectedPriceRange ===
        "100-250"
      }
      onChange={() =>
        setSelectedPriceRange(
          "100-250"
        )
      }
    />

    <span className="po-radio"></span>

    <span>
      ₱100 – ₱250
    </span>

  </label>


  <label
    className={`po-price-option ${
      selectedPriceRange === "250-500"
        ? "active"
        : ""
    }`}
  >

    <input
      type="radio"
      name="priceRange"
      value="250-500"
      checked={
        selectedPriceRange ===
        "250-500"
      }
      onChange={() =>
        setSelectedPriceRange(
          "250-500"
        )
      }
    />

    <span className="po-radio"></span>

    <span>
      ₱250 – ₱500
    </span>

  </label>


  <label
    className={`po-price-option ${
      selectedPriceRange === "500-1000"
        ? "active"
        : ""
    }`}
  >

    <input
      type="radio"
      name="priceRange"
      value="500-1000"
      checked={
        selectedPriceRange ===
        "500-1000"
      }
      onChange={() =>
        setSelectedPriceRange(
          "500-1000"
        )
      }
    />

    <span className="po-radio"></span>

    <span>
      ₱500 – ₱1,000
    </span>

  </label>


  <label
    className={`po-price-option ${
      selectedPriceRange === "1000plus"
        ? "active"
        : ""
    }`}
  >

    <input
      type="radio"
      name="priceRange"
      value="1000plus"
      checked={
        selectedPriceRange ===
        "1000plus"
      }
      onChange={() =>
        setSelectedPriceRange(
          "1000plus"
        )
      }
    />

    <span className="po-radio"></span>

    <span>
      ₱1,000+
    </span>

  </label>

</div>

</div>

            </aside>


            {/* =================================================
                RIGHT SIDE
            ================================================= */}

            <main className="po-main">


              {/* PAGE HEADER */}

              <div className="po-top">

                <div className="po-heading">

                  <div className="po-eyebrow">
                    OUR COLLECTION
                  </div>


                  <h1 className="po-title">

                    Product{" "}

                    <span>
                      Overview
                    </span>

                  </h1>


                  <p>
                    Discover our complete collection
                  </p>

                </div>

              </div>


              {/* SELECTED CATEGORY INDICATOR */}

              {selectedCategoryData && (

                <div className="po-selected-category">

                  <span>
                    {selectedCategoryData.icon}
                  </span>

                  <strong>
                    {selectedCategoryData.name}
                  </strong>

                </div>

              )}


              {/* LOADING */}

              {loading && (

                <p className="po-state">
                  Loading products...
                </p>

              )}


              {/* ERROR */}

              {error && (

                <p className="po-state po-state-error">
                  {error}
                </p>

              )}


              {/* PRODUCT GRID */}

              {!loading &&
                !error && (

                  <div className="po-grid">

                    {filtered.map(
                      (product) => (

                        <button
                          key={
                            product.id
                          }
                          type="button"
                          className={`po-card${product.stock <= 0 ? " po-card-out-of-stock" : ""
                            }`}
                          onClick={() =>
                            handleViewProduct(
                              product.id
                            )
                          }
                        >


                          {/* IMAGE */}

                          <div className="po-img">

                            <img
                              src={
                                product
                                  .images?.[0] ||
                                fallbackImage
                              }
                              alt={
                                product.name
                              }
                              onError={(
                                event
                              ) => {

                                event.currentTarget.src =
                                  fallbackImage;

                              }}
                            />

                            {product.stock <= 0 && (
                              <span className="po-sold-out-badge">
                                Sold Out
                              </span>
                            )}

                          </div>


                          {/* BODY */}

                          <div className="po-card-body">


                            {/* PRODUCT CATEGORY */}

                            <div className="po-card-meta">

                              <span>
                                {getProductCategory(
                                  product
                                )}
                              </span>

                            </div>


                            {/* NAME */}

                            <div className="po-name">
                              {
                                product.name
                              }
                            </div>


                            {/* PRICE */}

                            <div className="po-price">
                              {formatProductPrice(
                                product.price
                              )}
                            </div>


                            {/* FOOTER */}

                            <div className="po-card-footer">

                              <span>
                                {product.stock <= 0
                                  ? "Sold Out"
                                  : "View Product"}
                              </span>

                              <span className="po-card-arrow">
                                →
                              </span>

                            </div>

                          </div>

                        </button>

                      )
                    )}

                  </div>

                )}


              {/* EMPTY */}

              {!loading &&
                !error &&
                filtered.length === 0 && (

                  <div className="po-empty">

                    <div className="po-empty-icon">
                      ⌕
                    </div>

                    <h3>
                      No products found
                    </h3>

                    <p>
                      There are no products
                      in this category yet.
                    </p>

                  </div>

                )}

            </main>

          </div>

        </div>

      </div>


      {/* =====================================================
          LOGIN MODAL
      ===================================================== */}

      {showLoginModal && (

        <LoginRequiredModal

          variant={
            modalVariant
          }

          onClose={() =>
            setShowLoginModal(
              false
            )
          }

          onLogin={() => {

            localStorage.removeItem(
              "cart"
            );

            localStorage.removeItem(
              "cartItems"
            );

            localStorage.removeItem(
              "userCart"
            );

            setShowLoginModal(
              false
            );

            navigate(
              "/user-login",
              {
                state: {
                  from:
                    `${location.pathname}${location.search}`,
                },
              }
            );

          }}

          onRegister={() => {

            localStorage.removeItem(
              "cart"
            );

            localStorage.removeItem(
              "cartItems"
            );

            localStorage.removeItem(
              "userCart"
            );

            setShowLoginModal(
              false
            );

            navigate(
              "/user-register"
            );

          }}

        />

      )}

    </>
  );
}


export default ProductOverview;