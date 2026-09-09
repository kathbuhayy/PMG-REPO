/**
 * PMG AI Image Generation - Cloudflare Workers AI
 *
 * Uses Cloudflare Workers AI FLUX.1 Schnell
 *
 * IMPORTANT:
 * CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID
 * must be configured in the backend .env
 */

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;

const MODEL = "@cf/black-forest-labs/flux-1-schnell";

async function generateWithCloudflare({
  prompt,
  imageSize = "square_hd",
}) {
  if (!CLOUDFLARE_API_TOKEN) {
    throw new Error(
      "CLOUDFLARE_API_TOKEN environment variable is not set"
    );
  }

  if (!CLOUDFLARE_ACCOUNT_ID) {
    throw new Error(
      "CLOUDFLARE_ACCOUNT_ID environment variable is not set"
    );
  }

  if (!prompt || !prompt.trim()) {
    throw new Error("AI image prompt is required");
  }

  const url =
    `https://api.cloudflare.com/client/v4/accounts/` +
    `${CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`;

  console.log(
    `[PMG AI] Generating artwork with Cloudflare ${MODEL}...`
  );

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: prompt.trim(),
      steps: 4,
    }),
  });

  if (!response.ok) {
    let message = `Cloudflare AI error: ${response.status}`;

    try {
      const errorData = await response.json();

      message =
        errorData?.errors?.[0]?.message ||
        errorData?.message ||
        message;
    } catch {
      // Ignore JSON parsing errors
    }

    console.error(
      "[PMG AI] Cloudflare generation failed:",
      message
    );

    throw new Error(message);
  }

  const data = await response.json();

  if (!data?.success) {
    const message =
      data?.errors?.[0]?.message ||
      "Cloudflare AI generation failed";

    console.error(
      "[PMG AI] Cloudflare generation failed:",
      message
    );

    throw new Error(message);
  }

  const base64Image = data?.result?.image;

  if (!base64Image) {
    console.error(
      "[PMG AI] Cloudflare returned no image:",
      data
    );

    throw new Error(
      "Cloudflare AI returned no generated image"
    );
  }

  /*
   * Cloudflare FLUX returns the generated image as Base64.
   *
   * Convert it to a data URL so the existing frontend
   * can continue using the imageUrl field.
   */
  const imageUrl =
    base64Image.startsWith("data:")
      ? base64Image
      : `data:image/jpeg;base64,${base64Image}`;

  console.log(
    "[PMG AI] Cloudflare image generated successfully"
  );

  return {
    url: imageUrl,
    width: 1024,
    height: 1024,
    seed: null,
    contentType: "image/jpeg",
    backgroundRemoved: false,
    generationModel: MODEL,
  };
}

module.exports = {
  generateWithCloudflare,
};