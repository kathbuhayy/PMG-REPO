const { test, expect } = require("@playwright/test");

test.describe("User Registration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/user-register");
  });

  test("should display registration form correctly", async ({ page }) => {
    await expect(page.locator(".login-header h1")).toHaveText(
      "Create Account"
    );

    const firstNameInput = page.locator("#firstName");
    const lastNameInput = page.locator("#lastName");
    const emailInput = page.locator("#email");
    const phoneInput = page.locator("#phone");
    const passwordInput = page.locator("#password");
    const submitBtn = page.locator('button[type="submit"]');
    const loginLink = page.locator(".auth-text-link");

    await expect(firstNameInput).toBeVisible();
    await expect(lastNameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(phoneInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
    await expect(loginLink).toBeVisible();
  });

  test("should show validation error on empty submit", async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    const errorMsg = page.locator(".error-message");
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText(/required|fill/i);
  });

  test("should validate first name", async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    const errorMsg = page.locator(".error-message");
    await expect(errorMsg).toBeVisible();
  });

  test("should validate last name", async ({ page }) => {
    const firstNameInput = page.locator("#firstName");
    const submitBtn = page.locator('button[type="submit"]');

    await firstNameInput.fill("John");
    await submitBtn.click();

    const errorMsg = page.locator(".error-message");
    await expect(errorMsg).toBeVisible();
  });

  test("should validate email format", async ({ page }) => {
    const firstNameInput = page.locator("#firstName");
    const lastNameInput = page.locator("#lastName");
    const emailInput = page.locator("#email");
    const submitBtn = page.locator('button[type="submit"]');

    await firstNameInput.fill("John");
    await lastNameInput.fill("Doe");
    await emailInput.fill("invalid-email");
    await submitBtn.click();

    const errorMsg = page.locator(".error-message");
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText(/email|valid/i);
  });

  test("should validate phone number format", async ({ page }) => {
    const firstNameInput = page.locator("#firstName");
    const lastNameInput = page.locator("#lastName");
    const emailInput = page.locator("#email");
    const phoneInput = page.locator("#phone");
    const submitBtn = page.locator('button[type="submit"]');

    await firstNameInput.fill("John");
    await lastNameInput.fill("Doe");
    await emailInput.fill("john@example.com");
    await phoneInput.fill("123");
    await submitBtn.click();

    const errorMsg = page.locator(".error-message");
    await expect(errorMsg).toBeVisible();
  });

  test("should validate password strength", async ({ page }) => {
    const firstNameInput = page.locator("#firstName");
    const lastNameInput = page.locator("#lastName");
    const emailInput = page.locator("#email");
    const phoneInput = page.locator("#phone");
    const passwordInput = page.locator("#password");
    const submitBtn = page.locator('button[type="submit"]');

    await firstNameInput.fill("John");
    await lastNameInput.fill("Doe");
    await emailInput.fill("john@example.com");
    await phoneInput.fill("09123456789");
    await passwordInput.fill("weak");
    await submitBtn.click();

    const errorMsg = page.locator(".error-message");
    await expect(errorMsg).toBeVisible();
  });

  test("should successfully register with valid data", async ({ page }) => {
    const firstNameInput = page.locator("#firstName");
    const lastNameInput = page.locator("#lastName");
    const emailInput = page.locator("#email");
    const phoneInput = page.locator("#phone");
    const passwordInput = page.locator("#password");
    const confirmPasswordInput = page.locator("#confirmPassword");
    const submitBtn = page.locator('button[type="submit"]');

    await firstNameInput.fill("John");
    await lastNameInput.fill("Doe");
    await emailInput.fill("john.doe@example.com");
    await phoneInput.fill("09123456789");
    await passwordInput.fill("SecurePass1!");
    await confirmPasswordInput.fill("SecurePass1!");
    await submitBtn.click();

    await page.waitForURL(/\/(user-otp|user-login)/);
    await expect(page).toHaveURL(/\/(user-otp|user-login)/);
  });

  test("should handle duplicate email registration", async ({ page }) => {
    const firstNameInput = page.locator("#firstName");
    const lastNameInput = page.locator("#lastName");
    const emailInput = page.locator("#email");
    const phoneInput = page.locator("#phone");
    const passwordInput = page.locator("#password");
    const confirmPasswordInput = page.locator("#confirmPassword");
    const submitBtn = page.locator('button[type="submit"]');

    await firstNameInput.fill("Jane");
    await lastNameInput.fill("Smith");
    await emailInput.fill("existing@example.com");
    await phoneInput.fill("09987654321");
    await passwordInput.fill("SecurePass1!");
    await confirmPasswordInput.fill("SecurePass1!");
    await submitBtn.click();

    const errorMsg = page.locator(".error-message");
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText(/already exists|registered/i);
  });

  test("should toggle password visibility", async ({ page }) => {
    const passwordInput = page.locator("#password");
    const toggleBtn = page.locator(".show-password-button").first();

    await expect(passwordInput).toHaveAttribute("type", "password");
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute("type", "text");
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("should navigate to login page", async ({ page }) => {
    const loginLink = page.locator(".auth-text-link");
    await loginLink.click();

    await page.waitForURL(/\/user-login/);
    await expect(page).toHaveURL(/\/user-login/);
  });

  test(
    "should handle registration with special characters in name",
    async ({ page }) => {
      const firstNameInput = page.locator("#firstName");
      const lastNameInput = page.locator("#lastName");
      const emailInput = page.locator("#email");
      const phoneInput = page.locator("#phone");
      const passwordInput = page.locator("#password");
      const confirmPasswordInput = page.locator("#confirmPassword");
      const submitBtn = page.locator('button[type="submit"]');

      await firstNameInput.fill("Jean");
      await lastNameInput.fill("OConnor");
      await emailInput.fill("jean.pierre@example.com");
      await phoneInput.fill("09123456789");
      await passwordInput.fill("SecurePass1!");
      await confirmPasswordInput.fill("SecurePass1!");
      await submitBtn.click();

      await page.waitForURL(/\/(user-otp|user-login)/);
    }
  );
});
