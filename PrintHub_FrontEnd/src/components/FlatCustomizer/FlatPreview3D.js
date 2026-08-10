import React from "react";
import GenericProductPreview3D from
  "../GenericProductCustomizer/GenericProductPreview3D";
import { parseFlatSize } from "../../utils/parseFlatSize";

const FLAT_CONFIG = {
  calling_card: { width: 3.5, height: 2, depth: 0.1 },
  banners:      { width: 5.0, height: 2.0, depth: 0.1 },
  stickers:     { width: 2.0, height: 2.0, depth: 0.1 },
  hang_tags:    { width: 1.0, height: 2.0, depth: 0.1, hole: true },
  brochures:    { width: 2.97, height: 2.1, depth: 0.1, foldLines: 2 },
  business_card: { width: 3.5, height: 2, depth: 0.1 },
  thank_you_card: { width: 3.5, height: 2, depth: 0.1 },
  poster: { width: 2.1, height: 2.97, depth: 0.1 },
  posters: { width: 2.1, height: 2.97, depth: 0.1 },
  flyer: { width: 2.1, height: 2.97, depth: 0.1 },
  flyers: { width: 2.1, height: 2.97, depth: 0.1 },
};

export default function FlatPreview3D({
  productType,
  baseColor = "#ffffff",
  zoneDesigns = {},
  zoneTexts = {},
  selectedSide = "",
  zones = [],
  selectedSize = "",
  onZoneDesignChange,
  onTextChange,
  onZoneSelect,
  onTextSelect,
}) {
  const base = FLAT_CONFIG[productType] || { width: 2.1, height: 2.97 };
  const parsed = parseFlatSize(selectedSize);
  let shape = base;
  if (parsed) {
    let w = parsed.width;
    let h = parsed.height;
    const defaultIsLandscape = base.width > base.height;
    const parsedIsLandscape = w > h;
    if (defaultIsLandscape !== parsedIsLandscape) {
      w = parsed.height;
      h = parsed.width;
    }
    shape = { ...base, width: w, height: h };
  }
  return (
    <GenericProductPreview3D
      shirtColor={baseColor}
      zoneDesigns={zoneDesigns}
      zoneTexts={zoneTexts}
      selectedSide={selectedSide}
      zones={zones}
      onZoneDesignChange={onZoneDesignChange}
      onTextChange={onTextChange}
      onZoneSelect={onZoneSelect}
      onTextSelect={onTextSelect}
      projectionMode="decal"
      flatShape={shape}
      decalScale={{
        front: { w: 0.9, h: 0.9, depth: 0.2, surfaceOffset: 0.01 },
        back: { w: 0.9, h: 0.9, depth: 0.2, surfaceOffset: 0.01 },
        outside: { w: 0.9, h: 0.9, depth: 0.2, surfaceOffset: 0.01 },
        inside: { w: 0.9, h: 0.9, depth: 0.2, surfaceOffset: 0.01 },
      }}
    />
  );
}
