import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./User-cart.css";
import "./User-orders.css";
import {
  FaArrowLeft,
  FaTrash,
  FaMinus,
  FaPlus,
  FaShoppingBag,
} from "react-icons/fa";
import CheckoutModal from "./CheckoutModal";
import AlertModal from "../components/AlertModal";
import { useCart } from "../hooks/useCart";
import { buildApiUrl } from "../config/api";

function UserCartPage() {
  const navigate = useNavigate();
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCheckoutAuthModal, setShowCheckoutAuthModal] = useState(false);
  const { cartItems, removeFromCart, updateQuantity } = useCart();
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  // Stock lookup for out-of-stock validation
  const [productStockMap, setProductStockMap] = useState({});

  useEffect(() => {
    const fetchStocks = async () => {
      const productIds = [
        ...new Set(cartItems.map((it) => it.productId).filter(Boolean)),
      ];
      if (productIds.length === 0) return;

      const map = {};
      await Promise.all(
        productIds.map(async (id) => {
          try {
            const res = await fetch(buildApiUrl(`/api/products/${id}`));
            if (res.ok) {
              const data = await res.json();
              map[id] = Number(data.stock !== undefined ? data.stock : 1);
            }
          } catch (e) {
            console.error("Failed to fetch product stock:", e);
          }
        }),
      );
      setProductStockMap(map);
    };

    fetchStocks();
  }, [cartItems]);

  const hasOosItem = cartItems
    .filter((item) => selectedItemIds.includes(item.id))
    .some((item) => {
      const stockFromMap = productStockMap[item.productId];
      if (stockFromMap !== undefined) return stockFromMap === 0;
      return item.stock === 0 || item.product?.stock === 0;
    });

  // Local edit state for quantity inputs (keeps typing from immediately mutating global cart)
  const [editQtyMap, setEditQtyMap] = useState({});

  // Initialize local qty map when cart items change
  useEffect(() => {
    const next = {};
    const currentSelected = new Set(selectedItemIds);
    let selectionChanged = false;
    const newSelected = [];

    cartItems.forEach((it) => {
      next[it.id] = String(it.qty);
      if (currentSelected.has(it.id)) {
        newSelected.push(it.id);
      }
    });
    
    // By default, if nothing is selected and cart has items, select all
    if (cartItems.length > 0 && selectedItemIds.length === 0 && !selectionChanged) {
      setSelectedItemIds(cartItems.map((it) => it.id));
    } else if (newSelected.length !== selectedItemIds.length) {
      setSelectedItemIds(newSelected);
    }

    setEditQtyMap(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems]);

  const toggleSelection = (id) => {
    setSelectedItemIds((prev) => 
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItemIds.length === cartItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(cartItems.map((it) => it.id));
    }
  };

  const getStoredUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  };

  const storedUser = getStoredUser();
  const userRole = String(storedUser?.role || "").toLowerCase();
  const isCustomer = Boolean(
    storedUser?.id &&
    userRole !== "admin" &&
    userRole !== "staff" &&
    userRole !== "guest",
  );
  const userId = isCustomer ? parseInt(storedUser.id, 10) : null;

  const selectedItems = cartItems.filter((item) => selectedItemIds.includes(item.id));
  const subtotal = selectedItems.reduce(
    (acc, item) => acc + item.price * item.qty,
    0,
  );
  const total = subtotal;

  const formatPeso = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(n);

  // CART FUNCTIONS
  const updateQty = (id, newQty) => {
    updateQuantity(id, newQty);
  };

  const removeItem = (id) => {
    removeFromCart(id);
  };

  const handleCheckoutClick = () => {
    if (selectedItemIds.length === 0) {
      setAlertMessage("Please select at least one item to checkout.");
      setAlertOpen(true);
      return;
    }
    if (!isCustomer) {
      setShowCheckoutAuthModal(true);
      return;
    }
    setShowCheckout(true);
  };

  const handleCheckoutAuthConfirm = () => {
    setShowCheckoutAuthModal(false);
    navigate("/user-register");
  };

  // Only remove the items that were checked out, preserving un-selected cart items
  const handleCheckoutComplete = async (orderData) => {
    for (const item of selectedItems) {
      await removeFromCart(item.id);
    }
    setShowCheckout(false);
    navigate("/user-orders");
  };

  if (cartItems.length === 0 && !showCheckout) {
    return (
      <div>
        <div className="ucart-page fade-in-up">
          <div className="uo-top">
            <button
              className="uo-back"
              type="button"
              onClick={() => navigate(-1)}
            >
              <FaArrowLeft /> Back
            </button>
            <h1 className="uo-title">My Cart</h1>
            <p className="uo-subtitle">
              Your cart is empty. Start shopping to add custom print products.
            </p>
          </div>
          <div className="ucart-empty-wrap">
            <div className="ucart-empty-card">
              <div className="ucart-empty-icon">
                <FaShoppingBag />
              </div>
              <h2>Your cart is empty</h2>
              <p>Start adding products to your cart and they will appear here.</p>
              <button
                className="ucart-continue"
                type="button"
                onClick={() => navigate("/product-overview")}
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="ucart-page fade-in-up">
        {/* TOP BAR */}
        <div className="uo-top">
          <button
            className="uo-back"
            type="button"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft /> Back
          </button>
          <h1 className="uo-title">My Cart</h1>
          <p className="uo-subtitle">
            Review your selected print products and options before checkout.
          </p>
        </div>

        <div className="ucart-wrap">
          {/* Cart items */}
          <div className="ucart-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className="ucart-section-title" style={{ margin: 0 }}>
                Cart Items ({cartItems.length})
              </h2>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
                <input 
                  type="checkbox" 
                  checked={cartItems.length > 0 && selectedItemIds.length === cartItems.length}
                  onChange={toggleSelectAll}
                  style={{ marginRight: '8px', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                Select All
              </label>
            </div>

            {cartItems.map((item) => (
              <div key={item.id} className="ucart-item" style={{ alignItems: 'center' }}>
                <input 
                  type="checkbox" 
                  checked={selectedItemIds.includes(item.id)}
                  onChange={() => toggleSelection(item.id)}
                  style={{ marginRight: '16px', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <img
                  className="ucart-thumb"
                  src={
                    item.productImage ||
                    item.image ||
                    item.images?.[0] ||
                    "https://via.placeholder.com/70"
                  }
                  alt={item.name || item.title}
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://via.placeholder.com/70";
                  }}
                />
                <div className="ucart-info">
                  <div className="ucart-name">
                    {item.name || item.title}
                    {(item.stock === 0 ||
                      item.product?.stock === 0 ||
                      productStockMap[item.productId] === 0) && (
                      <span
                        style={{
                          marginLeft: "8px",
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "#dc2626",
                          background: "rgba(220, 38, 38, 0.1)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        Out of Stock
                      </span>
                    )}
                  </div>
                  {item.customizations && (
                    <div className="ucart-desc">
                      {[
                        item.customizations.quantity &&
                          `Quantity: ${item.customizations.quantity}`,
                        item.customizations.size &&
                          `Size: ${item.customizations.size}`,
                        item.customizations.material &&
                          `Material: ${
                            item.customizations.material?.label ||
                            item.customizations.material
                          }`,
                        item.customizations.finish &&
                          `Finish: ${item.customizations.finish}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  )}
                  <div className="ucart-price">{formatPeso(item.price)}</div>
                </div>
                <div className="ucart-controls">
                  <div className="ucart-qty">
                    <button
                      className="ucart-qty-btn"
                      type="button"
                      onClick={() => updateQty(item.id, Math.max(1, item.qty - 1))}
                    >
                      <FaMinus />
                    </button>
                    <input
                      className="ucart-qty-num"
                      type="number"
                      min="1"
                      value={editQtyMap[item.id] ?? item.qty}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditQtyMap((prev) => ({ ...prev, [item.id]: val }));
                      }}
                      onBlur={(e) => {
                        const num = parseInt(e.target.value, 10);
                        if (num >= 1) updateQty(item.id, num);
                        else
                          setEditQtyMap((prev) => ({
                            ...prev,
                            [item.id]: String(item.qty),
                          }));
                      }}
                    />
                    <button
                      className="ucart-qty-btn"
                      type="button"
                      onClick={() => updateQty(item.id, item.qty + 1)}
                    >
                      <FaPlus />
                    </button>
                  </div>
                  <button
                    className="ucart-remove"
                    type="button"
                    onClick={() => removeItem(item.id)}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order summary */}
          <div className="ucart-summary">
            <h2 className="ucart-section-title">Order Summary</h2>
            <div className="ucart-row">
              <span>Subtotal</span>
              <span>{formatPeso(subtotal)}</span>
            </div>
            <div className="ucart-divider" />
            <div className="ucart-total">
              <span>Total</span>
              <span>{formatPeso(total)}</span>
            </div>
            {hasOosItem && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#dc2626",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "600",
                  marginBottom: "14px",
                }}
              >
                One or more items in your cart are out of stock. Please remove
                them before checking out.
              </div>
            )}
            <button
              className="ucart-checkout"
              type="button"
              disabled={hasOosItem}
              onClick={handleCheckoutClick}
              style={
                hasOosItem
                  ? {
                      opacity: 0.5,
                      cursor: "not-allowed",
                      background: "#94a3b8",
                    }
                  : {}
              }
            >
              Proceed to Checkout
            </button>
            <button
              className="ucart-continue"
              type="button"
              onClick={() => navigate("/product-overview")}
            >
              Continue Shopping
            </button>
          </div>
        </div>

        {/* Checkout modal */}
        {showCheckout && (
          <CheckoutModal
            userId={userId}
            cartItems={selectedItems}
            total={total}
            subtotal={subtotal}
            onClose={() => setShowCheckout(false)}
            onSuccess={handleCheckoutComplete}
          />
        )}

        {/* Auth prompt modal */}
        {showCheckoutAuthModal && (
          <div className="ucart-auth-modal-overlay">
            <div className="ucart-auth-modal">
              <h2>Sign in to checkout</h2>
              <p>
                You need an account to place an order. Register or log in to
                continue.
              </p>
              <div className="ucart-auth-modal-actions">
                <button
                  className="ucart-auth-modal-cancel"
                  type="button"
                  onClick={() => setShowCheckoutAuthModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="ucart-auth-modal-primary"
                  type="button"
                  onClick={handleCheckoutAuthConfirm}
                >
                  Register / Login
                </button>
              </div>
            </div>
          </div>
        )}
        
        <AlertModal 
          isOpen={alertOpen} 
          message={alertMessage} 
          onClose={() => setAlertOpen(false)} 
        />
      </div>
    </div>
  );
}

export default UserCartPage;
