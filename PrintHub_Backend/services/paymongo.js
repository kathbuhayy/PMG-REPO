const PAYMONGO_BASE = "https://api.paymongo.com/v1";

// Extract pcs count per item pack from customizations object
function extractPcsFromCustomizations(customizations) {
  if (!customizations) return 1;

  const qtyStr =
    typeof customizations.quantity === "object"
      ? customizations.quantity?.label || ""
      : String(customizations.quantity || "");

  const match = qtyStr.match(/(\d+)\s*(?:pc|pcs|piece|pieces)?/i);
  if (match && match[1]) {
    const parsed = parseInt(match[1], 10);
    return parsed > 0 ? parsed : 1;
  }

  return 1;
}

// Formats a customization object into a single readable label string
function formatCustomizations(customizations) {
  if (!customizations) return "";
  const parts = [
    customizations.quantity && `Quantity: ${customizations.quantity}`,
    customizations.size && `Size: ${customizations.size}`,
    customizations.material &&
      `Material: ${customizations.material?.label || customizations.material}`,
    customizations.finish && `Finish: ${customizations.finish}`,
  ].filter(Boolean);
  return parts.join(" · ");
}

// Formats an order object into a standardized receipt payload for responses
const buildReceiptPayload = (order, statusOverride, emailSent) => {
  const paymentStatus = statusOverride || order.payment_status || "unpaid";
  const isPaid = paymentStatus === "paid";
  const customerName =
    [order.user?.first_name, order.user?.last_name]
      .filter(Boolean)
      .join(" ") ||
    order.user?.email ||
    "Customer";
  const customerEmail = order.user?.email || "";
  const receiptNo = `PMG-${String(order.id).padStart(6, "0")}`;
  const paidAt =
    isPaid && order.updatedAt
      ? new Date(order.updatedAt).toISOString()
      : null;

  const subtotal = (order.items || []).reduce(
    (sum, item) => sum + parseFloat(item.total_price || 0),
    0
  );
  const totalAmount = parseFloat(order.total || 0);
  const shippingCost = Math.max(0, totalAmount - subtotal);

  return {
    receiptNo,
    orderId: order.id,
    customerName,
    customerEmail,
    status: paymentStatus,
    paymentStatus,
    paymentMethod: order.payment_method || "Online payment",
    paymentReference:
      order.payment_reference || order.paymongo_session_id || "",
    total: order.total,
    currency: order.currency || "PHP",
    issuedAt: paidAt || new Date().toISOString(),
    paidAt,
    subtotal,
    shippingCost,
    shippingAddress: order.shipping_address || "",
    billingAddress: order.billing_address || "",
    emailSent: emailSent !== undefined ? !!emailSent : undefined,
    items: (order.items || []).map((item) => ({
      id: item.id,
      productName: item.product?.name || `Product #${item.productId}`,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.total_price,
      customizationLabel: formatCustomizations(item.customizations),
      pcsCount: extractPcsFromCustomizations(item.customizations),
    })),
    mockEmail: {
      to: customerEmail,
      subject: isPaid
        ? `Payment successful - PMG Receipt ${receiptNo}`
        : `Payment update - PMG Order #${order.id}`,
      status: isPaid ? "success" : "not_paid",
      body: isPaid
        ? `Hi ${customerName}, your payment for Order #${order.id} was successful. Your e-receipt number is ${receiptNo}.`
        : `Hi ${customerName}, payment for Order #${order.id} is not yet confirmed. You can retry payment from My Orders.`,
    },
  };
};

// Encodes the PayMongo secret key in base64 format for HTTP Basic auth
const paymongoAuth = () => {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) {
    console.warn(
      "⚠️ PAYMONGO_SECRET_KEY not set. PayMongo requests will fail until configured."
    );
    return "";
  }
  return Buffer.from(key + ":").toString("base64");
};

// Returns unique payment methods allowed by the request or application config
const paymongoPaymentMethods = (requestedMethods) => {
  const source = Array.isArray(requestedMethods)
    ? requestedMethods.join(",")
    : process.env.PAYMONGO_PAYMENT_METHOD_TYPES;
  const configured = process.env.PAYMONGO_PAYMENT_METHOD_TYPES;
  const methods = (source || configured || "qrph")
    .split(",")
    .map((method) => method.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set(methods)];
};

// Performs an authenticated API request to the PayMongo endpoint
const paymongoRequest = async (path, options = {}) => {
  const authHeader = paymongoAuth();
  if (!authHeader) {
    const error = new Error(
      "Payment provider not configured (missing secret)"
    );
    error.status = 500;
    throw error;
  }

  const response = await fetch(`${PAYMONGO_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${authHeader}`,
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error("PayMongo request failed");
    error.status = 502;
    error.details = data?.errors || data;
    throw error;
  }

  return data;
};

// Constructs the customer billing object from order details for PayMongo APIs
const customerBillingForOrder = (order) => {
  const firstName = order.user?.first_name || "";
  const lastName = order.user?.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim() || `Order #${order.id}`;

  return {
    name: fullName,
    email: order.user?.email || undefined,
    phone: order.user?.phone || undefined,
    address: {
      line1:
        order.billing_address ||
        order.shipping_address ||
        order.user?.address ||
        "Philippines",
      country: "PH",
    },
  };
};

// Generates normalized line items from order items for checkout sessions
const generateLineItems = (
  order,
  publicFrontendUrl,
  compactCheckout = false
) => {
  return order.items.map((item) => {
    const rawImageUrl =
      (item.customizations && item.customizations.imageUrl) ||
      (item.product &&
        item.product.images &&
        item.product.images[0]) ||
      undefined;

    // Ensure image URL is absolute. If it's relative, prefix with public URL.
    let imageUrl = rawImageUrl;
    if (imageUrl && imageUrl.startsWith("/")) {
      imageUrl = `${publicFrontendUrl.replace(/\/$/, "")}${imageUrl}`;
    }

    return {
      currency: "PHP",
      amount: Math.round(parseFloat(item.unit_price) * 100), // in centavos
      name: item.product?.name || `Item #${item.productId}`,
      quantity: item.quantity,
      image_url: compactCheckout ? undefined : imageUrl || undefined,
      images: !compactCheckout && imageUrl ? [imageUrl] : undefined,
    };
  });
};

// Builds the checkout session creation payload including line items and options
const createSessionPayload = (
  order,
  lineItems,
  paymentMethods,
  buildPaymentReturnUrl
) => {
  const itemsTotal = order.items.reduce(
    (sum, item) => sum + parseFloat(item.total_price),
    0
  );
  const shippingCost = parseFloat(order.total) - itemsTotal;
  if (shippingCost > 0.005) {
    lineItems.push({
      currency: "PHP",
      amount: Math.round(shippingCost * 100),
      name: "Shipping",
      quantity: 1,
    });
  }

  const checkoutPaymentMethods = paymongoPaymentMethods(paymentMethods);

  return {
    data: {
      attributes: {
        line_items: lineItems,
        payment_method_types: checkoutPaymentMethods,
        success_url: buildPaymentReturnUrl("success"),
        cancel_url: buildPaymentReturnUrl("cancelled"),
        description: `PrintHub Order #${order.id}`,
        reference_number: String(order.id),
        metadata: { order_id: String(order.id) },
        billing: order.billing_address
          ? {
              name: `Order #${order.id}`,
              address: { line1: order.billing_address, country: "PH" },
            }
          : undefined,
      },
    },
  };
};

// Creates a PayMongo Checkout Session and returns response session details
const createCheckoutSession = async (sessionPayload) => {
  return paymongoRequest("/checkout_sessions", {
    method: "POST",
    body: JSON.stringify(sessionPayload),
  });
};

// Executes full QR Ph payment flow: creating intent, method, and attaching them
const createQrphPayment = async (order, amount) => {
  // 1. Create Payment Intent
  const intent = await paymongoRequest("/payment_intents", {
    method: "POST",
    body: JSON.stringify({
      data: {
        attributes: {
          amount,
          currency: "PHP",
          payment_method_allowed: ["qrph"],
          capture_type: "automatic",
          description: `PrintHub Order #${order.id}`,
          statement_descriptor: "PrintHub",
          metadata: { order_id: String(order.id) },
        },
      },
    }),
  });

  const intentId = intent.data.id;
  const clientKey = intent.data.attributes.client_key;

  // 2. Create Payment Method
  const paymentMethod = await paymongoRequest("/payment_methods", {
    method: "POST",
    body: JSON.stringify({
      data: {
        attributes: {
          type: "qrph",
          billing: customerBillingForOrder(order),
        },
      },
    }),
  });

  // 3. Attach Payment Method to Intent
  const attached = await paymongoRequest(
    `/payment_intents/${intentId}/attach`,
    {
      method: "POST",
      body: JSON.stringify({
        data: {
          attributes: {
            payment_method: paymentMethod.data.id,
            client_key: clientKey,
          },
        },
      }),
    }
  );

  const attrs = attached.data.attributes || {};
  const qrImageUrl = attrs.next_action?.code?.image_url;

  return {
    intentId,
    clientKey,
    qrImageUrl,
  };
};

// Fetches details of a specific payment intent from PayMongo
const retrievePaymentIntent = async (paymentIntentId) => {
  return paymongoRequest(`/payment_intents/${paymentIntentId}`, {
    method: "GET",
  });
};

// Fetches details of a specific checkout session from PayMongo
const retrieveCheckoutSession = async (checkoutSessionId) => {
  return paymongoRequest(`/checkout_sessions/${checkoutSessionId}`, {
    method: "GET",
  });
};

// Validates HMAC-SHA256 signature of incoming PayMongo webhook payloads
const verifyWebhookSignature = (
  rawBodyString,
  signatureHeader,
  webhookSecret
) => {
  const isProduction = process.env.NODE_ENV === "production";
  const isPlaceholder =
    !webhookSecret ||
    webhookSecret === "whsec_REPLACE_WITH_YOUR_WEBHOOK_SECRET";

  if (isPlaceholder) {
    if (isProduction) {
      console.error(
        "PayMongo webhook error: Webhook secret not configured in production."
      );
      return false;
    }
    return true; // Bypass signature verification in non-production
  }

  if (!signatureHeader) {
    console.warn("PayMongo webhook: missing signature header");
    return false;
  }

  // Signature format: t=<timestamp>,te=<test_sig>,li=<live_sig>
  const parts = signatureHeader.split(",").reduce((acc, part) => {
    const [k, v] = part.split("=");
    if (k && v) acc[k] = v;
    return acc;
  }, {});

  const timestamp = parts.t;
  if (!timestamp) return false;

  const toSign = `${timestamp}.${rawBodyString}`;
  const crypto = require("crypto");
  const expectedSig = crypto
    .createHmac("sha256", webhookSecret)
    .update(toSign)
    .digest("hex");

  const receivedSig = parts.te || parts.li; // test env uses 'te'
  if (receivedSig !== expectedSig) {
    const shortRec = String(receivedSig || "").slice(0, 8);
    const shortExp = String(expectedSig || "").slice(0, 8);
    console.warn(
      `PayMongo webhook signature mismatch: got=${shortRec} expected=${shortExp}`
    );
    return false;
  }

  return true;
};

// Creates a return inquiry and updates the order status in the database
const createInquiryAndUpdateOrder = async (order, reason, details) => {
  const prisma = require("../db/prisma");
  const productNames = (order.items || [])
    .map((item) => item.product?.name || `Product #${item.productId}`)
    .join(", ");
  const customerName =
    [order.user?.first_name, order.user?.last_name]
      .filter(Boolean)
      .join(" ") ||
    "Customer";
  const customerEmail = order.user?.email || "";

  const inquiry = await prisma.inquiry.create({
    data: {
      userId: order.userId,
      product_title: productNames || `Order #${order.id}`,
      subject: `Return complaint for Order #${order.id}`,
      name: customerName,
      email: customerEmail,
      quantity: String(
        (order.items || []).reduce((sum, item) => sum + item.quantity, 0)
      ),
      other: [`Reason: ${reason}`, details && `Details: ${details}`]
        .filter(Boolean)
        .join("\n"),
      status: "new",
    },
  });

  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: { status: "return_requested" },
    include: { items: true, user: true },
  });

  return {
    inquiry,
    updatedOrder,
    customerEmail,
    customerName,
  };
};

// Export PayMongo helper functions for use in other parts of the app.
module.exports = {
  PAYMONGO_BASE,
  buildReceiptPayload,
  paymongoAuth,
  paymongoPaymentMethods,
  paymongoRequest,
  customerBillingForOrder,
  generateLineItems,
  createSessionPayload,
  createCheckoutSession,
  createQrphPayment,
  retrievePaymentIntent,
  retrieveCheckoutSession,
  verifyWebhookSignature,
  createInquiryAndUpdateOrder,
};

