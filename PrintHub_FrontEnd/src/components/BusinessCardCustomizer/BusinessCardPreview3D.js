import FlatPreview3D from "../FlatCustomizer/FlatPreview3D";

export default function BusinessCardPreview3D({
  shirtColor = "#ffffff",
  zoneDesigns = {},
  zoneTexts = {},
  onTextChange,
  onZoneSelect,
  onTextSelect,
  selectedSize = "",
}) {
  return (
    <FlatPreview3D
      productType="business_card"
      baseColor={shirtColor}
      zoneDesigns={zoneDesigns}
      selectedSize={selectedSize}
      zoneTexts={zoneTexts}
      onTextChange={onTextChange}
      onZoneSelect={onZoneSelect}
      onTextSelect={onTextSelect}
    />
  );
}
