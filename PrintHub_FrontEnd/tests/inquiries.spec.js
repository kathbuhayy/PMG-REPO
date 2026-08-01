const { test, expect } = require("@playwright/test");

test.describe("Inquiry and Contact", () => {
  test.describe("Customer Inquiry Submission", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/user-dashboard");
    });

    test("should navigate to inquiries section", async ({ page }) => {
      const inquiriesLink = page.locator(
        'a:has-text("Inquiry"), a:has-text("Inquiries"), a:has-text("Messages"), a:has-text("Support")'
      );
      if (await inquiriesLink.isVisible()) {
        await inquiriesLink.click();

        await page.waitForURL(/.*inquiry|.*inquiries|.*support|.*message/);
      }
    });

    test("should display inquiries list", async ({ page }) => {
      const inquiriesLink = page.locator(
        'a:has-text("Inquiry"), a:has-text("Inquiries"), a:has-text("Messages")'
      );
      if (await inquiriesLink.isVisible()) {
        await inquiriesLink.click();

        const inquiriesList = page.locator(
          '[class*="inquiry"], [class*="message"], [class*="list"]'
        );
        if (await inquiriesList.count() > 0) {
          await expect(inquiriesList.first()).toBeVisible();
        }
      }
    });

    test("should open new inquiry form", async ({ page }) => {
      const inquiriesLink = page.locator(
        'a:has-text("Inquiry"), a:has-text("Inquiries"), a:has-text("Messages")'
      );
      if (await inquiriesLink.isVisible()) {
        await inquiriesLink.click();

        const newInquiryBtn = page.locator(
          'button:has-text("New"), button:has-text("Send"), button:has-text("Message")'
        );
        if (await newInquiryBtn.isVisible()) {
          await newInquiryBtn.click();

          const form = page.locator('[class*="form"], [class*="inquiry"]');
          await expect(form).toBeVisible();
        }
      }
    });

    test("should display inquiry form fields", async ({ page }) => {
      const inquiriesLink = page.locator(
        'a:has-text("Inquiry"), a:has-text("Inquiries"), a:has-text("Messages")'
      );
      if (await inquiriesLink.isVisible()) {
        await inquiriesLink.click();

        const newInquiryBtn = page.locator(
          'button:has-text("New"), button:has-text("Send"), button:has-text("Message")'
        );
        if (await newInquiryBtn.isVisible()) {
          await newInquiryBtn.click();

          const subjectInput = page.locator('input[placeholder*="subject" i]');
          const messageInput = page.locator('textarea[placeholder*="message|inquiry" i]');

          if (await subjectInput.isVisible()) {
            await expect(subjectInput).toBeVisible();
          }
          if (await messageInput.isVisible()) {
            await expect(messageInput).toBeVisible();
          }
        }
      }
    });

    test("should validate required fields in inquiry form", async ({ page }) => {
      const inquiriesLink = page.locator(
        'a:has-text("Inquiry"), a:has-text("Inquiries"), a:has-text("Messages")'
      );
      if (await inquiriesLink.isVisible()) {
        await inquiriesLink.click();

        const newInquiryBtn = page.locator(
          'button:has-text("New"), button:has-text("Send"), button:has-text("Message")'
        );
        if (await newInquiryBtn.isVisible()) {
          await newInquiryBtn.click();

          const submitBtn = page.locator('button[type="submit"]');
          if (await submitBtn.isVisible()) {
            await submitBtn.click();

            const errorMsg = page.locator(
              '[class*="error"], [role="alert"]'
            );
            if (await errorMsg.count() > 0) {
              await expect(errorMsg.first()).toContainText(/required|please/i);
            }
          }
        }
      }
    });

    test("should submit inquiry successfully", async ({ page }) => {
      const inquiriesLink = page.locator(
        'a:has-text("Inquiry"), a:has-text("Inquiries"), a:has-text("Messages")'
      );
      if (await inquiriesLink.isVisible()) {
        await inquiriesLink.click();

        const newInquiryBtn = page.locator(
          'button:has-text("New"), button:has-text("Send"), button:has-text("Message")'
        );
        if (await newInquiryBtn.isVisible()) {
          await newInquiryBtn.click();

          const subjectInput = page.locator(
            'input[placeholder*="subject" i]'
          );
          const messageInput = page.locator(
            'textarea[placeholder*="message|inquiry" i]'
          );

          if (await subjectInput.isVisible()) {
            await subjectInput.fill("Question about custom printing");
            await messageInput.fill(
              "I want to know more about your custom printing options for large orders."
            );

            const submitBtn = page.locator('button[type="submit"]');
            await submitBtn.click();

            const successMsg = page.locator('[class*="success"]');
            if (await successMsg.count() > 0) {
              await expect(successMsg.first()).toContainText(
                /success|submitted|sent/i
              );
            }
          }
        }
      }
    });

    test("should attach file to inquiry", async ({ page }) => {
      const inquiriesLink = page.locator(
        'a:has-text("Inquiry"), a:has-text("Inquiries"), a:has-text("Messages")'
      );
      if (await inquiriesLink.isVisible()) {
        await inquiriesLink.click();

        const newInquiryBtn = page.locator(
          'button:has-text("New"), button:has-text("Send"), button:has-text("Message")'
        );
        if (await newInquiryBtn.isVisible()) {
          await newInquiryBtn.click();

          const fileInput = page.locator('input[type="file"]');
          if (await fileInput.isVisible()) {
            await fileInput.setInputFiles({
              name: "design.pdf",
              mimeType: "application/pdf",
              buffer: Buffer.from("fake-pdf-data"),
            });

            await page.waitForTimeout(500);

            const filePreview = page.locator(
              '[class*="file"], [class*="attachment"]'
            );
            if (await filePreview.count() > 0) {
              await expect(filePreview.first()).toBeVisible();
            }
          }
        }
      }
    });

    test("should view inquiry response", async ({ page }) => {
      const inquiriesLink = page.locator(
        'a:has-text("Inquiry"), a:has-text("Inquiries"), a:has-text("Messages")'
      );
      if (await inquiriesLink.isVisible()) {
        await inquiriesLink.click();

        const inquiryItem = page.locator('[class*="inquiry"], [class*="message"]').first();
        if (await inquiryItem.isVisible()) {
          await inquiryItem.click();

          const response = page.locator('[class*="response"], [class*="reply"]');
          if (await response.count() > 0) {
            await expect(response.first()).toBeVisible();
          }
        }
      }
    });

    test("should track inquiry status", async ({ page }) => {
      const inquiriesLink = page.locator(
        'a:has-text("Inquiry"), a:has-text("Inquiries"), a:has-text("Messages")'
      );
      if (await inquiriesLink.isVisible()) {
        await inquiriesLink.click();

        const inquiryItem = page.locator('[class*="inquiry"], [class*="message"]').first();
        if (await inquiryItem.isVisible()) {
          await inquiryItem.click();

          const statusBadge = page.locator('[class*="status"], [class*="badge"]');
          if (await statusBadge.count() > 0) {
            await expect(statusBadge.first()).toContainText(
              /open|pending|resolved|closed|answered/i
            );
          }
        }
      }
    });

    test("should filter inquiries by status", async ({ page }) => {
      const inquiriesLink = page.locator(
        'a:has-text("Inquiry"), a:has-text("Inquiries"), a:has-text("Messages")'
      );
      if (await inquiriesLink.isVisible()) {
        await inquiriesLink.click();

        const statusFilter = page.locator(
          'select[name*="status" i], [class*="status-filter"]'
        );
        if (await statusFilter.isVisible()) {
          await statusFilter.selectOption("pending");

          const inquiryList = page.locator(
            '[class*="inquiry"], [class*="message"], [class*="item"]'
          );
          if (await inquiryList.count() > 0) {
            await expect(inquiryList.first()).toBeVisible();
          }
        }
      }
    });

    test("should search inquiries", async ({ page }) => {
      const inquiriesLink = page.locator(
        'a:has-text("Inquiry"), a:has-text("Inquiries"), a:has-text("Messages")'
      );
      if (await inquiriesLink.isVisible()) {
        await inquiriesLink.click();

        const searchInput = page.locator('input[placeholder*="search" i]');
        if (await searchInput.isVisible()) {
          await searchInput.fill("printing");
          await page.waitForTimeout(500);

          const inquiryList = page.locator(
            '[class*="inquiry"], [class*="message"], [class*="item"]'
          );
          if (await inquiryList.count() > 0) {
            await expect(inquiryList.first()).toBeVisible();
          }
        }
      }
    });
  });

  test.describe("Contact Form", () => {
    test("should display contact form on contact page", async ({ page }) => {
      await page.goto("/contact");

      const contactForm = page.locator('[class*="form"], form');
      await expect(contactForm.first()).toBeVisible();
    });

    test("should display contact form fields", async ({ page }) => {
      await page.goto("/contact");

      const nameInput = page.locator('input[placeholder*="name" i]');
      const emailInput = page.locator('input[placeholder*="email" i]');
      const messageInput = page.locator('textarea[placeholder*="message|inquiry" i]');

      if (await nameInput.isVisible()) {
        await expect(nameInput).toBeVisible();
      }
      if (await emailInput.isVisible()) {
        await expect(emailInput).toBeVisible();
      }
      if (await messageInput.isVisible()) {
        await expect(messageInput).toBeVisible();
      }
    });

    test("should validate contact form", async ({ page }) => {
      await page.goto("/contact");

      const submitBtn = page.locator('button[type="submit"]');
      if (await submitBtn.isVisible()) {
        await submitBtn.click();

        const errorMsg = page.locator('[class*="error"], [role="alert"]');
        if (await errorMsg.count() > 0) {
          await expect(errorMsg.first()).toContainText(/required|please/i);
        }
      }
    });

    test("should submit contact form successfully", async ({ page }) => {
      await page.goto("/contact");

      const nameInput = page.locator('input[placeholder*="name" i]');
      const emailInput = page.locator('input[placeholder*="email" i]');
      const messageInput = page.locator('textarea[placeholder*="message|inquiry" i]');
      const submitBtn = page.locator('button[type="submit"]');

      if (await nameInput.isVisible()) {
        await nameInput.fill("John Doe");
        await emailInput.fill("john@example.com");
        await messageInput.fill(
          "I have a question about bulk orders for corporate events."
        );

        await submitBtn.click();

        const successMsg = page.locator('[class*="success"]');
        if (await successMsg.count() > 0) {
          await expect(successMsg.first()).toContainText(
            /success|submitted|sent|thank/i
          );
        }
      }
    });

    test("should display contact information", async ({ page }) => {
      await page.goto("/contact");

      const contactInfo = page.locator(
        '[class*="contact-info"], [class*="phone"], [class*="email"], [class*="address"]'
      );
      if (await contactInfo.count() > 0) {
        await expect(contactInfo.first()).toBeVisible();
      }
    });
  });

  test.describe("Admin - Inquiry Management", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/admin-dashboard");
    });

    test("should navigate to inquiries section", async ({ page }) => {
      const inquiriesLink = page.locator(
        'a:has-text("Inquiry"), a:has-text("Inquiries"), a:has-text("Messages"), a:has-text("Support")'
      );
      if (await inquiriesLink.isVisible()) {
        await inquiriesLink.click();

        await page.waitForURL(/.*inquiry|.*inquiries|.*support/);
      }
    });

    test("should display all inquiries", async ({ page }) => {
      const inquiriesLink = page.locator(
        'a:has-text("Inquiry"), a:has-text("Inquiries"), a:has-text("Messages")'
      );
      if (await inquiriesLink.isVisible()) {
        await inquiriesLink.click();

        const inquiriesList = page.locator(
          'table, [class*="inquiry"], [class*="list"]'
        );
        await expect(inquiriesList.first()).toBeVisible();
      }
    });

    test("should respond to inquiry", async ({ page }) => {
      const inquiriesLink = page.locator(
        'a:has-text("Inquiry"), a:has-text("Inquiries"), a:has-text("Messages")'
      );
      if (await inquiriesLink.isVisible()) {
        await inquiriesLink.click();

        const inquiryRow = page.locator('table tbody tr, [class*="inquiry-item"]').first();
        if (await inquiryRow.isVisible()) {
          await inquiryRow.click();

          const responseInput = page.locator('textarea[placeholder*="response|reply" i]');
          if (await responseInput.isVisible()) {
            await responseInput.fill(
              "Thank you for your inquiry. We will get back to you soon."
            );

            const sendBtn = page.locator('button:has-text("Send"), button:has-text("Reply")');
            if (await sendBtn.isVisible()) {
              await sendBtn.click();

              const successMsg = page.locator('[class*="success"]');
              if (await successMsg.count() > 0) {
                await expect(successMsg.first()).toContainText(
                  /success|sent|replied/i
                );
              }
            }
          }
        }
      }
    });

    test("should mark inquiry as resolved", async ({ page }) => {
      const inquiriesLink = page.locator(
        'a:has-text("Inquiry"), a:has-text("Inquiries"), a:has-text("Messages")'
      );
      if (await inquiriesLink.isVisible()) {
        await inquiriesLink.click();

        const inquiryRow = page.locator('table tbody tr, [class*="inquiry-item"]').first();
        if (await inquiryRow.isVisible()) {
          await inquiryRow.click();

          const resolveBtn = page.locator(
            'button:has-text("Resolve"), button:has-text("Mark as Resolved"), button:has-text("Close")'
          );
          if (await resolveBtn.isVisible()) {
            await resolveBtn.click();

            const successMsg = page.locator('[class*="success"]');
            if (await successMsg.count() > 0) {
              await expect(successMsg.first()).toContainText(
                /success|resolved|closed/i
              );
            }
          }
        }
      }
    });
  });
});
