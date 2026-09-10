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
    // Was 70 - same off-by-100 typo as the old wrap.w bug. In decal
    // mode this multiplies directly against the mesh's real width
    // (zoneW = size.x * scale.w in placeMesh), so 70 produced a decal
    // box ~70x the mug's actual size. The real geometry then only
    // ever sampled a razor-thin sliver near the exact center of the
    // source image, stretched across the whole visible surface -
    // which is what produced the banded/striped look.
    w: 0.7,
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
    // (measured via UV inspector: U 0.29-0.69, V 0.03-0.98).
    // w/x are fractions of the full circumference (see
    // getWrapUVBounds in GenericProductPreview3D.js) - w was
    // previously 70 (should be a 0-1 fraction, not a percent-like
    // integer) and x was 1 (should be a small centering offset, not a
    // full-circumference shift). Both bugs together made uMin/uMax
    // compute as 0/1 - the entire wrap, not a bounded print area -
    // which is what caused the striped/garbled mug texture.
    w: 0.4,
    h: 0.90,
    x: -0.01,
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