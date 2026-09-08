/**
 * PMG AI Image Generation
 *
 * Pipeline:
 *   1. Generate artwork with fal.ai FLUX.1 [dev]
 *   2. Send the generated image to fal.ai BiRefNet V2
 *   3. Remove the background
 *   4. Return the transparent PNG
 *
 * Production:
 *   fal.ai FLUX.1 [dev] + BiRefNet V2
 *
 * IMPORTANT:
 *   FAL_KEY must be configured in your backend .env
 */

const FAL_BASE = "https://fal.run";

const DEFAULT_MODEL = "fal-ai/flux/dev";
const BACKGROUND_REMOVAL_MODEL = "fal-ai/birefnet/v2";

const SIZE_MAP = {
  square_hd: [1024, 1024],
  square: [512, 512],
  portrait_4_3: [768, 1024],
  portrait_16_9: [576, 1024],
  landscape_4_3: [1024, 768],
  landscape_16_9: [1024, 576],
};

/**
 * Generate an image from a text prompt.
 *
 * Pipeline:
 *   FLUX → BiRefNet → transparent PNG
 *
 * @param {Object} opts
 * @param {string} opts.prompt
 * @param {string} [opts.model]
 * @param {string} [opts.imageSize]
 * @param {number} [opts.numSteps]
 *
 * @returns {Promise<{
 *   url: string,
 *   width: number,
 *   height: number,
 *   seed: number|null,
 *   contentType: string,
 *   backgroundRemoved: boolean
 * }>}
 */
async function generateImage({
  prompt,
  model = DEFAULT_MODEL,
  imageSize = "square_hd",
  numSteps = 28,
}) {
  if (!prompt || !prompt.trim()) {
    throw new Error("AI image prompt is required");
  }

  /*
   * We are intentionally using the real fal.ai pipeline.
   *
   * FAL_MOCK previously routed requests through Pollinations.AI.
   * That bypassed our background-removal pipeline and could return
   * images with backgrounds.
   *
   * If FAL_MOCK is still enabled in .env, warn clearly instead of
   * silently returning a non-transparent image.
   */
  if (process.env.FAL_MOCK === "true") {
    console.warn(
      "[AI Builder] FAL_MOCK=true is enabled. " +
        "The PMG AI Builder requires fal.ai for transparent PNG generation. " +
        "Set FAL_MOCK=false or remove FAL_MOCK from .env."
    );
  }

  return generateWithFal(
    prompt,
    model,
    imageSize,
    numSteps
  );
}

// ── fal.ai FLUX + BiRefNet ────────────────────────────────────────────────

async function generateWithFal(
  prompt,
  model,
  imageSize,
  numSteps
) {
  const falKey = process.env.FAL_KEY;

  if (!falKey) {
    throw new Error(
      "FAL_KEY environment variable is not set"
    );
  }

  const [width, height] =
    SIZE_MAP[imageSize] || [1024, 1024];

  console.log(
    `[PMG AI] Generating artwork with ${model}...`
  );

  // -----------------------------------------------------------------------
  // STEP 1: Generate artwork with FLUX
  // -----------------------------------------------------------------------

  const generationRes = await fetch(
    `${FAL_BASE}/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,

        image_size: imageSize,

        num_inference_steps: numSteps,

        guidance_scale: 3.5,

        num_images: 1,

        /*
         * Keep fal.ai safety checking enabled.
         */
        safety_tolerance: "2",

        /*
         * PNG is better than JPEG for the intermediate
         * artwork because it avoids JPEG compression artifacts
         * before background removal.
         *
         * IMPORTANT:
         * PNG here does NOT mean transparent.
         * BiRefNet below is what creates the transparency.
         */
        output_format: "png",
      }),
    }
  );

  if (!generationRes.ok) {
    let errMsg = `fal.ai FLUX error: ${generationRes.status}`;

    try {
      const errBody = await generationRes.json();

      errMsg =
        errBody?.message ||
        errBody?.detail ||
        errBody?.error ||
        errMsg;
    } catch {
      // Ignore JSON parsing errors
    }

    console.error(
      "[PMG AI] FLUX generation failed:",
      errMsg
    );

    throw new Error(errMsg);
  }

  const generationData =
    await generationRes.json();

  const generatedImage =
    generationData?.images?.[0];

  if (!generatedImage?.url) {
    console.error(
      "[PMG AI] FLUX returned no image:",
      generationData
    );

    throw new Error(
      "fal.ai FLUX returned no image URL"
    );
  }

  const generatedImageUrl =
    generatedImage.url;

  const generatedWidth =
    generatedImage.width || width;

  const generatedHeight =
    generatedImage.height || height;

  const seed =
    generationData?.seed ?? null;

  console.log(
    `[PMG AI] FLUX image generated: ${generatedImageUrl}`
  );

  // -----------------------------------------------------------------------
  // STEP 2: Remove background with BiRefNet V2
  // -----------------------------------------------------------------------

  console.log(
    "[PMG AI] Removing background with BiRefNet V2..."
  );

  const backgroundRemovalRes =
    await fetch(
      `${FAL_BASE}/${BACKGROUND_REMOVAL_MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${falKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          /*
           * BiRefNet V2 model variant.
           *
           * Light 2K gives us higher-resolution processing
           * while keeping the processing cost reasonable.
           */
          model: "General Use (Light 2K)",

          /*
           * Higher resolution helps preserve:
           * - small details
           * - lettering
           * - thin shapes
           * - irregular edges
           */
          operating_resolution: "2048x2048",

          /*
           * Improve the foreground edges after segmentation.
           */
          refine_foreground: true,

          /*
           * We only need the final transparent image.
           */
          output_mask: false,

          /*
           * Explicitly request PNG.
           *
           * This is the important part for the final
           * transparent artwork.
           */
          output_format: "png",

          /*
           * The FLUX-generated artwork.
           */
          image_url: generatedImageUrl,
        }),
      }
    );

  if (!backgroundRemovalRes.ok) {
    let errMsg =
      `fal.ai BiRefNet error: ${backgroundRemovalRes.status}`;

    try {
      const errBody =
        await backgroundRemovalRes.json();

      errMsg =
        errBody?.message ||
        errBody?.detail ||
        errBody?.error ||
        errMsg;
    } catch {
      // Ignore JSON parsing errors
    }

    console.error(
      "[PMG AI] Background removal failed:",
      errMsg
    );

    throw new Error(
      `Background removal failed: ${errMsg}`
    );
  }

  const backgroundRemovalData =
    await backgroundRemovalRes.json();

  /*
   * BiRefNet V2 returns:
   *
   * {
   *   image: {
   *     url,
   *     width,
   *     height,
   *     content_type
   *   }
   * }
   *
   * We also support the images[] format as a fallback
   * so small API response changes won't immediately
   * break the builder.
   */
  const transparentImage =
    backgroundRemovalData?.image ||
    backgroundRemovalData?.images?.[0];

  if (!transparentImage?.url) {
    console.error(
      "[PMG AI] BiRefNet returned no transparent image:",
      backgroundRemovalData
    );

    throw new Error(
      "Background removal returned no transparent PNG"
    );
  }

  const finalWidth =
    transparentImage.width ||
    generatedWidth;

  const finalHeight =
    transparentImage.height ||
    generatedHeight;

  console.log(
    `[PMG AI] Transparent PNG ready: ${transparentImage.url}`
  );

  // -----------------------------------------------------------------------
  // STEP 3: Return the FINAL transparent image
  // -----------------------------------------------------------------------

  return {
    /*
     * IMPORTANT:
     * This is now the BiRefNet PNG URL,
     * NOT the original FLUX image URL.
     */
    url: transparentImage.url,

    width: finalWidth,

    height: finalHeight,

    seed,

    contentType:
      transparentImage.content_type ||
      "image/png",

    backgroundRemoved: true,

    /*
     * Keep the original FLUX URL available for debugging
     * or future use, but the frontend should use `url`.
     */
    originalImageUrl: generatedImageUrl,

    generationModel: model,

    backgroundRemovalModel:
      BACKGROUND_REMOVAL_MODEL,
  };
}

module.exports = {
  generateImage,
};