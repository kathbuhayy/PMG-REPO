import TshirtCustomizerPanel from "../TshirtCustomizer/TshirtCustomizerPanel";
import JerseyPreview3D from "./JerseyPreview3D";

export default function JerseyCustomizerPanel(props) {
  return (
    <TshirtCustomizerPanel
      {...props}
      modelPath="/models/sando.glb"
      PreviewComponent={JerseyPreview3D}
      designType="jersey"
      productLabel="jersey"
      previewProps={{
        decalScale: {
          front: { w: 0.52, h: 0.52, depth: 0.3, surfaceOffset: 0.025, y: 0.12 },
          back: { w: 0.42, h: 0.42, depth: 0.25, surfaceOffset: 0.005, y: 0.15 },
        },
      }}
    />
  );
}