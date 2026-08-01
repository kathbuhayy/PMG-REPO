const { test, expect } = require("@playwright/test");

test.describe("PrintHub Customer Authentication", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the user login page before each test
    await page.goto("/user-login");
  });

  test("should render the login form correctly", async ({ page }) => {
    // Check that brand name and header welcome text are visible
    await expect(page.locator(".auth-mini-brand strong")).toHaveText(
      "PrintHub"
    );
    await expect(page.locator(".login-header h1")).toHaveText(
      "Welcome Back"
    );

    // Verify fields and buttons exist
    const emailInput = page.locator(
      'input[placeholder="customer@example.com"]'
    );
    await expect(emailInput).toBeVisible();

    const passwordInput = page.locator(
      'input[placeholder="Enter your password"]'
    );
    await expect(passwordInput).toBeVisible();

    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
  });

  test("should toggle password visibility", async ({ page }) => {
    const passwordInput = page.locator(
      'input[placeholder="Enter your password"]'
    );
    const toggleBtn = page.locator(".show-password-button");

    // Initially type password, check input type
    await expect(passwordInput).toHaveAttribute("type", "password");

    // Click toggle to reveal password
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    // Click toggle again to hide password
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("should show error on empty submit", async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Verify error message is rendered
    const errorMsg = page.locator(".error-message");
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText("Email and password are required");
  });

  test("should trigger forgot password modal", async ({ page }) => {
    const forgotLink = page.locator(".forgot-password");
    await expect(forgotLink).toBeVisible();

    // Click link to open modal
    await forgotLink.click();
    const modalHeader = page.locator(".forgot-password-modal h2");
    await expect(modalHeader).toBeVisible();
    await expect(modalHeader).toHaveText("Forgot your password?");

    // Click cancel to close
    const cancelBtn = page.locator(".modal-button.cancel");
    await cancelBtn.click();
    await expect(page.locator(".forgot-password-modal")).not.toBeVisible();
  });

  test("should navigate to register page and validate fields", async ({
    page,
  }) => {
    const createBtn = page.locator(".auth-text-link");
    await expect(createBtn).toBeVisible();

    // Navigate to registration page
    await createBtn.click();
    await expect(page).toHaveURL(/\/user-register/);
    await expect(page.locator(".registration-header h1")).toHaveText(
      "Create Account"
    );

    // Submit registration without entering values to trigger validation
    const registerBtn = page.locator('button[type="submit"]');
    await registerBtn.click();

    // Validate that form highlights required fields
    const errorMsg = page.locator(".error-message");
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText("Please fill in all required fields");
  });
});
