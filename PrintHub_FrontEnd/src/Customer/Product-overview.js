import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
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


const productTypes = [
  "T-Shirts",
  "Caps",
  "Hoodies",
  "Jerseys",
  "Mugs",
  "Posters",
  "Banners",
  "Stickers",
  "Notebooks",
  "Business Cards",
  "Tarpaulins",
  "IDs",
  "Packaging",
];


const priceRanges = [
  {
    label: "Any price",
    value: "all",
  },
  {
    label: "Under ₱100",
    value: "under100",
  },
  {
    label: "₱100 – ₱250",
    value: "100-250",
  },
  {
    label: "₱250 – ₱500",
    value: "250-500",
  },
  {
    label: "₱500 – ₱1,000",
    value: "500-1000",
  },
  {
    label: "₱1,000+",
    value: "1000plus",
  },
];


const ratingRanges = [
  {
    label: "Any rating",
    value: "all",
  },
  {
    label: "★★★★★ 4.5 & up",
    value: "4.5",
  },
  {
    label: "★★★★☆ 4.0 & up",
    value: "4.0",
  },
  {
    label: "★★★☆☆ 3.5 & up",
    value: "3.5",
  },
];


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


const normalizeProductType = (product) => {
  const name = String(
    product?.name || ""
  ).toLowerCase();

  const printType = String(
    product?.print_type || ""
  ).toLowerCase();

  const combined =
    `${name} ${printType}`;


  if (
    combined.includes("t-shirt") ||
    combined.includes("shirt")
  ) {
    return "T-Shirts";
  }


  if (combined.includes("cap")) {
    return "Caps";
  }


  if (combined.includes("hoodie")) {
    return "Hoodies";
  }


  if (combined.includes("jersey")) {
    return "Jerseys";
  }


  if (combined.includes("mug")) {
    return "Mugs";
  }


  if (combined.includes("poster")) {
    return "Posters";
  }


  if (combined.includes("banner")) {
    return "Banners";
  }


  if (
    combined.includes("sticker") ||
    combined.includes("label")
  ) {
    return "Stickers";
  }


  if (combined.includes("notebook")) {
    return "Notebooks";
  }


  if (combined.includes("business card")) {
    return "Business Cards";
  }


  if (combined.includes("tarpaulin")) {
    return "Tarpaulins";
  }


  if (
    /\bid\b/.test(combined) ||
    combined.includes("identification")
  ) {
    return "IDs";
  }


  if (combined.includes("packaging")) {
    return "Packaging";
  }


  return "";
};


const getPriceMatch = (
  price,
  range
) => {
  if (range === "all") {
    return true;
  }

  const numericPrice = Number(price);

  if (!Number.isFinite(numericPrice)) {
    return false;
  }

  switch (range) {
    case "under100":
      return numericPrice < 100;

    case "100-250":
      return (
        numericPrice >= 100 &&
        numericPrice <= 250
      );

    case "250-500":
      return (
        numericPrice > 250 &&
        numericPrice <= 500
      );

    case "500-1000":
      return (
        numericPrice > 500 &&
        numericPrice <= 1000
      );

    case "1000plus":
      return numericPrice > 1000;

    default:
      return true;
  }
};


function ProductOverview() {
  const navigate = useNavigate();

  const location = useLocation();

  const filterRef = useRef(null);


  const [products, setProducts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(null);


  const [searchQuery, setSearchQuery] =
    useState("");


  const [showFilters, setShowFilters] =
    useState(false);


  const [selectedTypes, setSelectedTypes] =
    useState([]);


  const [priceRange, setPriceRange] =
    useState("all");


  const [ratingRange, setRatingRange] =
    useState("all");


  const [appliedFilters, setAppliedFilters] =
    useState({
      types: [],
      price: "all",
      rating: "all",
    });


  const [showLoginModal, setShowLoginModal] =
    useState(false);


  const [modalVariant, setModalVariant] =
    useState("default");


  useEffect(() => {
    const params =
      new URLSearchParams(
        location.search
      );

    setSearchQuery(
      params.get("search") || ""
    );
  }, [location.search]);


  useEffect(() => {
    const fetchProducts =
      async () => {
        try {
          setLoading(true);

          const res = await fetch(
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
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };

    fetchProducts();
  }, []);


  useEffect(() => {
    const handleOutsideClick =
      (event) => {
        if (
          filterRef.current &&
          !filterRef.current.contains(
            event.target
          )
        ) {
          setShowFilters(false);
        }
      };


    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );


    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);


  const activeFilterCount =
    appliedFilters.types.length +
    (appliedFilters.price !== "all"
      ? 1
      : 0) +
    (appliedFilters.rating !== "all"
      ? 1
      : 0);


  const filtered = useMemo(() => {
    return products.filter(
      (product) => {
        const name = String(
          product?.name || ""
        );

        const productType =
          normalizeProductType(
            product
          );


        const matchesSearch =
          name
            .toLowerCase()
            .includes(
              searchQuery.toLowerCase()
            );


        const matchesType =
          appliedFilters.types
            .length === 0 ||
          appliedFilters.types.includes(
            productType
          );


        const matchesPrice =
          getPriceMatch(
            product?.price,
            appliedFilters.price
          );


        const index =
          products.indexOf(product);


        const productRating =
          4.4 +
          ((index % 6) / 10);


        const matchesRating =
          appliedFilters.rating ===
            "all" ||
          productRating >=
            Number(
              appliedFilters.rating
            );


        return (
          matchesSearch &&
          matchesType &&
          matchesPrice &&
          matchesRating
        );
      }
    );
  }, [
    products,
    searchQuery,
    appliedFilters,
  ]);


  const toggleProductType =
    (type) => {
      setSelectedTypes(
        (current) => {
          if (
            current.includes(type)
          ) {
            return current.filter(
              (item) =>
                item !== type
            );
          }

          return [
            ...current,
            type,
          ];
        }
      );
    };


  const clearTypes = () => {
    setSelectedTypes([]);
  };


  const clearPrice = () => {
    setPriceRange("all");
  };


  const clearRating = () => {
    setRatingRange("all");
  };


  const clearAllFilters = () => {
    setSelectedTypes([]);

    setPriceRange("all");

    setRatingRange("all");

    setAppliedFilters({
      types: [],
      price: "all",
      rating: "all",
    });
  };


  const applyFilters = () => {
    setAppliedFilters({
      types: [
        ...selectedTypes,
      ],
      price: priceRange,
      rating: ratingRange,
    });

    setShowFilters(false);
  };


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

        setShowLoginModal(true);

        return;
      }

      navigate(`/product/${id}`);
    };


  return (
    <>
      <div className="po-page fade-in-up">
        <div className="po-shell">

          {/* =====================================================
              PAGE HEADER
          ===================================================== */}

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
                Discover our complete
                collection
              </p>

            </div>
          </div>


          {/* =====================================================
              SEARCH + FILTER
          ===================================================== */}

          <div className="po-search-filter-row">

            {/* SEARCH */}

            <div className="po-search-wrap">
              <span
                aria-hidden="true"
              >
                ⌕
              </span>

              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
              />
            </div>


            {/* FILTER */}

            <div
              className="po-filter-area"
              ref={filterRef}
            >

              <button
                type="button"
                className={`po-filter-button ${
                  showFilters
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setShowFilters(
                    (current) =>
                      !current
                  )
                }
              >

                <span className="po-filter-icon">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>


                <span>
                  Filter
                </span>


                {activeFilterCount >
                  0 && (
                  <span className="po-filter-count">
                    {activeFilterCount}
                  </span>
                )}


                <span
                  className={`po-filter-chevron ${
                    showFilters
                      ? "open"
                      : ""
                  }`}
                >
                  ↓
                </span>

              </button>


              {showFilters && (
                <div className="po-filter-dropdown">

                  {/* FILTER HEADER */}

                  <div className="po-filter-header">

                    <div>

                      <div className="po-filter-eyebrow">
                        REFINE RESULTS
                      </div>

                      <h2>
                        Filter Products
                      </h2>

                    </div>


                    <button
                      type="button"
                      className="po-filter-close"
                      onClick={() =>
                        setShowFilters(
                          false
                        )
                      }
                      aria-label="Close filters"
                    >
                      ×
                    </button>

                  </div>


                  {/* PRODUCT TYPE */}

                  <section className="po-filter-section">

                    <div className="po-filter-section-heading">

                      <h3>
                        Product Type
                      </h3>

                      <button
                        type="button"
                        onClick={
                          clearTypes
                        }
                      >
                        Clear
                      </button>

                    </div>


                    <div className="po-type-grid">

                      {productTypes.map(
                        (type) => {
                          const checked =
                            selectedTypes.includes(
                              type
                            );

                          return (
                            <label
                              key={type}
                              className={`po-check-option ${
                                checked
                                  ? "checked"
                                  : ""
                              }`}
                            >

                              <input
                                type="checkbox"
                                checked={
                                  checked
                                }
                                onChange={() =>
                                  toggleProductType(
                                    type
                                  )
                                }
                              />


                              <span className="po-custom-checkbox">
                                {checked &&
                                  "✓"}
                              </span>


                              <span>
                                {type}
                              </span>

                            </label>
                          );
                        }
                      )}

                    </div>

                  </section>


                  {/* PRICE RANGE */}

                  <section className="po-filter-section">

                    <div className="po-filter-section-heading">

                      <h3>
                        Price Range
                      </h3>

                      <button
                        type="button"
                        onClick={
                          clearPrice
                        }
                      >
                        Clear
                      </button>

                    </div>


                    <div className="po-radio-row">

                      {priceRanges.map(
                        (item) => (
                          <label
                            key={
                              item.value
                            }
                            className={`po-radio-option ${
                              priceRange ===
                              item.value
                                ? "checked"
                                : ""
                            }`}
                          >

                            <input
                              type="radio"
                              name="priceRange"
                              value={
                                item.value
                              }
                              checked={
                                priceRange ===
                                item.value
                              }
                              onChange={() =>
                                setPriceRange(
                                  item.value
                                )
                              }
                            />


                            <span className="po-custom-radio"></span>


                            <span>
                              {item.label}
                            </span>

                          </label>
                        )
                      )}

                    </div>

                  </section>


                  {/* RATING */}

                  <section className="po-filter-section po-rating-section">

                    <div className="po-filter-section-heading">

                      <h3>
                        Rating
                      </h3>

                      <button
                        type="button"
                        onClick={
                          clearRating
                        }
                      >
                        Clear
                      </button>

                    </div>


                    <div className="po-radio-row po-rating-row">

                      {ratingRanges.map(
                        (item) => (
                          <label
                            key={
                              item.value
                            }
                            className={`po-radio-option ${
                              ratingRange ===
                              item.value
                                ? "checked"
                                : ""
                            }`}
                          >

                            <input
                              type="radio"
                              name="ratingRange"
                              value={
                                item.value
                              }
                              checked={
                                ratingRange ===
                                item.value
                              }
                              onChange={() =>
                                setRatingRange(
                                  item.value
                                )
                              }
                            />


                            <span className="po-custom-radio"></span>


                            <span
                              className={
                                item.value !==
                                "all"
                                  ? "po-rating-stars"
                                  : ""
                              }
                            >
                              {
                                item.label
                              }
                            </span>

                          </label>
                        )
                      )}

                    </div>

                  </section>


                  {/* FILTER ACTIONS */}

                  <div className="po-filter-footer">

                    <button
                      type="button"
                      className="po-clear-all"
                      onClick={
                        clearAllFilters
                      }
                    >
                      Clear All
                    </button>


                    <button
                      type="button"
                      className="po-apply-filters"
                      onClick={
                        applyFilters
                      }
                    >
                      Apply Filters
                    </button>

                  </div>

                </div>
              )}

            </div>

          </div>


          {/* =====================================================
              RESULTS
          ===================================================== */}

          {loading && (
            <p className="po-state">
              Loading products...
            </p>
          )}


          {error && (
            <p className="po-state po-state-error">
              {error}
            </p>
          )}


          {/* =====================================================
              PRODUCT GRID
          ===================================================== */}

          <div className="po-grid">

            {filtered.map(
              (product, index) => (
                <button
                  key={product.id}
                  type="button"
                  className="po-card"
                  onClick={() =>
                    handleViewProduct(
                      product.id
                    )
                  }
                >

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

                  </div>


                  <div className="po-card-body">

                    <div className="po-card-meta">

                      <span>
                        {getProductCategory(
                          product
                        )}
                      </span>


                      <strong>
                        ★{" "}
                        {(
                          4.4 +
                          ((index % 6) /
                            10)
                        ).toFixed(1)}
                      </strong>

                    </div>


                    <div className="po-name">
                      {product.name}
                    </div>


                    <div className="po-price">
                      {formatProductPrice(
                        product.price
                      )}
                    </div>


                    <div className="po-card-footer">

                      <span>
                        View Product
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
                  Try adjusting your
                  search or filters.
                </p>

              </div>
            )}

        </div>
      </div>


      {/* =========================================================
          LOGIN MODAL
      ========================================================= */}

      {showLoginModal && (
        <LoginRequiredModal
          variant={modalVariant}

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