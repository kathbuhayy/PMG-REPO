const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Each entry: product id, its new single material_options label,
// and the real InventorySubstrate/InventoryUnit name it should link to.
const UPDATES = [
  { id: 34, label: "Cardstock (Included)", substrate: "cardstock_paper" },   // Business Card
  { id: 8,  label: "Cardstock (Included)", substrate: "cardstock_paper" },   // Note Cards / Thank You Cards
  { id: 5,  label: "Cardstock (Included)", substrate: "cardstock_paper" },   // Product Hang Tags
  { id: 6,  label: "Gloss Paper (Included)", substrate: "bond_paper" },     // Posters
  { id: 10, label: "Paper Cover (Included)", substrate: "cardstock_paper" }, // Notebook
  { id: 7,  label: "Vinyl (Included)", substrate: "vinyl_sheet" },          // Tarpaulin / Banners
  { id: 4,  label: "Vinyl (Included)", substrate: "vinyl_sheet" },          // Stickers & Labels
];

// Cap is handled separately below since it uses unit-based tracking
// (plain_cap), not a substrate.
const CAP_ID = 44;
const CAP_LABEL = "Fabric (Included)";

async function main() {
  for (const u of UPDATES) {
    const updated = await prisma.product.update({
      where: { id: u.id },
      data: {
        material_options: [u.label],
        substrateMaterialName: u.substrate,
      },
    });
    console.log(`✔ [${u.id}] ${updated.name}: material_options=${JSON.stringify(updated.material_options)}, substrate=${updated.substrateMaterialName}`);
  }

  const cap = await prisma.product.update({
    where: { id: CAP_ID },
    data: {
      material_options: [CAP_LABEL],
    },
  });
  console.log(`✔ [${CAP_ID}] ${cap.name}: material_options=${JSON.stringify(cap.material_options)} (unitMaterialName unchanged: ${cap.unitMaterialName})`);
}

main()
  .catch((e) => console.error("❌ Script failed:", e))
  .finally(() => prisma.$disconnect());