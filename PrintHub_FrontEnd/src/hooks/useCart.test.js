import { renderHook } from "@testing-library/react";
import React from "react";
import { useCart } from "./useCart";
import { CartProvider } from "../contexts/CartContext";

describe("useCart hook tests", () => {
  // Tests hook error when used outside CartProvider
  test("throws an error when used outside of CartProvider", () => {
    // Suppress console.error output for expected error thrown by hook
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    
    expect(() => renderHook(() => useCart())).toThrow(
      "useCart must be used within a CartProvider"
    );

    consoleSpy.mockRestore();
  });

  // Tests hook success when wrapped with CartProvider
  test("returns the cart context when inside CartProvider", () => {
    const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;
    const { result } = renderHook(() => useCart(), { wrapper });

    expect(result.current).toHaveProperty("cartItems");
    expect(result.current).toHaveProperty("addToCart");
    expect(result.current).toHaveProperty("removeFromCart");
    expect(result.current).toHaveProperty("updateQuantity");
    expect(result.current).toHaveProperty("clearCart");
  });
});
