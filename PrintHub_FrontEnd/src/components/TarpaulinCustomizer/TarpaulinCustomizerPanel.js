import TshirtCustomizerPanel from "../TshirtCustomizer/TshirtCustomizerPanel";
import GenericProductPreview3D from "../GenericProductCustomizer/GenericProductPreview3D";

export default function TarpaulinCustomizerPanel(props) {
  return (
    <TshirtCustomizerPanel
      {...props}
      modelPath={null}
      PreviewComponent={GenericProductPreview3D}
      designType="tarpaulin"
      productLabel="tarpaulin"
      previewProps={{
        projectionMode: "plane",
        flatShape: { width: 5.0, height: 2.0, depth: 0.02 },
        decalScale: { front: { w: 1, h: 1, surfaceOffset: 0.08 } },
      }}
    />
  );
}
