import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import MobileFooterNav from "./MobileFooterNav";
import { CartContext } from "../contexts/CartContext";

const mockNavigate = jest.fn();
let mockLocation = { pathname: "/user-home" };

// Mock react-router-dom virtually to avoid Jest ESM resolve issues
jest.mock(
  "react-router-dom",
  () => ({
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  }),
  { virtual: true }
);

// Helper renderer that provides custom cart context wrapper
function renderMobileFooterNav(cartItems = []) {
  const mockContext = {
    cartItems,
    addToCart: jest.fn(),
    removeFromCart: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
  };

  return render(
    <CartContext.Provider value={mockContext}>
      <MobileFooterNav />
    </CartContext.Provider>
  );
}

describe("MobileFooterNav component tests with mocked react-router-dom", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockLocation = { pathname: "/user-home" };
  });

  // Tests component tab labels existence
  test("renders all 5 tabs: Home, Shop, Cart, Orders, and Profile", () => {
    renderMobileFooterNav();

    expect(screen.getByRole("button", { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /shop/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cart/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /orders/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /profile/i })).toBeInTheDocument();
  });

  // Tests active page styling highlights on specific tabs
  test("highlights the active tab based on route pathname matching", () => {
    mockLocation = { pathname: "/user-home" };
    const { rerender } = renderMobileFooterNav([]);
    
    const homeTab = screen.getByRole("button", { name: /home/i });
    expect(homeTab.className).toContain("mfn-tab--active");

    mockLocation = { pathname: "/product-overview" };
    rerender(
      <CartContext.Provider value={{ cartItems: [] }}>
        <MobileFooterNav />
      </CartContext.Provider>
    );
    const shopTab = screen.getByRole("button", { name: /shop/i });
    expect(shopTab.className).toContain("mfn-tab--active");
  });

  // Tests item badge count logic with standard quantities
  test("displays a badge showing sum of items quantity in cart", () => {
    const items = [
      { id: 1, qty: 3, price: 10 },
      { id: 2, qty: 5, price: 20 },
    ];

    renderMobileFooterNav(items);

    const badge = screen.getByText("8");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toBe("mfn-badge");
  });

  // Tests clicking on tab triggers navigation
  test("triggers navigate function on tab button click", () => {
    renderMobileFooterNav();

    const shopTab = screen.getByRole("button", { name: /shop/i });
    fireEvent.click(shopTab);

    expect(mockNavigate).toHaveBeenCalledWith("/product-overview");
  });
});
