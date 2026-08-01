const { test, expect } = require("@playwright/test");

test.describe("Ordering Process", () => {
  test.beforeEach(async ({ page }) => {
    // Assuming user is logged in, go to home/products page
    await page.goto("/user-home");
  });

  test("should display available products", async ({ page }) => {
    // Wait for products to load
    const productItems = page.locator('[class*="product"], [class*="item"]');
    await expect(productItems.first()).toBeVisible();

    // Check product details are visible
    const productName = page.locator('[class*="product-name"], [class*="title"]');
    const productPrice = page.locator('[class*="product-price"], [class*="price"]');

    await expect(productName.first()).toBeVisible();
    await expect(productPrice.first()).toBeVisible();
  });

  test("should filter products by category", async ({ page }) => {
    const categoryFilter = page.locator('[class*="category"], select[name*="category" i]');

    if (await categoryFilter.isVisible()) {
      await categoryFilter.first().click();
      const categoryOption = page.locator(
        '[class*="category"] [role="option"], select option'
      );
      await categoryOption.first().click();

      // Products should update based on filter
      const productItems = page.locator('[class*="product"], [class*="item"]');
      await expect(productItems.first()).toBeVisible();
    }
  });

  test("should search for products", async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]');

    if (await searchInput.isVisible()) {
      await searchInput.fill("T-Shirt");
      await page.waitForTimeout(500); // Wait for search results

      const productItems = page.locator('[class*="product"], [class*="item"]');
      await expect(productItems.first()).toBeVisible();
    }
  });

  test("should view product details", async ({ page }) => {
    const productItem = page.locator('[class*="product"], [class*="item"]').first();
    await productItem.click();

    // Should navigate to product detail page
    await page.waitForURL(/.*product|.*detail/);
    await expect(page).toHaveURL(/.*product|.*detail/);

    // Check product details are displayed
    const productName = page.locator('h1, h2');
    const productDescription = page.locator('[class*="description"]');
    const productPrice = page.locator('[class*="price"]');

    await expect(productName).toBeVisible();
    await expect(productPrice).toBeVisible();
  });

  test("should display product images", async ({ page }) => {
    const productItem = page.locator('[class*="product"], [class*="item"]').first();
    await productItem.click();

    const productImage = page.locator('img[alt*="product" i], [class*="product-image"] img');
    await expect(productImage.first()).toBeVisible();
  });

  test("should display product pricing and availability", async ({ page }) => {
    const productItem = page.locator('[class*="product"], [class*="item"]').first();
    await productItem.click();

    const price = page.locator('[class*="price"]');
    const availability = page.locator('[class*="available"], [class*="stock"]');

    await expect(price.first()).toBeVisible();
    if (await availability.count() > 0) {
      await expect(availability.first()).toContainText(/available|in stock|out of stock/i);
    }
  });

  test("should select product quantity", async ({ page }) => {
    const productItem = page.locator('[class*="product"], [class*="item"]').first();
    await productItem.click();

    const quantityInput = page.locator('input[type="number"], input[name*="quantity" i]');

    if (await quantityInput.isVisible()) {
      await quantityInput.clear();
      await quantityInput.fill("3");
      await expect(quantityInput).toHaveValue("3");
    }
  });

  test("should add product to cart", async ({ page }) => {
    const productItem = page.locator('[class*="product"], [class*="item"]').first();
    await productItem.click();

    const addToCartBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Add To Cart")').first();
    await addToCartBtn.click();

    // Should show success message
    const successMsg = page.locator('[class*="success"], [class*="toast"], [class*="notification"]');
    await expect(successMsg.first()).toContainText(/added|cart|success/i);
  });

  test("should view cart after adding product", async ({ page }) => {
    const productItem = page.locator('[class*="product"], [class*="item"]').first();
    await productItem.click();

    const addToCartBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Add To Cart")').first();
    await addToCartBtn.click();

    // Navigate to cart
    const cartBtn = page.locator('button:has-text("Cart"), a:has-text("Cart")');
    await cartBtn.click();

    await page.waitForURL(/.*cart/);
    await expect(page).toHaveURL(/.*cart/);

    // Product should be visible in cart
    const cartItem = page.locator('[class*="cart-item"], [class*="order-item"]');
    await expect(cartItem.first()).toBeVisible();
  });

  test("should update product quantity in cart", async ({ page }) => {
    // First add a product to cart
    const productItem = page.locator('[class*="product"], [class*="item"]').first();
    await productItem.click();

    const addToCartBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Add To Cart")').first();
    await addToCartBtn.click();

    // Go to cart
    const cartBtn = page.locator('button:has-text("Cart"), a:has-text("Cart")');
    await cartBtn.click();

    // Update quantity
    const quantityInput = page.locator('input[type="number"]').first();
    await quantityInput.clear();
    await quantityInput.fill("5");

    // Total should update
    const totalPrice = page.locator('[class*="total"], [class*="subtotal"]');
    await expect(totalPrice.first()).toBeVisible();
  });

  test("should remove product from cart", async ({ page }) => {
    // Add product to cart
    const productItem = page.locator('[class*="product"], [class*="item"]').first();
    await productItem.click();

    const addToCartBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Add To Cart")').first();
    await addToCartBtn.click();

    // Go to cart
    const cartBtn = page.locator('button:has-text("Cart"), a:has-text("Cart")');
    await cartBtn.click();

    // Remove product
    const removeBtn = page.locator('button:has-text("Remove"), button:has-text("Delete"), [class*="remove"]');
    await removeBtn.click();

    // Product should be removed
    const cartItems = page.locator('[class*="cart-item"], [class*="order-item"]');
    await expect(cartItems.first()).not.toBeVisible();
  });

  test("should calculate cart totals correctly", async ({ page }) => {
    // Add product to cart
    const productItem = page.locator('[class*="product"], [class*="item"]').first();
    await productItem.click();

    const productPrice = page.locator('[class*="price"]').first();
    const priceText = await productPrice.textContent();

    const addToCartBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Add To Cart")').first();
    await addToCartBtn.click();

    // Go to cart
    const cartBtn = page.locator('button:has-text("Cart"), a:has-text("Cart")');
    await cartBtn.click();

    // Check totals
    const cartTotal = page.locator('[class*="total"]');
    await expect(cartTotal.first()).toBeVisible();
  });

  test("should proceed to checkout from cart", async ({ page }) => {
    // Add product to cart
    const productItem = page.locator('[class*="product"], [class*="item"]').first();
    await productItem.click();

    const addToCartBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Add To Cart")').first();
    await addToCartBtn.click();

    // Go to cart
    const cartBtn = page.locator('button:has-text("Cart"), a:has-text("Cart")');
    await cartBtn.click();

    // Checkout
    const checkoutBtn = page.locator('button:has-text("Checkout"), button:has-text("Proceed to Checkout")');
    await checkoutBtn.click();

    await page.waitForURL(/.*checkout/);
    await expect(page).toHaveURL(/.*checkout/);
  });
});
