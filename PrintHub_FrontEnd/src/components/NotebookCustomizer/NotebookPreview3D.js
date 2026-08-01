import React from "react";
import GenericProductPreview3D from
  "../GenericProductCustomizer/GenericProductPreview3D";

export default function NotebookPreview3D(props) {
  return (
    <GenericProductPreview3D
      {...props}
      zoneFaceMap={{
        front_cover: "front",
        back_cover: "back",
      }}
      projectionMode={{
        front_cover: "decal",
        back_cover: "decal",
        default: "decal",
      }}
      decalScale={{
        front_cover: {
          w: 0.72,
          h: 0.88,
          depth: 0.3,
          surfaceOffset: 0.005,
        },
        back_cover: {
          w: 0.72,
          h: 0.88,
          depth: 0.3,
          surfaceOffset: 0.005,
        },
      }}
    />
  );
}
