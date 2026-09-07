import TshirtCustomizerPanel from "../TshirtCustomizer/TshirtCustomizerPanel";
import StickerPreview3D from "./StickerPreview3D";

export default function StickerCustomizerPanel(props) {
  return (
    <TshirtCustomizerPanel
      {...props}
      PreviewComponent={StickerPreview3D}
      designType="sticker"
      productLabel="sticker"
      previewProps={{
        modelPath: "/models/sticker.glb",
      }}
    />
  );
}