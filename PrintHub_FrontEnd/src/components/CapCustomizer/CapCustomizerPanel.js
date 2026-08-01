import TshirtCustomizerPanel from "../TshirtCustomizer/TshirtCustomizerPanel";
import CapPreview3D from "./CapPreview3D";

export default function CapCustomizerPanel(props) {
  return (
    <TshirtCustomizerPanel
      {...props}
      modelPath="/models/cap.glb"
      PreviewComponent={CapPreview3D}
      designType="cap"
      productLabel="cap"
      previewProps={{
        projectionMode: "decal",
        decalScale: {
          front: {
            w: 0.34,
            h: 0.3,
            depth: 0.32,
            surfaceOffset: 0.025,
            y: -0.08,
            z: -0.32,
          },
          back: {
            w: 0.32,
            h: 0.28,
            depth: 0.28,
            surfaceOffset: 0.015,
            y: 0.15,
          },
          left_side: {
            w: 0.28,
            h: 0.28,
            depth: 0.28,
            surfaceOffset: 0.015,
            y: 0.1,
            z: -0.15,
          },
          right_side: {
            w: 0.28,
            h: 0.28,
            depth: 0.28,
            surfaceOffset: 0.015,
            y: 0.1,
            z: -0.15,
          },
        }
      }}
    />
  );
}
