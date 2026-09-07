import React from "react";
import TshirtPreview3D from "../components/TshirtCustomizer/TshirtPreview3D";
import CapPreview3D from "../components/CapCustomizer/CapPreview3D";
import MugPreview3D from "../components/MugCustomizer/MugPreview3D";
import NotebookPreview3D from "../components/NotebookCustomizer/NotebookPreview3D";
import JerseyPreview3D from "../components/JerseyCustomizer/JerseyPreview3D";
import FlatPreview3D from "../components/FlatCustomizer/FlatPreview3D";

export function inferCustomizerCategory({ category, name }) {
  const rawCategory = String(category || "").toLowerCase();
  const label = String(name || "").toLowerCase();

  if (label.includes("flyer")) return "flyers";
  if (label.includes("poster")) return "posters";
  if (label.includes("sticker") || label.includes("label")) return "stickers";
  if (label.includes("hang tag") || label.includes("hangtag")) return "hang_tags";
  if (label.includes("tarpaulin") || label.includes("banner")) return "banners";
  if (label.includes("business card") || label.includes("calling card")) return "business_card";
  if (label.includes("thank you")) return "thank_you_card";
  if (label.includes("brochure")) return "brochures";

  if (rawCategory && !["service", "print", "other"].includes(rawCategory)) {
    return rawCategory;
  }
  if (label.includes("notebook")) return "notebook";
  if (label.includes("jersey")) return "jersey";
  if (label.includes("cap") || label.includes("hat")) return "cap";
  if (label.includes("mug") || label.includes("cup")) return "mug";
  if (label.includes("shirt") || label.includes("t-shirt") || label.includes("tshirt")) {
    return "tshirt";
  }
  return rawCategory || "other";
}

// Accepts { productName, design } - same shape as AdminOrders' ai3DPreviewModal
// state, so it can be called directly with that object.
export function render3DPreview({ productName, design }) {
  const category = inferCustomizerCategory({
    name: productName,
    category: design?.type || design?.category,
  });

  const baseColor =
    design?.shirtColor || design?.productColor || design?.baseColor || "#ffffff";

  const zoneDesigns = design?.zones || {};
  const zoneTexts = design?.zoneTexts || {};
  const zoneLayers = design?.zoneLayers || {};
  const zoneColors = design?.zoneColors || {};

  if (category === "tshirt") {
    return (
      <TshirtPreview3D
        modelPath="/models/texture.glb"
        shirtColor={baseColor}
        zoneColors={zoneColors}
        zoneDesigns={zoneDesigns}
        zoneTexts={zoneTexts}
        zoneLayers={zoneLayers}
        fillParent={true}
      />
    );
  }
  if (category === "cap") {
    return (
      <CapPreview3D
        modelPath="/models/cap.glb"
        shirtColor={baseColor}
        zoneColors={zoneColors}
        zoneDesigns={zoneDesigns}
        zoneTexts={zoneTexts}
        zoneLayers={zoneLayers}
        fillParent={true}
        projectionMode="decal"
        decalScale={{
          front: { w: 0.34, h: 0.3, depth: 0.32, surfaceOffset: 0.025, y: -0.08, z: -0.32 },
          back: { w: 0.32, h: 0.28, depth: 0.28, surfaceOffset: 0.015, y: 0.15 },
          left_side: { w: 0.28, h: 0.28, depth: 0.28, surfaceOffset: 0.015, y: 0.1, z: -0.15 },
          right_side: { w: 0.28, h: 0.28, depth: 0.28, surfaceOffset: 0.015, y: 0.1, z: -0.15 },
        }}
      />
    );
  }
  if (category === "mug") {
    return (
      <MugPreview3D
        modelPath="/models/mug.glb"
        shirtColor={baseColor}
        zoneColors={zoneColors}
        zoneDesigns={zoneDesigns}
        zoneTexts={zoneTexts}
        zoneLayers={zoneLayers}
        fillParent={true}
      />
    );
  }
  if (category === "notebook") {
    return (
      <NotebookPreview3D
        modelPath="/models/notebook.glb"
        shirtColor={baseColor}
        zoneColors={zoneColors}
        zoneDesigns={zoneDesigns}
        zoneTexts={zoneTexts}
        zoneLayers={zoneLayers}
        fillParent={true}
      />
    );
  }
  if (category === "jersey") {
    return (
      <JerseyPreview3D
        modelPath="/models/jersey.glb"
        shirtColor={baseColor}
        zoneColors={zoneColors}
        zoneDesigns={zoneDesigns}
        zoneTexts={zoneTexts}
        zoneLayers={zoneLayers}
        fillParent={true}
      />
    );
  }

  return (
    <FlatPreview3D
      productType={category}
      baseColor={baseColor}
      zoneDesigns={zoneDesigns}
      zoneTexts={zoneTexts}
      zoneLayers={zoneLayers}
      fillParent={true}
    />
  );
}