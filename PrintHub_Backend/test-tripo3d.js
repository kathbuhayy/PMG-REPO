/**
 * test-tripo3d.js
 * Quick manual test for the new Tripo3D service (services/tripo3d.js).
 * Run this locally to confirm your TRIPO_API_KEY + the new service work
 * before wiring anything into the UI. This does NOT touch server.js or
 * any routes — it just calls the service function directly.
 *
 * Run:
 *   cd PrintHub_Backend
 *   node test-tripo3d.js
 *
 * (Make sure TRIPO_API_KEY is set in your .env — this script loads dotenv.)
 */

require("dotenv").config();
const { generateModelFromText } = require("./services/tripo3d");

async function main() {
  if (!process.env.TRIPO_API_KEY) {
    console.error("TRIPO_API_KEY is not set in your .env — add it first.");
    process.exitCode = 1;
    return;
  }

  console.log("Requesting a test 3D model from Tripo3D...");
  console.log("(this usually takes 10-120 seconds)\n");

  try {
    const { glbUrl, tripoTaskId } = await generateModelFromText({
      prompt: "a plain baseball cap, front view, studio lighting",
      quality: "standard",
    });

    console.log("\n✅ SUCCESS");
    console.log("Task ID:", tripoTaskId);
    console.log("Model URL (expires ~5 min, download/use promptly):");
    console.log(glbUrl);
  } catch (err) {
    console.error("\n❌ FAILED");
    console.error(err.message);
    process.exitCode = 1;
  }
}

main();