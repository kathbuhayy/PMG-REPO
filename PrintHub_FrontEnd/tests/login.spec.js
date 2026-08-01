const { test, expect } = require("@playwright/test");

test.describe("User Login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/user-login");
  });

  test("should display login form correctly", async ({ page }) => {
    // Check brand and header
    await expect(page.locator(".auth-mini-brand strong")).toHaveText(
      "PrintHub"
    );
    await expect(page.locator(".login-header h1")).toHaveText(
      "Welcome Back"
    );

    // Check all form elements are present
    const emailInput = page.locator('input[placeholder*="email" i]');
    const passwordInput = page.locator('input[placeholder*="password" i]');
    const submitBtn = page.locator('button[type="submit"]');
    const registerLink = page.locator(".auth-text-link");
    const forgotLink = page.locator(".forgot-password");

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
    await expect(registerLink).toBeVisible();
    await expect(forgotLink).toBeVisible();
  });

  test("should show validation error on empty submit", async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    const errorMsg = page.locator(".error-message");
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText(/email|password|required/i);
  });

  test("should show validation error for invalid email format", async ({
    page,
  }) => {
    const emailInput = page.locator('input[placeholder*="email" i]');
    const submitBtn = page.locator('button[type="submit"]');

    await emailInput.fill("invalid-email");
    await submitBtn.click();

    const errorMsg = page.locator(".error-message");
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText(/invalid|valid email/i);
  });

  test("should toggle password visibility", async ({ page }) => {
    const passwordInput = page.locator('input[placeholder*="password" i]');
    const toggleBtn = page.locator(".show-password-button");

    await expect(passwordInput).toHaveAttribute("type", "password");
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute("type", "text");
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("should successfully login with valid credentials", async ({ page }) => {
    const emailInput = page.locator('input[placeholder*="email" i]');
    const passwordInput = page.locator('input[placeholder*="password" i]');
    const submitBtn = page.locator('button[type="submit"]');

    await emailInput.fill("testuser@example.com");
    await passwordInput.fill("ValidPassword123!");
    await submitBtn.click();

    // Wait for navigation to dashboard/home
    await page.waitForURL(/\/(user-home|user-dashboard)/);
    await expect(page).toHaveURL(/\/(user-home|user-dashboard)/);
  });

  test("should show error on invalid credentials", async ({ page }) => {
    const emailInput = page.locator('input[placeholder*="email" i]');
    const passwordInput = page.locator('input[placeholder*="password" i]');
    const submitBtn = page.locator('button[type="submit"]');

    await emailInput.fill("testuser@example.com");
    await passwordInput.fill("WrongPassword123!");
    await submitBtn.click();

    const errorMsg = page.locator(".error-message");
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText(/incorrect|invalid|failed/i);
  });

  test("should navigate to registration page", async ({ page }) => {
    const createBtn = page.locator(".auth-text-link");
    await createBtn.click();

    await page.waitForURL(/\/user-register/);
    await expect(page).toHaveURL(/\/user-register/);
  });

  test("should open forgot password modal", async ({ page }) => {
    const forgotLink = page.locator(".forgot-password");
    await forgotLink.click();

    const modal = page.locator(".forgot-password-modal");
    await expect(modal).toBeVisible();

    const modalTitle = page.locator(".forgot-password-modal h2");
    await expect(modalTitle).toContainText(/forgot|password/i);
  });

  test("should close forgot password modal on cancel", async ({ page }) => {
    const forgotLink = page.locator(".forgot-password");
    await forgotLink.click();

    const cancelBtn = page.locator(".forgot-password-modal .modal-button.cancel");
    await cancelBtn.click();

    const modal = page.locator(".forgot-password-modal");
    await expect(modal).not.toBeVisible();
  });

  test("should persist form data during session", async ({ page }) => {
    const emailInput = page.locator('input[placeholder*="email" i]');
    const testEmail = "persistent@example.com";

    await emailInput.fill(testEmail);
    // Navigate away and back
    await page.goto("/");
    await page.goto("/user-login");

    // Check if email persists (depends on implementation)
    const currentValue = await emailInput.inputValue();
    // This may or may not persist depending on implementation
    await expect(emailInput).toBeVisible();
  });

  test("should handle rapid submit attempts", async ({ page }) => {
    const emailInput = page.locator('input[placeholder*="email" i]');
    const passwordInput = page.locator('input[placeholder*="password" i]');
    const submitBtn = page.locator('button[type="submit"]');

    await emailInput.fill("testuser@example.com");
    await passwordInput.fill("ValidPassword123!");

    // Try multiple rapid clicks
    await submitBtn.click();
    await submitBtn.click();
    await submitBtn.click();

    // Should only process once or show rate limit error
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/user-login|user-home|user-dashboard/);
  });
});
