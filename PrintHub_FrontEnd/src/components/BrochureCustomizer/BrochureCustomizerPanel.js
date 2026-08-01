import TshirtCustomizerPanel from "../TshirtCustomizer/TshirtCustomizerPanel";
import GenericProductPreview3D from "../GenericProductCustomizer/GenericProductPreview3D";

export default function BrochureCustomizerPanel(props) {
  return (
    <TshirtCustomizerPanel
      {...props}
      modelPath={null}
      PreviewComponent={GenericProductPreview3D}
      designType="brochure"
      productLabel="brochure"
      previewProps={{
        projectionMode: "plane",
        flatShape: { width: 2.97, height: 2.1, depth: 0.1, foldLines: 2 },
        decalScale: {
          front: { w: 1, h: 1, surfaceOffset: 0.08 },
          back: { w: 1, h: 1, surfaceOffset: 0.08 },
        },
      }}
    />
  );
}
