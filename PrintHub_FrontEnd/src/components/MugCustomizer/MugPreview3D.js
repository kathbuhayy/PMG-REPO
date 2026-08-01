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
    w: 0.45,
    h: 0.45,
    depth: 0.3,
    surfaceOffset: 0.005,
  },
  back: {
    w: 0.45,
    h: 0.45,
    depth: 0.3,
    surfaceOffset: 0.005,
  },
  wrap: {
    w: 2.5,
    h: 0.75,
    depth: 0.8,
    surfaceOffset: 0.005,
    x: -0.25,
  },
};

export default function MugPreview3D(props) {
  return (
    <GenericProductPreview3D
      {...props}
      zoneFaceMap={ZONE_FACE_MAP}
      projectionMode={PROJECTION_MODE}
      decalScale={DECAL_SCALE}
    />
  );
}
