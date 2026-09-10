//CartContext.js(outside the hooks)
import React, { createContext, useEffect, useMemo, useState } from "react";
import { buildApiUrl } from "../config/api";
import { getGuestDesignDraft, clearGuestDesignDraft } from "../utils/guestCustomization";


const CartContext = createContext();
const CART_STORAGE_KEY = "printHub_cart";

const getCustomerUser = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const role = String(user?.role || "").toLowerCase();
    if (!user?.id || role === "admin" || role === "staff" || role === "guest") {
      return null;
    }
    return user;
  } catch {
    return null;
  }
};


const normalizeMaterial = (material) =>
  material && typeof material === "object"
    ? {
        label: String(material.label || ""),
        price: String(material.price || ""),
      }
    : {
        label: material ? String(material) : "",
        price: "",
      };

const normalizeCartItem = (item) => {
  const productImage =
    item.productImage ||
    item.image ||
    item.product?.images?.[0] ||
    item.images?.[0] ||
    item.customizations?.design?.generatedImageUrl ||
    item.customizations?.imageUrl ||
    null;

  return {
    ...item,
    id: item.id,
    productId: item.productId,
    title: item.title || item.name || item.product?.name || "Product",
    name: item.name || item.title || item.product?.name || "Product",
    price: Number(item.price || 0),
    qty: Math.max(1, Number(item.qty || item.quantity || 1)),
    productImage,
    images: item.images || item.product?.images || (productImage ? [productImage] : []),
    customizations: {
      ...(item.customizations || {}),
      material: normalizeMaterial(item.customizations?.material),
    },
  };
};

const initializeCart = () => {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored).map(normalizeCartItem);
  } catch (e) {
    console.error("Failed to parse cart from localStorage:", e);
    return [];
  }
};

const buildCartPayload = (product) => {
  const {
    productId,
    title,
    name,
    price,
    size,
    sizeSurcharge,   // ADD
    isRushOrder,      // ADD
    rushOrderFee,     // ADD
    material,
    sides,
    finishing,
    quantity,
    design,
    images,
    productImage,
  } = product;

  const normalizedMaterial = normalizeMaterial(material);

  const qtyNumber = product.qty || quantity?.quantityNumber || 1;
  const unitPrice = qtyNumber > 0 ? (price / qtyNumber) : price;

  return normalizeCartItem({
    id: Date.now(),
    productId,
    title: title || name,
    name: name || title,
    price: unitPrice,
    qty: qtyNumber,
    productImage: productImage || images?.[0] || null,
    images,
    customizations: {
      size,
      sizeSurcharge: sizeSurcharge || 0,          // ADD
      isRushOrder: Boolean(isRushOrder),           // ADD
      rushOrderFee: rushOrderFee || 0,             // ADD
      material: normalizedMaterial,
      sides,
      finishing,
      quantity: quantity?.label || quantity,
      quantityPrice: quantity?.price,
      ...(design ? { design } : {}),
    },
  });
};

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(initializeCart());
  const [serverCartReady, setServerCartReady] = useState(false);

  // CartProvider wraps <BrowserRouter> in App.js, so client-side page
  // navigation (e.g. after login, via navigate() with no full reload)
  // never re-renders it on its own - a plain `const userId = ...` read
  // straight from localStorage would keep returning whatever it saw on
  // the last render that DID happen (typically null, from just after a
  // logout's hard reload), so the cart would silently keep loading
  // against the wrong/no user until something else forced a re-render
  // (a manual page refresh, which is exactly what "fixes" it). Tracking
  // it as state and refreshing it on a dedicated "userLoggedIn" event
  // (dispatched right after login writes localStorage) makes this
  // reactive instead of relying on an incidental re-render.
  const [userId, setUserId] = useState(() => {
    const customer = getCustomerUser();
    return customer?.id ? Number(customer.id) : null;
  });

  useEffect(() => {
    const refreshUserId = () => {
      const customer = getCustomerUser();
      setUserId(customer?.id ? Number(customer.id) : null);
    };
    window.addEventListener("userLoggedIn", refreshUserId);
    window.addEventListener("storage", refreshUserId);
    return () => {
      window.removeEventListener("userLoggedIn", refreshUserId);
      window.removeEventListener("storage", refreshUserId);
    };
  }, []);

  const persistLocal = (items) => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  };

  const loadServerCart = async () => {
    if (!userId) {
      setServerCartReady(false);
      return;
    }

    try {
      const guestDraft = getGuestDesignDraft();
    if (guestDraft) {
      try {
        await saveItemToServer(buildCartPayload(guestDraft));
      } catch (e) {
        console.error("Failed to restore guest design draft:", e);
      } finally {
        clearGuestDesignDraft();
      }
    }
      const res = await fetch(buildApiUrl(`/api/user/${userId}/cart`));

      if (res.status === 404) {
        console.warn("User not found (stale session). Logging out...");
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/user-login";
        return;
      }

      const cType = res.headers.get("content-type");

      if (!cType || !cType.includes("application/json")) {
        throw new Error(`Non-JSON response (status ${res.status})`);
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load cart");
      }

      const serverItems = Array.isArray(data)
        ? data.map(normalizeCartItem)
        : [];
      const localItems = initializeCart();

      if (serverItems.length === 0 && localItems.length > 0) {
        const migrated = [];

        for (const item of localItems) {
          const saved = await saveItemToServer(item);
          migrated.push(saved || item);
        }

        setCartItems(migrated.map(normalizeCartItem));
        persistLocal(migrated);
      } else {
        setCartItems(serverItems);
        persistLocal(serverItems);
      }

      setServerCartReady(true);
    } catch (e) {
      console.error("Failed to sync cart:", e);
      setServerCartReady(false);
    }
  };

  const saveItemToServer = async (item) => {
    if (!userId) return null;

    const res = await fetch(buildApiUrl(`/api/user/${userId}/cart`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });

    if (res.status === 404) {
      console.warn("User not found (stale session). Logging out...");
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/user-login";
      return null;
    }

    const cType = res.headers.get("content-type");

    if (!cType || !cType.includes("application/json")) {
      throw new Error(`Non-JSON response (status ${res.status})`);
    }

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to save cart item");
    }

    return normalizeCartItem(data);
  };

  useEffect(() => {
    loadServerCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    persistLocal(cartItems);
  }, [cartItems]);

  const addToCart = async (product) => {
    const item = buildCartPayload(product);

    if (userId) {
      try {
        await saveItemToServer(item);
        await loadServerCart();
        return;
      } catch (e) {
        console.error("Server cart add failed, using local cart:", e);
      }
    }

    setCartItems((prevItems) => {
      if (!item.customizations?.design) {
        const existingItem = prevItems.find(
          (prev) =>
            prev.productId === item.productId &&
            !prev.customizations?.design &&
            JSON.stringify(prev.customizations || {}) ===
              JSON.stringify(item.customizations || {}),
        );

        if (existingItem) {
          return prevItems.map((prev) =>
            prev.id === existingItem.id ? { ...prev, qty: prev.qty + 1 } : prev,
          );
        }
      }
      return [...prevItems, item];
    });
  };

  const removeFromCart = async (itemId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== itemId));

    if (userId && serverCartReady) {
      try {
        await fetch(buildApiUrl(`/api/user/${userId}/cart/${itemId}`), {
          method: "DELETE",
        });
      } catch (e) {
        console.error("Failed to remove server cart item:", e);
      }
    }
  };

  // Re-fetches the live formula price for one product+customization at a
  // given quantity, so bulk-discount tiers and design-scaled material cost
  // stay correct even when quantity is changed from the cart page rather
  // than the customizer. Returns null on any failure so the caller can
  // fall back to keeping the item's existing price rather than clearing it.
  const fetchUnitPriceForQuantity = async (item, quantity) => {
    if (!item.productId) return null;
    try {
      const res = await fetch(
        buildApiUrl(`/api/products/${item.productId}/estimate-price`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customizations: item.customizations || {},
            quantity,
          }),
        },
      );
      if (!res.ok) return null;
      const data = await res.json();
      return typeof data.unitPrice === "number" ? data.unitPrice : null;
    } catch (e) {
      console.error("Failed to re-estimate price for quantity change:", e);
      return null;
    }
  };

  const updateQuantity = async (itemId, newQty) => {
    const parsed = parseInt(newQty, 10);
    const finalQty = Number.isNaN(parsed) ? 1 : Math.floor(parsed);

    if (finalQty < 1) {
      removeFromCart(itemId);
      return;
    }

    const currentItem = cartItems.find((item) => item.id === itemId);

    // Optimistic update: apply the new quantity immediately so the UI
    // feels responsive, keeping the existing unit price until the fresh
    // estimate (which reflects any bulk-discount tier change) comes back.
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, qty: finalQty } : item,
      ),
    );

    const freshUnitPrice = currentItem
      ? await fetchUnitPriceForQuantity(currentItem, finalQty)
      : null;

    if (freshUnitPrice != null) {
      setCartItems((prevItems) =>
        prevItems.map((item) =>
          item.id === itemId
            ? { ...item, qty: finalQty, price: freshUnitPrice }
            : item,
        ),
      );
    }

    if (userId && serverCartReady) {
      try {
        await fetch(buildApiUrl(`/api/user/${userId}/cart/${itemId}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            qty: finalQty,
            ...(freshUnitPrice != null ? { price: freshUnitPrice } : {}),
          }),
        });
      } catch (e) {
        console.error("Failed to update server cart item:", e);
      }
    }
  };

  const clearCart = async () => {
    setCartItems([]);

    if (userId && serverCartReady) {
      try {
        await fetch(buildApiUrl(`/api/user/${userId}/cart`), {
          method: "DELETE",
        });
      } catch (e) {
        console.error("Failed to clear server cart:", e);
      }
    }
  };

  const value = useMemo(
    () => ({
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      refreshCart: loadServerCart,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cartItems, userId, serverCartReady],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export { CartContext };
