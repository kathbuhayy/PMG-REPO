import TshirtCustomizerPanel from "../TshirtCustomizer/TshirtCustomizerPanel";
import JerseyPreview3D from "./JerseyPreview3D";

export default function JerseyCustomizerPanel(props) {
  return (
    <TshirtCustomizerPanel
      {...props}
      modelPath="/models/jersey.glb"
      PreviewComponent={JerseyPreview3D}
      designType="jersey"
      productLabel="jersey"
      previewProps={{
        projectionMode: "decal",
        decalScale: {
          front: {
            w: 0.52,
            h: 0.52,
            depth: 0.3,
            surfaceOffset: 0.025,
            y: 0.12,
            z: -0.06,
          },
          back: {
            w: 0.42,
            h: 0.42,
            depth: 0.25,
            surfaceOffset: 0.005,
            y: 0.15,
            z: 0.06,
          },
          left_sleeve: {
            w: 0.24,
            h: 0.24,
            depth: 0.25,
            surfaceOffset: 0.005,
            y: 0.15,
            x: 0.05,
          },
          right_sleeve: {
            w: 0.24,
            h: 0.24,
            depth: 0.25,
            surfaceOffset: 0.005,
            y: 0.15,
            x: -0.05,
          },
        },
      }}
    />
  );
}
