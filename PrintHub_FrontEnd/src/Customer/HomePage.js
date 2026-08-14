import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaBoxes,
  FaTshirt,
  FaBullhorn,
  FaBoxOpen,
  FaImage,
  FaIdCard,
  FaBookOpen,
  FaStickyNote,
  FaFlag,
  FaShippingFast,
  FaAward,
  FaHeadphones,
  FaPrint,
  FaHeart,
} from "react-icons/fa";
import pmgWebsiteLogo from "../assets/brand/pmg-mark.png";
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
        <p>CUSTOM PRINTS, APPAREL, PACKAGING & SIGNAGE</p>
        <div className="pmg-splash-loading" aria-hidden="true">
          <span onAnimationEnd={onComplete} />
        </div>
      </div>
    </div>
  );
}

function ServicesSection() {
  const services = [
    {
      Icon: FaTshirt,
      title: "Custom Apparel",
      text: "T-shirts, hoodies, and jerseys with crisp print finishes",
      tone: "cyan",
    },
    {
      Icon: FaBullhorn,
      title: "Marketing Materials",
      text: "Business cards, flyers, and professional promotional items",
      tone: "violet",
    },
    {
      Icon: FaBoxOpen,
      title: "Packaging Design",
      text: "Custom boxes, labels, and branded product packaging",
      tone: "orange",
    },
    {
      Icon: FaImage,
      title: "Large Format",
      text: "Posters, banners, and outdoor tarpaulin displays",
      tone: "green",
    },
  ];

  return (
    <section className="home-services reveal-on-scroll">
      <div className="home-section-intro">
        <h2>Our Core Services</h2>
        <p>High-quality print solutions tailored for your business</p>
      </div>

      <div className="home-service-grid">
        {services.map((service) => (
          <article
            className={`home-service-card service-${service.tone}`}
            key={service.title}
          >
            <div className="service-spill" aria-hidden="true" />
            <div className="home-service-icon" aria-hidden="true">
              <service.Icon className="service-icon-svg" />
            </div>
            <h3>{service.title}</h3>
            <p>{service.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function PopularProductsSection({ navigate }) {
  const popular = [
    { label: "Business Cards", Icon: FaIdCard },
    { label: "T-Shirts", Icon: FaTshirt },
    { label: "Posters", Icon: FaImage },
    { label: "Notebooks", Icon: FaBookOpen },
    { label: "Stickers", Icon: FaStickyNote },
    { label: "Banners", Icon: FaFlag },
  ];

  return (
    <section className="home-popular reveal-on-scroll">
      <div className="home-section-intro dark">
        <h2>Popular Print Categories</h2>
        <p>Explore our most requested custom printing options</p>
      </div>

      <div className="home-popular-grid">
        {popular.map((item) => (
          <button
            type="button"
            key={item.label}
            className="home-popular-card"
            onClick={() => navigate("/product-overview")}
          >
            <span className="popular-icon" aria-hidden="true">
              <item.Icon className="popular-icon-svg" />
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      Icon: FaShippingFast,
      title: "Fast Turnaround",
      text: "Ready for pickup within 24-48 hours",
    },
    {
      Icon: FaAward,
      title: "Quality Guaranteed",
      text: "100% satisfaction or your money back",
    },
    {
      Icon: FaHeadphones,
      title: "24/7 Support",
      text: "We're here whenever you need us",
    },
  ];

  return (
    <section className="home-features reveal-on-scroll">
      <div className="home-feature-grid">
        {features.map((feature, index) => (
          <article
            className="home-feature-card"
            key={feature.title}
            style={{ "--card-delay": `${index * 0.12}s` }}
          >
            <span className="card-light" aria-hidden="true" />
            <div className="home-feature-icon" aria-hidden="true">
              <feature.Icon className="feature-icon-svg" />
            </div>
            <h3>{feature.title}</h3>
            <p>{feature.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [scrollProgress, setScrollProgress] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const container =
      document.querySelector(".app-content-scrollable") ||
      document.getElementById("landingScrollContainer");
    const handleScroll = () => {
      if (container) {
        const total = container.scrollHeight - container.clientHeight;
        const current = container.scrollTop;
        setScrollProgress(total > 0 ? current / total : 0);
      } else {
        const total =
          document.documentElement.scrollHeight - window.innerHeight;
        const current = window.scrollY;
        setScrollProgress(total > 0 ? current / total : 0);
      }
    };

    handleScroll();
    if (container) container.addEventListener("scroll", handleScroll);
    window.addEventListener("scroll", handleScroll);
    return () => {
      if (container) container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const revealItems = document.querySelectorAll(".reveal-on-scroll");
    if (!revealItems.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 },
    );

    revealItems.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [products]);

  useEffect(() => {
    if (location.state?.scrollTo) {
      const el = document.getElementById(location.state.scrollTo);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, [location]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(buildApiUrl("/api/products?limit=8"));
        if (!res.ok) throw new Error("Failed to load products");
        const data = await res.json();
        const list = (data.products || data).map((p) => ({
          id: p.id,
          name: p.name || p.title || "Untitled",
          images: p.images || [],
          price: p.price,
          stock: p.stock,
        }));
        setProducts(list);
      } catch (err) {
        setProducts([]);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="App landing-page-wrapper">
      <div
        className="home-scroll-progress"
        style={{ transform: `scaleX(${scrollProgress})` }}
      />

      {/* HERO */}
      <header className="App-header">
        <div className="hero-copy">
          <h1>
            <span className="hero-main-text">Print Your Ideas</span>
            <span className="hero-brand">With PMG</span>
          </h1>
          <p>
            High-precision custom prints, branded merchandise, and packaging
            built for businesses, events, and personal brands.
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="hero-cta"
              onClick={() => navigate("/product-overview")}
            >
              Explore Products <span aria-hidden="true">→</span>
            </button>
            <button
              type="button"
              className="hero-secondary-btn"
              onClick={() => navigate("/user-regis")}
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      <ServicesSection />

      <main className="main-content">
        {/* HOW TO ORDER */}
        <section className="howto-wrap reveal-on-scroll">
          <div className="home-section-intro howto-intro">
            <h2>Order Your Custom Prints in 6 Easy Steps</h2>
            <p>A simple, transparent process from initial design to final output.</p>
          </div>

          <div className="howto-box">
            <div className="howto-steps">
              {[
                {
                  step: "STEP 1",
                  title: "Choose your product",
                  text: "Select your desired print item, dimensions, and quantity.",
                },
                {
                  step: "STEP 2",
                  title: "Customize design",
                  text: "Upload your artwork or configure in our online customizer.",
                },
                {
                  step: "STEP 3",
                  title: "Quality check",
                  text: "We review specs to guarantee crisp, high-resolution output.",
                },
                {
                  step: "STEP 4",
                  title: "Precision printing",
                  text: "Your project enters production on professional machinery.",
                },
                {
                  step: "STEP 5",
                  title: "Secure payment",
                  text: "Complete checkout with trusted digital payment options.",
                },
                {
                  step: "STEP 6",
                  title: "Pickup or delivery",
                  text: "Receive your items via delivery or visit our shop.",
                },
              ].map((s, idx) => (
                <div className="howto-step" key={idx}>
                  <div className="howto-step-top">
                    <span className="howto-step-label">{s.step}</span>
                    {idx !== 5 && <span className="howto-arrow">▶</span>}
                  </div>
                  <div className="howto-step-indicator">
                    <div className="howto-step-circle">{idx + 1}</div>
                    {idx !== 5 && <div className="howto-step-connector" />}
                  </div>
                  <div className="howto-step-body">
                    <div className="howto-step-title">{s.title}</div>
                    <div className="howto-step-text">{s.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <PopularProductsSection navigate={navigate} />

        <FeaturesSection />

        {/* ABOUT */}
        <section className="about-showcase reveal-on-scroll" id="about">
          <div className="home-section-intro about-intro">
            <h2>About PMG Printing House</h2>
            <p>Your reliable commercial printing partner</p>
          </div>

          <div className="about-story-grid">
            <article className="about-story-card about-main-card">
              <span className="about-card-kicker">Why PMG</span>
              <div className="about-icon-container" aria-hidden="true">
                <FaPrint className="about-icon-svg" />
              </div>
              <h3>Built for fast, premium print work.</h3>
              <p>
                From single custom items to large production batches. Designed
                for businesses that demand quality without delay.
              </p>
              <div className="about-stat-grid">
                <span>
                  <strong>500+</strong> Projects Completed
                </span>
                <span>
                  <strong>24-48h</strong> Turnaround Ready
                </span>
                <span>
                  <strong>Full</strong> Shop Services
                </span>
              </div>
            </article>

            <article className="about-story-card">
              <span className="about-card-kicker">What We Print</span>
              <div className="about-icon-container" aria-hidden="true">
                <FaBoxes className="about-icon-svg" />
              </div>
              <h3>Our core products</h3>
              <div className="about-pill-cloud">
                {[
                  "Custom T-Shirts",
                  "Branded Mugs",
                  "Custom Notebooks",
                  "Stickers & Decals",
                  "Business Cards",
                  "Posters & Banners",
                ].map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </article>

            <article className="about-story-card">
              <span className="about-card-kicker">Our Commitment</span>
              <div className="about-icon-container" aria-hidden="true">
                <FaHeart className="about-icon-svg" />
              </div>
              <h3>Quality service & professional support.</h3>
              <div className="about-feature-grid">
                <span>Fast Turnaround</span>
                <span>Custom Solutions</span>
                <span>Direct Support</span>
                <span>Modern Equipment</span>
              </div>
            </article>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="contact-showcase" id="contact">
        <div className="home-section-intro contact-intro">
          <h2>Contact Us</h2>
          <p>Get in touch with PMG for inquiries and custom quotes.</p>
        </div>
        <div className="contact-links">
          <a href="tel:09389343337090">
            <span>Call</span>
            0938-934-3337
          </a>
          <a href="tel:09081858988091">
            <span>Call</span>
            0908-185-8988
          </a>
          <a href="tel:09122043818">
            <span>Call</span>
            0912-204-3818
          </a>
          <a href="mailto:pmg.prints@gmail.com">
            <span>Email</span>
            pmg.prints@gmail.com
          </a>
        </div>
      </footer>
    </div>
  );
}
