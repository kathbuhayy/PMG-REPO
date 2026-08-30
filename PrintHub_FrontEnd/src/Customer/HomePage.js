import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import {
  FaShippingFast,
  FaAward,
  FaHeadphones,
  FaPrint,
  FaArrowRight,
  FaCheck,
  FaBolt,
  FaPhoneAlt,
  FaEnvelope,
} from "react-icons/fa";

import pmgWebsiteLogo from "../assets/brand/pmg-logo-nav.png";
import { buildApiUrl } from "../config/api";

export function SplashScreen({ onComplete }) {
  useEffect(() => {
    const fallback = window.setTimeout(onComplete, 2400);
    return () => window.clearTimeout(fallback);
  }, [onComplete]);

  return (
    <div
      className="pmg-paint-splash"
      role="status"
      aria-label="Loading PMG Printing"
    >
      <div className="pmg-splash-center">
        <div className="pmg-splash-icon" aria-hidden="true">
          <img src={pmgWebsiteLogo} alt="" />
        </div>

        <h1>PMG PRINTING HOUSE</h1>

        <p>
          CUSTOM PRINTS, APPAREL, PACKAGING & SIGNAGE
        </p>

        <div className="pmg-splash-loading" aria-hidden="true">
          <span onAnimationEnd={onComplete} />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SERVICES
   ========================================================= */

function ServicesSection({ navigate }) {
  const services = [
    {
      title: "DTF Printing",
      text:
        "Vibrant and durable prints perfect for shirts, apparel, and more.",
      image: "/pmg-service-images/dtf-printing.png",
    },
    {
      title: "Sublimation",
      text:
        "Full-color prints that stay vibrant and look amazing.",
      image: "/pmg-service-images/sublimation.png",
    },
    {
      title: "Cut & Sew",
      text:
        "Custom apparel made with precision and attention to detail.",
      image: "/pmg-service-images/cut-and-sew.png",
    },
    {
      title: "Embroidery",
      text:
        "Professional stitching for a premium, lasting finish.",
      image: "/pmg-service-images/embroidery.png",
    },
    {
      title: "Tarpaulin",
      text:
        "High-quality prints for banners, signage, and events.",
      image: "/pmg-service-images/tarpaulin.png",
    },
    {
      title: "UV Stickers",
      text:
        "Weather-resistant stickers for indoor and outdoor use.",
      image: "/pmg-service-images/uv-stickers.png",
    },
  ];

  return (
    <section
      className="pmg-services-section"
      id="services"
    >
      <div className="pmg-section-heading light">
        <div className="pmg-heading-lines">
          <span />
          <strong>OUR SERVICES</strong>
          <span />
        </div>

        <h2>
          What We <strong>Offer</strong>
        </h2>

        <p>
          Professional printing solutions for businesses,
          organizations, events, and personal projects.
        </p>
      </div>

      <div className="pmg-services-grid">
        {services.map((service) => (
          <article
            className="pmg-service-card"
            key={service.title}
          >
            <div className="pmg-service-image">
              <img
                src={service.image}
                alt={`${service.title} product`}
              />
            </div>

            <div className="pmg-service-content">
              <h3>{service.title}</h3>

              <p>{service.text}</p>

              <button
                type="button"
                onClick={() =>
                  navigate("/product-overview")
                }
              >
                Learn more
                <FaArrowRight />
              </button>
            </div>
          </article>
        ))}
      </div>

      <button
        type="button"
        className="pmg-services-all"
        onClick={() =>
          navigate("/product-overview")
        }
      >
        View All Products
        <FaArrowRight />
      </button>
    </section>
  );
}

/* =========================================================
   HOW TO ORDER
   ========================================================= */

function HowToOrderSection() {
  const steps = [
    {
      number: "01",
      title: "Choose Your Product",
      text:
        "Select your desired print item, dimensions, and quantity.",
    },
    {
      number: "02",
      title: "Customize Your Design",
      text:
        "Upload your artwork or create your design using our customizer.",
    },
    {
      number: "03",
      title: "Quality Check",
      text:
        "We review your specifications before production begins.",
    },
    {
      number: "04",
      title: "Precision Printing",
      text:
        "Your project enters production using professional equipment.",
    },
    {
      number: "05",
      title: "Secure Payment",
      text:
        "Complete your order using our available payment options.",
    },
    {
      number: "06",
      title: "Pickup or Delivery",
      text:
        "Receive your finished order through pickup or delivery.",
    },
  ];

  return (
    <section className="pmg-how-section">
      <div className="pmg-section-heading">
        <span>HOW IT WORKS</span>

        <h2>
          From Idea to <strong>Reality</strong>
        </h2>

        <p>
          A simple and transparent process from your
          first idea to the finished product.
        </p>
      </div>

      <div className="pmg-how-grid">
        {steps.map((step, index) => (
          <article
            className="pmg-how-card"
            key={step.number}
          >
            <div className="pmg-step-number">
              {step.number}
            </div>

            <div className="pmg-step-content">
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>

            {index !== steps.length - 1 && (
              <FaArrowRight className="pmg-step-arrow" />
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function PopularProductsSection({ navigate }) {
  const popular = [
    {
      label: "Business Cards",
      image: "/pmg-product-images/business-cards.png",
    },
    {
      label: "T-Shirts",
      image: "/pmg-product-images/t-shirts.png",
    },
    {
      label: "Posters",
      image: "/pmg-product-images/posters.png",
    },
    {
      label: "Notebooks",
      image: "/pmg-product-images/notebooks.png",
    },
    {
      label: "Stickers",
      image: "/pmg-product-images/stickers.png",
    },
    {
      label: "Banners",
      image: "/pmg-product-images/banners.png",
    },
  ];

  return (
    <section
      className="pmg-products-section"
      id="products"
    >
      <div className="pmg-products-background" />

      <div className="pmg-products-inner">

        {/* TOP CONTENT */}
        <div className="pmg-products-hero">

          <div className="pmg-products-copy">

            <div className="pmg-products-kicker">
              <span>///</span>
              <strong>POPULAR PRODUCTS</strong>
              <span>///</span>
            </div>

            <h2>
              Print It.
              <br />
              <strong>Brand It.</strong>
            </h2>

            <p>
              Explore high-quality, customizable printing
              solutions made for your ideas, your brand,
              your way.
            </p>

          </div>


          {/* PRODUCT SHOWCASE */}
          <div className="pmg-products-showcase">

            <div className="pmg-showcase-glow" />

            <img
              src="/pmg-product-images/hero-showcase.png"
              alt="PMG Printing House product showcase"
              className="pmg-showcase-image"
            />

          </div>

        </div>


        {/* PRODUCT CARDS */}
        <div className="pmg-product-grid">

          {popular.map((item) => (
            <button
              type="button"
              className="pmg-product-card"
              key={item.label}
              onClick={() =>
                navigate("/product-overview")
              }
            >

              <div className="pmg-product-card-image">

                <div className="pmg-product-card-glow" />

                <img
                  src={item.image}
                  alt={item.label}
                  onError={(event) => {
                    event.currentTarget.src =
                      "/pmg-product-images/placeholder.png";
                  }}
                />

              </div>


              <div className="pmg-product-card-footer">

                <div className="pmg-product-card-name">

                  <span className="pmg-product-card-icon">
                    <FaPrint />
                  </span>

                  <span>
                    {item.label}
                  </span>

                </div>

                <span className="pmg-product-card-arrow">
                  <FaArrowRight />
                </span>

              </div>

            </button>
          ))}

        </div>


        {/* VIEW ALL */}
        <button
          type="button"
          className="pmg-outline-light-btn"
          onClick={() =>
            navigate("/product-overview")
          }
        >
          VIEW ALL PRODUCTS
          <FaArrowRight />
        </button>

      </div>
    </section>
  );
}


/* =========================================================
   ABOUT
   ========================================================= */

function AboutSection() {
  return (
    <section
      className="pmg-about-section"
      id="about"
    >
      <div className="pmg-about-content">
        <span className="pmg-kicker">
          ABOUT PMG
        </span>

        <h2>
          Your Ideas.
          <br />
          <strong>Our Craft.</strong>
        </h2>

        <p>
          PMG Printing House provides custom printing
          and branding solutions for businesses,
          organizations, events, and individuals.
        </p>

        <p>
          From custom apparel and jerseys to
          promotional materials, stickers, signage,
          and more, we help transform your ideas into
          professional finished products.
        </p>

        <div className="pmg-about-checks">
          <div>
            <FaCheck />
            <span>Professional printing</span>
          </div>

          <div>
            <FaCheck />
            <span>Custom solutions</span>
          </div>

          <div>
            <FaCheck />
            <span>Fast turnaround</span>
          </div>

          <div>
            <FaCheck />
            <span>Direct customer support</span>
          </div>
        </div>
      </div>

      <div className="pmg-about-card">
        <div className="pmg-about-card-glow" />

        <img
          src="/pmg-about-images/printing-machine.jpg"
          alt="PMG printing machine"
          className="pmg-about-image"
        />

        <div className="pmg-about-image-overlay" />

        <FaPrint />

        <span>PMG</span>

        <h3>
          WE PRINT
          <br />
          YOUR VISION
          <br />
          <strong>TO LIFE.</strong>
        </h3>
      </div>
    </section>
  );
}

/* =========================================================
   CONTACT
   ========================================================= */

function ContactSection() {
  return (
    <footer
      className="pmg-contact-section"
      id="contact"
    >
      {/* =====================================================
            FOOTER LINKS
            ===================================================== */}

      <div className="pmg-footer-links">

        {/* BRAND */}
        <div className="pmg-footer-brand">

          <img
            src={pmgWebsiteLogo}
            alt="PMG Printing House"
          />

          <p>
            Your one-stop printing solution for
            high-quality prints, fast services,
            and satisfaction guaranteed.
          </p>

        </div>


        {/* SHOP */}
        <div className="pmg-footer-column">

          <h3>Shop</h3>

          <a href="#products">
            All Products
          </a>

          <a href="#products">
            Business Cards
          </a>

          <a href="#products">
            Flyers
          </a>

          <a href="#products">
            Stickers
          </a>

          <a href="#products">
            Banners
          </a>

          <a href="#products">
            Packaging
          </a>

          <a href="#products">
            T-Shirts & Apparel
          </a>

          <a href="#products">
            Invitations
          </a>

        </div>


        {/* SERVICES */}
        <div className="pmg-footer-column">

          <h3>Services</h3>

          <a href="#services">
            Offset Printing
          </a>

          <a href="#services">
            Digital Printing
          </a>

          <a href="#services">
            Large Format Printing
          </a>

          <a href="#services">
            Custom Design
          </a>

          <a href="#services">
            3D AI-Generated Preview
          </a>

          <a href="#services">
            Same-day Printing
          </a>

        </div>


        {/* COMPANY */}
        <div className="pmg-footer-column">

          <h3>Company</h3>

          <a href="#about">
            About Us
          </a>

          <a href="#about">
            Why Choose PMG
          </a>

          <a href="#contact">
            FAQ
          </a>

        </div>


        {/* CUSTOMER SERVICE */}
        <div className="pmg-footer-column">

          <h3>Customer Service</h3>

          <a href="#about">
            About Us
          </a>

          <a href="#contact">
            Contact Us
          </a>

          <a href="#contact">
            FAQ
          </a>

        </div>

      </div>


      {/* =====================================================
            FOOTER BOTTOM
            ===================================================== */}

      <div className="pmg-footer-bottom">

        <span>
          © {new Date().getFullYear()} PMG Printing House
        </span>

        <span>
          Custom Prints • Apparel • Branding
        </span>

      </div>

    </footer>
  );
}

const HERO_SLIDES = [
  {
    label: "Apparel & Wearables",
    image: "/pmg-product-images/hero-showcase.png",
    alt: "PMG custom apparel and promotional products",
  },
  {
    label: "Custom T-Shirts",
    image: "/pmg-product-images/t-shirts.png",
    alt: "PMG custom T-shirts",
  },
  {
    label: "Print Materials",
    image: "/pmg-product-images/business-cards.png",
    alt: "PMG printed business cards",
  },
  {
    label: "Posters & Signage",
    image: "/pmg-product-images/posters.png",
    alt: "PMG custom posters",
  },
  {
    label: "Stickers",
    image: "/pmg-product-images/stickers.png",
    alt: "PMG custom stickers",
  },
  {
    label: "Banners",
    image: "/pmg-product-images/banners.png",
    alt: "PMG custom banners",
  },
];


export default function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);

  const [scrollProgress, setScrollProgress] =
    useState(0);

  const [heroSlide, setHeroSlide] =
    useState(0);

  /* =======================================================
     SCROLL PROGRESS
     ======================================================= */

  useEffect(() => {
    const container =
      document.querySelector(
        ".app-content-scrollable"
      ) ||
      document.getElementById(
        "landingScrollContainer"
      );

    const handleScroll = () => {
      if (container) {
        const total =
          container.scrollHeight -
          container.clientHeight;

        const current =
          container.scrollTop;

        setScrollProgress(
          total > 0 ? current / total : 0
        );
      } else {
        const total =
          document.documentElement.scrollHeight -
          window.innerHeight;

        const current =
          window.scrollY;

        setScrollProgress(
          total > 0 ? current / total : 0
        );
      }
    };

    handleScroll();

    if (container) {
      container.addEventListener(
        "scroll",
        handleScroll
      );
    }

    window.addEventListener(
      "scroll",
      handleScroll
    );

    return () => {
      if (container) {
        container.removeEventListener(
          "scroll",
          handleScroll
        );
      }

      window.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, []);

  /* =======================================================
     REVEAL ANIMATION
     ======================================================= */

  useEffect(() => {
    const revealItems =
      document.querySelectorAll(
        ".pmg-reveal"
      );

    if (!revealItems.length) {
      return undefined;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add(
                "pmg-visible"
              );

              observer.unobserve(
                entry.target
              );
            }
          });
        },
        {
          threshold: 0.12,
        }
      );

    revealItems.forEach((item) =>
      observer.observe(item)
    );

    return () => observer.disconnect();
  }, [products]);

  /* =======================================================
     LANDING SECTION NAVIGATION
     ======================================================= */

  useEffect(() => {
    if (location.state?.scrollTo) {
      const el =
        document.getElementById(
          location.state.scrollTo
        );

      if (el) {
        setTimeout(() => {
          el.scrollIntoView({
            behavior: "smooth",
          });
        }, 100);
      }
    }
  }, [location]);

  /* =======================================================
   HERO PRODUCT CAROUSEL
   ======================================================= */

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroSlide((current) =>
        (current + 1) % HERO_SLIDES.length
      );
    }, 4500);

    return () =>
      window.clearInterval(timer);
  }, []);

  /* =======================================================
     LOAD PRODUCTS
     ======================================================= */

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(
          buildApiUrl(
            "/api/products?limit=8"
          )
        );

        if (!res.ok) {
          throw new Error(
            "Failed to load products"
          );
        }

        const data = await res.json();

        const list =
          (data.products || data).map(
            (p) => ({
              id: p.id,
              name:
                p.name ||
                p.title ||
                "Untitled",
              images:
                p.images || [],
              price: p.price,
              stock: p.stock,
            })
          );

        setProducts(list);
      } catch (err) {
        console.error(err);
        setProducts([]);
      }
    };

    fetchProducts();
  }, []);

  return (
    <>
      <style>{`
           
           @import url('https://fonts.googleapis.com/css2?family=Anton&family=Permanent+Marker&family=Poppins:wght@400;500;600;700;800;900&display=swap');


        /* =====================================================
           ROOT
           ===================================================== */

.landing-page-wrapper {
  --pmg-green: #9cff00;
  --pmg-green-soft: #76d42b;
  --pmg-deep: #011510;
  --pmg-deep-2: #031f16;
  --pmg-dark-text: #0d281d;

  width: 100%;
  min-height: 100vh;

  overflow-x: hidden;

  background: #f5f6f2;

  color: var(--pmg-dark-text);

  font-family: "Poppins", sans-serif;
}


        .landing-page-wrapper *,
        .landing-page-wrapper *::before,
        .landing-page-wrapper *::after {
          box-sizing: border-box;
        }


        .landing-page-wrapper button,
        .landing-page-wrapper a {
          font-family: inherit;
        }


        /* =====================================================
           SCROLL PROGRESS
           ===================================================== */

        .home-scroll-progress {
          position: fixed;
          top: 0;
          left: 0;

          z-index: 5000;

          width: 100%;
          height: 3px;

          transform-origin:
            left center;

          background:
            var(--pmg-green);

          box-shadow:
            0 0 14px
            rgba(156,255,0,.7);

          pointer-events: none;
        }


        /* =====================================================
           HERO
           ===================================================== */

        .pmg-hero {
          position: relative;

          min-height:
            min(720px, calc(100vh - 60px));

          overflow: hidden;

          display: flex;
          align-items: center;

          background:
            radial-gradient(
              circle at 75% 45%,
              rgba(62,175,72,.30),
              transparent 30%
            ),
            radial-gradient(
              circle at 95% 90%,
              rgba(156,255,0,.08),
              transparent 32%
            ),
            linear-gradient(
              120deg,
              #020f0a 0%,
              #052218 48%,
              #03130e 100%
            );

          color: white;
        }


        .pmg-hero::before {
          content: "";

          position: absolute;
          inset: 0;

          opacity: .16;

          background-image:
            radial-gradient(
              rgba(156,255,0,.35) 1px,
              transparent 1px
            );

          background-size: 25px 25px;

          mask-image:
            linear-gradient(
              to right,
              black,
              transparent 65%
            );
        }


        .pmg-hero::after {
          content: "";

          position: absolute;

          width: 70%;
          height: 70%;

          right: -20%;
          bottom: -40%;

          border-radius: 50%;

          background:
            rgba(156,255,0,.07);

          filter: blur(70px);
        }


        .pmg-hero-inner {
          position: relative;
          z-index: 2;

          width:
            min(1380px, 92%);

          margin: 0 auto;

          min-height: 650px;

          display: grid;

          grid-template-columns:
            42% 58%;

          align-items: center;
        }


        .pmg-hero-copy {
          position: relative;
          z-index: 5;

          padding: 60px 0;
        }


        .pmg-hero-title {
          margin: 0;

          max-width: 650px;

          font-family:
            "Anton",
            sans-serif;

          font-size:
            clamp(55px, 6vw, 92px);

          line-height: .92;

          letter-spacing: 1px;

          font-weight: 400;

          text-transform: uppercase;
        }


        .pmg-hero-title span {
          display: block;
        }


        .pmg-hero-title .green {
          display: block;

          margin-top: 4px;

          font-family:
            "Permanent Marker",
            cursive;

          color:
            var(--pmg-green);

          font-size: .88em;

          font-weight: 400;

          font-style: normal;

          letter-spacing: 0;

          text-transform: uppercase;

          transform:
            rotate(-2deg);

          transform-origin:
            left center;
        }


        .pmg-hero-description {
          max-width: 510px;

          margin:
            26px 0
            30px;

          color:
            rgba(255,255,255,.72);

          font-size: 16px;

          line-height: 1.7;
        }


        .pmg-hero-actions {
          display: flex;

          align-items: center;

          gap: 12px;

          flex-wrap: wrap;
        }


        .pmg-primary-btn,
        .pmg-secondary-btn {
          min-height: 50px;

          padding:
            0 25px;

          border-radius: 8px;

          display: inline-flex;

          align-items: center;
          justify-content: center;

          gap: 10px;

          cursor: pointer;

          font-size: 13px;

          font-weight: 900;

          letter-spacing: .4px;

          transition:
            transform .25s ease,
            box-shadow .25s ease,
            background .25s ease,
            border-color .25s ease,
            color .25s ease;
        }


        .pmg-primary-btn {
          border:
            1px solid
            var(--pmg-green);

          background:
            var(--pmg-green);

          color: #081508;
        }


        .pmg-primary-btn:hover {
          transform:
            translateY(-3px);

          box-shadow:
            0 15px 35px
            rgba(156,255,0,.22);
        }


        .pmg-secondary-btn {
          border:
            1px solid
            rgba(255,255,255,.35);

          background: transparent;

          color: white;
        }


        .pmg-secondary-btn:hover {
          transform:
            translateY(-3px);

          border-color:
            var(--pmg-green);

          color:
            var(--pmg-green);
        }


        /* =====================================================
           HERO PRODUCT CAROUSEL
           ===================================================== */

        .pmg-hero-product {
          position: relative;

          height: 650px;

          display: flex;

          align-items: center;
          justify-content: center;

          overflow: visible;
        }


        .pmg-hero-product-glow {
          position: absolute;

          width: 610px;
          height: 500px;

          left: 50%;
          top: 50%;

          transform:
            translate(-50%, -50%);

          border-radius: 50%;

          background:
            radial-gradient(
              ellipse,
              rgba(81,190,80,.30),
              rgba(81,190,80,.09) 46%,
              transparent 72%
            );

          filter: blur(18px);

          pointer-events: none;
        }


        .pmg-hero-carousel {
          position: relative;

          width: 100%;
          height: 560px;

          display: flex;

          align-items: center;
          justify-content: center;

          overflow: visible;
        }


        .pmg-hero-slide {
          position: absolute;

          top: 50%;
          left: 50%;

          width: min(520px, 72%);

          height: 500px;

          transform:
            translate(-50%, -50%)
            scale(.82);

          opacity: 0;

          pointer-events: none;

          border:
            1px solid
            rgba(156,255,0,.32);

          border-radius: 18px;

          background:
            linear-gradient(
              145deg,
              rgba(7,42,29,.82),
              rgba(1,19,14,.94)
            );

          box-shadow:
            0 24px 55px
            rgba(0,0,0,.30);

          overflow: hidden;

          display: flex;

          align-items: center;
          justify-content: center;

          transition:
            transform .65s cubic-bezier(.22,.61,.36,1),
            opacity .65s ease,
            left .65s cubic-bezier(.22,.61,.36,1),
            filter .65s ease;

          filter:
            saturate(.78)
            brightness(.72);
        }


        .pmg-hero-slide.active {
          left: 50%;

          transform:
            translate(-50%, -50%)
            scale(1);

          opacity: 1;

          z-index: 4;

          pointer-events: auto;

          border-color:
            rgba(156,255,0,.78);

          box-shadow:
            0 28px 60px
            rgba(0,0,0,.45),
            0 0 35px
            rgba(156,255,0,.08);

          filter:
            saturate(1)
            brightness(1);
        }


        .pmg-hero-slide.prev {
          left: 14%;

          transform:
            translate(-50%, -50%)
            scale(.72);

          opacity: .55;

          z-index: 2;

          filter:
            saturate(.65)
            brightness(.58);
        }


        .pmg-hero-slide.next {
          left: 86%;

          transform:
            translate(-50%, -50%)
            scale(.72);

          opacity: .55;

          z-index: 2;

          filter:
            saturate(.65)
            brightness(.58);
        }


        .pmg-hero-slide::before {
          content: "";

          position: absolute;

          inset: 0;

          background:
            radial-gradient(
              circle at 50% 42%,
              rgba(91,203,69,.17),
              transparent 52%
            );

          pointer-events: none;
        }


        .pmg-hero-slide img {
          position: relative;

          z-index: 2;

          width: 100%;
          height: 100%;

          padding: 34px;

          object-fit: contain;

          filter:
            drop-shadow(
              0 28px 30px
              rgba(0,0,0,.55)
            );

          animation:
            pmgHeroProductFloat
            5.5s
            ease-in-out
            infinite;
        }


        .pmg-hero-slide-label {
          position: absolute;

          z-index: 5;

          left: 0;
          right: 0;
          bottom: 0;

          min-height: 58px;

          padding:
            12px 18px;

          display: flex;

          align-items: center;
          justify-content: center;

          border-top:
            1px solid
            rgba(255,255,255,.10);

          background:
            rgba(0,10,7,.66);

          backdrop-filter:
            blur(8px);

          color:
            var(--pmg-green);

          font-size: 12px;

          font-weight: 900;

          letter-spacing: .3px;

          text-transform: uppercase;

          text-align: center;
        }


        .pmg-hero-carousel-arrow {
          position: absolute;

          z-index: 8;

          top: 50%;

          width: 48px;
          height: 48px;

          transform:
            translateY(-50%);

          display: grid;

          place-items: center;

          border:
            1px solid
            rgba(156,255,0,.55);

          border-radius: 50%;

          background:
            rgba(1,22,15,.82);

          color:
            var(--pmg-green);

          cursor: pointer;

          font-size: 28px;

          line-height: 1;

          transition:
            background .25s ease,
            transform .25s ease,
            box-shadow .25s ease;
        }


        .pmg-hero-carousel-arrow.left {
          left: 5%;
        }


        .pmg-hero-carousel-arrow.right {
          right: 5%;
        }


        .pmg-hero-carousel-arrow:hover {
          background:
            var(--pmg-green);

          color:
            #06180e;

          box-shadow:
            0 0 24px
            rgba(156,255,0,.22);
        }


        .pmg-hero-carousel-arrow.left:hover {
          transform:
            translateY(-50%)
            translateX(-2px);
        }


        .pmg-hero-carousel-arrow.right:hover {
          transform:
            translateY(-50%)
            translateX(2px);
        }


        .pmg-hero-carousel-dots {
          position: absolute;

          z-index: 9;

          left: 50%;
          bottom: 14px;

          transform:
            translateX(-50%);

          display: flex;

          align-items: center;

          gap: 9px;

          padding:
            7px 11px;

          border-radius: 999px;

          background:
            rgba(1,15,10,.62);

          backdrop-filter:
            blur(7px);
        }


        .pmg-hero-carousel-dot {
          width: 7px;
          height: 7px;

          padding: 0;

          border: 0;

          border-radius: 50%;

          background:
            rgba(255,255,255,.45);

          cursor: pointer;

          transition:
            width .25s ease,
            background .25s ease,
            transform .25s ease;
        }


        .pmg-hero-carousel-dot.active {
          width: 10px;
          height: 10px;

          background:
            var(--pmg-green);

          transform:
            scale(1.05);

          box-shadow:
            0 0 12px
            rgba(156,255,0,.40);
        }


        @keyframes pmgHeroProductFloat {
          0%,
          100% {
            transform:
              translateY(0);
          }

          50% {
            transform:
              translateY(-7px);
          }
        }


        /* =====================================================
           SECTION HEADINGS
           ===================================================== */

        .pmg-section-heading {
          position: relative;

          z-index: 2;

          max-width: 820px;

          margin:
            0 auto
            45px;

          text-align: center;
        }


        .pmg-section-heading > span {
          color:
            #579d28;

          font-size: 11px;

          font-weight: 900;

          letter-spacing: 3px;
        }


        .pmg-heading-lines {
          display: flex;

          align-items: center;
          justify-content: center;

          gap: 22px;

          margin-bottom: 18px;

          color:
            var(--pmg-green);

          font-size: 11px;

          font-weight: 900;

          letter-spacing: 4px;
        }


        .pmg-heading-lines span {
          width: 42px;
          height: 1px;

          background:
            var(--pmg-green);

          opacity: .8;
        }
          .pmg-section-heading h2 {
  margin:
    9px 0
    14px;

  font-family:
    "Anton",
    sans-serif;

  font-size:
    clamp(40px, 5vw, 72px);

  line-height: .96;

  letter-spacing: 1px;

  font-weight: 400;
}


        .pmg-section-heading h2 strong {
          color:
            #70bb21;
        }


        .pmg-section-heading p {
          max-width: 760px;

          margin: 0 auto;

          color:
            #68766e;

          font-size: 15px;

          line-height: 1.7;
        }


        .pmg-section-heading.light > span {
          color:
            var(--pmg-green);
        }


        .pmg-section-heading.light h2 {
          color: white;
        }


        .pmg-section-heading.light h2 strong {
          color:
            var(--pmg-green);
        }


        .pmg-section-heading.light p {
          color:
            rgba(255,255,255,.70);
        }


        /* =====================================================
           SERVICES
           
           UPDATED:
           - Six cards across desktop
           - Smaller cards
           - Image on top
           - Text underneath
           - No circle icons
           - No numbers
           ===================================================== */

/* =====================================================
   SERVICES
   ===================================================== */

.pmg-services-section {
  position: relative;
  overflow: hidden;

  padding:
    62px
    max(3%, calc((100% - 1570px) / 2))
    55px;

  background:
    radial-gradient(
      circle at 5% 30%,
      rgba(67,175,64,.16),
      transparent 25%
    ),
    radial-gradient(
      circle at 96% 72%,
      rgba(156,255,0,.08),
      transparent 27%
    ),
    #011510;

  color: white;
}

.pmg-services-section::before {
  content: "";

  position: absolute;
  inset: 0;

  pointer-events: none;
  opacity: .20;

  background-image:
    radial-gradient(
      rgba(156,255,0,.48) 1px,
      transparent 1px
    );

  background-size: 25px 25px;

  mask-image:
    radial-gradient(
      ellipse at center,
      black 0%,
      transparent 76%
    );
}


/* =====================================================
   SERVICE GRID
   ===================================================== */

.pmg-services-grid {
  position: relative;
  z-index: 2;

  width: 100%;
  max-width: 1450px;

  margin: 0 auto;

  display: grid;

  /* 3 cards per row */
  grid-template-columns:
    repeat(3, minmax(0, 1fr));

  /* bigger gap between cards */
  gap: 20px;
}


/* =====================================================
   SERVICE CARD
   ===================================================== */

.pmg-service-card {
  position: relative;
  min-width: 0;

  /* SMALLER CARDS */
  height: 300px;

  overflow: hidden;

  border:
    1px solid
    rgba(112,202,88,.38);

  border-radius: 14px;

  background:
    linear-gradient(
      135deg,
      rgba(5,38,25,.94),
      rgba(1,24,17,.97)
    );

  display: flex;
  flex-direction: column;

  isolation: isolate;

  transition:
    transform .3s ease,
    border-color .3s ease,
    box-shadow .3s ease;
}

.pmg-service-card::before {
  content: "";

  position: absolute;
  inset: 0;

  z-index: -1;

  background:
    radial-gradient(
      circle at 50% 35%,
      rgba(91,203,69,.12),
      transparent 50%
    );

  pointer-events: none;
}

.pmg-service-card:hover {
  transform: translateY(-5px);

  border-color:
    rgba(156,255,0,.72);

  box-shadow:
    0 18px 40px
    rgba(0,0,0,.35),
    0 0 25px
    rgba(156,255,0,.07);
}


/* =====================================================
   SERVICE IMAGE
   ===================================================== */

.pmg-service-image {
  position: relative;

  width: 100%;

  /* SMALLER IMAGE AREA */
  height: 155px;

  flex-shrink: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  overflow: hidden;
}

.pmg-service-image::after {
  content: "";

  position: absolute;

  width: 150px;
  height: 150px;

  left: 50%;
  top: 50%;

  transform:
    translate(-50%, -50%);

  border-radius: 50%;

  background:
    radial-gradient(
      circle,
      rgba(98,217,71,.22),
      transparent 68%
    );

  filter: blur(8px);

  z-index: -1;
}

.pmg-service-image img {
  width: 100%;
  height: 100%;

  object-fit: contain;

  padding: 5px;

  display: block;

  filter:
    drop-shadow(
      0 10px 14px
      rgba(0,0,0,.40)
    );

  transition:
    transform .35s ease,
    filter .35s ease;
}

.pmg-service-card:hover
.pmg-service-image img {
  transform: scale(1.04);

  filter:
    drop-shadow(
      0 15px 20px
      rgba(0,0,0,.46)
    )
    drop-shadow(
      0 0 15px
      rgba(156,255,0,.10)
    );
}


/* =====================================================
   SERVICE TEXT
   ===================================================== */

.pmg-service-content {
  flex: 1;

  padding:
    10px
    14px
    12px;

  display: flex;
  flex-direction: column;

  align-items: flex-start;
}

.pmg-service-content h3 {
  margin:
    0 0 5px;

  color: white;

  font-size: 17px;

  line-height: 1.15;

  font-weight: 900;
}

.pmg-service-content p {
  margin: 0;

  color: rgba(255,255,255,.64);

  font-size: 11px;

  line-height: 1.45;

  /* Keep all cards the same height */
  min-height: 32px;
}


/* =====================================================
   LEARN MORE
   ===================================================== */

.pmg-service-content button {
  /* REMOVED margin-top:auto */
  margin-top: 10px;

  display: inline-flex;

  align-items: center;

  gap: 7px;

  padding: 0;

  border: 0;

  background: transparent;

  color:
    var(--pmg-green);

  cursor: pointer;

  font-size: 11px;

  font-weight: 900;
}

.pmg-service-content button svg {
  font-size: 10px;

  transition:
    transform .2s ease;
}

.pmg-service-content button:hover svg {
  transform:
    translateX(5px);
}


/* =====================================================
   VIEW ALL PRODUCTS
   ===================================================== */

.pmg-services-all {
  position: relative;
  z-index: 3;

  margin:
    28px auto
    0;

  min-height: 46px;

  padding:
    0 27px;

  display: flex;

  align-items: center;
  justify-content: center;

  gap: 10px;

  border:
    1px solid
    rgba(156,255,0,.65);

  border-radius: 999px;

  background:
    rgba(3,27,19,.35);

  color:
    var(--pmg-green);

  cursor: pointer;

  font-size: 12px;

  font-weight: 900;

  transition:
    background .25s ease,
    color .25s ease,
    transform .25s ease,
    box-shadow .25s ease;
}

.pmg-services-all:hover {
  background:
    var(--pmg-green);

  color:
    #031b13;

  transform:
    translateY(-2px);

  box-shadow:
    0 0 24px
    rgba(156,255,0,.18);
}

        /* =====================================================
           HOW TO ORDER
           ===================================================== */

        .pmg-how-section {
          padding:
            100px
            max(5%, calc((100% - 1300px) / 2));

          background:
            #f5f6f2;
        }


        .pmg-how-grid {
          display: grid;

          grid-template-columns:
            repeat(3, 1fr);

          gap: 18px;
        }


        .pmg-how-card {
          position: relative;

          min-height: 175px;

          padding: 25px;

          border-radius: 14px;

          background: white;

          border:
            1px solid
            #e3e9e0;

          transition:
            transform .25s ease,
            box-shadow .25s ease;
        }


        .pmg-how-card:hover {
          transform:
            translateY(-4px);

          box-shadow:
            0 12px 30px
            rgba(15,45,28,.08);
        }


        .pmg-step-number {
          margin-bottom: 20px;

          color:
            #75b827;

          font-size: 13px;

          font-weight: 950;

          letter-spacing: 1px;
        }


        .pmg-step-content h3 {
          margin:
            0 0 8px;

          color:
            #10291e;

          font-size: 16px;

          font-weight: 900;
        }


        .pmg-step-content p {
          max-width: 300px;

          margin: 0;

          color:
            #69766f;

          font-size: 12px;

          line-height: 1.65;
        }


        .pmg-step-arrow {
          position: absolute;

          right: 20px;
          top: 27px;

          color:
            #b4c5ad;

          font-size: 11px;
        }


/* =====================================================
   POPULAR PRODUCTS
   ===================================================== */

.pmg-products-section {
  position: relative;

  overflow: hidden;

  padding:
    42px
    max(3.5%, calc((100% - 1540px) / 2))
    32px;

  background:
    radial-gradient(
      circle at 70% 30%,
      rgba(55, 155, 60, .20),
      transparent 34%
    ),
    radial-gradient(
      circle at 95% 80%,
      rgba(156,255,0,.07),
      transparent 30%
    ),
    linear-gradient(
      135deg,
      #011510 0%,
      #021c14 50%,
      #01130e 100%
    );

  color: white;
}


.pmg-products-background {
  position: absolute;

  width: 800px;
  height: 800px;

  right: -350px;
  top: -300px;

  border-radius: 50%;

  background:
    rgba(80,180,70,.08);

  filter: blur(70px);

  pointer-events: none;
}


/* =====================================================
   PRODUCTS INNER
   ===================================================== */

.pmg-products-inner {
  position: relative;

  z-index: 2;

  width: 100%;

  max-width: 1540px;

  margin: 0 auto;
}


/* =====================================================
   PRODUCTS HERO
   ===================================================== */

.pmg-products-hero {

  min-height: 390px;

  display: grid;

  grid-template-columns:
    43%
    57%;

  align-items: center;

  margin-bottom: 4px;
}


/* =====================================================
   PRODUCTS COPY
   ===================================================== */

.pmg-products-copy {

  position: relative;

  z-index: 5;

  padding:
    20px 0
    15px;
}


.pmg-products-kicker {

  display: flex;

  align-items: center;

  gap: 8px;

  margin-bottom: 12px;

  color:
    var(--pmg-green);

  font-size: 10px;

  font-weight: 900;

  letter-spacing: 3px;
}


.pmg-products-kicker span {

  font-size: 12px;

  letter-spacing: 0;
}


.pmg-products-copy h2 {

  margin: 0;

  color: white;

  font-family:
    "Anton",
    sans-serif;

  font-size:
    clamp(54px, 6vw, 88px);

  line-height: .91;

  font-weight: 400;

  text-transform: uppercase;

  letter-spacing: 1px;
}


.pmg-products-copy h2 strong {

  color:
    var(--pmg-green);

  font-weight: 400;
}


.pmg-products-copy > p {

  max-width: 500px;

  margin:
    23px 0 25px;

  color:
    rgba(255,255,255,.70);

  font-size: 14px;

  line-height: 1.65;
}


/* =====================================================
   PRODUCT BENEFITS
   ===================================================== */

.pmg-products-benefits {

  display: grid;

  grid-template-columns:
    repeat(4, minmax(0, 1fr));

  gap: 15px;

  max-width: 610px;
}


.pmg-product-benefit {

  display: flex;

  align-items: flex-start;

  gap: 9px;
}


.pmg-product-benefit > svg {

  flex: 0 0 auto;

  margin-top: 2px;

  color:
    var(--pmg-green);

  font-size: 21px;
}


.pmg-product-benefit div {

  display: flex;

  flex-direction: column;

  gap: 3px;
}


.pmg-product-benefit strong {

  color: white;

  font-size: 9px;

  font-weight: 900;

  line-height: 1.2;

  text-transform: uppercase;
}


.pmg-product-benefit span {

  color:
    rgba(255,255,255,.53);

  font-size: 8px;

  line-height: 1.45;
}


/* =====================================================
   SHOWCASE
   ===================================================== */

.pmg-products-showcase {

  position: relative;

  height: 410px;

  display: flex;

  align-items: center;

  justify-content: center;

  overflow: visible;
}


.pmg-showcase-glow {

  position: absolute;

  width: 600px;
  height: 400px;

  right: 2%;

  top: 50%;

  transform:
    translateY(-50%);

  border-radius: 50%;

  background:
    radial-gradient(
      ellipse,
      rgba(70,170,70,.28),
      rgba(70,170,70,.10) 45%,
      transparent 72%
    );

  filter: blur(18px);
}


.pmg-showcase-image {

  position: relative;

  z-index: 2;

  width:
    min(850px, 115%);

  height:
    100%;

  object-fit:
    contain;

  object-position:
    center;

  filter:
    drop-shadow(
      0 28px 32px
      rgba(0,0,0,.55)
    );

  animation:
    pmgShowcaseFloat
    6s
    ease-in-out
    infinite;
}


@keyframes pmgShowcaseFloat {

  0%,
  100% {
    transform:
      translateY(0);
  }

  50% {
    transform:
      translateY(-7px);
  }
}


/* =====================================================
   PRODUCT GRID
   ===================================================== */

.pmg-product-grid {

  position: relative;

  z-index: 5;

  display: grid;

  grid-template-columns:
    repeat(6, minmax(0, 1fr));

  gap: 11px;

  width: 100%;

  margin:
    0 auto
    12px;
}


/* =====================================================
   PRODUCT CARD
   ===================================================== */

.pmg-product-card {

  position: relative;

  min-width: 0;

  height: 245px;

  overflow: hidden;

  padding: 0;

  display: flex;

  flex-direction: column;

  justify-content: space-between;

  border:
    1px solid
    rgba(255,255,255,.15);

  border-radius: 14px;

  background:
    linear-gradient(
      145deg,
      rgba(11,45,34,.82),
      rgba(2,23,17,.98)
    );

  color: white;

  cursor: pointer;

  text-align: left;

  transition:
    transform .28s ease,
    border-color .28s ease,
    box-shadow .28s ease;
}


.pmg-product-card:hover {

  transform:
    translateY(-5px);

  border-color:
    rgba(156,255,0,.62);

  box-shadow:
    0 18px 38px
    rgba(0,0,0,.32),
    0 0 25px
    rgba(156,255,0,.08);
}


/* =====================================================
   PRODUCT CARD IMAGE
   ===================================================== */

.pmg-product-card-image {

  position: relative;

  width: 100%;

  height: 190px;

  display: flex;

  align-items: center;

  justify-content: center;

  overflow: hidden;
}


.pmg-product-card-glow {

  position: absolute;

  width: 150px;
  height: 100px;

  left: 50%;
  bottom: -15px;

  transform:
    translateX(-50%);

  border-radius: 50%;

  background:
    rgba(110,210,70,.13);

  filter:
    blur(24px);
}


.pmg-product-card-image img {

  position: relative;

  z-index: 2;

  width: 100%;
  height: 100%;

  object-fit: contain;

  padding:
    8px;

  filter:
    drop-shadow(
      0 15px 17px
      rgba(0,0,0,.43)
    );

  transition:
    transform .35s ease;
}


.pmg-product-card:hover
.pmg-product-card-image img {

  transform:
    scale(1.07)
    translateY(-4px);
}


/* =====================================================
   PRODUCT CARD FOOTER
   ===================================================== */

.pmg-product-card-footer {

  position: relative;

  z-index: 4;

  min-height: 55px;

  padding:
    7px 10px;

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 7px;

  border-top:
    1px solid
    rgba(255,255,255,.09);

  background:
    rgba(0,10,7,.55);

  backdrop-filter:
    blur(6px);
}


.pmg-product-card-name {

  min-width: 0;

  display: flex;

  align-items: center;

  gap: 8px;

  color: white;

  font-size: 10px;

  font-weight: 900;
}


.pmg-product-card-name
> span:last-child {

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;
}


.pmg-product-card-icon {

  width: 30px;
  height: 30px;

  flex: 0 0 30px;

  display: grid;

  place-items: center;

  border:
    1px solid
    rgba(156,255,0,.65);

  border-radius: 50%;

  color:
    var(--pmg-green);

  font-size: 9px;
}


.pmg-product-card-arrow {

  width: 30px;
  height: 30px;

  flex: 0 0 30px;

  display: grid;

  place-items: center;

  border-radius: 50%;

  background:
    var(--pmg-green);

  color:
    #06180e;

  font-size: 10px;

  transition:
    transform .25s ease;
}


.pmg-product-card:hover
.pmg-product-card-arrow {

  transform:
    translateX(2px);
}


/* =====================================================
   VIEW ALL
   ===================================================== */

.pmg-outline-light-btn {

  min-width: 278px;

  min-height: 48px;

  margin:
    0 auto;

  padding:
    0 25px;

  display: flex;

  align-items: center;

  justify-content: center;

  gap: 11px;

  border:
    1px solid
    rgba(156,255,0,.62);

  border-radius: 9px;

  background:
    rgba(2,25,18,.40);

  color: white;

  cursor: pointer;

  font-size: 11px;

  font-weight: 900;

  text-transform: uppercase;

  transition:
    background .25s ease,
    color .25s ease,
    transform .25s ease,
    box-shadow .25s ease;
}


.pmg-outline-light-btn svg {

  color:
    var(--pmg-green);

  transition:
    transform .25s ease;
}


.pmg-outline-light-btn:hover {

  background:
    var(--pmg-green);

  color:
    #031b13;

  transform:
    translateY(-2px);

  box-shadow:
    0 12px 28px
    rgba(156,255,0,.15);
}


.pmg-outline-light-btn:hover svg {

  color:
    #031b13;

  transform:
    translateX(4px);
}


/* =====================================================
   PRODUCT SECTION RESPONSIVE
   ===================================================== */

@media (max-width: 1250px) {

  .pmg-products-hero {

    grid-template-columns:
      45%
      55%;
  }


  .pmg-products-benefits {

    grid-template-columns:
      repeat(2, 1fr);

    max-width: 450px;

    gap: 12px;
  }


  .pmg-product-grid {

    grid-template-columns:
      repeat(3, 1fr);
  }

}


@media (max-width: 900px) {

  .pmg-products-hero {

    grid-template-columns:
      1fr;

    padding-top: 20px;
  }


  .pmg-products-copy {

    text-align: center;

    padding-bottom: 0;
  }


  .pmg-products-copy > p {

    margin-left: auto;
    margin-right: auto;
  }


  .pmg-products-benefits {

    margin:
      0 auto;

    text-align: left;
  }


  .pmg-products-showcase {

    height: 350px;
  }


  .pmg-showcase-image {

    width: 100%;
  }

}


@media (max-width: 768px) {

  .pmg-products-section {

    padding:
      55px 5%
      30px;
  }


  .pmg-products-hero {

    min-height: auto;
  }


  .pmg-products-copy h2 {

    font-size:
      clamp(48px, 13vw, 68px);
  }


  .pmg-products-copy > p {

    font-size: 12px;
  }


  .pmg-products-benefits {

    grid-template-columns:
      1fr 1fr;

    gap: 15px 10px;
  }


  .pmg-products-showcase {

    height: 300px;

    margin-top: 5px;
  }


  .pmg-product-grid {

    grid-template-columns:
      1fr 1fr;

    gap: 9px;
  }


  .pmg-product-card {

    height: 225px;
  }


  .pmg-product-card-image {

    height: 170px;
  }

}


@media (max-width: 420px) {

  .pmg-products-benefits {

    grid-template-columns:
      1fr;
  }


  .pmg-products-showcase {

    height: 260px;
  }


  .pmg-product-grid {

    grid-template-columns:
      1fr;
  }


  .pmg-product-card {

    height: 250px;
  }


  .pmg-product-card-image {

    height: 195px;
  }

}



        /* =====================================================
           ABOUT
           ===================================================== */

        .pmg-about-section {
          max-width: 1300px;

          margin: 0 auto;

          padding:
            110px 5%;

          display: grid;

          grid-template-columns:
            1.15fr .85fr;

          gap: 80px;

          align-items: center;

          background:
            #f5f6f2;
        }


        .pmg-kicker {
          color:
            #5e9d29;

          font-size: 11px;

          font-weight: 900;

          letter-spacing: 2.5px;
        }


        .pmg-about-content h2 {
          margin:
            12px 0
            22px;

          color:
            #10291e;

          font-size:
            clamp(40px, 5vw, 65px);

          line-height: .95;

          letter-spacing: -2px;
        }


        .pmg-about-content h2 strong {
          color:
            #69ad28;
        }


        .pmg-about-content > p {
          max-width: 590px;

          margin:
            0 0
            15px;

          color:
            #65736b;

          font-size: 14px;

          line-height: 1.8;
        }


        .pmg-about-checks {
          margin-top: 28px;

          display: grid;

          grid-template-columns:
            repeat(2, 1fr);

          gap: 13px;
        }


        .pmg-about-checks div {
          display: flex;

          align-items: center;

          gap: 9px;

          color:
            #244132;

          font-size: 12px;

          font-weight: 700;
        }


        .pmg-about-checks svg {
          color:
            #6db529;

          font-size: 10px;
        }


        .pmg-about-card {
          position: relative;

          min-height: 470px;

          overflow: hidden;

          padding: 45px;

          border-radius: 24px;

          display: flex;

          flex-direction: column;

          justify-content: flex-end;

          background:
            radial-gradient(
              circle at 50% 20%,
              rgba(86,191,75,.28),
              transparent 45%
            ),
            linear-gradient(
              145deg,
              #092c1e,
              #03150e
            );

          color: white;

          box-shadow:
            0 25px 70px
            rgba(7,38,24,.18);
        }


/* =====================================================
   ABOUT CARD
   ===================================================== */

.pmg-about-card {
  position: relative;

  width: 100%;
  height: 590px;

  overflow: hidden;

  padding: 32px 32px 42px;

  border-radius: 24px;

  display: flex;
  flex-direction: column;
  justify-content: flex-end;

  background:
    linear-gradient(
      145deg,
      #092c1e,
      #03150e
    );

  color: white;

  box-shadow:
    0 25px 70px
    rgba(7,38,24,.18);
}


/* =====================================================
   ABOUT CARD IMAGE
   ===================================================== */

.pmg-about-image {
  position: absolute;

  top: 0;
  left: 0;

  width: 100%;
  height: 100%;

  object-fit: cover;

  /*
    This is the important part.
    It makes the image behave like
    the first screenshot.
  */
  object-position: center center;

  z-index: 0;

  transform: scale(1.01);

  filter:
    drop-shadow(
      0 18px 20px
      rgba(0,0,0,.35)
    );

  transition:
    transform .4s ease;
}


/* =====================================================
   IMAGE OVERLAY
   ===================================================== */

.pmg-about-image-overlay {
  position: absolute;

  inset: 0;

  z-index: 1;

  pointer-events: none;

  background:
    linear-gradient(
      to bottom,
      rgba(1,21,14,.05) 0%,
      rgba(1,21,14,.02) 42%,
      rgba(1,21,14,.45) 62%,
      rgba(1,21,14,.94) 86%,
      #03150e 100%
    );
}


/* =====================================================
   CARD GLOW
   ===================================================== */

.pmg-about-card-glow {
  position: absolute;

  width: 260px;
  height: 260px;

  top: -80px;
  right: -70px;

  border-radius: 50%;

  background:
    rgba(156,255,0,.12);

  filter: blur(30px);

  z-index: 1;

  pointer-events: none;
}

/* =====================================================
   PMG LABEL
   ===================================================== */

.pmg-about-card > span {
  position: relative;

  z-index: 3;

  margin-bottom: 10px;

  color:
    rgba(255,255,255,.58);

  font-size: 12px;

  font-weight: 900;

  letter-spacing: 3px;
}


/* =====================================================
   CARD HEADING
   ===================================================== */

.pmg-about-card h3 {
  position: relative;

  z-index: 3;

  margin: 0;

  font-size:
    clamp(36px, 4vw, 48px);

  line-height: .92;

  letter-spacing: -1px;

  font-weight: 950;
}


.pmg-about-card h3 strong {
  color:
    var(--pmg-green);

  font-style: italic;
}


        /* =====================================================
           CONTACT
           ===================================================== */

/* =====================================================
   CONTACT + FOOTER
   ===================================================== */

.pmg-contact-section {
  position: relative;

  padding:
    78px
    max(5%, calc((100% - 1380px) / 2))
    28px;

  overflow: hidden;

  background:
    radial-gradient(
      circle at 82% 12%,
      rgba(91,174,62,.16),
      transparent 32%
    ),
    radial-gradient(
      circle at 12% 90%,
      rgba(156,255,0,.05),
      transparent 30%
    ),
    linear-gradient(
      135deg,
      #011510 0%,
      #031b13 55%,
      #02140f 100%
    );

  color: white;
}


/* =====================================================
   CONTACT TOP
   ===================================================== */

.pmg-contact-inner {
  position: relative;

  display: grid;

  grid-template-columns:
    minmax(0, .95fr)
    minmax(0, 1.05fr);

  gap: 65px;

  align-items: center;

  padding-bottom: 68px;
}


/* =====================================================
   CONTACT LEFT TEXT
   ===================================================== */

.pmg-contact-copy > span {
  color:
    var(--pmg-green);

  font-size: 11px;

  font-weight: 900;

  letter-spacing: 3px;
}


.pmg-contact-copy h2 {
  margin:
    13px 0
    20px;

  max-width: 650px;

  color: white;

  font-size:
    clamp(46px, 5vw, 72px);

  line-height: .94;

  letter-spacing: -2.5px;

  font-weight: 900;
}


.pmg-contact-copy h2 strong {
  color:
    var(--pmg-green);

  font-style: italic;
}


.pmg-contact-copy p {
  max-width: 560px;

  margin: 0;

  color:
    rgba(255,255,255,.58);

  font-size: 15px;

  line-height: 1.7;
}


/* =====================================================
   CONTACT CARDS
   ===================================================== */

.pmg-contact-info {
  display: grid;

  grid-template-columns:
    1fr 1fr;

  gap: 14px;
}


.pmg-contact-info a {
  min-height: 112px;

  padding:
    20px 24px;

  display: flex;

  align-items: center;

  gap: 20px;

  border:
    1px solid
    rgba(255,255,255,.11);

  border-radius: 15px;

  background:
    linear-gradient(
      145deg,
      rgba(12,49,37,.48),
      rgba(3,28,21,.56)
    );

  color: white;

  text-decoration: none;

  box-shadow:
    inset 0 1px 0
    rgba(255,255,255,.025);

  transition:
    transform .25s ease,
    border-color .25s ease,
    background .25s ease,
    box-shadow .25s ease;
}


.pmg-contact-info a:hover {
  transform:
    translateY(-3px);

  border-color:
    rgba(156,255,0,.34);

  background:
    linear-gradient(
      145deg,
      rgba(15,58,42,.60),
      rgba(4,31,23,.68)
    );

  box-shadow:
    0 14px 32px
    rgba(0,0,0,.18);
}


/* =====================================================
   CONTACT ICON
   ===================================================== */

.pmg-contact-icon {
  width: 58px;
  height: 58px;

  flex:
    0 0 58px;

  display: grid;

  place-items: center;

  border:
    1px solid
    rgba(156,255,0,.35);

  border-radius: 50%;

  color:
    var(--pmg-green);

  background:
    rgba(156,255,0,.025);

  font-size: 21px;

  box-shadow:
    0 0 20px
    rgba(156,255,0,.035);
}


.pmg-contact-info a > div {
  min-width: 0;

  display: flex;

  flex-direction: column;

  gap: 6px;
}


.pmg-contact-info a > div > span {
  color:
    var(--pmg-green);

  font-size: 9px;

  font-weight: 900;

  letter-spacing: 2px;
}


.pmg-contact-info a strong {
  display: block;

  color: white;

  font-size: 16px;

  line-height: 1.25;

  font-weight: 900;

  white-space: nowrap;
}


/* =====================================================
   FOOTER LINK AREA
   ===================================================== */

.pmg-footer-links {
  display: grid;

  grid-template-columns:
    1.45fr
    1fr
    1.15fr
    .95fr
    1.05fr;

  gap: 0;

  padding:
    40px 0
    42px;

  border-top:
    1px solid
    rgba(255,255,255,.09);

  border-bottom:
    1px solid
    rgba(255,255,255,.09);
}


/* =====================================================
   FOOTER BRAND
   ===================================================== */

.pmg-footer-brand {
  padding-right: 42px;
}


.pmg-footer-brand img {
  width: 135px;
  height: auto;
  display: block;
  margin-bottom: 24px;
  object-fit: contain;
}


.pmg-footer-brand p {
  max-width: 260px;

  margin: 0;

  color:
    rgba(255,255,255,.58);

  font-size: 12px;

  line-height: 1.75;
}


/* =====================================================
   FOOTER COLUMNS
   ===================================================== */

.pmg-footer-column {
  min-width: 0;

  padding:
    0 28px;

  border-left:
    1px solid
    rgba(255,255,255,.08);

  display: flex;

  flex-direction: column;

  align-items: flex-start;

  gap: 8px;
}


.pmg-footer-column h3 {
  position: relative;

  margin:
    0 0 10px;

  padding-bottom: 8px;

  color: white;

  font-size: 16px;

  line-height: 1.2;

  font-weight: 900;
}


.pmg-footer-column h3::after {
  content: "";

  position: absolute;

  left: 0;

  bottom: 0;

  width: 28px;

  height: 2px;

  border-radius: 999px;

  background:
    var(--pmg-green);
}


.pmg-footer-column a {
  color:
    rgba(255,255,255,.62);

  font-size: 11px;

  line-height: 1.45;

  text-decoration: none;

  transition:
    color .2s ease,
    transform .2s ease;
}


.pmg-footer-column a:hover {
  color:
    var(--pmg-green);

  transform:
    translateX(3px);
}


/* =====================================================
   FOOTER BOTTOM
   ===================================================== */

.pmg-footer-bottom {
  padding-top: 20px;

  display: flex;

  justify-content: space-between;

  align-items: center;

  gap: 15px;

  color:
    rgba(255,255,255,.34);

  font-size: 10px;
}


        /* =====================================================
           REVEAL
           ===================================================== */

        .pmg-reveal {
          opacity: 0;

          transform:
            translateY(25px);

          transition:
            opacity .7s ease,
            transform .7s ease;
        }


        .pmg-visible {
          opacity: 1;

          transform:
            translateY(0);
        }


        /* =====================================================
           TABLET
           ===================================================== */

        @media (max-width: 1250px) {

.pmg-services-grid {
  position: relative;
  z-index: 2;

  width: 100%;
  max-width: 1450px;

  margin: 0 auto;

  display: grid;

  grid-template-columns:
    repeat(3, minmax(0, 1fr));

  align-items: start;

  gap: 20px;
}
.pmg-service-card {
  position: relative;
  min-width: 0;

  height: auto;
  min-height: 0;


        @media (max-width: 1100px) {

          .pmg-hero-inner {
            grid-template-columns:
              48% 52%;
          }


          .pmg-hero-title {
            font-size:
              clamp(46px, 5.8vw, 70px);
          }


          .pmg-hero-product {
            height: 570px;
          }


          .pmg-hero-carousel {
            height: 510px;
          }


          .pmg-hero-slide {
            width: 480px;
            height: 450px;
          }


          .pmg-services-grid {
            grid-template-columns:
              repeat(3, 1fr);
          }


          .pmg-service-card {
            height: 390px;
          }


          .pmg-how-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }


          .pmg-features-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }

        }


        /* =====================================================
           MOBILE
           ===================================================== */

        @media (max-width: 768px) {

          .pmg-hero-product {
            width: 100%;

            height: 390px;

            margin-top: 10px;
          }


          .pmg-hero-product-glow {
            width: 350px;
            height: 350px;
          }


          .pmg-hero-carousel {
            height: 360px;
          }


          .pmg-hero-slide {
            width: min(390px, 76%);
            height: 335px;
          }


          .pmg-hero-slide.prev {
            left: 7%;
          }


          .pmg-hero-slide.next {
            left: 93%;
          }


          .pmg-hero-slide img {
            padding: 22px;
          }


          .pmg-hero-carousel-arrow {
            width: 42px;
            height: 42px;

            font-size: 24px;
          }


          .pmg-hero-carousel-arrow.left {
            left: 1%;
          }


          .pmg-hero-carousel-arrow.right {
            right: 1%;
          }


          /* SERVICES */

          .pmg-services-section {
            padding:
              55px 5%;
          }


          .pmg-services-grid {
            grid-template-columns:
              repeat(2, 1fr);

            gap: 18px;
          }


          .pmg-service-card {
            height: 350px;
          }


          .pmg-service-image {
            height: 190px;
          }


          .pmg-service-content {
            padding:
              11px
              12px
              14px;
          }


          .pmg-service-content h3 {
            font-size: 15px;
          }


          .pmg-service-content p {
            font-size: 10px;
          }


          .pmg-service-content button {
            font-size: 10px;
          }


          /* HOW */

          .pmg-how-section {
            padding:
              70px 5%;
          }


          .pmg-how-grid {
            grid-template-columns:
              1fr;

            gap: 10px;
          }


          .pmg-how-card {
            min-height: 150px;
          }


          .pmg-step-arrow {
            display: none;
          }


          /* PRODUCTS */

          .pmg-products-section {
            padding:
              70px 5%;
          }


          .pmg-product-grid {
            grid-template-columns:
              1fr 1fr;

            gap: 9px;
          }


          .pmg-product-card {
            min-height: 90px;

            padding: 14px;

            gap: 9px;
          }


          /* FEATURES */

          .pmg-features-section {
            padding:
              40px 5%;
          }


          .pmg-features-grid {
            grid-template-columns:
              1fr 1fr;

            gap:
              25px 12px;
          }


          .pmg-feature-item {
            align-items:
              flex-start;
          }


          .pmg-feature-icon {
            width: 35px;
            height: 35px;

            flex-basis: 35px;

            font-size: 12px;
          }


          .pmg-feature-item h3 {
            font-size: 9px;
          }


          .pmg-feature-item p {
            font-size: 8px;
          }


          /* ABOUT */

          .pmg-about-section {
            padding:
              75px 5%;

            display: flex;

            flex-direction: column;

            gap: 45px;
          }


          .pmg-about-content h2 {
            font-size: 45px;
          }


          .pmg-about-content > p {
            font-size: 13px;
          }


          .pmg-about-checks {
            grid-template-columns:
              1fr;
          }


          .pmg-about-card {
            width: 100%;

            min-height: 370px;

            padding: 32px;
          }


          .pmg-about-card > svg {
            top: 32px;
            left: 32px;
          }


          /* CONTACT */

         /* CONTACT */

.pmg-contact-section {
  padding:
    58px 5%
    20px;
}


.pmg-contact-inner {
  grid-template-columns:
    1fr;

  gap: 38px;

  padding-bottom: 50px;
}


.pmg-contact-copy h2 {
  font-size: 45px;
}


.pmg-contact-info {
  grid-template-columns:
    1fr;
}


.pmg-footer-links {
  grid-template-columns:
    repeat(2, 1fr);

  gap:
    34px 0;

  padding:
    35px 0
    38px;
}


.pmg-footer-brand {
  grid-column:
    1 / -1;

  padding-right: 0;
}


.pmg-footer-brand p {
  max-width: 420px;
}


.pmg-footer-column {
  padding:
    0 20px;
}


.pmg-footer-column:nth-child(2),
.pmg-footer-column:nth-child(4) {

  border-left: 0;
}


.pmg-footer-column:nth-child(3) {
  border-left:
    1px solid
    rgba(255,255,255,.08);
}


.pmg-footer-bottom {
  flex-direction:
    column;

  text-align:
    center;
}


        /* =====================================================
           SMALL PHONES
           ===================================================== */

        @media (max-width: 420px) {

          .pmg-hero-product {
            height: 330px;
          }


          .pmg-hero-product-glow {
            width: 290px;
            height: 290px;
          }


          .pmg-hero-carousel {
            height: 310px;
          }


          .pmg-hero-slide {
            width: 82%;
            height: 285px;

            border-radius: 14px;
          }


          .pmg-hero-slide.prev,
          .pmg-hero-slide.next {
            opacity: 0;
          }


          .pmg-hero-slide-label {
            min-height: 48px;

            padding:
              9px 12px;

            font-size: 10px;
          }


          .pmg-hero-carousel-arrow {
            width: 38px;
            height: 38px;

            font-size: 21px;
          }

        }
          

      `}</style>

      <div className="landing-page-wrapper">

        {/* =====================================================
            SCROLL PROGRESS
            ===================================================== */}

        <div
          className="home-scroll-progress"
          style={{
            transform:
              `scaleX(${scrollProgress})`,
          }}
        />


        {/* =====================================================
            HERO
            ===================================================== */}

        <header className="pmg-hero">

          <div className="pmg-hero-inner">

            <div className="pmg-hero-copy">

              <h1 className="pmg-hero-title">

                <span>We Print</span>

                <span>Your Vision</span>

                <span className="green">
                  To Life.
                </span>

              </h1>


              <p className="pmg-hero-description">
                High-quality custom prints and
                branding solutions for businesses,
                organizations, events, and personal
                projects.
              </p>


              <div className="pmg-hero-actions">

                <button
                  type="button"
                  className="pmg-primary-btn"
                  onClick={() =>
                    navigate(
                      "/product-overview"
                    )
                  }
                >
                  Get Started
                  <FaArrowRight />
                </button>


                <button
                  type="button"
                  className="pmg-secondary-btn"
                  onClick={() => {
                    const element =
                      document.getElementById(
                        "services"
                      );

                    if (element) {
                      element.scrollIntoView({
                        behavior: "smooth",
                      });
                    }
                  }}
                >
                  Our Services
                </button>

              </div>

            </div>


            <div className="pmg-hero-product">

              <div
                className=
                "pmg-hero-product-glow"
              />

              <div className="pmg-hero-carousel">

                {HERO_SLIDES.map((slide, index) => {
                  const previousIndex =
                    (heroSlide - 1 + HERO_SLIDES.length) %
                    HERO_SLIDES.length;

                  const nextIndex =
                    (heroSlide + 1) %
                    HERO_SLIDES.length;

                  let positionClass = "";

                  if (index === heroSlide) {
                    positionClass = "active";
                  } else if (index === previousIndex) {
                    positionClass = "prev";
                  } else if (index === nextIndex) {
                    positionClass = "next";
                  }

                  return (
                    <div
                      className=
                      {`pmg-hero-slide ${positionClass}`}
                      key={slide.label}
                    >

                      <img
                        src={slide.image}
                        alt={slide.alt}
                      />

                      <div className="pmg-hero-slide-label">
                        {slide.label}
                      </div>

                    </div>
                  );
                })}


                <button
                  type="button"
                  className=
                  "pmg-hero-carousel-arrow left"
                  aria-label="Previous featured product"
                  onClick={() =>
                    setHeroSlide(
                      (current) =>
                        (current - 1 + HERO_SLIDES.length) %
                        HERO_SLIDES.length
                    )
                  }
                >
                  ‹
                </button>


                <button
                  type="button"
                  className=
                  "pmg-hero-carousel-arrow right"
                  aria-label="Next featured product"
                  onClick={() =>
                    setHeroSlide(
                      (current) =>
                        (current + 1) %
                        HERO_SLIDES.length
                    )
                  }
                >
                  ›
                </button>


                <div
                  className="pmg-hero-carousel-dots"
                  aria-label="Featured products"
                >

                  {HERO_SLIDES.map((slide, index) => (
                    <button
                      key={slide.label}
                      type="button"
                      className=
                      {`pmg-hero-carousel-dot ${index === heroSlide
                        ? "active"
                        : ""
                        }`}
                      aria-label=
                      {`Show ${slide.label}`}
                      aria-current={
                        index === heroSlide
                          ? "true"
                          : undefined
                      }
                      onClick={() =>
                        setHeroSlide(index)
                      }
                    />
                  ))}

                </div>

              </div>

            </div>

          </div>

        </header>


        {/* =====================================================
            SERVICES
            ===================================================== */}

        <div className="pmg-reveal">
          <ServicesSection
            navigate={navigate}
          />
        </div>


        {/* =====================================================
            HOW TO ORDER
            ===================================================== */}

        <div className="pmg-reveal">
          <HowToOrderSection />
        </div>


        {/* =====================================================
            POPULAR PRODUCTS
            ===================================================== */}

        <div className="pmg-reveal">
          <PopularProductsSection
            navigate={navigate}
          />
        </div>


        {/* =====================================================
            ABOUT
            ===================================================== */}

        <div className="pmg-reveal">
          <AboutSection />
        </div>


        {/* =====================================================
            CONTACT
            ===================================================== */}

        <ContactSection />

      </div>
    </>
  );
}