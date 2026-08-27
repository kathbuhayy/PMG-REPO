// mockup.js
const express = require("express");
const router = express.Router();
const supabase = require("../db/supabase");
const { BUILDER_BUCKET, ensureBucket } = require("../services/uploadHelpers");

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY || "";
const PRINTFUL_CATALOG = {
  tshirt: {
    productId: 71,
    variantLight: 4012,
    variantDark: 4017,
  },
};

function hexLuminance(hex) {
  const clean = (hex || "#ffffff").replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) || 255;
  const g = parseInt(clean.substring(2, 4), 16) || 255;
  const b = parseInt(clean.substring(4, 6), 16) || 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

const ZONE_TO_PRINTFUL_PLACEMENT_CANDIDATES = {
  front: ["front"],
  back: ["back"],
  left_sleeve: ["sleeve_left", "left_sleeve", "left"],
  right_sleeve: ["sleeve_right", "right_sleeve", "right"],
};

router.post("/upload-design", async (req, res) => {
  try {
    const { dataUrl } = req.body;
    if (!dataUrl || !dataUrl.startsWith("data:image/")) {
      return res.status(400).json({ message: "dataUrl must be a data:image/... string" });
    }

    const matches = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ message: "Could not parse image data URL" });
    }

    await ensureBucket();

    const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    const path = `mockups/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from(BUILDER_BUCKET)
      .upload(path, buffer, { contentType: `image/${ext}`, upsert: false });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);

    const { data: urlData } = supabase.storage.from(BUILDER_BUCKET).getPublicUrl(path);
    res.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error("mockup upload-design failed:", err);
    res.status(500).json({ message: "Failed to upload design for mockup." });
  }
});

router.post("/printful/create-task", async (req, res) => {
  try {
    if (!PRINTFUL_API_KEY) {
      return res.status(400).json({ message: "PRINTFUL_API_KEY is not set on the server." });
    }

    const { designs, category = "tshirt", shirtColor } = req.body;
    if (!Array.isArray(designs) || designs.length === 0) {
      return res.status(400).json({ message: "designs must be a non-empty array of { zoneId, imageUrl }." });
    }

    const catalogEntry = PRINTFUL_CATALOG[category];
    if (!catalogEntry) {
      return res.status(400).json({
        message: `No Printful catalog mapping configured for category "${category}" yet.`,
      });
    }

    const isLight = hexLuminance(shirtColor) > 128;
    const variantId = isLight ? catalogEntry.variantLight : catalogEntry.variantDark;

    const printfilesRes = await fetch(
      `https://api.printful.com/mockup-generator/printfiles/${catalogEntry.productId}`,
      { headers: { Authorization: `Bearer ${PRINTFUL_API_KEY}` } },
    );
    const printfilesData = await printfilesRes.json();
    if (!printfilesRes.ok) {
      return res.status(printfilesRes.status).json({
        message:
          printfilesData?.result ||
          printfilesData?.error?.message ||
          "Failed to fetch Printful printfile dimensions.",
      });
    }

    const availablePlacements = printfilesData.result?.available_placements || {};
    const variantEntry = printfilesData.result?.variant_printfiles?.find(
      (v) => v.variant_id === variantId,
    );

    const files = [];
    const skippedZones = [];

    for (const { zoneId, imageUrl } of designs) {
      const candidates = ZONE_TO_PRINTFUL_PLACEMENT_CANDIDATES[zoneId] || [zoneId];
      const placementKey = candidates.find((key) => key in availablePlacements);

      if (!placementKey) {
        skippedZones.push(zoneId);
        continue;
      }

      const printfileId = variantEntry?.placements?.[placementKey];
      const printfile = printfilesData.result?.printfiles?.find(
        (p) => p.printfile_id === printfileId,
      );

      if (!printfile?.width || !printfile?.height) {
        skippedZones.push(zoneId);
        continue;
      }

      files.push({
        placement: placementKey,
        image_url: imageUrl,
        position: {
          area_width: printfile.width,
          area_height: printfile.height,
          width: printfile.width,
          height: printfile.height,
          top: 0,
          left: 0,
        },
      });
    }

    if (files.length === 0) {
      return res.status(400).json({
        message: `None of the provided zones (${designs.map((d) => d.zoneId).join(", ")}) map to a placement this product supports.`,
      });
    }

    const printfulRes = await fetch(
      `https://api.printful.com/mockup-generator/create-task/${catalogEntry.productId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PRINTFUL_API_KEY}`,
        },
        body: JSON.stringify({
          variant_ids: [variantId],
          format: "jpg",
          files,
        }),
      },
    );

    const data = await printfulRes.json();
    if (!printfulRes.ok) {
      return res.status(printfulRes.status).json({
        message: data?.result || data?.error?.message || "Printful create-task failed",
      });
    }

    res.json({ taskKey: data.result.task_key, skippedZones });
  } catch (err) {
    console.error("mockup create-task failed:", err);
    res.status(500).json({ message: "Failed to reach Printful." });
  }
});

router.get("/printful/task-status", async (req, res) => {
  try {
    if (!PRINTFUL_API_KEY) {
      return res.status(400).json({ message: "PRINTFUL_API_KEY is not set on the server." });
    }

    const { taskKey } = req.query;
    if (!taskKey) {
      return res.status(400).json({ message: "taskKey query param is required" });
    }

    const printfulRes = await fetch(
      `https://api.printful.com/mockup-generator/task?task_key=${taskKey}`,
      { headers: { Authorization: `Bearer ${PRINTFUL_API_KEY}` } },
    );

    const data = await printfulRes.json();
    if (!printfulRes.ok) {
      return res.status(printfulRes.status).json({
        message: data?.result || data?.error?.message || "Printful task-status failed",
      });
    }

    res.json({
      status: data.result?.status,
      mockups: (data.result?.mockups || []).map((m) => ({
        placement: m.placement,
        mockupUrl: m.mockup_url,
      })),
    });
  } catch (err) {
    console.error("mockup task-status failed:", err);
    res.status(500).json({ message: "Failed to reach Printful." });
  }
});

const SUDOMOCK_API_KEY = process.env.SUDOMOCK_API_KEY;

const SUDOMOCK_TEMPLATE_MAP = {
  tshirt: {
    mockupUuid: "0bb4bbbe-6b66-4825-863f-bd892e108066",
    zones: {
      front: "0a971349-7672-4f0e-8a93-276c5090fe56",
    },
  },
};

router.post("/sudomock/render", async (req, res) => {
  try {
    const { designs, category = "tshirt", shirtColor } = req.body || {};
    if (!designs) {
      return res.status(400).json({ message: "designs is required" });
    }

    const template = SUDOMOCK_TEMPLATE_MAP[category];
    if (!template) {
      return res
        .status(400)
        .json({ message: `No SudoMock template configured for "${category}".` });
    }

    const matched = designs
      .map(({ zoneId, imageUrl }) => {
        const soUuid = template.zones[zoneId];
        if (!soUuid) return null;
        return { zoneId, soUuid, imageUrl };
      })
      .filter(Boolean);

    if (matched.length === 0) {
      return res
        .status(400)
        .json({ message: "No matching print areas for the provided zones." });
    }

    const print_areas = matched.map(({ soUuid, imageUrl }) => ({
      uuid: soUuid,
      artwork_url: imageUrl,
      placement: { position: "center", fit: "fit" },
    }));

    if (shirtColor) {
      print_areas.forEach((pa) => {
        pa.color = shirtColor;
      });
    }

    const sudomockRes = await fetch(
      `https://api.sudomock.com/api/v1/sudoai/2d-mockups/${template.mockupUuid}/render`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": SUDOMOCK_API_KEY,
        },
        body: JSON.stringify({
          print_areas,
          export_options: { image_format: "png", image_size: 2048, quality: 90 },
        }),
      },
    );

    const data = await sudomockRes.json();
    if (!sudomockRes.ok || data.success === false) {
      console.error("SudoMock render error:", data);
      return res
        .status(502)
        .json({ message: data.error || data.message || data.detail || "SudoMock render failed." });
    }

    const imageUrl = data.data?.print_files?.[0]?.export_path;
    if (!imageUrl) {
      console.error("SudoMock render: no image URL in response:", data);
      return res.status(502).json({ message: "SudoMock returned no rendered image." });
    }

    res.json({
      mockups: [{ placement: matched.map((m) => m.zoneId).join("+"), mockupUrl: imageUrl }],
    });
  } catch (err) {
    console.error("SudoMock render error:", err);
    res.status(500).json({ message: "Failed to render SudoMock mockup." });
  }
});

module.exports = router;