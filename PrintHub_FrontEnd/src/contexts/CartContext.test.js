import React, { useContext } from "react";
import { render, screen, act } from "@testing-library/react";
import { CartProvider, CartContext } from "./CartContext";

// Helper component to access and inspect cart context values in tests
function CartTestConsumer() {
  const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart } =
    useContext(CartContext);

  return (
    <div>
      <div data-testid="cart-count">{cartItems.length}</div>
      <ul data-testid="cart-items">
        {cartItems.map((item) => (
          <li key={item.id}>
            {item.title} - Qty: {item.qty} - Price: {item.price}
            <button
              data-testid={`remove-${item.id}`}
              onClick={() => removeFromCart(item.id)}
            >
              Remove
            </button>
            <button
              data-testid={`inc-${item.id}`}
              onClick={() => updateQuantity(item.id, item.qty + 1)}
            >
              Increment
            </button>
            <button
              data-testid={`dec-${item.id}`}
              onClick={() => updateQuantity(item.id, item.qty - 1)}
            >
              Decrement
            </button>
          </li>
        ))}
      </ul>
      <button
        data-testid="add-btn"
        onClick={() =>
          addToCart({
            productId: 123,
            title: "Test Product",
            price: 100,
          })
        }
      >
        Add Item
      </button>
      <button data-testid="clear-btn" onClick={clearCart}>
        Clear
      </button>
    </div>
  );
}

describe("CartContext integration tests", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  // Tests CartProvider mounting without crash
  test("CartProvider initializes empty cart when localStorage is empty", () => {
    render(
      <CartProvider>
        <CartTestConsumer />
      </CartProvider>
    );

    expect(screen.getByTestId("cart-count").textContent).toBe("0");
  });

  // Tests addition to cart
  test("adds a item to the cart using local state", async () => {
    render(
      <CartProvider>
        <CartTestConsumer />
      </CartProvider>
    );

    const addBtn = screen.getByTestId("add-btn");
    await act(async () => {
      addBtn.click();
    });

    expect(screen.getByTestId("cart-count").textContent).toBe("1");
    expect(screen.getByTestId("cart-items").textContent).toContain("Test Product");
  });

  // Tests item grouping/duplicate merge functionality
  test("groups duplicate items when added twice", async () => {
    render(
      <CartProvider>
        <CartTestConsumer />
      </CartProvider>
    );

    const addBtn = screen.getByTestId("add-btn");
    await act(async () => {
      addBtn.click();
    });
    await act(async () => {
      addBtn.click();
    });

    expect(screen.getByTestId("cart-count").textContent).toBe("1");
    expect(screen.getByTestId("cart-items").textContent).toContain("Qty: 2");
  });

  // Tests item removal
  test("removes items from cart", async () => {
    render(
      <CartProvider>
        <CartTestConsumer />
      </CartProvider>
    );

    const addBtn = screen.getByTestId("add-btn");
    await act(async () => {
      addBtn.click();
    });

    const removeBtn = screen.getByText("Remove");
    await act(async () => {
      removeBtn.click();
    });

    expect(screen.getByTestId("cart-count").textContent).toBe("0");
  });

  // Tests manual quantity modifications and decrement removal edge case
  test("handles quantity changes and deletes when quantity reaches zero", async () => {
    render(
      <CartProvider>
        <CartTestConsumer />
      </CartProvider>
    );

    const addBtn = screen.getByTestId("add-btn");
    await act(async () => {
      addBtn.click();
    });

    const incBtn = screen.getByText("Increment");
    await act(async () => {
      incBtn.click();
    });
    expect(screen.getByTestId("cart-items").textContent).toContain("Qty: 2");

    const decBtn = screen.getByText("Decrement");
    await act(async () => {
      decBtn.click();
    });
    expect(screen.getByTestId("cart-items").textContent).toContain("Qty: 1");

    await act(async () => {
      decBtn.click(); // should drop qty to 0 and remove
    });
    expect(screen.getByTestId("cart-count").textContent).toBe("0");
  });

  // Tests clearCart logic
  test("clears all items in the cart", async () => {
    render(
      <CartProvider>
        <CartTestConsumer />
      </CartProvider>
    );

    const addBtn = screen.getByTestId("add-btn");
    await act(async () => {
      addBtn.click();
    });

    const clearBtn = screen.getByTestId("clear-btn");
    await act(async () => {
      clearBtn.click();
    });

    expect(screen.getByTestId("cart-count").textContent).toBe("0");
  });
});
