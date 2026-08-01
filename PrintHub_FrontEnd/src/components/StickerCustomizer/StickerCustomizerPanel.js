import TshirtCustomizerPanel from "../TshirtCustomizer/TshirtCustomizerPanel";
import GenericProductPreview3D from "../GenericProductCustomizer/GenericProductPreview3D";

export default function StickerCustomizerPanel(props) {
  return (
    <TshirtCustomizerPanel
      {...props}
      modelPath={null}
      PreviewComponent={GenericProductPreview3D}
      designType="sticker"
      productLabel="sticker"
      previewProps={{
        projectionMode: "plane",
        flatShape: { width: 2.0, height: 2.0, depth: 0.1, radius: 1 },
        decalScale: { front: { w: 0.9, h: 0.9, surfaceOffset: 0.08 } },
      }}
    />
  );
}
