import FlatPreview3D from "../FlatCustomizer/FlatPreview3D";

export default function PosterPreview3D({
  shirtColor = "#ffffff",
  zoneDesigns = {},
  selectedSize = "",
}) {
  return (
    <FlatPreview3D
      productType="poster"
      baseColor={shirtColor}
      zoneDesigns={zoneDesigns}
      selectedSize={selectedSize}
    />
  );
}
