const PDFDocument = require("pdfkit");
const { buildReceiptPayload } = require("./paymongo");
const { money } = require("./order");
const MATERIAL_UNIT_LABELS = { substrate: "m", ink: "ml", unit: "pcs" };
/**
 * Builds a PDF invoice buffer for the given order. Reuses buildReceiptPayload
 * so the numbers on the PDF always match what's shown in the email receipt
 * and the frontend order-detail screen — one source of truth for the data,
 * this function only handles layout.
 */
function generateInvoicePdf(order) {
  return new Promise((resolve, reject) => {
    try {
      const receipt = buildReceiptPayload(order);
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // --- Header ---
      doc
        .fillColor("#00480e")
        .fontSize(22)
        .font("Helvetica-Bold")
        .text("PrintSync", 50, 50);

      doc
        .fillColor("#3d882c")
        .fontSize(10)
        .font("Helvetica")
        .text("Invoice", 50, 78);

      doc
        .fillColor("#073605")
        .fontSize(11)
        .text(`Invoice No: ${receipt.receiptNo}`, 350, 50, { align: "right" })
        .text(`Order #: ${receipt.orderId}`, 350, 65, { align: "right" })
        .text(
          `Date: ${new Date(receipt.issuedAt).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}`,
          350,
          80,
          { align: "right" }
        );

      doc.moveTo(50, 110).lineTo(545, 110).strokeColor("#e2e8f0").stroke();

      // --- Billed to / status ---
      doc
        .fillColor("#3d882c")
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("BILLED TO", 50, 130);

      doc
        .fillColor("#0f2a11")
        .fontSize(11)
        .font("Helvetica")
        .text(receipt.customerName, 50, 145)
        .text(receipt.customerEmail || "", 50, 160);

      if (receipt.shippingAddress) {
        doc.text(receipt.shippingAddress, 50, 175, { width: 250 });
      }

      doc
        .fillColor("#3d882c")
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("PAYMENT STATUS", 350, 130, { align: "right" });

      doc
        .fillColor(receipt.status === "paid" ? "#16a34a" : "#d97706")
        .fontSize(12)
        .font("Helvetica-Bold")
        .text(receipt.status.toUpperCase().replace(/_/g, " "), 350, 145, {
          align: "right",
        });

      if (receipt.paymentMethod) {
        doc
          .fillColor("#3d882c")
          .fontSize(10)
          .font("Helvetica")
          .text(`via ${receipt.paymentMethod}`, 350, 162, { align: "right" });
      }

      // --- Items table ---
      let y = 220;
      doc
        .fillColor("#ffffff")
        .rect(50, y, 495, 24)
        .fill("#00480e");

      doc
        .fillColor("#ffffff")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Product", 60, y + 7)
        .text("Qty", 320, y + 7, { width: 40, align: "right" })
        .text("Unit Price", 370, y + 7, { width: 80, align: "right" })
        .text("Total", 460, y + 7, { width: 75, align: "right" });

      y += 24;
      doc.font("Helvetica").fontSize(10);

      receipt.items.forEach((item, i) => {
        // Build the full itemized breakdown — customization label, setup
        // fee, one line per raw material actually consumed (so the
        // customer sees exactly what the design-size scaling charged
        // them for, not just a summed total), then any bulk discount.
        // Older orders placed before this feature simply won't have
        // pricingBreakdown data, so these lines are omitted for them.
        const detailLines = [];

        if (item.customizationLabel) {
          detailLines.push(item.customizationLabel);
        }

        if (item.setupFee != null && item.setupFee > 0) {
          detailLines.push(`Setup fee: ${money(item.setupFee)}`);
        }

        if (item.materialCost && item.materialCost.length > 0) {
          detailLines.push(
            `Materials used${
              item.marginMultiplier != null ? ` (×${item.marginMultiplier} margin)` : ""
            }:`
          );
          item.materialCost.forEach((m) => {
            const unitLabel = MATERIAL_UNIT_LABELS[m.type] || "";
            const amountLabel = `${m.amount} ${unitLabel}`.trim();
            const costLabel =
              m.lineCost != null
                ? `${money(m.unitCost)}/${unitLabel} = ${money(m.lineCost)}`
                : "cost not set";
            detailLines.push(`   • ${m.name}: ${amountLabel} × ${costLabel}`);
          });
        }

        if (item.quantityDiscountFactor != null && item.quantityDiscountFactor < 1) {
          const pct = Math.round((1 - item.quantityDiscountFactor) * 100);
          detailLines.push(`Bulk discount: -${pct}%`);
        }

        const rowHeight = 22 + detailLines.length * 11;

        if (i % 2 === 0) {
          doc.fillColor("#f8fafc").rect(50, y, 495, rowHeight).fill();
        }

        doc.fillColor("#0f2a11").text(item.productName, 60, y + 6, { width: 250 });

        let detailY = y + 18;
        doc.fillColor("#6ac789").fontSize(8);
        detailLines.forEach((line) => {
          doc.text(line, 60, detailY, { width: 320 });
          detailY += 11;
        });
        doc.fontSize(10);

        doc
          .fillColor("#0f2a11")
          .text(String(item.quantity), 320, y + 6, { width: 40, align: "right" })
          .text(money(item.unitPrice), 370, y + 6, { width: 80, align: "right" })
          .text(money(item.totalPrice), 460, y + 6, { width: 75, align: "right" });

        y += rowHeight;
      });

      // --- Totals ---
      y += 15;
      doc.moveTo(350, y).lineTo(545, y).strokeColor("#e2e8f0").stroke();
      y += 10;

      doc
        .fillColor("#3d882c")
        .fontSize(10)
        .text("Subtotal", 350, y, { width: 110, align: "left" })
        .fillColor("#0f2a11")
        .text(money(receipt.subtotal), 460, y, { width: 75, align: "right" });

      y += 16;
      doc
        .fillColor("#3d882c")
        .text("Shipping", 350, y, { width: 110, align: "left" })
        .fillColor("#0f2a11")
        .text(money(receipt.shippingCost), 460, y, { width: 75, align: "right" });

      y += 20;
      doc.moveTo(350, y).lineTo(545, y).strokeColor("#00480e").stroke();
      y += 10;

      doc
        .fillColor("#00480e")
        .fontSize(13)
        .font("Helvetica-Bold")
        .text("Total", 350, y, { width: 110, align: "left" })
        .text(money(receipt.total), 460, y, { width: 75, align: "right" });

      // --- Footer ---
      doc
        .fillColor("#6ac789")
        .fontSize(8)
        .font("Helvetica")
        .text(
          "This is a system-generated invoice from PrintSync. For questions, contact support.",
          50,
          770,
          { align: "center", width: 495 }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateInvoicePdf };