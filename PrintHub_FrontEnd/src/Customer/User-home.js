import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./User-home.css";
import { buildApiUrl } from "../config/api";

/* =========================================================
   PMG PRODUCT IMAGES
   All images are located inside:

   public/
      pmg-product-images/
         banners.png
         business-cards.png
         hero-showcase.png
         notebooks.png
         posters.png
         stickers.png
         t-shirts.png
========================================================= */

const PRODUCT_IMAGES = {
  banners: "/pmg-product-images/banners.png",
  businessCards: "/pmg-product-images/business-cards.png",
  heroShowcase: "/pmg-product-images/hero-showcase.png",
  notebooks: "/pmg-product-images/notebooks.png",
  posters: "/pmg-product-images/posters.png",
  stickers: "/pmg-product-images/stickers.png",
  tshirts: "/pmg-product-images/t-shirts.png",
};

const fallbackImage = PRODUCT_IMAGES.heroShowcase;

/* =========================================================
   HERO CAROUSEL
========================================================= */

const heroSlides = [
  {
    id: "banners",
    eyebrow: "LARGE FORMAT",
    title: "Banners",
    heading: "MAKE YOUR MESSAGE",
    accent: "STAND OUT.",
    description:
      "High-quality banners and large-format prints designed for events, promotions, storefronts, and campaigns.",
    image: PRODUCT_IMAGES.banners,
    category: "Business",
  },

  {
    id: "business-cards",
    eyebrow: "BUSINESS PRINTING",
    title: "Business Cards",
    heading: "ELEVATE YOUR BRAND WITH",
    accent: "PRINTING.",
    description:
      "Premium business cards with crisp colors, clean cuts, and finishes that make every first impression feel intentional.",
    image: PRODUCT_IMAGES.businessCards,
    category: "Business",
  },

  {
    id: "hero-showcase",
    eyebrow: "PMG PRINTING HOUSE",
    title: "Print Showcase",
    heading: "BRING YOUR IDEAS",
    accent: "TO LIFE.",
    description:
      "From everyday prints to custom branding solutions, PMG helps turn your ideas into something you can see, hold, and share.",
    image: PRODUCT_IMAGES.heroShowcase,
    category: "Business",
  },

  {
    id: "notebooks",
    eyebrow: "CUSTOM STATIONERY",
    title: "Custom Notebooks",
    heading: "PUT YOUR BRAND",
    accent: "ON PAPER.",
    description:
      "Personalized notebooks and stationery for businesses, schools, events, gifts, and everyday use.",
    image: PRODUCT_IMAGES.notebooks,
    category: "Business",
  },

  {
    id: "posters",
    eyebrow: "POSTERS & SIGNAGE",
    title: "Posters",
    heading: "MAKE YOUR MESSAGE",
    accent: "VISIBLE.",
    description:
      "Large-format posters made for events, promotions, announcements, storefronts, and campaigns.",
    image: PRODUCT_IMAGES.posters,
    category: "Business",
  },

  {
    id: "stickers",
    eyebrow: "STICKERS & LABELS",
    title: "Stickers & Labels",
    heading: "TURN IDEAS INTO",
    accent: "STICKERS.",
    description:
      "Durable custom stickers and labels for packaging, products, promotions, laptops, and more.",
    image: PRODUCT_IMAGES.stickers,
    category: "Labels",
  },

  {
    id: "t-shirts",
    eyebrow: "CUSTOM APPAREL",
    title: "Custom T-Shirts",
    heading: "WEAR YOUR BRAND.",
    accent: "OWN IT.",
    description:
      "Custom printed shirts and apparel for teams, businesses, organizations, events, and personal projects.",
    image: PRODUCT_IMAGES.tshirts,
    category: "Clothing",
  },
];

/* =========================================================
   QUICK BROWSE
========================================================= */

const quickCategories = [
  {
    number: "01",
    title: "Apparel",
    description: "T-shirts, jerseys, and custom clothing",
    category: "Clothing",
    image: PRODUCT_IMAGES.tshirts,
  },

  {
    number: "02",
    title: "Business",
    description: "Cards, flyers, notebooks, and more",
    category: "Business",
    image: PRODUCT_IMAGES.businessCards,
  },

  {
    number: "03",
    title: "Packaging",
    description: "Labels, stickers, and product prints",
    category: "Labels",
    image: PRODUCT_IMAGES.stickers,
  },

  {
    number: "04",
    title: "Large Format",
    description: "Posters, banners, and signage",
    category: "Business",
    image: PRODUCT_IMAGES.banners,
  },
];

/* =========================================================
   PRODUCT IMAGE RESOLVER
========================================================= */

function resolveProductImage(product) {
  if (!product) {
    return fallbackImage;
  }

  const name = String(
    product.name ||
      product.product_name ||
      product.title ||
      ""
  ).toLowerCase();

  const apiImage =
    product.images?.[0] ||
    product.image ||
    product.image_url ||
    product.imageUrl;

  if (apiImage) {
    if (
      apiImage.includes("business-cards") ||
      apiImage.includes("business-card")
    ) {
      return PRODUCT_IMAGES.businessCards;
    }

    if (
      apiImage.includes("sticker") ||
      apiImage.includes("label")
    ) {
      return PRODUCT_IMAGES.stickers;
    }

    if (
      apiImage.includes("notebook") ||
      apiImage.includes("notepad")
    ) {
      return PRODUCT_IMAGES.notebooks;
    }

    if (
      apiImage.includes("poster") ||
      apiImage.includes("signage")
    ) {
      return PRODUCT_IMAGES.posters;
    }

    if (
      apiImage.includes("banner") ||
      apiImage.includes("tarpaulin")
    ) {
      return PRODUCT_IMAGES.banners;
    }

    if (
      apiImage.includes("shirt") ||
      apiImage.includes("tshirt") ||
      apiImage.includes("t-shirt") ||
      apiImage.includes("jersey")
    ) {
      return PRODUCT_IMAGES.tshirts;
    }

    if (
      apiImage.includes("hero-showcase")
    ) {
      return PRODUCT_IMAGES.heroShowcase;
    }

    return apiImage;
  }

  if (
    name.includes("business card") ||
    name.includes("calling card")
  ) {
    return PRODUCT_IMAGES.businessCards;
  }

  if (
    name.includes("sticker") ||
    name.includes("vinyl") ||
    name.includes("label")
  ) {
    return PRODUCT_IMAGES.stickers;
  }

  if (
    name.includes("notebook") ||
    name.includes("notepad")
  ) {
    return PRODUCT_IMAGES.notebooks;
  }

  if (
    name.includes("poster") ||
    name.includes("signage")
  ) {
    return PRODUCT_IMAGES.posters;
  }

  if (
    name.includes("banner") ||
    name.includes("tarpaulin")
  ) {
    return PRODUCT_IMAGES.banners;
  }

  if (
    name.includes("shirt") ||
    name.includes("t-shirt") ||
    name.includes("jersey") ||
    name.includes("apparel")
  ) {
    return PRODUCT_IMAGES.tshirts;
  }

  return fallbackImage;
}

/* =========================================================
   HERO CAROUSEL COMPONENT
========================================================= */

const HeroCarousel = React.memo(({ navigate }) => {
  /*
   * Start on Business Cards.
   */
  const [activeHero, setActiveHero] = useState(1);

  /* =======================================================
     AUTOMATIC CAROUSEL

     Every 4 seconds the carousel advances.
     It DOES NOT pause when hovering.
  ======================================================= */

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveHero((current) => {
        return (current + 1) % heroSlides.length;
      });
    }, 4000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  /* =======================================================
     PREVIOUS SLIDE
  ======================================================= */

  const previousSlide = () => {
    setActiveHero((current) => {
      if (current === 0) {
        return heroSlides.length - 1;
      }

      return current - 1;
    });
  };

  /* =======================================================
     NEXT SLIDE
  ======================================================= */

  const nextSlide = () => {
    setActiveHero((current) => {
      return (current + 1) % heroSlides.length;
    });
  };

  const currentHero = heroSlides[activeHero];

  /* =======================================================
     PREVIOUS / NEXT INDEX
  ======================================================= */

  const previousIndex =
    activeHero === 0
      ? heroSlides.length - 1
      : activeHero - 1;

  const nextIndex =
    activeHero === heroSlides.length - 1
      ? 0
      : activeHero + 1;

  return (
    <section
      className="uh-hero"
      style={{
        "--hero-accent": "#b6ff00",
      }}
    >
      {/* =================================================
          BACKGROUND
      ================================================= */}

      <div className="uh-hero-carousel">
        {heroSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={`uh-hero-slide ${
              activeHero === index
                ? "active"
                : ""
            }`}
            style={{
              backgroundImage: `url("${slide.image}")`,
            }}
          />
        ))}
      </div>

      <div className="uh-hero-overlay" />

      <div className="uh-hero-glow" />

      {/* =================================================
          HERO TEXT
      ================================================= */}

      <div className="uh-hero-content">
        <span className="uh-hero-kicker">
          {currentHero.eyebrow}
        </span>

        <h1>
          {currentHero.heading}

          <br />

          <span>
            {currentHero.accent}
          </span>
        </h1>

        <p>
          {currentHero.description}
        </p>

        <div className="uh-hero-actions">
          <button
            className="uh-hero-btn"
            type="button"
            onClick={() =>
              navigate(
                "/product-overview"
              )
            }
          >
            Shop Now

            <span aria-hidden="true">
              →
            </span>
          </button>

          <button
            className="uh-hero-ghost"
            type="button"
            onClick={() =>
              navigate(
                "/product-overview"
              )
            }
          >
            Browse Services
          </button>
        </div>
      </div>

      {/* =================================================
          PRODUCT CAROUSEL
      ================================================= */}

      <div className="uh-hero-featured">

        {/* =================================================
            LEFT PRODUCT
        ================================================= */}

        <div className="uh-feature-side uh-feature-left">
          <div className="uh-feature-image">
            <img
              src={
                heroSlides[
                  previousIndex
                ].image
              }
              alt={
                heroSlides[
                  previousIndex
                ].title
              }
              onError={(event) => {
                event.currentTarget.src =
                  fallbackImage;
              }}
            />
          </div>

          <div className="uh-feature-label">
            {
              heroSlides[
                previousIndex
              ].title
            }
          </div>

          <button
            type="button"
            className="uh-carousel-arrow uh-carousel-arrow-left"
            onClick={previousSlide}
            aria-label="Previous product"
          >
            ‹
          </button>
        </div>

        {/* =================================================
            CENTER PRODUCT
        ================================================= */}

        <div
          className="uh-feature-main"
          key={currentHero.id}
        >
          <div className="uh-feature-main-inner">

            <div className="uh-feature-badge">
              {currentHero.eyebrow}
            </div>

            <div className="uh-feature-product-image">
              <img
                key={
                  currentHero.image
                }
                src={
                  currentHero.image
                }
                alt={
                  currentHero.title
                }
                onError={(event) => {
                  event.currentTarget.src =
                    fallbackImage;
                }}
              />
            </div>

            <div className="uh-feature-content">
              <h2>
                {currentHero.title}
              </h2>

              <p>
                {
                  currentHero.description
                }
              </p>

              <button
                type="button"
                className="uh-feature-explore"
                onClick={() =>
                  navigate(
                    `/product-overview?category=${currentHero.category}`
                  )
                }
              >
                <span>
                  EXPLORE NOW
                </span>

                <span className="uh-feature-line" />

                <span aria-hidden="true">
                  →
                </span>
              </button>
            </div>

          </div>
        </div>

        {/* =================================================
            RIGHT PRODUCT
        ================================================= */}

        <div className="uh-feature-side uh-feature-right">
          <div className="uh-feature-image">
            <img
              src={
                heroSlides[
                  nextIndex
                ].image
              }
              alt={
                heroSlides[
                  nextIndex
                ].title
              }
              onError={(event) => {
                event.currentTarget.src =
                  fallbackImage;
              }}
            />
          </div>

          <div className="uh-feature-label">
            {
              heroSlides[
                nextIndex
              ].title
            }
          </div>

          <button
            type="button"
            className="uh-carousel-arrow uh-carousel-arrow-right"
            onClick={nextSlide}
            aria-label="Next product"
          >
            ›
          </button>
        </div>
      </div>

      {/* =================================================
          DOTS
      ================================================= */}

      <div className="uh-bestseller-dots">
        {heroSlides.map(
          (slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={
                activeHero === index
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveHero(
                  index
                )
              }
              aria-label={`Show ${slide.title}`}
            />
          )
        )}
      </div>
    </section>
  );
});

/* =========================================================
   MAIN USER HOME PAGE
========================================================= */

function UserHomePage() {
  const navigate = useNavigate();

  const [products, setProducts] =
    useState([]);

  const [
    loadingProducts,
    setLoadingProducts,
  ] = useState(true);

  /* =======================================================
     LOAD PRODUCTS
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    fetch(
      buildApiUrl(
        "/api/products?limit=8"
      )
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Failed to load products"
          );
        }

        return response.json();
      })
      .then((data) => {
        if (!mounted) return;

        const productList =
          Array.isArray(
            data?.products
          )
            ? data.products
            : Array.isArray(data)
              ? data
              : [];

        setProducts(
          productList
        );
      })
      .catch(() => {
        if (mounted) {
          setProducts([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingProducts(
            false
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  /* =======================================================
     FALLBACK PRODUCTS
  ======================================================= */

  const displayProducts =
    useMemo(() => {
      if (products.length > 0) {
        return products;
      }

      return [
        {
          id: "business-cards",
          name: "Business Cards",
          description:
            "Professional business cards for your brand.",
          image:
            PRODUCT_IMAGES.businessCards,
        },

        {
          id: "stickers",
          name: "Stickers & Labels",
          description:
            "Custom stickers and labels for products and packaging.",
          image:
            PRODUCT_IMAGES.stickers,
        },

        {
          id: "notebooks",
          name: "Custom Notebooks",
          description:
            "Personalized notebooks for business, school, or gifts.",
          image:
            PRODUCT_IMAGES.notebooks,
        },

        {
          id: "posters",
          name: "Posters",
          description:
            "High-quality prints for events and promotions.",
          image:
            PRODUCT_IMAGES.posters,
        },

        {
          id: "banners",
          name: "Banners",
          description:
            "Large-format banners for events and businesses.",
          image:
            PRODUCT_IMAGES.banners,
        },

        {
          id: "t-shirts",
          name: "Custom T-Shirts",
          description:
            "Custom printed apparel for teams and events.",
          image:
            PRODUCT_IMAGES.tshirts,
        },
      ];
    }, [products]);

  /* =======================================================
     OPEN PRODUCT
  ======================================================= */

  const openProduct = (
    product
  ) => {
    /*
     * Database product
     */
    if (
      product.id &&
      typeof product.id ===
        "number"
    ) {
      navigate(
        `/product/${product.id}`
      );

      return;
    }

    if (
      product.id &&
      !Number.isNaN(
        Number(product.id)
      ) &&
      Number(product.id) > 0
    ) {
      navigate(
        `/product/${product.id}`
      );

      return;
    }

    /*
     * Fallback products
     */
    const name =
      String(
        product.name || ""
      ).toLowerCase();

    if (
      name.includes("business")
    ) {
      navigate(
        "/product-overview?category=Business"
      );

      return;
    }

    if (
      name.includes("sticker") ||
      name.includes("label")
    ) {
      navigate(
        "/product-overview?category=Labels"
      );

      return;
    }

    if (
      name.includes("shirt") ||
      name.includes("apparel") ||
      name.includes("jersey")
    ) {
      navigate(
        "/product-overview?category=Clothing"
      );

      return;
    }

    navigate(
      "/product-overview"
    );
  };

  return (
    <div className="uh-page fade-in-up">

      {/* =================================================
          HERO
      ================================================= */}

      <HeroCarousel
        navigate={navigate}
      />

      {/* =================================================
          QUICK BROWSE
      ================================================= */}

      <section className="uh-explore-strip">
        <div className="uh-section-title">
          <span>
            Quick Browse
          </span>

          <h2>
            Select a category to{" "}
            <strong>
              start your project
            </strong>
          </h2>
        </div>

        <div className="uh-quick-grid">
          {quickCategories.map(
            (category) => (
              <button
                key={
                  category.title
                }
                type="button"
                className="uh-quick-card"
                onClick={() =>
                  navigate(
                    `/product-overview?category=${category.category}`
                  )
                }
              >
                <div className="uh-quick-image">
                  <img
                    src={
                      category.image
                    }
                    alt={
                      category.title
                    }
                    onError={(
                      event
                    ) => {
                      event.currentTarget.src =
                        fallbackImage;
                    }}
                  />
                </div>

                <div className="uh-quick-content">
                  <span className="uh-quick-number">
                    {
                      category.number
                    }
                  </span>

                  <strong>
                    {
                      category.title
                    }
                  </strong>

                  <small>
                    {
                      category.description
                    }
                  </small>
                </div>

                <span
                  className="uh-quick-arrow"
                  aria-hidden="true"
                >
                  →
                </span>
              </button>
            )
          )}
        </div>
      </section>

      {/* =================================================
          PRODUCT LINEUP
      ================================================= */}

      <section className="uh-lineup-section">
        <div className="uh-section-title">
          <span>
            Product Lineup
          </span>

          <h2>
            Choose a product and{" "}
            <strong>
              customize
            </strong>
          </h2>

          <p>
            Explore our printing
            services and start
            creating your project.
          </p>
        </div>

        {loadingProducts ? (
          <div className="uh-loading">
            <div className="uh-loading-spinner" />

            <p>
              Loading products...
            </p>
          </div>
        ) : (
          <div className="uh-cards">
            {displayProducts.map(
              (
                product,
                index
              ) => {
                const productImage =
                  resolveProductImage(
                    product
                  );

                return (
                  <button
                    key={
                      product.id ||
                      `${product.name}-${index}`
                    }
                    type="button"
                    className="uh-card uh-product-card"
                    onClick={() =>
                      openProduct(
                        product
                      )
                    }
                  >
                    <div className="uh-card-img">

                      {index < 2 && (
                        <span className="uh-card-badge">
                          POPULAR
                        </span>
                      )}

                      <img
                        src={
                          productImage
                        }
                        alt={
                          product.name ||
                          "PMG Printing Product"
                        }
                        onError={(
                          event
                        ) => {
                          event.currentTarget.src =
                            fallbackImage;
                        }}
                      />
                    </div>

                    <div className="uh-card-body">
                      <h3>
                        {
                          product.name ||
                          "Printing Service"
                        }
                      </h3>

                      <p>
                        {
                          product.description ||
                          "High-quality custom printing for your business and personal projects."
                        }
                      </p>

                      <span className="uh-card-cta">
                        Customize

                        <b aria-hidden="true">
                          →
                        </b>
                      </span>
                    </div>
                  </button>
                );
              }
            )}
          </div>
        )}
      </section>

      {/* =================================================
          FINAL CTA
      ================================================= */}

      <section className="uh-final-cta">
        <div className="uh-final-cta-content">

          <span>
            PMG PRINTING HOUSE
          </span>

          <h2>
            Ready to bring your{" "}
            <strong>
              ideas to life?
            </strong>
          </h2>

          <p>
            Create something that
            stands out. Choose your
            product and start
            customizing today.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/product-overview"
              )
            }
          >
            START YOUR PROJECT

            <span aria-hidden="true">
              →
            </span>
          </button>

        </div>
      </section>
    </div>
  );
}

export default UserHomePage;