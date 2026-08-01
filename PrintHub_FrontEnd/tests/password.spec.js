const { test, expect } = require("@playwright/test");

test.describe("User Password Management", () => {
  test.describe("Forgot Password", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/user-login");
    });

    test("should display forgot password modal", async ({ page }) => {
      const forgotLink = page.locator(".forgot-password");
      await forgotLink.click();

      const modal = page.locator(".forgot-password-modal");
      await expect(modal).toBeVisible();
      await expect(modal.locator("h2")).toContainText(/forgot|password/i);
    });

    test("should validate email in forgot password modal", async ({ page }) => {
      const forgotLink = page.locator(".forgot-password");
      await forgotLink.click();

      const modal = page.locator(".forgot-password-modal");
      const submitBtn = modal.locator('button[type="submit"]');
      await submitBtn.click();

      const errorMsg = modal.locator(".error-message");
      await expect(errorMsg).toBeVisible();
      await expect(errorMsg).toContainText(/email|required/i);
    });

    test("should validate email format in forgot password", async ({ page }) => {
      const forgotLink = page.locator(".forgot-password");
      await forgotLink.click();

      const modal = page.locator(".forgot-password-modal");
      const emailInput = modal.locator('input[placeholder*="email" i]');
      const submitBtn = modal.locator('button[type="submit"]');

      await emailInput.fill("invalid-email");
      await submitBtn.click();

      const errorMsg = modal.locator(".error-message");
      await expect(errorMsg).toBeVisible();
      await expect(errorMsg).toContainText(/valid|email/i);
    });

    test("should submit forgot password with valid email", async ({ page }) => {
      const forgotLink = page.locator(".forgot-password");
      await forgotLink.click();

      const modal = page.locator(".forgot-password-modal");
      const emailInput = modal.locator('input[placeholder*="email" i]');
      const submitBtn = modal.locator('button[type="submit"]');

      await emailInput.fill("testuser@example.com");
      await submitBtn.click();

      // Should show success message or navigate to OTP page
      const successMsg = modal.locator(".success-message");
      const otpPage = page.url();
      
      const messageOrNavigation = await Promise.race([
        successMsg.isVisible().catch(() => false),
        page.waitForURL(/.*forgot-otp|.*otp/).catch(() => false)
      ]);

      expect(messageOrNavigation).toBeTruthy();
    });

    test("should close forgot password modal on cancel", async ({ page }) => {
      const forgotLink = page.locator(".forgot-password");
      await forgotLink.click();

      const modal = page.locator(".forgot-password-modal");
      const cancelBtn = modal.locator(".modal-button.cancel, button:has-text('Cancel')");
      await cancelBtn.click();

      await expect(modal).not.toBeVisible();
    });
  });

  test.describe("Reset Password via OTP", () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to reset password page (usually accessed via email link)
      await page.goto("/user-forgot-otp");
    });

    test("should display OTP verification form", async ({ page }) => {
      const title = page.locator("h1");
      await expect(title).toContainText(/otp|verification|verify/i);

      // Check for OTP input fields
      const otpInputs = page.locator('input[placeholder*="OTP" i], input[placeholder*="code" i]');
      await expect(otpInputs.first()).toBeVisible();
    });

    test("should validate OTP input", async ({ page }) => {
      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();

      const errorMsg = page.locator(".error-message");
      await expect(errorMsg).toBeVisible();
      await expect(errorMsg).toContainText(/otp|code|required/i);
    });

    test("should submit OTP and proceed to password reset", async ({ page }) => {
      const otpInputs = page.locator('input[placeholder*="OTP" i], input[placeholder*="code" i]');
      const submitBtn = page.locator('button[type="submit"]');

      // Fill OTP (usually 6 digits)
      if (await otpInputs.count() > 1) {
        // Multiple fields
        for (let i = 0; i < await otpInputs.count(); i++) {
          await otpInputs.nth(i).fill("1");
        }
      } else {
        // Single field
        await otpInputs.fill("123456");
      }

      await submitBtn.click();

      // Should navigate to password reset page
      await page.waitForURL(/.*reset-password|.*new-password/);
      await expect(page).toHaveURL(/.*reset-password|.*new-password/);
    });

    test("should show error on invalid OTP", async ({ page }) => {
      const otpInputs = page.locator('input[placeholder*="OTP" i], input[placeholder*="code" i]');
      const submitBtn = page.locator('button[type="submit"]');

      // Fill with invalid OTP
      if (await otpInputs.count() > 1) {
        for (let i = 0; i < await otpInputs.count(); i++) {
          await otpInputs.nth(i).fill("0");
        }
      } else {
        await otpInputs.fill("000000");
      }

      await submitBtn.click();

      const errorMsg = page.locator(".error-message");
      await expect(errorMsg).toBeVisible();
      await expect(errorMsg).toContainText(/invalid|incorrect|expired/i);
    });

    test("should handle OTP expiration", async ({ page }) => {
      const otpInputs = page.locator('input[placeholder*="OTP" i], input[placeholder*="code" i]');
      
      // Check if there's an expiration timer
      const timer = page.locator(".otp-timer, .timer, [class*='timer']");
      if (await timer.isVisible()) {
        await expect(timer).toContainText(/\d+:\d+|expired/i);
      }
    });
  });

  test.describe("Reset Password", () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to reset password page
      await page.goto("/user-reset-password");
    });

    test("should display password reset form", async ({ page }) => {
      const title = page.locator("h1");
      await expect(title).toContainText(/reset|new password/i);

      const newPasswordInput = page.locator('input[placeholder*="new password" i]');
      const confirmPasswordInput = page.locator('input[placeholder*="confirm|repeat" i]');

      await expect(newPasswordInput).toBeVisible();
      await expect(confirmPasswordInput).toBeVisible();
    });

    test("should validate required fields", async ({ page }) => {
      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();

      const errorMsg = page.locator(".error-message");
      await expect(errorMsg).toBeVisible();
    });

    test("should validate password strength", async ({ page }) => {
      const newPasswordInput = page.locator('input[placeholder*="new password" i]');
      const confirmPasswordInput = page.locator('input[placeholder*="confirm|repeat" i]');
      const submitBtn = page.locator('button[type="submit"]');

      await newPasswordInput.fill("weak");
      await confirmPasswordInput.fill("weak");
      await submitBtn.click();

      const errorMsg = page.locator(".error-message");
      await expect(errorMsg).toBeVisible();
      await expect(errorMsg).toContainText(/strong|password|requirement/i);
    });

    test("should validate password match", async ({ page }) => {
      const newPasswordInput = page.locator('input[placeholder*="new password" i]');
      const confirmPasswordInput = page.locator('input[placeholder*="confirm|repeat" i]');
      const submitBtn = page.locator('button[type="submit"]');

      await newPasswordInput.fill("SecurePass123!");
      await confirmPasswordInput.fill("DifferentPass123!");
      await submitBtn.click();

      const errorMsg = page.locator(".error-message");
      await expect(errorMsg).toBeVisible();
      await expect(errorMsg).toContainText(/match|confirm/i);
    });

    test("should successfully reset password with valid data", async ({
      page,
    }) => {
      const newPasswordInput = page.locator('input[placeholder*="new password" i]');
      const confirmPasswordInput = page.locator('input[placeholder*="confirm|repeat" i]');
      const submitBtn = page.locator('button[type="submit"]');

      await newPasswordInput.fill("NewSecurePass123!");
      await confirmPasswordInput.fill("NewSecurePass123!");
      await submitBtn.click();

      // Should show success message or navigate to login
      const successMsg = page.locator(".success-message");
      const isSuccess = await successMsg.isVisible().catch(() => false);

      if (isSuccess) {
        await expect(successMsg).toContainText(/success|reset|updated/i);
      }

      // Should eventually navigate to login
      await page.waitForURL(/.*user-login|.*login/);
    });

    test("should toggle password visibility", async ({ page }) => {
      const newPasswordInput = page.locator('input[placeholder*="new password" i]');
      const toggleBtns = page.locator(".show-password-button, .toggle-password");

      if (await toggleBtns.count() > 0) {
        await expect(newPasswordInput).toHaveAttribute("type", "password");
        await toggleBtns.first().click();
        await expect(newPasswordInput).toHaveAttribute("type", "text");
      }
    });
  });

  test.describe("Update Password from Profile", () => {
    test.beforeEach(async ({ page }) => {
      // Assuming user is already logged in
      await page.goto("/user-dashboard");
      // Navigate to account settings/profile
      const settingsLink = page.locator('a:has-text("Settings"), a:has-text("Account"), a:has-text("Profile")');
      if (await settingsLink.isVisible()) {
        await settingsLink.click();
      }
    });

    test("should display change password form", async ({ page }) => {
      const changePasswordSection = page.locator('[class*="password"], h2:has-text("Change"), h2:has-text("Update")');
      
      if (await changePasswordSection.count() > 0) {
        const currentPasswordInput = page.locator('input[placeholder*="current|old" i]');
        const newPasswordInput = page.locator('input[placeholder*="new password" i]');

        await expect(currentPasswordInput).toBeVisible();
        await expect(newPasswordInput).toBeVisible();
      }
    });

    test("should validate current password", async ({ page }) => {
      const currentPasswordInput = page.locator('input[placeholder*="current|old" i]');
      const newPasswordInput = page.locator('input[placeholder*="new password" i]');
      const confirmPasswordInput = page.locator('input[placeholder*="confirm|repeat" i]');
      const submitBtn = page.locator('button[type="submit"]').last();

      if (await currentPasswordInput.isVisible()) {
        await newPasswordInput.fill("NewSecurePass123!");
        await confirmPasswordInput.fill("NewSecurePass123!");
        await submitBtn.click();

        const errorMsg = page.locator(".error-message");
        await expect(errorMsg).toContainText(/current|old password/i);
      }
    });

    test("should successfully update password", async ({ page }) => {
      const currentPasswordInput = page.locator('input[placeholder*="current|old" i]');
      const newPasswordInput = page.locator('input[placeholder*="new password" i]');
      const confirmPasswordInput = page.locator('input[placeholder*="confirm|repeat" i]');
      const submitBtn = page.locator('button[type="submit"]').last();

      if (await currentPasswordInput.isVisible()) {
        await currentPasswordInput.fill("CurrentPassword123!");
        await newPasswordInput.fill("NewSecurePass456!");
        await confirmPasswordInput.fill("NewSecurePass456!");
        await submitBtn.click();

        const successMsg = page.locator(".success-message");
        await expect(successMsg).toContainText(/success|updated/i);
      }
    });
  });
});
