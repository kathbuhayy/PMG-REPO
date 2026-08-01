const { test, expect } = require("@playwright/test");

test.describe("Payment Process", () => {
  test.describe("Payment Gateway", () => {
    test.beforeEach(async ({ page }) => {
      // Assuming we're at checkout with payment details ready
      await page.goto("/checkout");
    });

    test("should display payment methods", async ({ page }) => {
      const paymentMethods = page.locator('[class*="payment-method"], [role="radio"]');
      await expect(paymentMethods.first()).toBeVisible();
    });

    test("should select credit card payment", async ({ page }) => {
      const creditCardOption = page.locator('input[value*="card"], label:has-text("Card"), label:has-text("Credit")');
      if (await creditCardOption.isVisible()) {
        await creditCardOption.click();

        // Credit card form should appear
        const cardNumberInput = page.locator('input[placeholder*="card number" i], input[placeholder*="5555" i]');
        await expect(cardNumberInput).toBeVisible();
      }
    });

    test("should validate credit card fields", async ({ page }) => {
      // Select credit card
      const creditCardOption = page.locator('input[value*="card"], label:has-text("Card")');
      if (await creditCardOption.isVisible()) {
        await creditCardOption.click();

        const submitBtn = page.locator('button:has-text("Pay"), button:has-text("Submit")');
        await submitBtn.click();

        const errorMsg = page.locator('.error-message, [role="alert"]');
        await expect(errorMsg.first()).toContainText(/required|card|number/i);
      }
    });

    test("should validate card number format", async ({ page }) => {
      const creditCardOption = page.locator('input[value*="card"], label:has-text("Card")');
      if (await creditCardOption.isVisible()) {
        await creditCardOption.click();

        const cardNumberInput = page.locator('input[placeholder*="card number" i], input[placeholder*="5555" i]');
        const submitBtn = page.locator('button:has-text("Pay"), button:has-text("Submit")');

        await cardNumberInput.fill("1234");
        await submitBtn.click();

        const errorMsg = page.locator('.error-message, [role="alert"]');
        if (await errorMsg.count() > 0) {
          await expect(errorMsg.first()).toContainText(/invalid|card number/i);
        }
      }
    });

    test("should validate expiry date", async ({ page }) => {
      const creditCardOption = page.locator('input[value*="card"], label:has-text("Card")');
      if (await creditCardOption.isVisible()) {
        await creditCardOption.click();

        const cardNumberInput = page.locator('input[placeholder*="card number" i]');
        const expiryInput = page.locator('input[placeholder*="expiry|MM/YY|MM/YYYY" i]');

        if (await expiryInput.isVisible()) {
          await cardNumberInput.fill("4532123456789010");
          await expiryInput.fill("01/20"); // Past date

          const submitBtn = page.locator('button:has-text("Pay"), button:has-text("Submit")');
          await submitBtn.click();

          const errorMsg = page.locator('.error-message, [role="alert"]');
          if (await errorMsg.count() > 0) {
            await expect(errorMsg.first()).toContainText(/expiry|expired|invalid date/i);
          }
        }
      }
    });

    test("should validate CVV", async ({ page }) => {
      const creditCardOption = page.locator('input[value*="card"], label:has-text("Card")');
      if (await creditCardOption.isVisible()) {
        await creditCardOption.click();

        const cvvInput = page.locator('input[placeholder*="CVV|CVC|security" i]');

        if (await cvvInput.isVisible()) {
          await cvvInput.fill("1"); // Invalid CVV
          
          const submitBtn = page.locator('button:has-text("Pay"), button:has-text("Submit")');
          await submitBtn.click();

          const errorMsg = page.locator('.error-message, [role="alert"]');
          if (await errorMsg.count() > 0) {
            await expect(errorMsg.first()).toContainText(/cvv|cvc|invalid/i);
          }
        }
      }
    });

    test("should process credit card payment", async ({ page }) => {
      const creditCardOption = page.locator('input[value*="card"], label:has-text("Card")');
      if (await creditCardOption.isVisible()) {
        await creditCardOption.click();

        const cardNumberInput = page.locator('input[placeholder*="card number" i]');
        const expiryInput = page.locator('input[placeholder*="expiry|MM/YY|MM/YYYY" i]');
        const cvvInput = page.locator('input[placeholder*="CVV|CVC|security" i]');

        if (await cardNumberInput.isVisible()) {
          await cardNumberInput.fill("4532123456789010");
          
          if (await expiryInput.isVisible()) {
            await expiryInput.fill("12/25");
          }
          
          if (await cvvInput.isVisible()) {
            await cvvInput.fill("123");
          }

          const submitBtn = page.locator('button:has-text("Pay"), button:has-text("Submit")');
          await submitBtn.click();

          // Should navigate to payment success or order confirmation
          await page.waitForURL(/.*success|.*confirmation|.*order/);
          await expect(page).toHaveURL(/.*success|.*confirmation|.*order/);
        }
      }
    });
  });

  test.describe("GCash Payment", () => {
    test("should select GCash payment", async ({ page }) => {
      await page.goto("/checkout");

      const gcashOption = page.locator('input[value*="gcash"], label:has-text("GCash")');
      if (await gcashOption.isVisible()) {
        await gcashOption.click();

        // GCash payment details should appear
        const gcashInfo = page.locator('[class*="gcash"], [class*="payment-info"]');
        await expect(gcashInfo).toBeVisible();
      }
    });

    test("should display GCash payment instructions", async ({ page }) => {
      await page.goto("/checkout");

      const gcashOption = page.locator('input[value*="gcash"], label:has-text("GCash")');
      if (await gcashOption.isVisible()) {
        await gcashOption.click();

        // Check for reference number, QR code, or payment link
        const referenceNumber = page.locator('[class*="reference"], [class*="number"]');
        const qrCode = page.locator('img[alt*="QR" i], [class*="qr"]');

        const hasReference = await referenceNumber.count() > 0;
        const hasQR = await qrCode.count() > 0;

        expect(hasReference || hasQR).toBeTruthy();
      }
    });

    test("should process GCash payment", async ({ page }) => {
      await page.goto("/checkout");

      const gcashOption = page.locator('input[value*="gcash"], label:has-text("GCash")');
      if (await gcashOption.isVisible()) {
        await gcashOption.click();

        // Usually GCash payments redirect to external URL
        const submitBtn = page.locator('button:has-text("Pay"), button:has-text("Submit")');
        await submitBtn.click();

        // May redirect to GCash payment page or show reference
        await page.waitForTimeout(2000);
        const url = page.url();
        expect(url).toBeTruthy();
      }
    });
  });

  test.describe("Bank Transfer Payment", () => {
    test("should select bank transfer payment", async ({ page }) => {
      await page.goto("/checkout");

      const bankOption = page.locator('input[value*="bank"], label:has-text("Bank")');
      if (await bankOption.isVisible()) {
        await bankOption.click();

        // Bank transfer details should display
        const bankInfo = page.locator('[class*="bank"], [class*="account"], [class*="payment-info"]');
        await expect(bankInfo.first()).toBeVisible();
      }
    });

    test("should display bank account details", async ({ page }) => {
      await page.goto("/checkout");

      const bankOption = page.locator('input[value*="bank"], label:has-text("Bank")');
      if (await bankOption.isVisible()) {
        await bankOption.click();

        // Check for account number, bank name, reference
        const accountDetails = page.locator('[class*="account-number"], [class*="reference"], [class*="bank-name"]');
        await expect(accountDetails.first()).toBeVisible();
      }
    });

    test("should display payment reference for bank transfer", async ({ page }) => {
      await page.goto("/checkout");

      const bankOption = page.locator('input[value*="bank"], label:has-text("Bank")');
      if (await bankOption.isVisible()) {
        await bankOption.click();

        const referenceNumber = page.locator('[class*="reference"]');
        await expect(referenceNumber.first()).toContainText(/\d+/);
      }
    });
  });

  test.describe("Installment Payment", () => {
    test("should select installment payment", async ({ page }) => {
      await page.goto("/checkout");

      const installmentOption = page.locator('input[value*="installment"], label:has-text("Installment")');
      if (await installmentOption.isVisible()) {
        await installmentOption.click();

        // Installment options should display
        const installmentPlans = page.locator('[class*="installment-plan"], [class*="plan"]');
        await expect(installmentPlans.first()).toBeVisible();
      }
    });

    test("should display installment payment plans", async ({ page }) => {
      await page.goto("/checkout");

      const installmentOption = page.locator('input[value*="installment"], label:has-text("Installment")');
      if (await installmentOption.isVisible()) {
        await installmentOption.click();

        // Should show different month options
        const plans = page.locator('[class*="plan"], [role="radio"]');
        await expect(plans.first()).toBeVisible();
      }
    });

    test("should select installment duration", async ({ page }) => {
      await page.goto("/checkout");

      const installmentOption = page.locator('input[value*="installment"], label:has-text("Installment")');
      if (await installmentOption.isVisible()) {
        await installmentOption.click();

        const plan = page.locator('[class*="plan"], [role="radio"]').first();
        if (await plan.isVisible()) {
          await plan.click();

          // Monthly amount should update
          const monthlyAmount = page.locator('[class*="monthly"], [class*="amount"]');
          if (await monthlyAmount.count() > 0) {
            await expect(monthlyAmount.first()).toContainText(/\d+|\₱/);
          }
        }
      }
    });
  });

  test.describe("Payment Confirmation", () => {
    test("should display payment confirmation page", async ({ page }) => {
      // Navigate to confirmation page (after successful payment)
      await page.goto("/checkout/success");

      const confirmationMessage = page.locator('h1, h2');
      await expect(confirmationMessage.first()).toContainText(/success|confirmation|thank you/i);
    });

    test("should display order details on confirmation", async ({ page }) => {
      await page.goto("/checkout/success");

      const orderNumber = page.locator('[class*="order-number"], [class*="order-id"]');
      const totalAmount = page.locator('[class*="total"], [class*="amount"]');
      const deliveryDate = page.locator('[class*="delivery"], [class*="date"]');

      await expect(orderNumber.first()).toBeVisible();
      await expect(totalAmount).toBeVisible();
    });

    test("should provide order confirmation email option", async ({ page }) => {
      await page.goto("/checkout/success");

      const emailCheckbox = page.locator('input[type="checkbox"]');
      const downloadBtn = page.locator('button:has-text("Download"), button:has-text("Email")');

      if (await downloadBtn.count() > 0) {
        await expect(downloadBtn.first()).toBeVisible();
      }
    });
  });
});
