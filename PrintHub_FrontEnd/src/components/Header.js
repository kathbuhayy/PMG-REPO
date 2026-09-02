import React, { useEffect, useRef, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  FaShoppingCart,
  FaUserCircle,
  FaKey,
  FaEdit,
  FaBoxOpen,
  FaFileInvoiceDollar,
  FaBars,
  FaTimes,
} from "react-icons/fa";

import { useCart } from "../hooks/useCart";
import "./Header.css";
import { buildApiUrl } from "../config/api";

import pmgNavLogo from "../assets/brand/pmg-logo-nav.png";
import pmgLogoBlack from "../assets/brand/pmg-logo-black.png";

function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const dropdownRef = useRef(null);

  const { cartItems } = useCart();

  const [user, setUser] = useState({
    name: "",
    email: "",
    avatarUrl: "",
  });

  /* =========================================================
     GET CUSTOMER USER
     ========================================================= */

  const getCustomerUser = () => {
    try {
      const stored = localStorage.getItem("user");

      if (!stored) return null;

      const parsed = JSON.parse(stored);

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

  /* =========================================================
     LOGGED-IN CUSTOMER
     ========================================================= */

  const isLoggedIn = getCustomerUser();

  /* =========================================================
     CART COUNT
     ========================================================= */

  const cartCount = useMemo(
    () =>
      cartItems.reduce(
        (acc, item) => acc + item.qty,
        0
      ),
    [cartItems]
  );

  /* =========================================================
     LOAD USER PROFILE
     ========================================================= */

  useEffect(() => {
    const u = getCustomerUser();

    if (!u?.id) return;

    setUser((prev) => ({
      ...prev,
      name: u.firstName || u.name || "",
      email: u.email || "",
    }));

    const fetchUserProfile = () => {
      fetch(buildApiUrl(`/api/user-profile/${u.id}`))
        .then(async (res) => {
          const contentType =
            res.headers.get("content-type");

          if (
            !contentType ||
            !contentType.includes("application/json")
          ) {
            throw new Error(
              `Non-JSON response (status ${res.status})`
            );
          }

          const data = await res.json();

          if (!res.ok) {
            throw new Error(
              data?.message ||
              "Failed to load profile"
            );
          }

          setUser((prev) => ({
            ...prev,
            name:
              data.name ||
              prev.name ||
              u.firstName ||
              "User",

            email:
              data.email ||
              u.email ||
              prev.email ||
              "",

            avatarUrl:
              data.avatar_url || "",
          }));
        })
        .catch((err) => {
          console.error(err);
        });
    };

    fetchUserProfile();

    const handleProfileUpdate = () => {
      fetchUserProfile();
    };

    window.addEventListener(
      "profileUpdated",
      handleProfileUpdate
    );

    return () => {
      window.removeEventListener(
        "profileUpdated",
        handleProfileUpdate
      );
    };
  }, []);

  /* =========================================================
     NAVBAR SCROLL EFFECT
     ========================================================= */

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    handleScroll();

    window.addEventListener(
      "scroll",
      handleScroll,
      {
        passive: true,
      }
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, []);

  /* =========================================================
     CLOSE MENUS WHEN CLICKING OUTSIDE
     ========================================================= */

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setIsProfileOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  /* =========================================================
     ACTIONS
     ========================================================= */

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();

    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);

    window.location.href = "/";
  };

  const handleLogoClick = () => {
    navigate(
      isLoggedIn
        ? "/user-home"
        : "/"
    );
  };

  const isActive = (paths) =>
    paths.includes(location.pathname);

  /* =========================================================
     NAVBAR
     ========================================================= */

  const lightNavbarPages = [
    "/about",
    "/contact",
    "/product-overview",
    "/user-orders",
    "/user-cart",
    "/user-password-security",
    "/user-customize-profile",
    "/user-payments",
    "/user-inquiries",
  ];

  const isLightNavbar =
    lightNavbarPages.includes(
      location.pathname
    );

  return (
    <nav
      className={`uh-nav ${location.pathname === "/" ||
          location.pathname === "/user-home" ||
          location.pathname === "/product-overview" ||
          location.pathname === "/user-orders" ||
          location.pathname === "/about" ||
          location.pathname === "/contact" ||
          location.pathname === "/user-cart" ||
          location.pathname === "/user-password-security" ||
          location.pathname === "/user-customize-profile" ||
          location.pathname === "/user-payments" ||
          location.pathname === "/user-inquiries"
          ? "uh-nav-home"
          : ""
        } ${isScrolled
          ? "uh-nav-scrolled"
          : ""
        } ${isLightNavbar
          ? "uh-nav-light"
          : "uh-nav-dark"
        }`}
    >

      {/* =====================================================
          LOGO
          ===================================================== */}

      <div className="uh-brand-row">
        <button
          className="uh-logo"
          type="button"
          onClick={handleLogoClick}
        >
          <span className="uh-logo-mark">
            <img
              src={isLightNavbar ? pmgLogoBlack : pmgNavLogo}
              alt="PMG Printing House"
            />
          </span>
        </button>
      </div>

      {/* =====================================================
          MAIN NAVIGATION
          ===================================================== */}

      <div
        className="uh-center-nav"
        aria-label="Main navigation"
      >

        {/* HOME */}

        <button
          className={`uh-nav-pill ${isActive([
            "/",
            "/user-home",
          ])
              ? "active"
              : ""
            }`}
          type="button"
          onClick={() =>
            navigate(
              isLoggedIn
                ? "/user-home"
                : "/"
            )
          }
        >
          <span>Home</span>
        </button>

        {/* PRODUCTS */}

        <button
          className={`uh-nav-pill ${isActive([
            "/product-overview",
          ])
              ? "active"
              : ""
            }`}
          type="button"
          onClick={() =>
            navigate(
              "/product-overview"
            )
          }
        >
          <span>Products</span>
        </button>

        {/* ORDERS */}

        <button
          className={`uh-nav-pill ${isActive([
            "/user-orders",
          ])
              ? "active"
              : ""
            }`}
          type="button"
          onClick={() =>
            navigate("/user-orders")
          }
        >
          <span>Orders</span>
        </button>

        {/* ABOUT */}

        <button
          className={`uh-link uh-desktop-only ${location.pathname === "/about"
              ? "active"
              : ""
            }`}
          type="button"
          onClick={() =>
            navigate("/about")
          }
        >
          About
        </button>

        {/* CONTACT */}

        <button
          className={`uh-link uh-desktop-only ${location.pathname === "/contact"
              ? "active"
              : ""
            }`}
          type="button"
          onClick={() =>
            navigate("/contact")
          }
        >
          Contact
        </button>

      </div>

      {/* =====================================================
          RIGHT SIDE
          ===================================================== */}

      <div className="uh-actions">

        {/* CART */}

        <button
          className="uh-icon-btn uh-cart-btn"
          type="button"
          title="Cart"
          onClick={() =>
            navigate("/user-cart")
          }
        >
          <FaShoppingCart />

          {cartCount > 0 && (
            <span className="uh-cart-badge">
              {cartCount}
            </span>
          )}
        </button>

        {/* MOBILE MENU */}

        <button
          className="uh-icon-btn uh-mobile-only"
          type="button"
          aria-label="Menu"
          onClick={() =>
            setIsMobileMenuOpen(
              (v) => !v
            )
          }
        >
          {isMobileMenuOpen ? (
            <FaTimes />
          ) : (
            <FaBars />
          )}
        </button>

        {/* PROFILE / LOGIN */}

        <div
          className="uh-profile-wrap"
          ref={dropdownRef}
        >

          {isLoggedIn ? (
            <>
              <button
                className="uh-profile"
                type="button"
                title="Account"
                onClick={() => {
                  setIsProfileOpen(
                    (v) => !v
                  );

                  setIsMobileMenuOpen(
                    false
                  );
                }}
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt="Profile"
                  />
                ) : (
                  <FaUserCircle />
                )}
              </button>

              {isProfileOpen && (
                <div className="uh-dropdown">

                  <div className="uh-dd-top">

                    <div className="uh-dd-avatar">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt="Profile"
                        />
                      ) : (
                        <span>
                          {user.name?.[0]?.toUpperCase() ||
                            "U"}
                        </span>
                      )}
                    </div>

                    <div className="uh-dd-info">

                      <div className="uh-dd-name">
                        {user.name ||
                          "User"}
                      </div>

                      <div className="uh-dd-email">
                        {user.email || ""}
                      </div>

                    </div>
                  </div>

                  <div className="uh-dd-menu">

                    <button
                      className="uh-dd-item"
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(
                          false
                        );

                        navigate(
                          "/user-password-security"
                        );
                      }}
                    >
                      <FaKey />

                      <span>
                        Passwords and security
                      </span>
                    </button>

                    <button
                      className="uh-dd-item"
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(
                          false
                        );

                        navigate(
                          "/user-customize-profile"
                        );
                      }}
                    >
                      <FaEdit />

                      <span>
                        Customize your profile
                      </span>
                    </button>

                    <button
                      className="uh-dd-item"
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(
                          false
                        );

                        navigate(
                          "/user-orders"
                        );
                      }}
                    >
                      <FaBoxOpen />

                      <span>
                        Orders
                      </span>
                    </button>

                    <button
                      className="uh-dd-item"
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(
                          false
                        );

                        navigate(
                          "/user-payments"
                        );
                      }}
                    >
                      <FaFileInvoiceDollar />

                      <span>
                        Payment logs & invoices
                      </span>
                    </button>

                    <button
                      className="uh-dd-item"
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(
                          false
                        );

                        navigate(
                          "/user-inquiries"
                        );
                      }}
                    >
                      <FaFileInvoiceDollar />

                      <span>
                        My Inquiries
                      </span>
                    </button>

                  </div>

                  <div className="uh-dd-divider" />

                  <div className="uh-dd-bottom">

                    <button
                      className="uh-dd-logout"
                      type="button"
                      onClick={
                        handleLogout
                      }
                    >
                      Logout
                    </button>

                  </div>
                </div>
              )}
            </>
          ) : (
            <button
              className="uh-login-btn"
              type="button"
              onClick={() =>
                navigate(
                  "/user-login",
                  {
                    state: {
                      from: `${location.pathname}${location.search}`,
                    },
                  }
                )
              }
            >
              Login
            </button>
          )}

          {/* =================================================
              MOBILE DROPDOWN
              ================================================= */}

          {isMobileMenuOpen && (
            <div className="uh-mobile-menu">

              <button
                className="uh-mobile-item"
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(
                    false
                  );

                  navigate(
                    isLoggedIn
                      ? "/user-home"
                      : "/"
                  );
                }}
              >
                Home
              </button>

              <button
                className="uh-mobile-item"
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(
                    false
                  );

                  navigate(
                    "/product-overview"
                  );
                }}
              >
                Products
              </button>

              <button
                className="uh-mobile-item"
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(
                    false
                  );

                  navigate(
                    "/user-orders"
                  );
                }}
              >
                Orders
              </button>

              {/* ABOUT */}

              <button
                className="uh-mobile-item"
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(
                    false
                  );

                  navigate("/about");
                }}
              >
                About
              </button>

              {/* CONTACT */}

              <button
                className="uh-mobile-item"
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(
                    false
                  );

                  navigate("/contact");
                }}
              >
                Contact
              </button>

            </div>
          )}

        </div>

      </div>
    </nav>
  );
}

export default Header;