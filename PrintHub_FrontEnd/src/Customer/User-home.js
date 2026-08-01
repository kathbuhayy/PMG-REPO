import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./User-home.css";
import { buildApiUrl } from "../config/api";
import pmgHeroBg from "../assets/images/pmg-herobg.png";
import pmgPressImage from "../assets/images/pmg-image.jpg";
import pmgMobileImage from "../assets/images/pmg-mobile.jpg";
import businessCardImage from "../assets/images/dashboard/business-card.jpg";
import stickerImage from "../assets/images/dashboard/stick.png";
import tagImage from "../assets/images/dashboard/tag.png";

const heroSlides = [
  {
    eyebrow: "Business Cards",
    word: "Business Cards",
    title: "Elevate Your Brand With",
    text: "Premium cards with crisp color, clean cuts, and finishes that make every first impression feel intentional.",
    image: businessCardImage,
    accent: "#06b6d4",
  },
  {
    eyebrow: "Packaging & Labels",
    word: "Packaging",
    title: "Elevate Your Brand With",
    text: "Custom labels, hang tags, sleeves, and packaging details built for launches, gifts, and retail shelves.",
    image: tagImage,
    accent: "#f59e0b",
  },
  {
    eyebrow: "T-Shirts & Apparel",
    word: "Merchandise",
    title: "Elevate Your Brand With",
    text: "Wearable prints for teams, events, shops, and creator merch with colors that stay confident.",
    image: pmgMobileImage,
    accent: "#a855f7",
  },
  {
    eyebrow: "Stickers & Vinyl",
    word: "Stickers",
    title: "Elevate Your Brand With",
    text: "Durable decals, product stickers, and vinyl graphics made to turn small surfaces into brand moments.",
    image: stickerImage,
    accent: "#22c55e",
  },
  {
    eyebrow: "Large Format Tarpaulin",
    word: "Tarpaulins",
    title: "Elevate Your Brand With",
    text: "Large format prints for storefronts, events, promotions, and outdoor campaigns that need to be seen.",
    image: pmgHeroBg,
    accent: "#ef4444",
  },
  {
    eyebrow: "Corporate Branding",
    word: "Brand Kits",
    title: "Elevate Your Brand With",
    text: "Coordinated print packages for teams that need business cards, apparel, signage, and packaging in one place.",
    image: pmgPressImage,
    accent: "#38bdf8",
  },
];

const HeroCarousel = React.memo(({ navigate }) => {
  const [activeHero, setActiveHero] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveHero((current) => (current + 1) % heroSlides.length);
    }, 5600);
    return () => clearInterval(timer);
  }, []);

  const currentHero = heroSlides[activeHero];

  return (
    <section className="uh-hero">
      <div className="uh-hero-carousel" aria-hidden="true">
        {heroSlides.map((slide, index) => (
          <div
            key={slide.eyebrow}
            className={`uh-hero-slide ${activeHero === index ? "active" : ""}`}
            style={{ backgroundImage: `url(${slide.image})` }}
          />
        ))}
      </div>
      <div className="uh-hero-overlay" />
      <div className="uh-hero-content">
        <span className="uh-hero-kicker">{currentHero.eyebrow}</span>
        <h1>
          {currentHero.title} <span>{currentHero.word}</span>
        </h1>
        <p>{currentHero.text}</p>

        <div className="uh-hero-actions">
          <button
            className="uh-hero-btn"
            type="button"
            onClick={() => navigate("/product-overview")}
          >
            SHOP NOW
          </button>
          <button
            className="uh-hero-ghost"
            type="button"
            onClick={() => navigate("/product-overview")}
          >
            Browse Services
          </button>
        </div>
      </div>

      <div className="uh-hero-preview" aria-label="Featured print categories">
        <div className="uh-preview-list">
          {heroSlides.map((slide, index) => (
            <button
              key={slide.eyebrow}
              type="button"
              className={activeHero === index ? "active" : ""}
              onMouseEnter={() => setActiveHero(index)}
              onFocus={() => setActiveHero(index)}
              onClick={() => setActiveHero(index)}
            >
              <span>{slide.eyebrow}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
});

function UserHomePage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch(buildApiUrl("/api/products?limit=8"))
      .then((r) => r.json())
      .then((data) =>
        setProducts(
          Array.isArray(data.products)
            ? data.products
            : Array.isArray(data)
              ? data
              : []
        )
      )
      .catch(() => {});
  }, []);

  const fallbackImage =
    "https://via.placeholder.com/600x400?text=Product+Image";

  return (
    <div className="uh-page fade-in-up">
      <HeroCarousel navigate={navigate} />

      <section className="uh-explore-strip">
        <div className="uh-section-title">
          <span>Quick browse</span>
          <h2>Select a category to start your print order</h2>
        </div>
        <div className="uh-quick-grid">
          {[
            ["Apparel", "T-shirts, jerseys, caps", "Clothing"],
            ["Business", "Cards, flyers, brochures", "Business"],
            ["Packaging", "Tags, labels, stickers", "Labels"],
            ["Large Format", "Posters and tarpaulins", "Business"],
          ].map(([title, text, catVal], index) => (
            <button
              key={title}
              type="button"
              className="uh-quick-card"
              onClick={() =>
                navigate(`/product-overview?category=${catVal}`)
              }
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{title}</strong>
              <small>{text}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="uh-lineup-section">
        <div className="uh-section-title">
          <span>Product lineup</span>
          <h2>Choose a product and customize</h2>
        </div>

        <div className="uh-cards">
          {products.map((p) => (
            <button
              key={p.id}
              type="button"
              className="uh-card uh-product-card"
              onClick={() => navigate(`/product/${p.id}`)}
            >
              <div className="uh-card-img">
                <img
                  src={p.images?.[0] || fallbackImage}
                  alt={p.name}
                  onError={(e) => {
                    e.currentTarget.src = fallbackImage;
                  }}
                />
              </div>

              <div className="uh-card-body">
                <h3>{p.name}</h3>
                <p>{p.description || ""}</p>
                <span className="uh-card-cta">
                  Customize <b aria-hidden="true">›</b>
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default UserHomePage;
