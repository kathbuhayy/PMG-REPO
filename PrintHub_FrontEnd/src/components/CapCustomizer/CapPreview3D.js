import GenericProductPreview3D from "../GenericProductCustomizer/GenericProductPreview3D";

export default function CapPreview3D(props) {
  return (
    <GenericProductPreview3D
      {...props}
      zoneFaceMap={{
        front: "front",
        back: "back",
        left_side: "left",
        right_side: "right",
      }}
      projectionMode={{
        front: "decal",
        back: "decal",
        left_side: "decal",
        right_side: "decal",
        default: "decal",
      }}
    />
  );
}
