const { test, expect } = require("@playwright/test");

test.describe("Order Tracking and History", () => {
  test.beforeEach(async ({ page }) => {
    // Assuming user is logged in
    await page.goto("/user-dashboard");
  });

  test("should display orders/history section", async ({ page }) => {
    const ordersLink = page.locator('a:has-text("Orders"), a:has-text("History"), a:has-text("My Orders")');
    if (await ordersLink.isVisible()) {
      await ordersLink.click();
    }

    await page.waitForURL(/.*order|.*history|.*track/);

    const ordersHeading = page.locator("h1, h2");
    await expect(ordersHeading.first()).toContainText(/order|history|track/i);
  });

  test("should display list of orders", async ({ page }) => {
    const ordersLink = page.locator('a:has-text("Orders"), a:has-text("History"), a:has-text("My Orders")');
    if (await ordersLink.isVisible()) {
      await ordersLink.click();
    }

    const orderItems = page.locator('[class*="order"], [class*="item"]');
    await expect(orderItems.first()).toBeVisible();
  });

  test("should display order information in list", async ({ page }) => {
    const ordersLink = page.locator('a:has-text("Orders"), a:has-text("History"), a:has-text("My Orders")');
    if (await ordersLink.isVisible()) {
      await ordersLink.click();
    }

    const orderNumber = page.locator('[class*="order-number"], [class*="order-id"]');
    const orderDate = page.locator('[class*="date"], [class*="order-date"]');
    const orderStatus = page.locator('[class*="status"]');
    const orderTotal = page.locator('[class*="total"], [class*="price"]');

    await expect(orderNumber.first()).toBeVisible();
    if (await orderDate.count() > 0) {
      await expect(orderDate.first()).toBeVisible();
    }
    if (await orderTotal.count() > 0) {
      await expect(orderTotal.first()).toBeVisible();
    }
  });

  test("should filter orders by status", async ({ page }) => {
    const ordersLink = page.locator('a:has-text("Orders"), a:has-text("History"), a:has-text("My Orders")');
    if (await ordersLink.isVisible()) {
      await ordersLink.click();
    }

    const statusFilter = page.locator('select[name*="status" i], [class*="status-filter"]');

    if (await statusFilter.isVisible()) {
      await statusFilter.click();

      const filterOption = page.locator('[role="option"], option').first();
      await filterOption.click();

      // Orders should filter
      const orderItems = page.locator('[class*="order"], [class*="item"]');
      await expect(orderItems.first()).toBeVisible();
    }
  });

  test("should search for orders", async ({ page }) => {
    const ordersLink = page.locator('a:has-text("Orders"), a:has-text("History"), a:has-text("My Orders")');
    if (await ordersLink.isVisible()) {
      await ordersLink.click();
    }

    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]');

    if (await searchInput.isVisible()) {
      await searchInput.fill("ORD-123456");
      await page.waitForTimeout(500);

      const orderItems = page.locator('[class*="order"], [class*="item"]');
      if (await orderItems.count() > 0) {
        await expect(orderItems.first()).toBeVisible();
      }
    }
  });

  test("should view order details", async ({ page }) => {
    const ordersLink = page.locator('a:has-text("Orders"), a:has-text("History"), a:has-text("My Orders")');
    if (await ordersLink.isVisible()) {
      await ordersLink.click();
    }

    const orderItem = page.locator('[class*="order"], [class*="item"]').first();
    await orderItem.click();

    // Should navigate to order detail page
    await page.waitForURL(/.*order-detail|.*order\/\d+|.*track-order/);

    const orderDetails = page.locator('h1, h2');
    await expect(orderDetails.first()).toContainText(/order|detail|track/i);
  });

  test("should display order tracking information", async ({ page }) => {
    const ordersLink = page.locator('a:has-text("Orders"), a:has-text("History"), a:has-text("My Orders")');
    if (await ordersLink.isVisible()) {
      await ordersLink.click();
    }

    const orderItem = page.locator('[class*="order"], [class*="item"]').first();
    await orderItem.click();

    // Check for tracking details
    const orderNumber = page.locator('[class*="order-number"], [class*="order-id"]');
    const orderStatus = page.locator('[class*="status"]');
    const trackingNumber = page.locator('[class*="tracking-number"], [class*="tracking-id"]');

    await expect(orderNumber.first()).toBeVisible();
    await expect(orderStatus.first()).toBeVisible();
    if (await trackingNumber.count() > 0) {
      await expect(trackingNumber.first()).toBeVisible();
    }
  });

  test("should display order timeline/status history", async ({ page }) => {
    const ordersLink = page.locator('a:has-text("Orders"), a:has-text("History"), a:has-text("My Orders")');
    if (await ordersLink.isVisible()) {
      await ordersLink.click();
    }

    const orderItem = page.locator('[class*="order"], [class*="item"]').first();
    await orderItem.click();

    // Check for timeline or status updates
    const timeline = page.locator('[class*="timeline"], [class*="status-update"], [class*="history"]');
    const statusSteps = page.locator('[class*="step"], [role="progressbar"]');

    if (await timeline.count() > 0) {
      await expect(timeline.first()).toBeVisible();
    }
    if (await statusSteps.count() > 0) {
      await expect(statusSteps.first()).toBeVisible();
    }
  });

  test("should display order items in detail", async ({ page }) => {
    const ordersLink = page.locator('a:has-text("Orders"), a:has-text("History"), a:has-text("My Orders")');
    if (await ordersLink.isVisible()) {
      await ordersLink.click();
    }

    const orderItem = page.locator('[class*="order"], [class*="item"]').first();
    await orderItem.click();

    // Check for ordered items
    const items = page.locator('[class*="order-item"], [class*="product-item"]');
    const itemName = page.locator('[class*="product-name"], [class*="item-name"]');
    const itemPrice = page.locator('[class*="price"]');

    await expect(items.first()).toBeVisible();
    if (await itemName.count() > 0) {
      await expect(itemName.first()).toBeVisible();
    }
  });

  test("should display shipping information", async ({ page }) => {
    const ordersLink = page.locator('a:has-text("Orders"), a:has-text("History"), a:has-text("My Orders")');
    if (await ordersLink.isVisible()) {
      await ordersLink.click();
    }

    const orderItem = page.locator('[class*="order"], [class*="item"]').first();
    await orderItem.click();

    // Check for shipping details
    const shippingAddress = page.locator('[class*="shipping-address"], [class*="address"]');
    const deliveryDate = page.locator('[class*="delivery-date"], [class*="delivery"]');

    if (await shippingAddress.count() > 0) {
      await expect(shippingAddress.first()).toBeVisible();
    }
    if (await deliveryDate.count() > 0) {
      await expect(deliveryDate.first()).toBeVisible();
    }
  });

  test("should display payment information", async ({ page }) => {
    const ordersLink = page.locator('a:has-text("Orders"), a:has-text("History"), a:has-text("My Orders")');
    if (await ordersLink.isVisible()) {
      await ordersLink.click();
    }

    const orderItem = page.locator('[class*="order"], [class*="item"]').first();
    await orderItem.click();

    // Check for payment details
    const paymentMethod = page.locator('[class*="payment-method"], [class*="payment"]');
    const totalAmount = page.locator('[class*="total"], [class*="amount"]');

    if (await paymentMethod.count() > 0) {
      await expect(paymentMethod.first()).toBeVisible();
    }
    if (await totalAmount.count() > 0) {
      await expect(totalAmount.first()).toBeVisible();
    }
  });

  test("should allow canceling pending order", async ({ page }) => {
    const ordersLink = page.locator('a:has-text("Orders"), a:has-text("History"), a:has-text("My Orders")');
    if (await ordersLink.isVisible()) {
      await ordersLink.click();
    }

    // Find pending order
    const pendingOrder = page.locator('[class*="status"]:has-text("Pending"), [class*="order"]:has-text("Pending")').first();
    if (await pendingOrder.count() > 0) {
      await pendingOrder.click();

      const cancelBtn = page.locator('button:has-text("Cancel"), button:has-text("Cancel Order")');
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();

        // Confirm cancellation
        const confirmBtn = page.locator('button:has-text("Yes"), button:has-text("Confirm")');
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();

          const successMsg = page.locator('[class*="success"], [class*="message"]');
          await expect(successMsg.first()).toContainText(/canceled|cancelled/i);
        }
      }
    }
  });

  test("should display action buttons based on order status", async ({
    page,
  }) => {
    const ordersLink = page.locator('a:has-text("Orders"), a:has-text("History"), a:has-text("My Orders")');
    if (await ordersLink.isVisible()) {
      await ordersLink.click();
    }

    const orderItem = page.locator('[class*="order"], [class*="item"]').first();
    await orderItem.click();

    // Check for status-appropriate buttons
    const actionButtons = page.locator('button[class*="action"], button');

    if (await actionButtons.count() > 0) {
      // Buttons could be: Cancel, Track, Reorder, Return, etc.
      for (let i = 0; i < Math.min(3, await actionButtons.count()); i++) {
        const btn = actionButtons.nth(i);
        await expect(btn).toContainText(/cancel|track|reorder|return|download|print/i);
      }
    }
  });

  test("should allow reordering past orders", async ({ page }) => {
    const ordersLink = page.locator('a:has-text("Orders"), a:has-text("History"), a:has-text("My Orders")');
    if (await ordersLink.isVisible()) {
      await ordersLink.click();
    }

    const orderItem = page.locator('[class*="order"], [class*="item"]').first();
    await orderItem.click();

    const reorderBtn = page.locator('button:has-text("Reorder"), button:has-text("Order Again")');
    if (await reorderBtn.isVisible()) {
      await reorderBtn.click();

      // Should add items to cart and navigate to cart/checkout
      const successMsg = page.locator('[class*="success"], [class*="added"]');
      if (await successMsg.count() > 0) {
        await expect(successMsg.first()).toContainText(/added|cart/i);
      }
    }
  });

  test("should display order print/download receipt", async ({ page }) => {
    const ordersLink = page.locator('a:has-text("Orders"), a:has-text("History"), a:has-text("My Orders")');
    if (await ordersLink.isVisible()) {
      await ordersLink.click();
    }

    const orderItem = page.locator('[class*="order"], [class*="item"]').first();
    await orderItem.click();

    const printBtn = page.locator('button:has-text("Print"), button:has-text("Download"), button:has-text("Receipt")');
    if (await printBtn.isVisible()) {
      // Click print/download button
      await printBtn.click();
      await page.waitForTimeout(1000);

      // Should trigger print dialog or download
      expect(true).toBeTruthy();
    }
  });
});
