const { Resend } = require("resend");
const prisma = require("../db/prisma");
const { buildReceiptPayload } = require("./paymongo");
const {
  money,
  getCustomerName,
  ORDER_STATUS_LABELS,
} = require("./order");

const otpStore = {};

const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim();

const EMAIL_FROM =
  process.env.EMAIL_FROM?.trim() ||
  "PMG Printing House <onboarding@resend.dev>";

const CONTACT_EMAIL = process.env.CONTACT_EMAIL?.trim();

const resend = RESEND_API_KEY
  ? new Resend(RESEND_API_KEY)
  : null;

if (resend) {
  console.log("✅ Resend email service ready");
} else {
  console.log(
    "⚠️ RESEND_API_KEY is missing. " +
    "Emails will be logged to console in development mode."
  );
}

// Saves an OTP code and expiration metadata for a specific email.
const saveOtp = (email, data) => {
  otpStore[email] = data;
};

// Retrieves the OTP record for a specific email.
const getOtp = (email) => {
  return otpStore[email];
};

// Deletes the OTP record for a specific email.
const deleteOtp = (email) => {
  delete otpStore[email];
};

// Wraps email content into a unified responsive HTML template.
function renderBaseEmailTemplate({ title, category, contentHtml }) {
  const catBadge = category
    ? `<span style="float:right;color:#94a3b8;` +
    `font-size:12px;font-weight:600;` +
    `text-transform:uppercase;margin-top:4px;">` +
    `${category}` +
    `</span>`
    : "";

  return (
    `<!DOCTYPE html>` +
    `<html>` +
    `<head>` +
    `<meta charset="utf-8">` +
    `<meta name="viewport" ` +
    `content="width=device-width, initial-scale=1.0">` +
    `<title>${title}</title>` +
    `</head>` +
    `<body style="margin:0;padding:0;background-color:#f8fafc;` +
    `font-family:Arial,Helvetica,sans-serif;color:#334155;">` +
    `<table role="presentation" width="100%" cellspacing="0" ` +
    `cellpadding="0" style="background-color:#f8fafc;padding:32px 16px;">` +
    `<tr>` +
    `<td align="center">` +
    `<table role="presentation" width="100%" ` +
    `style="max-width:600px;background:#ffffff;border-radius:12px;` +
    `overflow:hidden;border:1px solid #e2e8f0;` +
    `box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">` +
    `<tr>` +
    `<td style="background:#0C1526;` +
    `background:linear-gradient(163deg, rgba(12, 21, 38, 1) 0%, ` +
    `rgba(2, 68, 148, 1) 100%);padding:24px 32px;text-align:center;">` +
    `<img
  src="https://www.pmgprintsync.shop/pmg-logo-nav.png"
  alt="PMG Printing House"
  style="width:220px;height:auto;display:block;margin:0 auto 10px auto;"
>` +
    `${catBadge}` +
    `</td>` +
    `</tr>` +
    `<tr>` +
    `<td style="padding:32px;">` +
    `<h1 style="margin:0 0 16px 0;font-size:20px;` +
    `font-weight:700;color:#024494;">` +
    `${title}` +
    `</h1>` +
    `${contentHtml}` +
    `</td>` +
    `</tr>` +
    `<tr>` +
    `<td style="background:#f1f5f9;padding:20px 32px;` +
    `text-align:center;border-top:1px solid #e2e8f0;` +
    `font-size:12px;color:#64748b;">` +
    `<p style="margin:0 0 6px 0;">` +
    `This is an automated message from PMG Printing House.` +
    `</p>` +
    `<p style="margin:0;">` +
    `&copy; PMG Printing House. All rights reserved.` +
    `</p>` +
    `</td>` +
    `</tr>` +
    `</table>` +
    `</td>` +
    `</tr>` +
    `</table>` +
    `</body>` +
    `</html>`
  );
}

// Sends an email through Resend or logs to console in development.
async function sendSystemEmail({ to, subject, text, html }) {
  const emojiPattern =
    "[\\u{1F600}-\\u{1F64F}" +
    "\\u{1F300}-\\u{1F5FF}" +
    "\\u{1F680}-\\u{1F6FF}" +
    "\\u{2600}-\\u{26FF}" +
    "\\u{2700}-\\u{27BF}]";

  const emojiRegex = new RegExp(emojiPattern, "gu");

  const cleanSubject = (subject || "")
    .replace(emojiRegex, "")
    .trim();

  const payload = {
    to,
    subject: cleanSubject,
    body: text,
    status: resend ? "queued" : "mock",
  };

  // No recipient
  if (!to) {
    return {
      ...payload,
      status: "skipped",
      reason: "missing recipient",
    };
  }

  // Resend API key is not configured
  if (!resend) {
    console.log(
      `📧 System email mock to ${to}: ${cleanSubject}`
    );

    if (text) {
      console.log("Email content:", text);
    }

    return payload;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: cleanSubject,
      text: text || undefined,
      html: html || undefined,
    });

    if (error) {
      console.error("❌ Resend email failed:", error);

      return {
        ...payload,
        status: "failed",
        error: error.message || "Resend email failed",
      };
    }

    console.log(
      `✅ Email sent through Resend to ${to}`
    );

    return {
      ...payload,
      status: "sent",
      id: data?.id || null,
    };
  } catch (err) {
    console.error(
      "❌ Resend email exception:",
      err.message
    );

    return {
      ...payload,
      status: "failed",
      error: err.message,
    };
  }
}

// Sends an email notification to the customer when their order status changes.
async function notifyOrderStatus(order, status) {
  const customerName = getCustomerName(order);

  const statusLabel =
    ORDER_STATUS_LABELS?.[status] ||
    status ||
    "Updated";

  const contentHtml =
    `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;">` +
    `Hi ${customerName},` +
    `</p>` +

    `<p style="margin:0 0 20px 0;font-size:15px;line-height:1.5;">` +
    `There is an update to your Order ` +
    `<strong>#${order.id}</strong>.` +
    `</p>` +

    `<div style="background:#f8fafc;border:1px solid #e2e8f0;` +
    `border-radius:8px;padding:20px;margin-bottom:20px;` +
    `font-size:14px;">` +

    `<div style="margin-bottom:8px;">` +
    `<span style="font-size:12px;color:#64748b;` +
    `text-transform:uppercase;font-weight:600;">Order Status</span>` +
    `<br>` +
    `<span style="font-size:20px;font-weight:700;color:#024494;">` +
    `${statusLabel}` +
    `</span>` +
    `</div>` +

    `</div>` +

    `<p style="margin:0;font-size:14px;color:#475569;">` +
    `You can view your order details from the "My Orders" tab ` +
    `on your PrintSync profile.` +
    `</p>`;

  return sendSystemEmail({
    to: order.user?.email,
    subject: `PrintSync Order #${order.id}: ${statusLabel}`,
    text:
      `Hi ${customerName}, your Order #${order.id} ` +
      `status has been updated to ${statusLabel}. ` +
      `Please check your My Orders tab for details.`,
    html: renderBaseEmailTemplate({
      title: "Order Status Update",
      category: "Order Update",
      contentHtml,
    }),
  });
}

// Sends an email confirmation to the customer after a payment is verified.
async function notifyPaymentConfirmation(order) {
  const receipt = buildReceiptPayload(order, "paid");

  const rows = receipt.items
    .map(
      (item) =>
        `<tr>` +
        `<td style="padding:10px;border-bottom:1px solid #e2e8f0;` +
        `vertical-align:top;">` +
        `<strong>${item.productName}</strong>` +
        (item.customizationLabel
          ? `<br><span style="font-size:12px;color:#64748b;">` +
          `${item.customizationLabel}</span>`
          : "") +
        `</td>` +
        `<td style="padding:10px;border-bottom:1px solid #e2e8f0;` +
        `text-align:center;vertical-align:top;">` +
        `${item.quantity}` +
        `</td>` +
        `<td style="padding:10px;border-bottom:1px solid #e2e8f0;` +
        `text-align:right;vertical-align:top;">` +
        `${money(item.unitPrice)}` +
        `</td>` +
        `<td style="padding:10px;border-bottom:1px solid #e2e8f0;` +
        `text-align:right;vertical-align:top;">` +
        `${money(item.totalPrice)}` +
        `</td>` +
        `</tr>`
    )
    .join("");

  const formattedDate = new Date(
    receipt.paidAt || receipt.issuedAt
  ).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const contentHtml =
    `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;">` +
    `Hi ${receipt.customerName},` +
    `</p>` +
    `<p style="margin:0 0 20px 0;font-size:15px;line-height:1.5;">` +
    `Payment for Order <strong>#${order.id}</strong> has been ` +
    `successfully confirmed.` +
    `</p>` +
    `<div style="background:#f8fafc;border:1px solid #e2e8f0;` +
    `border-radius:8px;padding:20px;margin-bottom:24px;` +
    `font-size:14px;line-height:1.5;">` +
    `<div style="margin-bottom:8px;"><strong>Receipt No:</strong> ` +
    `${receipt.receiptNo}</div>` +
    `<div style="margin-bottom:8px;"><strong>Date:</strong> ` +
    `${formattedDate}</div>` +
    `<div style="margin-bottom:8px;"><strong>Payment Method:</strong> ` +
    `${receipt.paymentMethod}</div>` +
    `<div style="margin-bottom:8px;"><strong>Reference:</strong> ` +
    `${receipt.paymentReference}</div>` +
    (receipt.shippingAddress
      ? `<div style="margin-top:12px;padding-top:12px;` +
      `border-top:1px solid #e2e8f0;">` +
      `<strong>Shipping Address:</strong><br>` +
      `${receipt.shippingAddress}</div>`
      : "") +
    `</div>` +
    `<h3 style="font-size:16px;font-weight:700;color:#024494;` +
    `margin:24px 0 12px 0;">Items Ordered</h3>` +
    `<table width="100%" cellspacing="0" cellpadding="0" ` +
    `style="border-collapse:collapse;margin-bottom:20px;font-size:14px;">` +
    `<thead>` +
    `<tr style="background:#f8fafc;text-align:left;color:#64748b;">` +
    `<th style="padding:10px;border-bottom:2px solid #e2e8f0;">Product</th>` +
    `<th style="padding:10px;border-bottom:2px solid #e2e8f0;` +
    `text-align:center;">Qty</th>` +
    `<th style="padding:10px;border-bottom:2px solid #e2e8f0;` +
    `text-align:right;">Price</th>` +
    `<th style="padding:10px;border-bottom:2px solid #e2e8f0;` +
    `text-align:right;">Total</th>` +
    `</tr>` +
    `</thead>` +
    `<tbody>` +
    `${rows}` +
    `</tbody>` +
    `</table>` +
    `<table width="100%" cellspacing="0" cellpadding="0" ` +
    `style="font-size:14px;line-height:1.6;margin-top:10px;">` +
    `<tr>` +
    `<td style="text-align:right;color:#64748b;padding:4px 10px;">` +
    `Subtotal:</td>` +
    `<td style="text-align:right;font-weight:600;padding:4px 10px;` +
    `width:120px;">${money(receipt.subtotal)}</td>` +
    `</tr>` +
    `<tr>` +
    `<td style="text-align:right;color:#64748b;padding:4px 10px;">` +
    `Shipping:</td>` +
    `<td style="text-align:right;font-weight:600;padding:4px 10px;">` +
    `${money(receipt.shippingCost)}</td>` +
    `</tr>` +
    `<tr style="font-size:16px;">` +
    `<td style="text-align:right;font-weight:700;color:#024494;` +
    `padding:8px 10px;border-top:1px solid #e2e8f0;">Total Paid:</td>` +
    `<td style="text-align:right;font-weight:700;color:#024494;` +
    `padding:8px 10px;border-top:1px solid #e2e8f0;">` +
    `${money(receipt.total)}</td>` +
    `</tr>` +
    `</table>`;

  return sendSystemEmail({
    to: order.user?.email,
    subject: `PrintSync Payment Confirmed: Order #${order.id}`,
    text:
      `Hi ${receipt.customerName}, payment for Order #${order.id} ` +
      `is confirmed. Receipt: ${receipt.receiptNo}. ` +
      `Total: ${money(order.total)}.`,
    html: renderBaseEmailTemplate({
      title: "Payment Confirmed",
      category: "Receipt",
      contentHtml,
    }),
  });
}

// Sends an email alert to the customer when a payment attempt fails or expires.
async function notifyPaymentFailed(order) {
  const receipt = buildReceiptPayload(order);
  const statusLabel =
    order.payment_status === "expired" ? "Expired" : "Failed";

  const contentHtml =
    `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;">` +
    `Hi ${receipt.customerName},` +
    `</p>` +
    `<p style="margin:0 0 20px 0;font-size:15px;line-height:1.5;">` +
    `The payment attempt for your Order <strong>#${order.id}</strong> ` +
    `has been marked as <strong>${statusLabel}</strong>.` +
    `</p>` +
    `<div style="background:#fff1f2;border:1px solid #fecdd3;` +
    `border-radius:8px;padding:20px;margin-bottom:24px;` +
    `font-size:14px;color:#9f1239;">` +
    `Please check your payment method status or retry the payment ` +
    `from the "My Orders" tab on your PrintSync profile.` +
    `</div>`;

  return sendSystemEmail({
    to: order.user?.email,
    subject: `PrintSync Payment ${statusLabel}: Order #${order.id}`,
    text:
      `Hi ${receipt.customerName}, payment for Order #${order.id} ` +
      `was marked as ${statusLabel.toLowerCase()}. ` +
      `Please retry from My Orders.`,
    html: renderBaseEmailTemplate({
      title: `Payment ${statusLabel}`,
      category: "Payment Alert",
      contentHtml,
    }),
  });
}

// Sends an email to a support staff member (or admin) alerting them that
// a customer has started a new support chat conversation. Only fires on
// the FIRST message of a conversation — not every message — so an active
// back-and-forth doesn't spam their inbox.
async function notifyNewSupportChat(staffUser, customerName, messageBody) {
  const contentHtml =
    `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;">` +
    `Hi ${staffUser.first_name || "there"},` +
    `</p>` +
    `<p style="margin:0 0 20px 0;font-size:15px;line-height:1.5;">` +
    `<strong>${customerName}</strong> just started a new support chat ` +
    `and is waiting for a reply.` +
    `</p>` +
    `<div style="background:#f8fafc;border:1px solid #e2e8f0;` +
    `border-radius:8px;padding:16px;margin-bottom:20px;">` +
    `<p style="margin:0;font-size:14px;color:#475569;font-style:italic;">` +
    `"${messageBody}"` +
    `</p>` +
    `</div>` +
    `<p style="margin:0;font-size:14px;color:#475569;">` +
    `Reply from the Support Inbox in your PrintSync dashboard.` +
    `</p>`;

  return sendSystemEmail({
    to: staffUser.email,
    subject: `New support chat from ${customerName}`,
    text: `${customerName} started a new support chat: "${messageBody}". Reply from the Support Inbox in your dashboard.`,
    html: renderBaseEmailTemplate({
      title: "New Support Chat",
      category: "Customer Support",
      contentHtml,
    }),
  });
}

// Sends an email confirmation after a return complaint is submitted.
async function notifyReturnComplaintReceived(order, inquiry) {
  const customerName = getCustomerName(order);

  const contentHtml =
    `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;">` +
    `Hi ${customerName},` +
    `</p>` +
    `<p style="margin:0 0 20px 0;font-size:15px;line-height:1.5;">` +
    `We have received your return request for Order ` +
    `<strong>#${order.id}</strong>.` +
    `</p>` +
    `<div style="background:#f8fafc;border:1px solid #e2e8f0;` +
    `border-radius:8px;padding:20px;margin-bottom:24px;font-size:14px;">` +
    `<div style="margin-bottom:10px;"><strong>Inquiry ID:</strong> ` +
    `${inquiry.id}</div>` +
    `<div style="margin-bottom:10px;"><strong>Subject:</strong> ` +
    `${inquiry.subject}</div>` +
    `<div style="margin-bottom:10px;"><strong>Reason:</strong> ` +
    `${inquiry.other || "N/A"}</div>` +
    `<div style="margin-top:10px;padding-top:10px;` +
    `border-top:1px solid #e2e8f0;color:#64748b;">` +
    `Status: Under Review` +
    `</div>` +
    `</div>` +
    `<p style="margin:0;font-size:14px;color:#475569;">` +
    `Our admin team is currently reviewing your request and will ` +
    `get back to you shortly.` +
    `</p>`;

  return sendSystemEmail({
    to: order.user?.email,
    subject: `PrintSync Return Request Received: Order #${order.id}`,
    text:
      `Hi ${customerName}, we received your return request for ` +
      `Order #${order.id} (Inquiry ID: ${inquiry.id}). ` +
      `Our staff will review it soon.`,
    html: renderBaseEmailTemplate({
      title: "Return Request Received",
      category: "Support",
      contentHtml,
    }),
  });
}

// Alerts administrators via email when product stock falls below threshold.
async function notifyLowStockProducts(products, threshold = 10) {
  const low = products.filter(
    (p) =>
      p.stock !== null &&
      p.stock !== undefined &&
      p.category !== "service" &&
      Number(p.stock) <= threshold
  );

  if (low.length === 0) return null;

  const adminUsers = await prisma.user.findMany({
    where: { role: { in: [0, 1] }, status: "active" },
    select: { email: true },
  });

  const recipients = adminUsers.map((user) => user.email).filter(Boolean);

  if (recipients.length === 0) return null;

  const rows = low
    .map(
      (product) =>
        `<tr>` +
        `<td style="padding:10px;border-bottom:1px solid #e2e8f0;">` +
        `${product.name}` +
        `</td>` +
        `<td style="padding:10px;border-bottom:1px solid #e2e8f0;">` +
        `${product.sku || "—"}` +
        `</td>` +
        `<td style="padding:10px;border-bottom:1px solid #e2e8f0;` +
        `color:#d97706;font-weight:700;">` +
        `${product.stock}` +
        `</td>` +
        `</tr>`
    )
    .join("");

  const contentHtml =
    `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;">` +
    `The following <strong>${low.length}</strong> product(s) ` +
    `are running low on stock:` +
    `</p>` +
    `<table width="100%" cellspacing="0" cellpadding="0" ` +
    `style="border-collapse:collapse;margin-bottom:20px;font-size:14px;">` +
    `<thead>` +
    `<tr style="background:#f8fafc;text-align:left;color:#64748b;">` +
    `<th style="padding:10px;border-bottom:2px solid #e2e8f0;">Product</th>` +
    `<th style="padding:10px;border-bottom:2px solid #e2e8f0;">SKU</th>` +
    `<th style="padding:10px;border-bottom:2px solid #e2e8f0;">Stock</th>` +
    `</tr>` +
    `</thead>` +
    `<tbody>${rows}</tbody>` +
    `</table>` +
    `<p style="margin:0;font-size:13px;color:#64748b;">` +
    `Please consider restocking these items soon.` +
    `</p>`;

  return sendSystemEmail({
    to: recipients.join(","),
    subject: `PrintSync Inventory Alert: Low Stock Items`,
    text: low
      .map(
        (product) =>
          `${product.name} (${product.sku || "no SKU"}): ` +
          `${product.stock} left`
      )
      .join("\n"),
    html: renderBaseEmailTemplate({
      title: "Low Stock Inventory Alert",
      category: "Inventory Alert",
      contentHtml,
    }),
  });
}

// Alerts administrators about a new order awaiting design review.
async function notifyAdminsNewOrderForReview(order) {
  const adminUsers = await prisma.user.findMany({
    where: { role: { in: [0, 1] }, status: "active" },
    select: { email: true },
  });

  const recipients = adminUsers.map((user) => user.email).filter(Boolean);

  if (recipients.length === 0) return null;

  const customerName = getCustomerName(order);

  const contentHtml =
    `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;">` +
    `Order <strong>#${order.id}</strong> from ` +
    `<strong>${customerName}</strong> requires design approval ` +
    `before payment.` +
    `</p>` +
    `<div style="background:#f8fafc;border:1px solid #e2e8f0;` +
    `border-radius:8px;padding:20px;margin-bottom:20px;">` +
    `<div style="margin-bottom:8px;">` +
    `<span style="font-size:12px;color:#64748b;` +
    `text-transform:uppercase;font-weight:600;">Customer</span>` +
    `<br>` +
    `<span style="font-size:15px;font-weight:600;color:#024494;">` +
    `${customerName}` +
    `</span>` +
    `</div>` +
    `<div>` +
    `<span style="font-size:12px;color:#64748b;` +
    `text-transform:uppercase;font-weight:600;">Total Amount</span>` +
    `<br>` +
    `<span style="font-size:18px;font-weight:700;color:#024494;">` +
    `${money(order.total)}` +
    `</span>` +
    `</div>` +
    `</div>` +
    `<p style="margin:0;font-size:14px;color:#475569;">` +
    `Please log in to the admin panel to review the custom design.` +
    `</p>`;

  return sendSystemEmail({
    to: recipients.join(","),
    subject: `PrintSync Admin Alert: Order #${order.id} Design Review`,
    text:
      `Order #${order.id} from ${customerName} is waiting ` +
      `for admin design approval before payment. ` +
      `Total: ${money(order.total)}.`,
    html: renderBaseEmailTemplate({
      title: "Design Approval Required",
      category: "Admin Alert",
      contentHtml,
    }),
  });
}

// Sends an email notification to the customer that their design is approved.
async function notifyDesignApproval(order) {
  const customerName = getCustomerName(order);

  const contentHtml =
    `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;">` +
    `Hi ${customerName},` +
    `</p>` +
    `<p style="margin:0 0 20px 0;font-size:15px;line-height:1.5;">` +
    `Great news! Your custom design for Order ` +
    `<strong>#${order.id}</strong> has been approved.` +
    `</p>` +
    `<div style="background:#f0fdf4;border:1px solid #bbf7d0;` +
    `border-radius:8px;padding:20px;margin-bottom:20px;">` +
    `<p style="margin:0;font-size:14px;color:#166534;font-weight:600;">` +
    `You can now proceed with your payment to start production.` +
    `</p>` +
    `</div>`;

  return sendSystemEmail({
    to: order.user?.email,
    subject: `PrintSync Order #${order.id}: Design Approved`,
    text:
      `Hi ${customerName}, your design for Order #${order.id} ` +
      `has been approved. You can now proceed with payment.`,
    html: renderBaseEmailTemplate({
      title: "Design Approved",
      category: "Order Update",
      contentHtml,
    }),
  });
}

// Sends an email notification to the customer that production is complete
// and their remaining balance is due before delivery/pickup.
async function notifyFinalPaymentDue(order, remainingBalance) {
  const customerName = getCustomerName(order);

  const contentHtml =
    `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;">` +
    `Hi ${customerName},` +
    `</p>` +
    `<p style="margin:0 0 20px 0;font-size:15px;line-height:1.5;">` +
    `Great news! Production for your Order ` +
    `<strong>#${order.id}</strong> is now complete.` +
    `</p>` +
    `<div style="background:#fffbeb;border:1px solid #fde68a;` +
    `border-radius:8px;padding:20px;margin-bottom:20px;">` +
    `<div style="margin-bottom:8px;">` +
    `<span style="font-size:12px;color:#92400e;` +
    `text-transform:uppercase;font-weight:600;">Remaining Balance</span>` +
    `<br>` +
    `<span style="font-size:20px;font-weight:700;color:#92400e;">` +
    `${money(remainingBalance)}` +
    `</span>` +
    `</div>` +
    `<p style="margin:0;font-size:14px;color:#92400e;">` +
    `Please settle the remaining balance before delivery or pickup ` +
    `can be scheduled.` +
    `</p>` +
    `</div>` +
    `<p style="margin:0;font-size:14px;color:#475569;">` +
    `You can complete this payment from the "My Orders" tab on your ` +
    `PrintSync profile.` +
    `</p>`;

  return sendSystemEmail({
    to: order.user?.email,
    subject: `PrintSync Order #${order.id}: Final Payment Due`,
    text:
      `Hi ${customerName}, production for Order #${order.id} is complete. ` +
      `Remaining balance of ${money(remainingBalance)} is due before ` +
      `delivery/pickup. Please pay from My Orders.`,
    html: renderBaseEmailTemplate({
      title: "Final Payment Due",
      category: "Payment Reminder",
      contentHtml,
    }),
  });
}

// Sends an OTP email to the user, logging to console in development.
async function sendOtpEmail({ email, code, expiresAt, subject }) {
  const emojiPattern =
    "[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}" +
    "\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]";

  const emojiRegex = new RegExp(emojiPattern, "gu");

  const cleanSubject =
    (subject || "").replace(emojiRegex, "").trim() ||
    `PMG Printing House Verification Code: ${code}`;

  const text =
    `Your PMG Printing House verification code is: ${code}. ` +
    `It expires in 5 minutes.`;

  const contentHtml =
    `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;">` +
    `Your single-use verification code is:` +
    `</p>` +
    `<div style="background:#f1f5f9;border:1px solid #cbd5e1;` +
    `border-radius:8px;padding:20px;text-align:center;margin-bottom:20px;">` +
    `<span style="font-family:monospace;font-size:32px;` +
    `font-weight:700;letter-spacing:6px;color:#024494;">` +
    `${code}` +
    `</span>` +
    `</div>` +
    `<p style="margin:0 0 8px 0;font-size:13px;color:#64748b;">` +
    `This code will expire in 5 minutes.` +
    `</p>` +
    `<p style="margin:0;font-size:13px;color:#94a3b8;">` +
    `If you did not request this code, please ignore this email.` +
    `</p>`;

  const html = renderBaseEmailTemplate({
    title: "Security Verification Code",
    category: "Security",
    contentHtml,
  });

  const res = await sendSystemEmail({
    to: email,
    subject: cleanSubject,
    text,
    html,
  });

  if (res.status === "mock") {
    console.log(
      `DEV OTP for ${email}: ${code} (expires: ${expiresAt.toISOString()})`
    );
  }

  return res;
}

// Sends an HTML email alert to admin accounts (role 0) when stock reaches 0.
async function notifyOutOfStockProducts(products) {
  const outOfStock = products.filter(
    (product) => Number(product.stock) === 0
  );

  if (outOfStock.length === 0) return null;

  const adminUsers = await prisma.user.findMany({
    where: { role: 0, status: "active" },
    select: { email: true },
  });

  const recipients = adminUsers.map((user) => user.email).filter(Boolean);

  if (recipients.length === 0) return null;

  const rows = outOfStock
    .map(
      (product) =>
        `<tr>` +
        `<td style="padding:10px;border-bottom:1px solid #e2e8f0;">` +
        `${product.name}` +
        `</td>` +
        `<td style="padding:10px;border-bottom:1px solid #e2e8f0;">` +
        `${product.sku || "—"}` +
        `</td>` +
        `<td style="padding:10px;border-bottom:1px solid #e2e8f0;` +
        `color:#dc2626;font-weight:700;">` +
        `0` +
        `</td>` +
        `</tr>`
    )
    .join("");

  const contentHtml =
    `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;">` +
    `The following <strong>${outOfStock.length}</strong> product(s) ` +
    `are completely out of stock:` +
    `</p>` +
    `<table width="100%" cellspacing="0" cellpadding="0" ` +
    `style="border-collapse:collapse;margin-bottom:20px;font-size:14px;">` +
    `<thead>` +
    `<tr style="background:#f8fafc;text-align:left;color:#64748b;">` +
    `<th style="padding:10px;border-bottom:2px solid #e2e8f0;">Product</th>` +
    `<th style="padding:10px;border-bottom:2px solid #e2e8f0;">SKU</th>` +
    `<th style="padding:10px;border-bottom:2px solid #e2e8f0;">Stock</th>` +
    `</tr>` +
    `</thead>` +
    `<tbody>${rows}</tbody>` +
    `</table>` +
    `<p style="margin:0;font-size:13px;color:#dc2626;font-weight:600;">` +
    `Please restock these items as soon as possible.` +
    `</p>`;

  return sendSystemEmail({
    to: recipients.join(","),
    subject: `PrintSync Inventory Alert: Out of Stock Items`,
    text: outOfStock
      .map(
        (product) =>
          `${product.name} (${product.sku || "no SKU"}): OUT OF STOCK`
      )
      .join("\n"),
    html: renderBaseEmailTemplate({
      title: "Out of Stock Inventory Alert",
      category: "Inventory Alert",
      contentHtml,
    }),
  });
}

// =========================================================
// CONTACT FORM EMAIL
// =========================================================
async function notifyContactForm({ name, phone, message }) {
  const safeName = String(name || "").trim();
  const safePhone = String(phone || "").trim();
  const safeMessage = String(message || "").trim();

  const contentHtml =
    `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;">` +
    `A customer has submitted a new message through the PMG Printing House contact form.` +
    `</p>` +

    `<div style="background:#f8fafc;border:1px solid #e2e8f0;` +
    `border-radius:8px;padding:20px;margin-bottom:20px;` +
    `font-size:14px;line-height:1.6;">` +

    `<div style="margin-bottom:12px;">` +
    `<strong>Customer Name</strong><br>` +
    `${safeName}` +
    `</div>` +

    `<div style="margin-bottom:12px;">` +
    `<strong>Phone Number</strong><br>` +
    `${safePhone}` +
    `</div>` +

    `<div>` +
    `<strong>Message</strong><br>` +
    `<div style="margin-top:6px;padding:12px;background:#ffffff;` +
    `border:1px solid #e2e8f0;border-radius:6px;white-space:pre-wrap;">` +
    `${safeMessage}` +
    `</div>` +
    `</div>` +

    `</div>` +

    `<p style="margin:0;font-size:13px;color:#64748b;">` +
    `This message was submitted through the PMG Printing House website contact form.` +
    `</p>`;

  return sendSystemEmail({
    to: CONTACT_EMAIL,
    subject: `PMG Printing House Contact Form: ${safeName}`,
    text:
      `New PMG Printing House contact form message\n\n` +
      `Customer Name: ${safeName}\n` +
      `Phone Number: ${safePhone}\n\n` +
      `Message:\n${safeMessage}`,
    html: renderBaseEmailTemplate({
      title: "New Contact Form Message",
      category: "Customer Support",
      contentHtml,
    }),
  });
}

module.exports = {
  saveOtp,
  getOtp,
  deleteOtp,
  sendSystemEmail,
  sendOtpEmail,
  notifyOrderStatus,
  notifyPaymentConfirmation,
  notifyPaymentFailed,
  notifyReturnComplaintReceived,
  notifyLowStockProducts,
  notifyOutOfStockProducts,
  notifyAdminsNewOrderForReview,
  notifyDesignApproval,
  notifyFinalPaymentDue,
  notifyNewSupportChat,
  notifyContactForm,
};