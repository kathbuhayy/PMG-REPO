import TshirtCustomizerPanel from "../TshirtCustomizer/TshirtCustomizerPanel";
import JerseyPreview3D from "./JerseyPreview3D";

const JERSEY_HEM_ZONE_OPTIONS = [
  { id: "neck", label: "Neck Hem" },
  { id: "bottom_hem", label: "Bottom Hem" },
  { id: "left_hem", label: "Left Hem" },
  { id: "right_hem", label: "Right Hem" },
];

export default function JerseyCustomizerPanel(props) {
  return (
    <TshirtCustomizerPanel
      {...props}
      modelPath="/models/sando.glb"
      PreviewComponent={JerseyPreview3D}
      designType="jersey"
      productLabel="jersey"
      hemZoneOptions={JERSEY_HEM_ZONE_OPTIONS}
    />
  );
}