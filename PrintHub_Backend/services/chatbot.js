const prisma = require("../db/prisma");

let model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
let catalogPromptCache = null;
let productsCache = null;
let cacheExpiryTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Formats a number to Philippine Peso or specified currency.
const formatMoney = (value, currency = "PHP") => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
  }).format(amount);
};

// Splits option string into label and price description.
const splitOption = (option) => {
  if (!option || typeof option !== "string") return null;
  const [label, price] = option.split("|").map((part) => part.trim());
  return price ? `${label}: ${price}` : label;
};

// Formats options array into a comma-separated string up to a limit.
const formatOptions = (options = [], limit = 5) =>
  options.map(splitOption).filter(Boolean).slice(0, limit).join(", ");

// Normalizes query text for case-insensitive keyword searching.
const normalizeSearchText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Finds a matching product based on search terms or aliases in the question.
const findProductForQuestion = (question, products) => {
  const q = normalizeSearchText(question);
  if (!q) return null;

  const aliases = [
    ["business card", "calling card", "card"],
    ["tarpaulin", "tarp", "banner"],
    ["t-shirt", "tshirt", "shirt"],
    ["sticker", "label"],
    ["notebook", "journal"],
  ];

  return products.find((product) => {
    const name = normalizeSearchText(product.name);
    const sku = normalizeSearchText(product.sku);
    const terms = [name, sku];

    aliases.forEach((group) => {
      const match = group.some((term) =>
        name.includes(normalizeSearchText(term))
      );
      if (match) {
        terms.push(...group.map(normalizeSearchText));
      }
    });

    return terms.some((term) => term && q.includes(term));
  });
};

// Builds a detailed string summary of product pricing, sizes, and turnaround.
const buildProductSummary = (product) => {
  const basePrice =
    formatMoney(product.price, product.currency) || product.price;
  const quantityOptions = formatOptions(product.quantity_options);
  const shippingOptions = formatOptions(product.shipping_options);
  const sizes = formatOptions(product.size_options);
  const materials = formatOptions(product.material_options);
  const turnaround = product.turnaround_hours
    ? `${Math.ceil(product.turnaround_hours / 24)} business day(s)`
    : "varies by order";

  return [
    `${product.name} starts at ${basePrice}.`,
    product.description,
    quantityOptions ? `Quantity pricing: ${quantityOptions}.` : "",
    sizes ? `Sizes: ${sizes}.` : "",
    materials ? `Materials: ${materials}.` : "",
    `Turnaround: ${turnaround}.`,
    shippingOptions ? `Shipping: ${shippingOptions}.` : "",
    "Final pricing can change based on size, material, finish, quantity, " +
      "and rush options.",
  ]
    .filter(Boolean)
    .join("\n");
};

// Generates a local fallback response when Gemini is unavailable or not set.
const buildLocalChatReply = (question, products) => {
  const q = normalizeSearchText(question);
  const product = findProductForQuestion(question, products);

  if (product) return buildProductSummary(product);

  if (q.includes("product") || q.includes("service") || q.includes("offer")) {
    const names = products.map((p) => p.name).slice(0, 12).join(", ");
    return (
      `PrintHub offers printing products and services including: ${names}. ` +
      `You can ask me about pricing, sizes, materials, turnaround, ` +
      `delivery, file requirements, or bulk orders for any of these.`
    );
  }

  if (
    q.includes("file") ||
    q.includes("format") ||
    q.includes("requirements")
  ) {
    return (
      "For print files, PrintHub accepts PDF, PNG, JPG, AI, and PSD. " +
      "For best results, use high-resolution files, CMYK color when " +
      "possible, and include bleed/safe margins for trimmed products."
    );
  }

  if (q.includes("payment") || q.includes("pay")) {
    return (
      "PrintHub supports GCash, PayMaya, bank transfer, and card/online " +
      "checkout when available."
    );
  }

  if (q.includes("delivery") || q.includes("shipping")) {
    return (
      "PrintHub supports pickup and delivery options. Many products include " +
      "free standard pickup/shipping options, with express delivery " +
      "available for an added fee depending on the product."
    );
  }

  if (q.includes("bulk") || q.includes("discount")) {
    return (
      "Bulk orders are supported. Many products already have lower " +
      "per-piece pricing at higher quantities, and custom bulk quotes " +
      "can be requested for larger jobs."
    );
  }

  return (
    "I can help with PrintHub products, pricing, quantity options, " +
    "materials, file requirements, delivery, payments, bulk orders, " +
    "and order support. What product would you like to ask about?"
  );
};

// Serializes the product catalog into a text context block for the AI model.
const buildCatalogContext = (products) =>
  products
    .map((product) => {
      const basePrice =
        formatMoney(product.price, product.currency) || String(product.price);
      return [
        `Product: ${product.name}`,
        `SKU: ${product.sku || "N/A"}`,
        `Description: ${product.description || "N/A"}`,
        `Base price: ${basePrice}`,
        `Print type: ${product.print_type || "N/A"}`,
        `Turnaround hours: ${product.turnaround_hours || "varies"}`,
        `Sizes: ${formatOptions(product.size_options) || "N/A"}`,
        `Materials: ${formatOptions(product.material_options) || "N/A"}`,
        `Sides: ${formatOptions(product.side_options) || "N/A"}`,
        `Finishing: ${formatOptions(product.finishing_options) || "N/A"}`,
        `Quantities: ${formatOptions(product.quantity_options, 8) || "N/A"}`,
        `Shipping: ${formatOptions(product.shipping_options) || "N/A"}`,
      ].join("\n");
    })
    .join("\n\n");


// Formats messages to Gemini-compatible format if they are in OpenAI style.
const formatGeminiMessages = (messages = []) => {
  return messages.map((msg) => {
    const role =
      msg.role === "assistant" || msg.role === "model" ? "model" : "user";

    if (msg.parts && Array.isArray(msg.parts)) {
      return {
        role,
        parts: msg.parts.map((p) => {
          if (typeof p === "string") {
            return { text: p };
          }
          return p && p.text ? { text: p.text } : { text: "" };
        }),
      };
    }

    const text =
      msg.content || (typeof msg.text === "string" ? msg.text : "");

    return {
      role,
      parts: [{ text }],
    };
  });
};


// Processes message history and fetches a reply from Gemini or local catalog.
async function handleChat(messages) {
  const formattedMessages = formatGeminiMessages(messages);

  const SYSTEM_PROMPT =
    "You are PrintHub Assistant, a friendly and knowledgeable AI chatbot " +
    "for PrintHub — a professional printing service. Help customers with:\n" +
    "- Pricing and quotes (business cards, flyers, posters, tarpaulins, " +
    "mugs, shirts, notebooks, etc.)\n" +
    "- Delivery times and shipping options\n" +
    "- Turnaround time for orders\n" +
    "- Design services and file requirements (PDF, PNG, JPG, AI, PSD)\n" +
    "- Payment methods (GCash, PayMaya, Bank Transfer)\n" +
    "- Returns and refunds policy\n" +
    "- Bulk order discounts\n" +
    "- Order status and tracking\n" +
    "Be concise, warm, and helpful. If asked about exact pricing and order" + 
    "status write a disclaimer of possible inaccuracy or, tell the customer" +
    "to contact PrintHub directly for a custom quote. \n\n" +
    "CRITICAL: You must ONLY answer questions directly related to PrintHub, " +
    "its products, payments, delivery, or policies. Do NOT answer " +
    "unrelated questions (e.g. general knowledge, science, math, coding, or"
    " personal queries). If asked about off-topic items, politely decline to" +
    "answer and redirect them to PrintHub services.";

  const latestUserMessage = [...formattedMessages]
    .reverse()
    .find((message) => message.role === "user")
    ?.parts?.map((part) => part.text)
    .filter(Boolean)
    .join(" ");

  const now = Date.now();
  if (!catalogPromptCache || !productsCache || now >= cacheExpiryTime) {
    console.log("[Chatbot Cache] Miss - fetching products from database...");
    productsCache = await prisma.product.findMany({
      where: { active: true, deleted_at: null },
      orderBy: { name: "asc" },
      take: 50,
    });

    const catalogContext =
      buildCatalogContext(productsCache) ||
      "No active products are currently available.";

    catalogPromptCache =
      `${SYSTEM_PROMPT}\n\n` +
      "Use the product catalog below as the source of truth for PrintHub " +
      "product and service questions. If the exact requested option is " +
      "not listed, share the closest listed options and suggest requesting " +
      "a custom quote. Do not invent prices, policies, phone numbers, " +
      "or addresses.\n\n" +
      "General PrintHub service facts:\n" +
      "- Accepted file formats: PDF, PNG, JPG, AI, PSD.\n" +
      "- Payment methods: GCash, PayMaya, Bank Transfer, and card/online " +
      "checkout when available.\n" +
      "- Bulk orders are supported and may receive custom pricing.\n" +
      "- Standard delivery/pickup and express options vary by product.\n\n" +
      "Product catalog:\n" +
      catalogContext;

    cacheExpiryTime = now + CACHE_TTL_MS;
  } else {
    console.log("[Chatbot Cache] Hit - using cached catalog context");
  }

  if (!process.env.GEMINI_API_KEY) {
    return buildLocalChatReply(latestUserMessage || "", productsCache);
  }

  if (!process.env.GEMINI_MODEL) {
    console.warn(
      `[Chatbot Warning] GEMINI_MODEL is not set. Defaulting to "${model}".`
    );
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: formattedMessages,
      systemInstruction: {
        parts: [{ text: catalogPromptCache }],
      },
      generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Gemini API error:", data);
    return buildLocalChatReply(latestUserMessage || "", productsCache);
  }

  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    buildLocalChatReply(latestUserMessage || "", productsCache)
  );
}

module.exports = {
  handleChat,
};
