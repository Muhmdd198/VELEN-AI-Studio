// ─────────────────────────────────────────────────────────────────────────────
// enhance.js  —  Next.js / Vercel API Route  (pages/api/enhance.js)
//
// Uses Replicate's Real-ESRGAN model to upscale images 4×.
//
// Setup:
//   1. Create a free account at https://replicate.com
//   2. Copy your API token from https://replicate.com/account/api-tokens
//   3. Add it to your .env.local file:
//        REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// ─────────────────────────────────────────────────────────────────────────────

// Real-ESRGAN model — get the latest version hash from:
// https://replicate.com/nightmareai/real-esrgan/versions
const REPLICATE_MODEL_VERSION =
  "42fed1c4976f5e5a3c4d0c2a0d9f7d2d8f8b6f8b9c0e9f7c2a6d8e9f7b1a2c3d4"; // ← replace with current version

const MAX_POLL_ATTEMPTS = 30;   // 30 × 1.5 s = 45 s timeout
const POLL_INTERVAL_MS  = 1500;

export default async function handler(req, res) {

  // FIX 1: only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { image } = req.body;

  if (!image || typeof image !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'image' field in request body." });
  }

  if (!process.env.REPLICATE_API_TOKEN) {
    return res.status(500).json({ error: "REPLICATE_API_TOKEN is not configured on the server." });
  }

  try {
    // ── Step 1: Create prediction ──────────────────────────────────────────
    const createRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type":  "application/json"
      },
      body: JSON.stringify({
        version: REPLICATE_MODEL_VERSION,
        input: {
          image,
          scale: 4      // upscale factor — 2, 4, or 8
        }
      })
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      throw new Error(`Replicate create error: ${err.detail || createRes.status}`);
    }

    const prediction = await createRes.json();

    // ── Step 2: Poll for result (with timeout) ─────────────────────────────
    // FIX 2: added max attempts to prevent infinite loop
    let output = null;
    let attempts = 0;

    while (!output && attempts < MAX_POLL_ATTEMPTS) {
      await delay(POLL_INTERVAL_MS);
      attempts++;

      const pollRes = await fetch(prediction.urls.get, {
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`
        }
      });

      if (!pollRes.ok) {
        throw new Error(`Replicate poll error: ${pollRes.status}`);
      }

      const pollData = await pollRes.json();

      if (pollData.status === "failed") {
        throw new Error(`Prediction failed: ${pollData.error || "unknown reason"}`);
      }

      if (pollData.status === "succeeded") {
        // output is an array, take the first URL
        output = Array.isArray(pollData.output) ? pollData.output[0] : pollData.output;
      }
    }

    if (!output) {
      throw new Error("Processing timed out. Please try again with a smaller image.");
    }

    // ── Step 3: Return result ──────────────────────────────────────────────
    return res.status(200).json({ output });

  } catch (err) {
    console.error("[enhance] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}

// FIX 3: removed frontend dropZone.addEventListener that was incorrectly
//         placed inside this server-side file.

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
