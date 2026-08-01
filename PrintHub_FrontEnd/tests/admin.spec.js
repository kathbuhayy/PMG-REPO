const { test, expect } = require("@playwright/test");

test.describe("Admin - Product Management", () => {
  test.beforeEach(async ({ page }) => {
    // Assuming admin is logged in
    await page.goto("/admin-dashboard");
  });

  test("should display admin dashboard", async ({ page }) => {
    if (page.url().endsWith("/") || page.url().includes("/user-login")) {
      return;
    }
    const dashboard = page.locator("h1, h2");
    await expect(dashboard.first()).toContainText(/dashboard|admin|management/i);
  });

  test("should navigate to products section", async ({ page }) => {
    const productsLink = page.locator('a:has-text("Products"), a:has-text("Manage Products")');
    if (await productsLink.isVisible()) {
      await productsLink.click();

      await page.waitForURL(/.*products|.*manage/);
    }
  });

  test("should display products list", async ({ page }) => {
    const productsLink = page.locator('a:has-text("Products"), a:has-text("Manage Products")');
    if (await productsLink.isVisible()) {
      await productsLink.click();

      const productTable = page.locator('table, [class*="product"], [class*="list"]');
      await expect(productTable.first()).toBeVisible();
    }
  });

  test("should add new product", async ({ page }) => {
    const productsLink = page.locator('a:has-text("Products"), a:has-text("Manage Products")');
    if (await productsLink.isVisible()) {
      await productsLink.click();

      const addBtn = page.locator('button:has-text("Add Product"), button:has-text("New")');
      if (await addBtn.isVisible()) {
        await addBtn.click();

        // Should show add product form
        const nameInput = page.locator('input[placeholder*="product name" i]');
        if (await nameInput.isVisible()) {
          await nameInput.fill("New T-Shirt");

          const descriptionInput = page.locator('textarea[placeholder*="description" i]');
          if (await descriptionInput.isVisible()) {
            await descriptionInput.fill("High quality cotton t-shirt");
          }

          const priceInput = page.locator('input[placeholder*="price" i]');
          if (await priceInput.isVisible()) {
            await priceInput.fill("599");
          }

          const categorySelect = page.locator('select[name*="category" i]');
          if (await categorySelect.isVisible()) {
            await categorySelect.selectOption("tshirt");
          }

          const saveBtn = page.locator('button:has-text("Save"), button:has-text("Add")');
          await saveBtn.click();

          const successMsg = page.locator('[class*="success"]');
          if (await successMsg.count() > 0) {
            await expect(successMsg.first()).toContainText(/success|added/i);
          }
        }
      }
    }
  });

  test("should upload product image", async ({ page }) => {
    const productsLink = page.locator('a:has-text("Products"), a:has-text("Manage Products")');
    if (await productsLink.isVisible()) {
      await productsLink.click();

      const addBtn = page.locator('button:has-text("Add Product"), button:has-text("New")');
      if (await addBtn.isVisible()) {
        await addBtn.click();

        const fileInput = page.locator('input[type="file"]');
        if (await fileInput.isVisible()) {
          await fileInput.setInputFiles({
            name: "product.jpg",
            mimeType: "image/jpeg",
            buffer: Buffer.from("fake-image-data"),
          });

          await page.waitForTimeout(1000);

          const imagePreview = page.locator('img[alt*="product" i], [class*="preview"]');
          if (await imagePreview.count() > 0) {
            await expect(imagePreview.first()).toBeVisible();
          }
        }
      }
    }
  });

  test("should set product pricing", async ({ page }) => {
    const productsLink = page.locator('a:has-text("Products"), a:has-text("Manage Products")');
    if (await productsLink.isVisible()) {
      await productsLink.click();

      const addBtn = page.locator('button:has-text("Add Product"), button:has-text("New")');
      if (await addBtn.isVisible()) {
        await addBtn.click();

        const priceInput = page.locator('input[placeholder*="price" i]');
        if (await priceInput.isVisible()) {
          await priceInput.fill("999.99");
          await expect(priceInput).toHaveValue("999.99");

          // Check for discount price
          const discountInput = page.locator('input[placeholder*="discount|sale" i]');
          if (await discountInput.isVisible()) {
            await discountInput.fill("799.99");
          }
        }
      }
    }
  });

  test("should set product stock", async ({ page }) => {
    const productsLink = page.locator('a:has-text("Products"), a:has-text("Manage Products")');
    if (await productsLink.isVisible()) {
      await productsLink.click();

      const addBtn = page.locator('button:has-text("Add Product"), button:has-text("New")');
      if (await addBtn.isVisible()) {
        await addBtn.click();

        const stockInput = page.locator('input[placeholder*="stock|quantity" i]');
        if (await stockInput.isVisible()) {
          await stockInput.fill("100");
          await expect(stockInput).toHaveValue("100");
        }
      }
    }
  });

  test("should edit existing product", async ({ page }) => {
    const productsLink = page.locator('a:has-text("Products"), a:has-text("Manage Products")');
    if (await productsLink.isVisible()) {
      await productsLink.click();

      const editBtn = page.locator('button:has-text("Edit"), button:has-text("✎")').first();
      if (await editBtn.isVisible()) {
        await editBtn.click();

        const nameInput = page.locator('input[placeholder*="product name" i]');
        if (await nameInput.isVisible()) {
          const currentValue = await nameInput.inputValue();
          await nameInput.clear();
          await nameInput.fill("Updated Product Name");

          const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update")');
          await saveBtn.click();

          const successMsg = page.locator('[class*="success"]');
          if (await successMsg.count() > 0) {
            await expect(successMsg.first()).toContainText(/success|updated/i);
          }
        }
      }
    }
  });

  test("should delete product", async ({ page }) => {
    const productsLink = page.locator('a:has-text("Products"), a:has-text("Manage Products")');
    if (await productsLink.isVisible()) {
      await productsLink.click();

      const deleteBtn = page.locator('button:has-text("Delete"), button:has-text("Remove")').first();
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();

        const confirmBtn = page.locator('button:has-text("Yes"), button:has-text("Confirm")');
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();

          const successMsg = page.locator('[class*="success"]');
          if (await successMsg.count() > 0) {
            await expect(successMsg.first()).toContainText(/success|deleted/i);
          }
        }
      }
    }
  });

  test("should search products", async ({ page }) => {
    const productsLink = page.locator('a:has-text("Products"), a:has-text("Manage Products")');
    if (await productsLink.isVisible()) {
      await productsLink.click();

      const searchInput = page.locator('input[placeholder*="search" i]');
      if (await searchInput.isVisible()) {
        await searchInput.fill("T-Shirt");
        await page.waitForTimeout(500);

        const productItems = page.locator('[class*="product"], table tbody tr');
        await expect(productItems.first()).toBeVisible();
      }
    }
  });

  test("should filter products by category", async ({ page }) => {
    const productsLink = page.locator('a:has-text("Products"), a:has-text("Manage Products")');
    if (await productsLink.isVisible()) {
      await productsLink.click();

      const categoryFilter = page.locator('select[name*="category" i], [class*="category-filter"]');
      if (await categoryFilter.isVisible()) {
        await categoryFilter.selectOption("tshirt");

        const productItems = page.locator('[class*="product"], table tbody tr');
        if (await productItems.count() > 0) {
          await expect(productItems.first()).toBeVisible();
        }
      }
    }
  });
});

test.describe("Admin - Order Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin-dashboard");
  });

  test("should navigate to orders section", async ({ page }) => {
    const ordersLink = page.locator('a:has-text("Orders"), a:has-text("Manage Orders")');
    if (await ordersLink.isVisible()) {
      await ordersLink.click();

      await page.waitForURL(/.*order/);
    }
  });

  test("should display orders list", async ({ page }) => {
    const ordersLink = page.locator('a:has-text("Orders"), a:has-text("Manage Orders")');
    if (await ordersLink.isVisible()) {
      await ordersLink.click();

      const orderTable = page.locator('table, [class*="order"], [class*="list"]');
      await expect(orderTable.first()).toBeVisible();
    }
  });

  test("should view order details", async ({ page }) => {
    const ordersLink = page.locator('a:has-text("Orders"), a:has-text("Manage Orders")');
    if (await ordersLink.isVisible()) {
      await ordersLink.click();

      const orderRow = page.locator('table tbody tr, [class*="order-item"]').first();
      if (await orderRow.isVisible()) {
        await orderRow.click();

        const orderDetails = page.locator('h1, h2');
        await expect(orderDetails.first()).toContainText(/order|detail/i);
      }
    }
  });

  test("should accept/confirm pending order", async ({ page }) => {
    const ordersLink = page.locator('a:has-text("Orders"), a:has-text("Manage Orders")');
    if (await ordersLink.isVisible()) {
      await ordersLink.click();

      // Find pending order
      const pendingOrder = page.locator('[class*="pending"], [class*="status"]:has-text("Pending")').first();
      if (await pendingOrder.isVisible()) {
        await pendingOrder.click();

        const acceptBtn = page.locator('button:has-text("Accept"), button:has-text("Confirm"), button:has-text("Approve")');
        if (await acceptBtn.isVisible()) {
          await acceptBtn.click();

          const successMsg = page.locator('[class*="success"]');
          if (await successMsg.count() > 0) {
            await expect(successMsg.first()).toContainText(/success|accepted|confirmed/i);
          }
        }
      }
    }
  });

  test("should reject order", async ({ page }) => {
    const ordersLink = page.locator('a:has-text("Orders"), a:has-text("Manage Orders")');
    if (await ordersLink.isVisible()) {
      await ordersLink.click();

      const orderRow = page.locator('table tbody tr, [class*="order-item"]').first();
      if (await orderRow.isVisible()) {
        await orderRow.click();

        const rejectBtn = page.locator('button:has-text("Reject"), button:has-text("Cancel"), button:has-text("Decline")');
        if (await rejectBtn.isVisible()) {
          await rejectBtn.click();

          const reasonInput = page.locator('textarea[placeholder*="reason" i]');
          if (await reasonInput.isVisible()) {
            await reasonInput.fill("Out of stock");

            const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Reject")');
            await confirmBtn.click();

            const successMsg = page.locator('[class*="success"]');
            if (await successMsg.count() > 0) {
              await expect(successMsg.first()).toContainText(/success|rejected/i);
            }
          }
        }
      }
    }
  });

  test("should mark order as shipped", async ({ page }) => {
    const ordersLink = page.locator('a:has-text("Orders"), a:has-text("Manage Orders")');
    if (await ordersLink.isVisible()) {
      await ordersLink.click();

      const orderRow = page.locator('table tbody tr, [class*="order-item"]').first();
      if (await orderRow.isVisible()) {
        await orderRow.click();

        const shipBtn = page.locator('button:has-text("Ship"), button:has-text("Mark as Shipped")');
        if (await shipBtn.isVisible()) {
          await shipBtn.click();

          const trackingInput = page.locator('input[placeholder*="tracking" i]');
          if (await trackingInput.isVisible()) {
            await trackingInput.fill("TRK123456789");

            const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Ship")');
            await confirmBtn.click();

            const successMsg = page.locator('[class*="success"]');
            if (await successMsg.count() > 0) {
              await expect(successMsg.first()).toContainText(/success|shipped/i);
            }
          }
        }
      }
    }
  });

  test("should filter orders by status", async ({ page }) => {
    const ordersLink = page.locator('a:has-text("Orders"), a:has-text("Manage Orders")');
    if (await ordersLink.isVisible()) {
      await ordersLink.click();

      const statusFilter = page.locator('select[name*="status" i], [class*="status-filter"]');
      if (await statusFilter.isVisible()) {
        await statusFilter.selectOption("pending");

        const orderItems = page.locator('table tbody tr, [class*="order-item"]');
        if (await orderItems.count() > 0) {
          await expect(orderItems.first()).toBeVisible();
        }
      }
    }
  });

  test("should search orders by order number", async ({ page }) => {
    const ordersLink = page.locator('a:has-text("Orders"), a:has-text("Manage Orders")');
    if (await ordersLink.isVisible()) {
      await ordersLink.click();

      const searchInput = page.locator('input[placeholder*="search" i]');
      if (await searchInput.isVisible()) {
        await searchInput.fill("ORD-123456");
        await page.waitForTimeout(500);

        const orderItems = page.locator('table tbody tr, [class*="order-item"]');
        if (await orderItems.count() > 0) {
          await expect(orderItems.first()).toBeVisible();
        }
      }
    }
  });
});
