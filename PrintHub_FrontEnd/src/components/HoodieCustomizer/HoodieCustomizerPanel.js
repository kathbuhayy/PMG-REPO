import TshirtCustomizerPanel from "../TshirtCustomizer/TshirtCustomizerPanel";
import HoodiePreview3D from "./HoodiePreview3D";

const HOODIE_HEM_ZONE_OPTIONS = [
  { id: "hood", label: "Hood" },
  { id: "bottom_hem", label: "Bottom Hem" },
  { id: "left_hem", label: "Left Cuff" },
  { id: "right_hem", label: "Right Cuff" },
];

export default function HoodieCustomizerPanel(props) {
  return (
    <TshirtCustomizerPanel
      {...props}
      modelPath="/models/hoodie.glb"
      PreviewComponent={HoodiePreview3D}
      designType="hoodie"
      productLabel="hoodie"
      hemZoneOptions={HOODIE_HEM_ZONE_OPTIONS}
    />
  );
}