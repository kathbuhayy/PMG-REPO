import React from "react";
import TshirtCustomizerPanel from
  "../TshirtCustomizer/TshirtCustomizerPanel";
import MugPreview3D from "./MugPreview3D";

const MUG_GLB = "/models/coffee_cup.glb";

export default function MugCustomizerPanel(props) {
  return (
    <TshirtCustomizerPanel
      {...props}
      modelPath={MUG_GLB}
      PreviewComponent={MugPreview3D}
      designType="mug"
      productLabel="mug"
    />
  );
}
