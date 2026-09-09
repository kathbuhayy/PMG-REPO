import TshirtCustomizerPanel from "../TshirtCustomizer/TshirtCustomizerPanel";
import CapPreview3D from "./CapPreview3D";

export default function CapCustomizerPanel(props) {
  return (
    <TshirtCustomizerPanel
      {...props}
      modelPath="/models/final_cap.glb"
      PreviewComponent={CapPreview3D}
      designType="cap"
      productLabel="cap"
      previewProps={{
        decalScale: {
          front: { w: 1, h: 1, depth: 3, surfaceOffset: 0.01, y: 0.01, z: 0.99 },
          back: { w: 1, h: 1, depth: 3, surfaceOffset: 0.01, y: 0.01, z: 0.99 },
          left_side: { w: 1.5, h: 2.5, depth: 3, surfaceOffset: 0.015, y: 0.1, z: -0.15 },
          right_side: { w: 1.5, h: 2.5, depth: 3, surfaceOffset: 0.015, y: 0.1, z: -0.15 },
        },
      }}
    />
  );
}