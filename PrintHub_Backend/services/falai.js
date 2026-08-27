/**
 * Image generation helper.
 *
 * Production:  OpenAI GPT Image 2   — requires OPENAI_API_KEY + billing set up
 * Development: Pollinations.AI      — free, no key, set FAL_MOCK=true in .env
 *
 * NOTE: this file used to call fal.ai's FLUX.1 [dev]. The function name,
 * exported signature, and return shape are unchanged so nothing calling
 * generateImage() elsewhere (server.js) needs to be touched. Only the
 * production path underneath was swapped.
 */

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";
const DEFAULT_MODEL = "gpt-image-2";

// Pollinations dev fallback still uses these pixel dimensions.
const SIZE_MAP = {
  square_hd: [1024, 1024],
  square: [512, 512],
  portrait_4_3: [768, 1024],
  portrait_16_9: [576, 1024],
  landscape_4_3: [1024, 768],
  landscape_16_9: [1024, 576],
};

// OpenAI's GPT Image 2 only accepts these three sizes — map every
// existing imageSize key onto the closest one.
const OPENAI_SIZE_MAP = {
  square_hd: "1024x1024",
  square: "1024x1024",
  portrait_4_3: "1024x1536",
  portrait_16_9: "1024x1536",
  landscape_4_3: "1536x1024",
  landscape_16_9: "1536x1024",
};

/**
 * Generate an image from a text prompt.
 * @param {Object} opts
 * @param {string} opts.prompt
 * @param {string} [opts.model]
 * @param {string} [opts.imageSize]
 * @param {number} [opts.numSteps] - unused by OpenAI, kept for signature compatibility
 * @returns {Promise<{url: string, width: number, height: number, seed: number|null}>}
 */
async function generateImage({
  prompt,
  model = DEFAULT_MODEL,
  imageSize = "square_hd",
  numSteps = 28,
}) {
  if (process.env.FAL_MOCK === "true") {
    return generateWithPollinations(prompt, imageSize);
  }
  return generateWithOpenAI(prompt, model, imageSize);
}

// ── Pollinations.AI (free, no key) ──────────────────────────────────────────
async function generateWithPollinations(prompt, imageSize) {
  const [width, height] = SIZE_MAP[imageSize] || [1024, 1024];
  const seed = Math.floor(Math.random() * 999999);

  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;

  console.log(`[Pollinations] Generated URL: ${url}`);

  // Return URL directly — Pollinations generates on first browser load, no pre-check needed
  return { url, width, height, seed };
}

// ── OpenAI GPT Image 2 ───────────────────────────────────────────────────────
async function generateWithOpenAI(prompt, model, imageSize) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY environment variable is not set");

  const size = OPENAI_SIZE_MAP[imageSize] || "1024x1024";
  const [width, height] = size.split("x").map(Number);

  const res = await fetch(OPENAI_IMAGES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      quality: "high",
      background: "transparent",
      n: 1,
    }),
  });

  if (!res.ok) {
    let errMsg = `OpenAI error: ${res.status}`;
    try {
      const errBody = await res.json();
      errMsg = errBody?.error?.message || errMsg;
    } catch {
      /* ignore */
    }
    throw new Error(errMsg);
  }

  const data = await res.json();
  const image = data?.data?.[0];
  if (!image?.b64_json) throw new Error("OpenAI returned no image data");

  return {
    url: `data:image/png;base64,${image.b64_json}`,
    width,
    height,
    seed: null,
  };
}

module.exports = { generateImage };