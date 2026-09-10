/**
 * PMG AI Image Generation - Cloudflare Workers AI
 *
 * Uses Cloudflare Workers AI FLUX.1 Schnell
 * + IMG.LY Background Removal
 *
 * IMPORTANT:
 * CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID
 * must be configured in the backend .env
 */

const { removeBackground } = require(
  "@imgly/background-removal-node"
);

const CLOUDFLARE_API_TOKEN =
  process.env.CLOUDFLARE_API_TOKEN;

const CLOUDFLARE_ACCOUNT_ID =
  process.env.CLOUDFLARE_ACCOUNT_ID;

const MODEL =
  "@cf/black-forest-labs/flux-1-schnell";

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
    let message =
      `Cloudflare AI error: ${response.status}`;

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

  const base64Image =
    data?.result?.image;

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
   * --------------------------------------------------
   * STEP 1: Convert Cloudflare Base64 into a Buffer
   * --------------------------------------------------
   */

  let imageBuffer;

  try {
    const cleanBase64 =
      base64Image.startsWith("data:")
        ? base64Image.split(",")[1]
        : base64Image;

    imageBuffer =
      Buffer.from(cleanBase64, "base64");

    console.log(
      "[PMG AI] Cloudflare image converted to Buffer"
    );
  } catch (error) {
    console.error(
      "[PMG AI] Failed to decode Cloudflare image:",
      error
    );

    throw new Error(
      "Failed to decode generated AI image"
    );
  }

  /*
   * --------------------------------------------------
   * STEP 2: Remove the background
   * --------------------------------------------------
   *
   * The Buffer is converted into a typed Blob.
   * This is important because IMG.LY needs to know
   * the input image MIME type.
   */

  let transparentBlob;

  try {
    console.log(
      "[PMG AI] Removing image background..."
    );

    const inputBlob = new Blob(
      [imageBuffer],
      {
        type: "image/jpeg",
      }
    );

    transparentBlob =
      await removeBackground(
        inputBlob,
        {
          output: {
            format: "image/png",
          },
        }
      );

    console.log(
      "[PMG AI] Background removed successfully"
    );
  } catch (error) {
    console.error(
      "[PMG AI] Background removal failed:",
      error
    );

    throw new Error(
      "AI image generated, but background removal failed"
    );
  }

  /*
   * --------------------------------------------------
   * STEP 3: Convert transparent PNG Blob to Buffer
   * --------------------------------------------------
   */

  let transparentBuffer;

  try {
    const arrayBuffer =
      await transparentBlob.arrayBuffer();

    transparentBuffer =
      Buffer.from(arrayBuffer);

    console.log(
      "[PMG AI] Transparent PNG converted to Buffer"
    );
  } catch (error) {
    console.error(
      "[PMG AI] Failed to convert transparent image:",
      error
    );

    throw new Error(
      "Failed to process transparent AI image"
    );
  }

  /*
   * --------------------------------------------------
   * STEP 4: Convert PNG Buffer to Base64
   * --------------------------------------------------
   */

  const transparentBase64 =
    transparentBuffer.toString("base64");

  /*
   * --------------------------------------------------
   * STEP 5: Return transparent PNG
   * --------------------------------------------------
   */

  const imageUrl =
    `data:image/png;base64,${transparentBase64}`;

  console.log(
    "[PMG AI] Transparent PNG generated successfully"
  );

  return {
    url: imageUrl,
    width: 1024,
    height: 1024,
    seed: null,
    contentType: "image/png",
    backgroundRemoved: true,
    generationModel: MODEL,
  };
}

module.exports = {
  generateWithCloudflare,
};