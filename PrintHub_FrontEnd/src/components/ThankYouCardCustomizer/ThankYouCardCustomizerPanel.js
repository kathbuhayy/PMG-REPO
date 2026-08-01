import TshirtCustomizerPanel from "../TshirtCustomizer/TshirtCustomizerPanel";
import ThankYouCardPreview3D from "./ThankYouCardPreview3D";

const GenericProductPreview3D = ThankYouCardPreview3D;

export default function ThankYouCardCustomizerPanel(props) {
  return (
    <TshirtCustomizerPanel
      {...props}
      modelPath={null}
      PreviewComponent={GenericProductPreview3D}
      designType="thank_you_card"
      productLabel="thank you card"
      previewProps={{
        projectionMode: "plane",
        flatShape: { width: 3.5, height: 2, depth: 0.035 },
        decalScale: {
          front: { w: 1, h: 1, surfaceOffset: 0.08 },
          back: { w: 1, h: 1, surfaceOffset: 0.08 },
        },
      }}
    />
  );
}
