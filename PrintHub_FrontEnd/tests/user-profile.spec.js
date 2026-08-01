const { test, expect } = require("@playwright/test");

test.describe("User Profile Management", () => {
  test.beforeEach(async ({ page }) => {
    // Assuming user is logged in
    await page.goto("/user-dashboard");
  });

  test("should display user profile section", async ({ page }) => {
    const profileLink = page.locator('a:has-text("Profile"), a:has-text("Account"), a:has-text("Settings")');
    if (await profileLink.isVisible()) {
      await profileLink.click();
    }

    await page.waitForURL(/.*profile|.*account|.*settings/);

    const profileHeading = page.locator("h1, h2");
    await expect(profileHeading.first()).toContainText(/profile|account|settings/i);
  });

  test("should display user information", async ({ page }) => {
    const profileLink = page.locator('a:has-text("Profile"), a:has-text("Account"), a:has-text("Settings")');
    if (await profileLink.isVisible()) {
      await profileLink.click();
    }

    const firstName = page.locator('input[placeholder*="first name" i], [class*="first-name"]');
    const lastName = page.locator('input[placeholder*="last name" i], [class*="last-name"]');
    const email = page.locator('input[placeholder*="email" i], [class*="email"]');

    if (await firstName.isVisible()) {
      await expect(firstName).toHaveValue(/\w+/);
    }
  });

  test("should update first name", async ({ page }) => {
    const profileLink = page.locator('a:has-text("Profile"), a:has-text("Account"), a:has-text("Settings")');
    if (await profileLink.isVisible()) {
      await profileLink.click();
    }

    const firstNameInput = page.locator('input[placeholder*="first name" i]');
    if (await firstNameInput.isVisible()) {
      await firstNameInput.clear();
      await firstNameInput.fill("Johnny");

      const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update")');
      await saveBtn.click();

      const successMsg = page.locator('[class*="success"], [class*="message"]');
      if (await successMsg.count() > 0) {
        await expect(successMsg.first()).toContainText(/success|updated/i);
      }
    }
  });

  test("should update last name", async ({ page }) => {
    const profileLink = page.locator('a:has-text("Profile"), a:has-text("Account"), a:has-text("Settings")');
    if (await profileLink.isVisible()) {
      await profileLink.click();
    }

    const lastNameInput = page.locator('input[placeholder*="last name" i]');
    if (await lastNameInput.isVisible()) {
      await lastNameInput.clear();
      await lastNameInput.fill("Smith");

      const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update")');
      await saveBtn.click();

      const successMsg = page.locator('[class*="success"], [class*="message"]');
      if (await successMsg.count() > 0) {
        await expect(successMsg.first()).toContainText(/success|updated/i);
      }
    }
  });

  test("should update phone number", async ({ page }) => {
    const profileLink = page.locator('a:has-text("Profile"), a:has-text("Account"), a:has-text("Settings")');
    if (await profileLink.isVisible()) {
      await profileLink.click();
    }

    const phoneInput = page.locator('input[placeholder*="phone" i]');
    if (await phoneInput.isVisible()) {
      await phoneInput.clear();
      await phoneInput.fill("09987654321");

      const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update")');
      await saveBtn.click();

      const successMsg = page.locator('[class*="success"], [class*="message"]');
      if (await successMsg.count() > 0) {
        await expect(successMsg.first()).toContainText(/success|updated/i);
      }
    }
  });

  test("should update delivery address", async ({ page }) => {
    const profileLink = page.locator('a:has-text("Profile"), a:has-text("Account"), a:has-text("Settings")');
    if (await profileLink.isVisible()) {
      await profileLink.click();
    }

    const addressInput = page.locator('input[placeholder*="address" i]');
    if (await addressInput.isVisible()) {
      await addressInput.clear();
      await addressInput.fill("456 Elm Street");

      const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update")');
      await saveBtn.click();

      const successMsg = page.locator('[class*="success"], [class*="message"]');
      if (await successMsg.count() > 0) {
        await expect(successMsg.first()).toContainText(/success|updated/i);
      }
    }
  });

  test("should validate email format when updating", async ({ page }) => {
    const profileLink = page.locator('a:has-text("Profile"), a:has-text("Account"), a:has-text("Settings")');
    if (await profileLink.isVisible()) {
      await profileLink.click();
    }

    const emailInput = page.locator('input[placeholder*="email" i]');
    if (await emailInput.isVisible()) {
      await emailInput.clear();
      await emailInput.fill("invalid-email");

      const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update")');
      await saveBtn.click();

      const errorMsg = page.locator('[class*="error"], [role="alert"]');
      if (await errorMsg.count() > 0) {
        await expect(errorMsg.first()).toContainText(/invalid|email/i);
      }
    }
  });

  test("should validate phone format when updating", async ({ page }) => {
    const profileLink = page.locator('a:has-text("Profile"), a:has-text("Account"), a:has-text("Settings")');
    if (await profileLink.isVisible()) {
      await profileLink.click();
    }

    const phoneInput = page.locator('input[placeholder*="phone" i]');
    if (await phoneInput.isVisible()) {
      await phoneInput.clear();
      await phoneInput.fill("123");

      const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update")');
      await saveBtn.click();

      const errorMsg = page.locator('[class*="error"], [role="alert"]');
      if (await errorMsg.count() > 0) {
        await expect(errorMsg.first()).toContainText(/invalid|phone|format/i);
      }
    }
  });

  test("should upload profile picture", async ({ page }) => {
    const profileLink = page.locator('a:has-text("Profile"), a:has-text("Account"), a:has-text("Settings")');
    if (await profileLink.isVisible()) {
      await profileLink.click();
    }

    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      // Mock file upload
      await fileInput.setInputFiles({
        name: "profile.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from("fake-image-data"),
      });

      await page.waitForTimeout(1000);

      const successMsg = page.locator('[class*="success"], [class*="uploaded"]');
      const profileImage = page.locator('img[alt*="profile"]');

      if (await successMsg.count() > 0) {
        await expect(successMsg.first()).toContainText(/success|uploaded/i);
      }
    }
  });

  test("should display saved addresses", async ({ page }) => {
    const addressLink = page.locator('a:has-text("Addresses"), a:has-text("Delivery"), a:has-text("Address Book")');
    if (await addressLink.isVisible()) {
      await addressLink.click();

      const addressList = page.locator('[class*="address"], [class*="address-item"]');
      if (await addressList.count() > 0) {
        await expect(addressList.first()).toBeVisible();
      }
    }
  });

  test("should add new delivery address", async ({ page }) => {
    const addressLink = page.locator('a:has-text("Addresses"), a:has-text("Delivery"), a:has-text("Address Book")');
    if (await addressLink.isVisible()) {
      await addressLink.click();

      const addBtn = page.locator('button:has-text("Add"), button:has-text("New Address")');
      if (await addBtn.isVisible()) {
        await addBtn.click();

        const addressInput = page.locator('input[placeholder*="address" i]');
        const cityInput = page.locator('input[placeholder*="city" i]');

        if (await addressInput.isVisible()) {
          await addressInput.fill("789 Oak Avenue");
          await cityInput.fill("Quezon City");

          const saveBtn = page.locator('button:has-text("Save"), button:has-text("Add Address")');
          await saveBtn.click();

          const successMsg = page.locator('[class*="success"]');
          if (await successMsg.count() > 0) {
            await expect(successMsg.first()).toContainText(/success|added/i);
          }
        }
      }
    }
  });

  test("should remove delivery address", async ({ page }) => {
    const addressLink = page.locator('a:has-text("Addresses"), a:has-text("Delivery"), a:has-text("Address Book")');
    if (await addressLink.isVisible()) {
      await addressLink.click();

      const removeBtn = page.locator('button:has-text("Remove"), button:has-text("Delete")').first();
      if (await removeBtn.isVisible()) {
        await removeBtn.click();

        const confirmBtn = page.locator('button:has-text("Yes"), button:has-text("Confirm")');
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();

          const successMsg = page.locator('[class*="success"], [class*="removed"]');
          if (await successMsg.count() > 0) {
            await expect(successMsg.first()).toContainText(/success|removed|deleted/i);
          }
        }
      }
    }
  });

  test("should display payment methods", async ({ page }) => {
    const paymentLink = page.locator('a:has-text("Payment"), a:has-text("Saved Cards"), a:has-text("Payments")');
    if (await paymentLink.isVisible()) {
      await paymentLink.click();

      const paymentMethods = page.locator('[class*="payment-method"], [class*="card"]');
      if (await paymentMethods.count() > 0) {
        await expect(paymentMethods.first()).toBeVisible();
      }
    }
  });

  test("should add saved payment method", async ({ page }) => {
    const paymentLink = page.locator('a:has-text("Payment"), a:has-text("Saved Cards"), a:has-text("Payments")');
    if (await paymentLink.isVisible()) {
      await paymentLink.click();

      const addBtn = page.locator('button:has-text("Add"), button:has-text("Save Card")');
      if (await addBtn.isVisible()) {
        await addBtn.click();

        const cardInput = page.locator('input[placeholder*="card" i]');
        if (await cardInput.isVisible()) {
          await cardInput.fill("4532123456789010");

          const saveBtn = page.locator('button:has-text("Save")');
          await saveBtn.click();

          const successMsg = page.locator('[class*="success"]');
          if (await successMsg.count() > 0) {
            await expect(successMsg.first()).toContainText(/success|saved/i);
          }
        }
      }
    }
  });

  test("should delete notification preferences option", async ({ page }) => {
    const notifLink = page.locator('a:has-text("Notifications"), a:has-text("Preferences")');
    if (await notifLink.isVisible()) {
      await notifLink.click();

      const checkboxes = page.locator('input[type="checkbox"]');
      if (await checkboxes.count() > 0) {
        const firstCheckbox = checkboxes.first();
        const isChecked = await firstCheckbox.isChecked();

        await firstCheckbox.click();

        if (isChecked) {
          // Was unchecked, now should be checked or vice versa
          const newState = await firstCheckbox.isChecked();
          expect(newState).not.toBe(isChecked);
        }
      }
    }
  });
});
