import React, { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaHome,
  FaStore,
  FaShoppingCart,
  FaListAlt,
  FaUserCircle,
} from "react-icons/fa";
import { useCart } from "../hooks/useCart";
import "./MobileFooterNav.css";

const TABS = [
  { id: "home", label: "Home", icon: FaHome, path: "/user-home" },
  { id: "shop", label: "Shop", icon: FaStore, path: "/product-overview" },
  { id: "cart", label: "Cart", icon: FaShoppingCart, path: "/user-cart" },
  { id: "orders", label: "Orders", icon: FaListAlt, path: "/user-orders" },
  {
    id: "profile",
    label: "Profile",
    icon: FaUserCircle,
    path: "/user-customize-profile",
  },
];

function MobileFooterNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartItems } = useCart();

  const cartCount = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.qty, 0),
    [cartItems],
  );

  const activeTab = TABS.find((tab) => {
    if (tab.id === "orders") {
      return (
        location.pathname === "/user-orders" ||
        location.pathname === "/user-inquiries"
      );
    }
    if (tab.id === "shop") {
      return (
        location.pathname === "/product-overview" ||
        location.pathname.startsWith("/product/")
      );
    }
    if (tab.id === "profile") {
      return (
        location.pathname === "/user-customize-profile" ||
        location.pathname === "/user-account-settings" ||
        location.pathname === "/user-password-security"
      );
    }
    return location.pathname === tab.path;
  })?.id;

  return (
    <nav className="mfn-nav" role="navigation" aria-label="Main navigation">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`mfn-tab${isActive ? " mfn-tab--active" : ""}`}
            onClick={() => navigate(tab.path)}
            aria-label={tab.label}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="mfn-icon-wrap">
              <Icon className="mfn-icon" />
              {tab.id === "cart" && cartCount > 0 && (
                <span className="mfn-badge">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </span>
            <span className="mfn-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default MobileFooterNav;
