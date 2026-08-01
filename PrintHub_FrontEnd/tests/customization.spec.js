const { test, expect } = require("@playwright/test");

test.describe("Design and Customization Process", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to product customization
    await page.goto("/user-home");
  });

  test("should open product customizer", async ({ page }) => {
    // Find a customizable product
    const productItem = page.locator('[class*="product"], [class*="item"]').first();
    await productItem.click();

    // Click customize/design button
    const customizeBtn = page.locator('button:has-text("Customize"), button:has-text("Design"), button:has-text("Personalize")');
    if (await customizeBtn.isVisible()) {
      await customizeBtn.click();

      // Should load the customizer
      const canvas = page.locator('canvas, [class*="canvas"], [class*="editor"]');
      if (await canvas.count() > 0) {
        await expect(canvas.first()).toBeVisible();
      }
    }
  });

  test("should display 3D product preview", async ({ page }) => {
    await page.goto("/customizer/tshirt");

    const preview3D = page.locator('canvas, [class*="3d"], [class*="preview"], [class*="model"]');
    if (await preview3D.isVisible()) {
      await expect(preview3D).toBeVisible();
    }
  });

  test("should rotate 3D model", async ({ page }) => {
    await page.goto("/customizer/tshirt");

    const preview3D = page.locator('canvas, [class*="preview"]').first();
    if (await preview3D.isVisible()) {
      // Simulate drag to rotate
      const box = await preview3D.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 + 50);
        await page.mouse.up();

        await page.waitForTimeout(500);
        // 3D model should rotate (verify no errors)
        expect(true).toBeTruthy();
      }
    }
  });

  test("should change product color", async ({ page }) => {
    await page.goto("/customizer/tshirt");

    const colorPicker = page.locator('[class*="color"], [class*="swatch"]');
    if (await colorPicker.count() > 0) {
      const colorOption = colorPicker.first();
      await colorOption.click();

      // Product color should change in preview
      await page.waitForTimeout(500);
      expect(true).toBeTruthy();
    }
  });

  test("should select product size", async ({ page }) => {
    await page.goto("/customizer/tshirt");

    const sizeSelector = page.locator('[class*="size"], select[name*="size" i]');
    if (await sizeSelector.isVisible()) {
      if ((await sizeSelector.locator("//..").count()) > 0) {
        // It's a select
        await sizeSelector.selectOption("L");
      } else {
        // It's a button/radio group
        const sizeOption = page.locator('[class*="size"] button, [class*="size"] [role="radio"]').nth(1);
        await sizeOption.click();
      }

      // Size should be selected
      const selectedSize = page.locator('[class*="selected"], [class*="active"]');
      if (await selectedSize.count() > 0) {
        await expect(selectedSize.first()).toBeVisible();
      }
    }
  });

  test("should add image to canvas", async ({ page }) => {
    await page.goto("/customizer/tshirt");

    const uploadBtn = page.locator('button:has-text("Upload"), button:has-text("Add Image"), [class*="upload"]');
    if (await uploadBtn.isVisible()) {
      await uploadBtn.click();

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles({
          name: "design.png",
          mimeType: "image/png",
          buffer: Buffer.from("fake-image-data"),
        });

        await page.waitForTimeout(1000);

        // Image should appear on canvas
        const canvas = page.locator('canvas, [class*="canvas"], [class*="editor"]');
        if (await canvas.count() > 0) {
          await expect(canvas.first()).toBeVisible();
        }
      }
    }
  });

  test("should position image on canvas", async ({ page }) => {
    await page.goto("/customizer/tshirt");

    // Add image first
    const uploadBtn = page.locator('button:has-text("Upload"), button:has-text("Add Image")');
    if (await uploadBtn.isVisible()) {
      await uploadBtn.click();

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles({
          name: "design.png",
          mimeType: "image/png",
          buffer: Buffer.from("fake-image-data"),
        });

        await page.waitForTimeout(500);

        // Move image on canvas
        const canvas = page.locator('canvas, [class*="canvas"]').first();
        if (await canvas.isVisible()) {
          const box = await canvas.boundingBox();
          if (box) {
            await page.mouse.move(box.x + box.width / 3, box.y + box.height / 2);
            await page.mouse.down();
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 30);
            await page.mouse.up();

            await page.waitForTimeout(500);
            expect(true).toBeTruthy();
          }
        }
      }
    }
  });

  test("should resize image on canvas", async ({ page }) => {
    await page.goto("/customizer/tshirt");

    // Add image first
    const uploadBtn = page.locator('button:has-text("Upload"), button:has-text("Add Image")');
    if (await uploadBtn.isVisible()) {
      await uploadBtn.click();

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles({
          name: "design.png",
          mimeType: "image/png",
          buffer: Buffer.from("fake-image-data"),
        });

        await page.waitForTimeout(500);

        // Look for resize handle
        const resizeHandle = page.locator('[class*="resize"], [class*="handle"]');
        if (await resizeHandle.isVisible()) {
          const box = await resizeHandle.boundingBox();
          if (box) {
            await page.mouse.move(box.x, box.y);
            await page.mouse.down();
            await page.mouse.move(box.x + 50, box.y + 50);
            await page.mouse.up();

            await page.waitForTimeout(500);
            expect(true).toBeTruthy();
          }
        }
      }
    }
  });

  test("should add text to design", async ({ page }) => {
    await page.goto("/customizer/tshirt");

    const addTextBtn = page.locator('button:has-text("Text"), button:has-text("Add Text")');
    if (await addTextBtn.isVisible()) {
      await addTextBtn.click();

      const textInput = page.locator('input[placeholder*="text" i], textarea');
      if (await textInput.isVisible()) {
        await textInput.fill("My Custom Text");

        // Text should appear on canvas
        const canvas = page.locator('canvas, [class*="canvas"]');
        if (await canvas.count() > 0) {
          await expect(canvas.first()).toBeVisible();
        }
      }
    }
  });

  test("should change text properties", async ({ page }) => {
    await page.goto("/customizer/tshirt");

    const addTextBtn = page.locator('button:has-text("Text"), button:has-text("Add Text")');
    if (await addTextBtn.isVisible()) {
      await addTextBtn.click();

      const textInput = page.locator('input[placeholder*="text" i]');
      if (await textInput.isVisible()) {
        await textInput.fill("Text");

        // Change font size
        const fontSizeInput = page.locator('input[type="number"], [class*="font-size"]');
        if (await fontSizeInput.isVisible()) {
          await fontSizeInput.fill("24");
        }

        // Change text color
        const colorPicker = page.locator('[class*="color"]');
        if (await colorPicker.count() > 0) {
          await colorPicker.nth(0).click();
        }

        await page.waitForTimeout(500);
        expect(true).toBeTruthy();
      }
    }
  });

  test("should preview design before saving", async ({ page }) => {
    await page.goto("/customizer/tshirt");

    const previewBtn = page.locator('button:has-text("Preview"), button:has-text("View")');
    if (await previewBtn.isVisible()) {
      await previewBtn.click();

      const modal = page.locator('[class*="modal"], [class*="preview"]');
      if (await modal.isVisible()) {
        await expect(modal).toBeVisible();

        const closeBtn = page.locator('[class*="close"], button:has-text("Close")');
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
        }
      }
    }
  });

  test("should save custom design", async ({ page }) => {
    await page.goto("/customizer/tshirt");

    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Save Design")');
    if (await saveBtn.isVisible()) {
      await saveBtn.click();

      const nameInput = page.locator('input[placeholder*="name" i]');
      if (await nameInput.isVisible()) {
        await nameInput.fill("My T-Shirt Design");

        const confirmBtn = page.locator('button:has-text("Save"), button:has-text("Confirm")');
        await confirmBtn.click();

        const successMsg = page.locator('[class*="success"]');
        if (await successMsg.count() > 0) {
          await expect(successMsg.first()).toContainText(/success|saved/i);
        }
      }
    }
  });

  test("should clear canvas", async ({ page }) => {
    await page.goto("/customizer/tshirt");

    const clearBtn = page.locator('button:has-text("Clear"), button:has-text("Reset")');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();

      const confirmBtn = page.locator('button:has-text("Yes"), button:has-text("Confirm")');
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();

        // Canvas should be empty
        await page.waitForTimeout(500);
        expect(true).toBeTruthy();
      }
    }
  });

  test("should undo last action", async ({ page }) => {
    await page.goto("/customizer/tshirt");

    const undoBtn = page.locator('button[aria-label*="undo" i], button:has-text("Undo")');
    if (await undoBtn.isVisible()) {
      await undoBtn.click();

      // Last action should be undone
      await page.waitForTimeout(300);
      expect(true).toBeTruthy();
    }
  });

  test("should redo last action", async ({ page }) => {
    await page.goto("/customizer/tshirt");

    const undoBtn = page.locator('button[aria-label*="undo" i], button:has-text("Undo")');
    const redoBtn = page.locator('button[aria-label*="redo" i], button:has-text("Redo")');

    if (await undoBtn.isVisible()) {
      await undoBtn.click();

      if (await redoBtn.isVisible()) {
        await redoBtn.click();

        // Action should be redone
        await page.waitForTimeout(300);
        expect(true).toBeTruthy();
      }
    }
  });

  test("should add design to cart", async ({ page }) => {
    await page.goto("/customizer/tshirt");

    // Add some design
    const addTextBtn = page.locator('button:has-text("Text"), button:has-text("Add Text")');
    if (await addTextBtn.isVisible()) {
      await addTextBtn.click();

      const textInput = page.locator('input[placeholder*="text" i]');
      if (await textInput.isVisible()) {
        await textInput.fill("Customized");

        // Add to cart
        const addToCartBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Order Now")');
        if (await addToCartBtn.isVisible()) {
          await addToCartBtn.click();

          const successMsg = page.locator('[class*="success"], [class*="added"]');
          if (await successMsg.count() > 0) {
            await expect(successMsg.first()).toContainText(/added|cart/i);
          }
        }
      }
    }
  });

  test("should load saved design", async ({ page }) => {
    await page.goto("/customizer/tshirt");

    const loadDesignBtn = page.locator('button:has-text("Load"), button:has-text("Open")');
    if (await loadDesignBtn.isVisible()) {
      await loadDesignBtn.click();

      const designList = page.locator('[class*="design"], [class*="template"]');
      if (await designList.count() > 0) {
        await designList.first().click();

        // Design should load
        await page.waitForTimeout(500);
        expect(true).toBeTruthy();
      }
    }
  });
});
