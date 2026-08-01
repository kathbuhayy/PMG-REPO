import TshirtCustomizerPanel from "../TshirtCustomizer/TshirtCustomizerPanel";
import GenericProductPreview3D from "../GenericProductCustomizer/GenericProductPreview3D";

export default function HangTagCustomizerPanel(props) {
  return (
    <TshirtCustomizerPanel
      {...props}
      modelPath={null}
      PreviewComponent={GenericProductPreview3D}
      designType="hang_tag"
      productLabel="hang tag"
      previewProps={{
        projectionMode: "plane",
        flatShape: { width: 1.0, height: 2.0, depth: 0.1, hole: true },
        decalScale: {
          front: { w: 0.92, h: 0.92, surfaceOffset: 0.08 },
          back: { w: 0.92, h: 0.92, surfaceOffset: 0.08 },
        },
      }}
    />
  );
}
