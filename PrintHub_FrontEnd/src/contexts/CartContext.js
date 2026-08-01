import React, { createContext, useEffect, useMemo, useState } from "react";
import { buildApiUrl } from "../config/api";

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
  const customer = getCustomerUser();
  const userId = customer?.id ? Number(customer.id) : null;

  const persistLocal = (items) => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  };

  const loadServerCart = async () => {
    if (!userId) {
      setServerCartReady(false);
      return;
    }

    try {
      const res = await fetch(buildApiUrl(`/api/user/${userId}/cart`));
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

  const updateQuantity = async (itemId, newQty) => {
    const parsed = parseInt(newQty, 10);
    const finalQty = Number.isNaN(parsed) ? 1 : Math.floor(parsed);

    if (finalQty < 1) {
      removeFromCart(itemId);
      return;
    }

    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, qty: finalQty } : item,
      ),
    );

    if (userId && serverCartReady) {
      try {
        await fetch(buildApiUrl(`/api/user/${userId}/cart/${itemId}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qty: finalQty }),
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
