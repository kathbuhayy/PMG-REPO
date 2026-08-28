// PrintHub_Backend/generateTripoTshirtPilot.js  (new file)
/**
 * generateTripoTshirtPilot.js
 * Pilot script: generates ONE blank t-shirt 3D model via the Tripo3D API
 * and saves it as a NEW file (tshirt-tripo3d-pilot.glb) alongside your
 * existing tshirt.glb - it does NOT touch or replace anything currently
 * working, so you can compare the two side by side before deciding
 * whether to actually switch over.
 *
 * IMPORTANT: even if this generates a great-looking model, it will NOT
 * automatically know where your front/back/sleeve print zones go - that
 * still needs to be calibrated by hand afterward, the same way Cap's
 * decalScale config was set up. This script only gets you the model file.
 *
 * Uses Tripo's official v3 API (developers.tripo3d.ai):
 *   POST https://openapi.tripo3d.ai/v3/generation/text-to-model
 *   GET  https://openapi.tripo3d.ai/v3/tasks/{task_id}
 * Model URLs expire quickly after generation - this downloads
 * immediately on success rather than waiting.
 *
 * Run:
 *   export TRIPO_API_KEY="your_key_here"   (Mac/Linux)
 *   $env:TRIPO_API_KEY="your_key_here"     (Windows PowerShell)
 *   node generateTripoTshirtPilot.js
 */

const fs = require("fs");
const path = require("path");

const TRIPO_API_KEY = process.env.TRIPO_API_KEY;
const BASE_URL = "https://openapi.tripo3d.ai/v3";

const PROMPT =
  "a plain blank white crew-neck t-shirt, front view, laid perfectly flat, " +
  "symmetrical, no wrinkles, no folds, seamless smooth cotton fabric, " +
  "studio product photography, even lighting, no shadows, no mannequin, " +
  "no person, plain background, high detail PBR texture";

const NEGATIVE_PROMPT =
  "wrinkles, folds, mannequin, person wearing, model wearing, background scenery, " +
  "shadows, blurry, distorted, asymmetrical, low quality, logo, print, pattern";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createTask() {
  const res = await fetch(`${BASE_URL}/generation/text-to-model`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TRIPO_API_KEY}`,
    },
    body: JSON.stringify({
      prompt: PROMPT,
      negative_prompt: NEGATIVE_PROMPT,
      model: "v3.1-20260211",
      texture: true,
      pbr: true,
      texture_quality: "detailed",
    }),
  });

  const data = await res.json();
  if (!res.ok || data.code !== 0) {
    throw new Error(`Failed to create Tripo3D task: ${JSON.stringify(data)}`);
  }
  return data.data.task_id;
}

async function pollTask(taskId) {
  const MAX_ATTEMPTS = 90;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(`${BASE_URL}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${TRIPO_API_KEY}` },
    });
    const data = await res.json();

    if (!res.ok || data.code !== 0) {
      throw new Error(`Failed to check task status: ${JSON.stringify(data)}`);
    }

    const { status, progress } = data.data;
    console.log(`  [${attempt}] status: ${status}, progress: ${progress ?? "?"}%`);

    if (status === "success") {
      return data.data.output;
    }
    if (status === "failed") {
      throw new Error(`Tripo3D task failed: ${JSON.stringify(data.data)}`);
    }

    await wait(2000);
  }
  throw new Error("Timed out waiting for Tripo3D generation to finish.");
}

async function downloadModel(modelUrl, outputPath) {
  const res = await fetch(modelUrl);
  if (!res.ok) {
    throw new Error(`Failed to download model file (status ${res.status}). URLs expire quickly - if this failed, rerun the whole script rather than reusing an old URL.`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
}

async function main() {
  if (!TRIPO_API_KEY) {
    console.error("Set TRIPO_API_KEY as an environment variable first (see comment at top of this file).");
    process.exitCode = 1;
    return;
  }

  console.log("Submitting generation task to Tripo3D...");
  const taskId = await createTask();
  console.log(`Task created: ${taskId}`);

  console.log("Polling for completion (this usually takes 10-120 seconds)...");
  const output = await pollTask(taskId);

  if (!output?.model_url) {
    throw new Error(`Task succeeded but no model_url was returned: ${JSON.stringify(output)}`);
  }

  const outputDir = path.join(__dirname, "..", "PrintHub_FrontEnd", "public", "models");
  const outputPath = path.join(outputDir, "tshirt-tripo3d-pilot.glb");

  if (!fs.existsSync(outputDir)) {
    console.error(`Expected models folder not found at ${outputDir} - adjust the path in this script if your folder structure differs, then save the file manually from output.model_url.`);
    console.log("Model URL (grab this quickly, it expires):", output.model_url);
    return;
  }

  console.log("Downloading model file...");
  await downloadModel(output.model_url, outputPath);

  console.log(`\nDone. Saved to: ${outputPath}`);
  if (output.rendered_image_url) {
    console.log(`Preview image (also expires quickly): ${output.rendered_image_url}`);
  }
  console.log("\nThis is a NEW file - your existing tshirt.glb is untouched.");
  console.log("Open tshirt-tripo3d-pilot.glb in a viewer (e.g. https://gltf-viewer.donmccurdy.com/) to check it before doing anything else.");
}

main().catch((err) => {
  console.error("\nPilot generation failed:", err.message);
  process.exitCode = 1;
});