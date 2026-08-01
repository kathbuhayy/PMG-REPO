import TshirtCustomizerPanel from "../TshirtCustomizer/TshirtCustomizerPanel";
import BusinessCardPreview3D from "./BusinessCardPreview3D";

export default function BusinessCardCustomizerPanel(props) {
  return (
    <TshirtCustomizerPanel
      {...props}
      modelPath={null}
      PreviewComponent={BusinessCardPreview3D}
      designType="business_card"
      productLabel="business card"
      previewProps={{
        projectionMode: "plane",
        flatShape: { width: 3.5, height: 2, depth: 0.1 },
        decalScale: {
          front: { w: 1, h: 1, surfaceOffset: 0.08 },
          back: { w: 1, h: 1, surfaceOffset: 0.08 },
        },
      }}
    />
  );
}
