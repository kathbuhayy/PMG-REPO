import TshirtCustomizerPanel from "../TshirtCustomizer/TshirtCustomizerPanel";
import FlyerPreview3D from "./FlyerPreview3D";

export default function FlyerCustomizerPanel(props) {
  return (
    <TshirtCustomizerPanel
      {...props}
      modelPath={null}
      PreviewComponent={FlyerPreview3D}
      designType="flyer"
      productLabel="flyer"
      previewProps={{
        projectionMode: "plane",
        flatShape: { width: 2.1, height: 2.97, depth: 0.035 },
        decalScale: {
          front: { w: 1, h: 1, surfaceOffset: 0.08 },
          back: { w: 1, h: 1, surfaceOffset: 0.08 },
        },
      }}
    />
  );
}
