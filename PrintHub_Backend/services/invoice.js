const PDFDocument = require("pdfkit");
const { buildReceiptPayload, money } = require("./paymongo");

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
        .fillColor("#024494")
        .fontSize(22)
        .font("Helvetica-Bold")
        .text("PrintSync", 50, 50);

      doc
        .fillColor("#64748b")
        .fontSize(10)
        .font("Helvetica")
        .text("Invoice", 50, 78);

      doc
        .fillColor("#334155")
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
        .fillColor("#64748b")
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("BILLED TO", 50, 130);

      doc
        .fillColor("#0f172a")
        .fontSize(11)
        .font("Helvetica")
        .text(receipt.customerName, 50, 145)
        .text(receipt.customerEmail || "", 50, 160);

      if (receipt.shippingAddress) {
        doc.text(receipt.shippingAddress, 50, 175, { width: 250 });
      }

      doc
        .fillColor("#64748b")
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
          .fillColor("#64748b")
          .fontSize(10)
          .font("Helvetica")
          .text(`via ${receipt.paymentMethod}`, 350, 162, { align: "right" });
      }

      // --- Items table ---
      let y = 220;
      doc
        .fillColor("#ffffff")
        .rect(50, y, 495, 24)
        .fill("#024494");

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
        // Build a one-line pricing breakdown (setup fee / material cost /
        // bulk discount) whenever this item has pricingBreakdown data —
        // older orders placed before this feature simply won't have it,
        // and the line is omitted entirely for them.
        const breakdownParts = [];
        if (item.setupFee != null) {
          breakdownParts.push(`Setup ${money(item.setupFee)}`);
        }
        if (item.materialCost && item.materialCost.length > 0) {
          const materialTotal = item.materialCost.reduce(
            (sum, m) => sum + (m.lineCost || 0),
            0
          );
          if (item.marginMultiplier != null) {
            breakdownParts.push(
              `Material ${money(materialTotal)} x${item.marginMultiplier}`
            );
          } else {
            breakdownParts.push(`Material ${money(materialTotal)}`);
          }
        }
        if (item.quantityDiscountFactor != null && item.quantityDiscountFactor < 1) {
          const pct = Math.round((1 - item.quantityDiscountFactor) * 100);
          breakdownParts.push(`Bulk discount -${pct}%`);
        }
        const breakdownLabel = breakdownParts.join("  ·  ");

        const lineCount =
          (item.customizationLabel ? 1 : 0) + (breakdownLabel ? 1 : 0);
        const rowHeight = 22 + lineCount * 11;

        if (i % 2 === 0) {
          doc.fillColor("#f8fafc").rect(50, y, 495, rowHeight).fill();
        }

        doc.fillColor("#0f172a").text(item.productName, 60, y + 6, { width: 250 });

        let detailY = y + 18;
        if (item.customizationLabel) {
          doc
            .fillColor("#94a3b8")
            .fontSize(8)
            .text(item.customizationLabel, 60, detailY, { width: 250 });
          detailY += 11;
        }
        if (breakdownLabel) {
          doc
            .fillColor("#94a3b8")
            .fontSize(8)
            .text(breakdownLabel, 60, detailY, { width: 320 });
        }
        doc.fontSize(10);

        doc
          .fillColor("#0f172a")
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
        .fillColor("#64748b")
        .fontSize(10)
        .text("Subtotal", 350, y, { width: 110, align: "left" })
        .fillColor("#0f172a")
        .text(money(receipt.subtotal), 460, y, { width: 75, align: "right" });

      y += 16;
      doc
        .fillColor("#64748b")
        .text("Shipping", 350, y, { width: 110, align: "left" })
        .fillColor("#0f172a")
        .text(money(receipt.shippingCost), 460, y, { width: 75, align: "right" });

      y += 20;
      doc.moveTo(350, y).lineTo(545, y).strokeColor("#024494").stroke();
      y += 10;

      doc
        .fillColor("#024494")
        .fontSize(13)
        .font("Helvetica-Bold")
        .text("Total", 350, y, { width: 110, align: "left" })
        .text(money(receipt.total), 460, y, { width: 75, align: "right" });

      // --- Footer ---
      doc
        .fillColor("#94a3b8")
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