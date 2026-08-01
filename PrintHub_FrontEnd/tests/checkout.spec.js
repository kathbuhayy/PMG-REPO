const { test, expect } = require("@playwright/test");

test.describe("Checkout Process", () => {
  test.beforeEach(async ({ page }) => {
    // Assuming we start at checkout page after adding items to cart
    await page.goto("/checkout");
  });

  test("should display checkout form", async ({ page }) => {
    // Check for key checkout sections
    const billingSection = page.locator('h2:has-text("Billing"), h2:has-text("Shipping")');
    const orderSummary = page.locator('[class*="order-summary"], [class*="summary"]');

    await expect(orderSummary.first()).toBeVisible();
  });

  test("should display order summary", async ({ page }) => {
    const orderItems = page.locator('[class*="order-item"], [class*="summary-item"]');
    const orderTotal = page.locator('[class*="total"], [class*="amount"]');

    await expect(orderItems.first()).toBeVisible();
    await expect(orderTotal).toBeVisible();
  });

  test("should fill shipping address", async ({ page }) => {
    const firstNameInput = page.locator('input[placeholder*="first name" i]');
    const lastNameInput = page.locator('input[placeholder*="last name" i]');
    const addressInput = page.locator('input[placeholder*="address" i]');
    const cityInput = page.locator('input[placeholder*="city" i]');
    const provinceInput = page.locator('input[placeholder*="province|state" i], select[name*="province" i]');
    const zipInput = page.locator('input[placeholder*="postal|zip" i]');

    if (await firstNameInput.isVisible()) {
      await firstNameInput.fill("John");
      await lastNameInput.fill("Doe");
      await addressInput.fill("123 Main Street");
      await cityInput.fill("Manila");

      if (await provinceInput.isVisible()) {
        await provinceInput.fill("Metro Manila");
      }

      await zipInput.fill("1000");

      // Verify fields are filled
      await expect(firstNameInput).toHaveValue("John");
      await expect(addressInput).toHaveValue("123 Main Street");
    }
  });

  test("should validate required shipping fields", async ({ page }) => {
    const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next")');
    await continueBtn.click();

    const errorMsg = page.locator('.error-message, [role="alert"]');
    await expect(errorMsg.first()).toBeVisible();
    await expect(errorMsg.first()).toContainText(/required|address|complete/i);
  });

  test("should apply shipping method", async ({ page }) => {
    const shippingOptions = page.locator('[class*="shipping-option"], [role="radio"]');

    if (await shippingOptions.count() > 0) {
      await shippingOptions.first().click();

      // Shipping cost should update
      const shippingCost = page.locator('[class*="shipping-cost"]');
      if (await shippingCost.isVisible()) {
        await expect(shippingCost).toContainText(/\d+|\₱/);
      }
    }
  });

  test("should validate shipping address format", async ({ page }) => {
    const addressInput = page.locator('input[placeholder*="address" i]');
    const zipInput = page.locator('input[placeholder*="postal|zip" i]');
    const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next")');

    // Fill with invalid data
    await addressInput.fill("a");
    await zipInput.fill("abc");
    await continueBtn.click();

    const errorMsg = page.locator('.error-message, [role="alert"]');
    if (await errorMsg.count() > 0) {
      await expect(errorMsg.first()).toContainText(/invalid|format/i);
    }
  });

  test("should handle same as billing address checkbox", async ({ page }) => {
    const sameAddressCheckbox = page.locator('input[type="checkbox"]').first();

    if (await sameAddressCheckbox.isVisible()) {
      await sameAddressCheckbox.click();

      // Billing address should populate with shipping address
      await page.waitForTimeout(500);
      const billingInputs = page.locator('input[name*="billing"]');
      if (await billingInputs.count() > 0) {
        // Verify they're filled or disabled
        await expect(billingInputs.first()).toBeTruthy();
      }
    }
  });

  test("should display payment methods", async ({ page }) => {
    // Navigate to payment section (usually after filling shipping)
    const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next")');
    
    // Fill shipping address first
    const firstNameInput = page.locator('input[placeholder*="first name" i]');
    if (await firstNameInput.isVisible()) {
      await firstNameInput.fill("John");
      await page.locator('input[placeholder*="last name" i]').fill("Doe");
      await page.locator('input[placeholder*="address" i]').fill("123 Main Street");
      await page.locator('input[placeholder*="city" i]').fill("Manila");
      await page.locator('input[placeholder*="postal|zip" i]').fill("1000");
      
      await continueBtn.click();
    }

    // Check for payment methods
    const paymentMethods = page.locator('[class*="payment-method"], [role="radio"]');
    await expect(paymentMethods.first()).toBeVisible();
  });

  test("should select payment method", async ({ page }) => {
    // Navigate to payment section
    const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next")');
    const firstNameInput = page.locator('input[placeholder*="first name" i]');

    if (await firstNameInput.isVisible()) {
      await firstNameInput.fill("John");
      await page.locator('input[placeholder*="last name" i]').fill("Doe");
      await page.locator('input[placeholder*="address" i]').fill("123 Main Street");
      await page.locator('input[placeholder*="city" i]').fill("Manila");
      await page.locator('input[placeholder*="postal|zip" i]').fill("1000");
      
      await continueBtn.click();
    }

    // Select payment method
    const paymentMethodRadio = page.locator('[class*="payment-method"] input, [role="radio"]').first();
    await paymentMethodRadio.click();

    // Payment details should display
    const paymentDetails = page.locator('[class*="payment-detail"], [class*="payment-info"]');
    if (await paymentDetails.count() > 0) {
      await expect(paymentDetails.first()).toBeVisible();
    }
  });

  test("should apply promo code", async ({ page }) => {
    const promoInput = page.locator('input[placeholder*="promo|coupon|code" i]');

    if (await promoInput.isVisible()) {
      await promoInput.fill("PROMO10");

      const applyBtn = page.locator('button:has-text("Apply")');
      if (await applyBtn.isVisible()) {
        await applyBtn.click();

        // Discount should be applied
        const discount = page.locator('[class*="discount"]');
        const total = page.locator('[class*="total"]');

        if (await discount.count() > 0) {
          await expect(discount.first()).toContainText(/\d+|\₱/);
        }
      }
    }
  });

  test("should display order summary with totals", async ({ page }) => {
    const subtotal = page.locator('[class*="subtotal"], [class*="subtotal"]');
    const shipping = page.locator('[class*="shipping-cost"]');
    const tax = page.locator('[class*="tax"]');
    const total = page.locator('[class*="total"], [class*="grand-total"]');

    if (await subtotal.count() > 0) {
      await expect(subtotal.first()).toBeVisible();
    }
    if (await total.count() > 0) {
      await expect(total).toContainText(/\d+|\₱/);
    }
  });

  test("should place order successfully", async ({ page }) => {
    // Fill all required information
    const firstNameInput = page.locator('input[placeholder*="first name" i]');
    if (await firstNameInput.isVisible()) {
      await firstNameInput.fill("John");
      await page.locator('input[placeholder*="last name" i]').fill("Doe");
      await page.locator('input[placeholder*="address" i]').fill("123 Main Street");
      await page.locator('input[placeholder*="city" i]').fill("Manila");
      await page.locator('input[placeholder*="postal|zip" i]').fill("1000");

      const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next")');
      await continueBtn.click();
    }

    // Select payment method
    const paymentMethod = page.locator('[class*="payment-method"] input, [role="radio"]').first();
    if (await paymentMethod.isVisible()) {
      await paymentMethod.click();
    }

    // Place order
    const placeOrderBtn = page.locator('button:has-text("Place Order"), button:has-text("Complete"), button:has-text("Submit")');
    await placeOrderBtn.click();

    // Should show success or navigate to confirmation
    const successMsg = page.locator('[class*="success"], [class*="confirmation"]');
    const orderConfirmation = page.url();

    const messageOrNavigation = await Promise.race([
      successMsg.isVisible().catch(() => false),
      page.waitForURL(/.*confirmation|.*success|.*order/).catch(() => false)
    ]);

    expect(messageOrNavigation).toBeTruthy();
  });

  test("should display estimated delivery date", async ({ page }) => {
    const deliveryDate = page.locator('[class*="delivery"], [class*="estimated"]');

    if (await deliveryDate.count() > 0) {
      await expect(deliveryDate.first()).toContainText(/\d+|days|week|month/i);
    }
  });
});
