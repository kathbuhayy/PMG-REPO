import React from "react";
import GenericProductPreview3D from
  "../GenericProductCustomizer/GenericProductPreview3D";

const ZONE_FACE_MAP = {
  front: "front",
  back: "back",
  wrap: "front",
};

const PROJECTION_MODE = {
  front: "decal",
  back: "decal",
  wrap: "cylindrical",
  default: "decal",
};

const DECAL_SCALE = {
  front: {
    w: 70,
    h: 0.90,
    depth: 0.45,
    surfaceOffset: 0.004,
  },

  back: {
    w: 0.68,
    h: 0.6,
    depth: 0.45,
    surfaceOffset: 0.004,
  },

  wrap: {
    // Matches the mug body mesh's ACTUAL computed cylindrical UV range
    // (measured via UV inspector: U 0.29–0.69, V 0.03–0.98).
    w: 70,
    h: 0.90,
    x: 1,
    y: 0,
  },
};

export default function MugPreview3D(props) {
  return (
    <GenericProductPreview3D
      {...props}
      zoneFaceMap={ZONE_FACE_MAP}
      projectionMode={PROJECTION_MODE}
      decalScale={DECAL_SCALE}
      modelRotationY={-Math.PI / 2}
      cylindricalUpAxis="z"
      cylindricalFrontOffsetDeg={120}
      cylindricalBackOffsetDeg={120}
    />
  );
}