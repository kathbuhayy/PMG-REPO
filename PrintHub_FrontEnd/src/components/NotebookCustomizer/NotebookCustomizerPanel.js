import React from "react";
import TshirtCustomizerPanel from
  "../TshirtCustomizer/TshirtCustomizerPanel";
import NotebookPreview3D from "./NotebookPreview3D";

const NOTEBOOK_GLB = "/models/notebook.glb";

export default function NotebookCustomizerPanel(props) {
  return (
    <TshirtCustomizerPanel
      {...props}
      modelPath={NOTEBOOK_GLB}
      PreviewComponent={NotebookPreview3D}
      designType="notebook"
      productLabel="notebook"
    />
  );
}
