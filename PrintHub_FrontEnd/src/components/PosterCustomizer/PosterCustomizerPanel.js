import TshirtCustomizerPanel from "../TshirtCustomizer/TshirtCustomizerPanel";
import PosterPreview3D from "./PosterPreview3D";

export default function PosterCustomizerPanel(props) {
  return (
    <TshirtCustomizerPanel
      {...props}
      modelPath={null}
      PreviewComponent={PosterPreview3D}
      designType="poster"
      productLabel="poster"
      previewProps={{
        projectionMode: "plane",
        flatShape: { width: 2.1, height: 2.97, depth: 0.035 },
        decalScale: { front: { w: 1, h: 1, surfaceOffset: 0.08 } },
      }}
    />
  );
}
