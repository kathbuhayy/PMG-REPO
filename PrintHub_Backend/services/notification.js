const nodemailer = require("nodemailer");
const prisma = require("../db/prisma");
const { buildReceiptPayload } = require("./paymongo");
const {
  money,
  getCustomerName,
  ORDER_STATUS_LABELS,
} = require("./order");

const otpStore = {};
let transporter = null;

const SMTP_ENABLED = process.env.SMTP_ENABLED !== "false";
const EMAIL_USER = process.env.EMAIL_USER?.trim();
const EMAIL_PASS = process.env.EMAIL_PASS?.replace(/\s/g, "");
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID?.trim();
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET?.trim();
const OAUTH_REFRESH_TOKEN = process.env.OAUTH_REFRESH_TOKEN?.trim();

// Check if all necessary OAuth2 credentials are provided.
const useOAuth2 =
  OAUTH_CLIENT_ID && OAUTH_CLIENT_SECRET && OAUTH_REFRESH_TOKEN;

if (SMTP_ENABLED && EMAIL_USER && (useOAuth2 || EMAIL_PASS)) {
  const authConfig = useOAuth2
    ? {
        type: "OAuth2",
        user: EMAIL_USER,
        clientId: OAUTH_CLIENT_ID,
        clientSecret: OAUTH_CLIENT_SECRET,
        refreshToken: OAUTH_REFRESH_TOKEN,
      }
    : {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      };

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: authConfig,
  });

  transporter.verify((err, success) => {
    if (err) console.log("Email transporter verify failed:", err);
    else console.log("Email transporter ready:", success);
  });
} else {
  console.log(
    "SMTP disabled or missing EMAIL_USER/EMAIL_PASS/OAuth2 credentials. " +
      "OTP will be logged to console (dev mode)."
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
    `rgba(2, 68, 148, 1) 100%);padding:24px 32px;text-align:left;">` +
    `<span style="color:#ffffff;font-size:22px;` +
    `font-weight:700;letter-spacing:0.5px;">` +
    `PrintHub` +
    `</span>` +
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
    `This is an automated message from PrintHub.` +
    `</p>` +
    `<p style="margin:0;">` +
    `&copy; PrintHub. All rights reserved.` +
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

// Sends an email using nodemailer or logs to console if in development.
async function sendSystemEmail({ to, subject, text, html }) {
  const emojiPattern =
    "[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}" +
    "\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]";
  const emojiRegex = new RegExp(emojiPattern, "gu");
  const cleanSubject = (subject || "").replace(emojiRegex, "").trim();

  const payload = {
    to,
    subject: cleanSubject,
    body: text,
    status: transporter ? "queued" : "mock",
  };

  if (!to) {
    return { ...payload, status: "skipped", reason: "missing recipient" };
  }

  if (!transporter) {
    console.log(`System email mock to ${to}: ${cleanSubject}`);
    return payload;
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject: cleanSubject,
      text,
      html,
    });

    return { ...payload, status: "sent" };
  } catch (err) {
    console.error("System email failed:", err.message);
    return { ...payload, status: "failed", error: err.message };
  }
}

// Sends an email notification to the customer about their order status.
async function notifyOrderStatus(order, statusOverride) {
  const status = statusOverride || order.status || "pending";
  const label = ORDER_STATUS_LABELS[status] || status.replace(/_/g, " ");
  const customerName = getCustomerName(order);

  const contentHtml =
    `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;">` +
    `Hi ${customerName},` +
    `</p>` +
    `<p style="margin:0 0 20px 0;font-size:15px;line-height:1.5;">` +
    `Your Order <strong>#${order.id}</strong> status has been updated.` +
    `</p>` +
    `<div style="background:#f8fafc;border:1px solid #e2e8f0;` +
    `border-radius:8px;padding:20px;margin-bottom:24px;">` +
    `<div style="margin-bottom:12px;">` +
    `<span style="font-size:12px;color:#64748b;` +
    `text-transform:uppercase;font-weight:600;">Status</span>` +
    `<br>` +
    `<span style="display:inline-block;margin-top:4px;` +
    `padding:4px 12px;background:#e0f2fe;color:#0369a1;` +
    `border-radius:9999px;font-size:13px;font-weight:700;">` +
    `${label}` +
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
    `</div>`;

  return sendSystemEmail({
    to: order.user?.email,
    subject: `PrintHub Order #${order.id}: ${label}`,
    text:
      `Hi ${customerName}, your Order #${order.id} ` +
      `status is now "${label}". Total: ${money(order.total)}.`,
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
    subject: `PrintHub Payment Confirmed: Order #${order.id}`,
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
    `from the "My Orders" tab on your PrintHub profile.` +
    `</div>`;

  return sendSystemEmail({
    to: order.user?.email,
    subject: `PrintHub Payment ${statusLabel}: Order #${order.id}`,
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
    subject: `PrintHub Return Request Received: Order #${order.id}`,
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
    subject: `PrintHub Inventory Alert: Low Stock Items`,
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
    subject: `PrintHub Admin Alert: Order #${order.id} Design Review`,
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
    subject: `PrintHub Order #${order.id}: Design Approved`,
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

// Sends an OTP email to the user, logging to console in development.
async function sendOtpEmail({ email, code, expiresAt, subject }) {
  const emojiPattern =
    "[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}" +
    "\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]";
  const emojiRegex = new RegExp(emojiPattern, "gu");
  const cleanSubject =
    (subject || "").replace(emojiRegex, "").trim() ||
    `PrintHub Verification Code: ${code}`;

  const text = `Your verification code is: ${code}. It expires in 5 minutes.`;

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
    subject: `PrintHub Inventory Alert: Out of Stock Items`,
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
};
