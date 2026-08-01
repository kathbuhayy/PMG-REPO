import FlatPreview3D from "../FlatCustomizer/FlatPreview3D";

export default function FlyerPreview3D({
  shirtColor = "#ffffff",
  zoneDesigns = {},
  selectedSize = "",
}) {
  return (
    <FlatPreview3D
      productType="flyer"
      baseColor={shirtColor}
      zoneDesigns={zoneDesigns}
      selectedSize={selectedSize}
    />
  );
}
