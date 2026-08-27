/**
 * 3D Model generation helper using the Tripo3D v3 API.
 *
 * Supports:
 *   - Text-to-3D: Generate 3D model from text prompt
 *   - Image-to-3D: Generate 3D model from a reference image URL
 *
 * Tripo3D API is async — tasks are submitted and polled until completion.
 * Docs: https://developers.tripo3d.ai
 *
 * NOTE: Tripo3D model URLs expire ~5 minutes after the task succeeds.
 * Callers should download/store the result promptly rather than caching
 * the URL for later use.
 */

const TRIPO_BASE = "https://openapi.tripo3d.ai/v3";
const TRIPO_MODEL_VERSION = "v3.1-20260211";
const TRIPO_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes max wait
const TRIPO_POLL_INTERVAL_MS = 2000; // Poll every 2 seconds, per Tripo docs

// Map the app's generic "draft" / "standard" / "preview" quality knob
// (inherited from the old Meshy integration) onto Tripo's texture_quality.
const QUALITY_TO_TEXTURE_QUALITY = {
  draft: "standard",
  preview: "standard",
  standard: "detailed",
};

/**
 * Check if Tripo3D is properly configured
 */
function validateTripoConfig() {
  const key = process.env.TRIPO_API_KEY;
  if (!key) {
    throw new Error("TRIPO_API_KEY environment variable is not set");
  }
  return key;
}

/**
 * Generate a 3D model from a text prompt using Tripo3D text-to-model API
 * @param {Object} opts
 * @param {string} opts.prompt - Description of the 3D model to generate
 * @param {string} [opts.quality] - "draft", "standard", or "preview" (default: "standard")
 * @returns {Promise<{glbUrl: string, tripoTaskId: string}>}
 */
async function generateModelFromText({ prompt, quality = "standard" }) {
  const apiKey = validateTripoConfig();

  console.log(
    `[Tripo3D] Submitting text-to-model task: "${prompt.slice(0, 60)}..."`,
  );

  const submitRes = await fetch(`${TRIPO_BASE}/generation/text-to-model`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: prompt.trim(),
      model: TRIPO_MODEL_VERSION,
      texture: true,
      pbr: true,
      texture_quality: QUALITY_TO_TEXTURE_QUALITY[quality] || "detailed",
    }),
  });

  const submitData = await submitRes.json();
  if (!submitRes.ok || submitData.code !== 0) {
    throw new Error(
      `Tripo3D text-to-model submission error: ${JSON.stringify(submitData)}`,
    );
  }

  const taskId = submitData.data?.task_id;
  if (!taskId) throw new Error("Tripo3D did not return a task ID");

  console.log(`[Tripo3D] Task submitted: ${taskId}`);

  const output = await pollTripoTask(apiKey, taskId);
  if (!output?.model_url) {
    throw new Error("Tripo3D task completed but no model_url was returned");
  }

  console.log(`✅ [Tripo3D] Task ${taskId} completed: ${output.model_url}`);
  return { glbUrl: output.model_url, tripoTaskId: taskId };
}

/**
 * Generate a 3D model from an image using Tripo3D image-to-model API
 * @param {Object} opts
 * @param {string} opts.imageUrl - Publicly accessible URL of the reference image (JPEG/PNG, max 20MB)
 * @param {string} [opts.description] - Optional text description to steer generation (used as negative-prompt-free hint)
 * @param {string} [opts.quality] - "draft", "standard", or "preview" (default: "standard")
 * @returns {Promise<{glbUrl: string, tripoTaskId: string}>}
 */
async function generateModelFromImage({
  imageUrl,
  description,
  quality = "standard",
}) {
  const apiKey = validateTripoConfig();

  console.log(
    `[Tripo3D] Submitting image-to-model task: ${imageUrl}${description ? ` with description: "${description.slice(0, 60)}..."` : ""}`,
  );

  const submitRes = await fetch(`${TRIPO_BASE}/generation/image-to-model`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      file: { url: imageUrl },
      model: TRIPO_MODEL_VERSION,
      texture: true,
      pbr: true,
      texture_quality: QUALITY_TO_TEXTURE_QUALITY[quality] || "detailed",
    }),
  });

  const submitData = await submitRes.json();
  if (!submitRes.ok || submitData.code !== 0) {
    throw new Error(
      `Tripo3D image-to-model submission error: ${JSON.stringify(submitData)}`,
    );
  }

  const taskId = submitData.data?.task_id;
  if (!taskId) throw new Error("Tripo3D did not return a task ID");

  console.log(`[Tripo3D] Task submitted: ${taskId}`);

  const output = await pollTripoTask(apiKey, taskId);
  if (!output?.model_url) {
    throw new Error("Tripo3D task completed but no model_url was returned");
  }

  console.log(`✅ [Tripo3D] Task ${taskId} completed: ${output.model_url}`);
  return { glbUrl: output.model_url, tripoTaskId: taskId };
}

/**
 * Poll a Tripo3D task until it succeeds, fails, or times out
 * @private
 * @param {string} apiKey - Tripo3D API key
 * @param {string} taskId - Tripo3D task ID
 * @returns {Promise<{model_url: string, rendered_image_url?: string}>}
 */
async function pollTripoTask(apiKey, taskId) {
  const startTime = Date.now();

  while (Date.now() - startTime < TRIPO_TIMEOUT_MS) {
    const statusRes = await fetch(`${TRIPO_BASE}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const statusData = await statusRes.json();
    if (!statusRes.ok || statusData.code !== 0) {
      throw new Error(
        `Tripo3D status check error: ${JSON.stringify(statusData)}`,
      );
    }

    const { status, progress, output } = statusData.data;
    console.log(
      `[Tripo3D] Task ${taskId} status: ${status}, progress: ${progress ?? "?"}% (elapsed: ${Math.round((Date.now() - startTime) / 1000)}s)`,
    );

    if (status === "success") {
      return output;
    }

    if (status === "failed" || status === "cancelled" || status === "banned") {
      throw new Error(
        `Tripo3D task ${status}: ${JSON.stringify(statusData.data)}`,
      );
    }

    if (status === "expired") {
      throw new Error("Tripo3D task expired");
    }

    await new Promise((resolve) =>
      setTimeout(resolve, TRIPO_POLL_INTERVAL_MS),
    );
  }

  throw new Error(
    `Tripo3D task ${taskId} did not complete within ${Math.round(TRIPO_TIMEOUT_MS / 1000)} seconds`,
  );
}

module.exports = {
  generateModelFromText,
  generateModelFromImage,
};