import TshirtCustomizerPanel from "../TshirtCustomizer/TshirtCustomizerPanel";
import SweatshirtPreview3D from "./SweatshirtPreview3D";

const SWEATSHIRT_HEM_ZONE_OPTIONS = [
  { id: "neck", label: "Neck Hem" },
  { id: "bottom_hem", label: "Bottom Hem" },
  { id: "left_hem", label: "Left Cuff" },
  { id: "right_hem", label: "Right Cuff" },
];

export default function SweatshirtCustomizerPanel(props) {
  return (
    <TshirtCustomizerPanel
      {...props}
      modelPath="/models/sweatshirt.glb"
      PreviewComponent={SweatshirtPreview3D}
      designType="sweatshirt"
      productLabel="sweatshirt"
      hemZoneOptions={SWEATSHIRT_HEM_ZONE_OPTIONS}
    />
  );
}