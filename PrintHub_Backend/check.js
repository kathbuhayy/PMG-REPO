const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // 1. Create the three new substrate rows (placeholder stock — correct
  //    via the Inventory admin page once you know real amounts).
  const fabrics = ["cotton_fleece", "cotton_poly_fleece", "heavyweight_fleece"];
  for (const name of fabrics) {
    const created = await prisma.inventorySubstrate.upsert({
      where: { materialName: name },
      update: {},
      create: { materialName: name, stockMeters: 300, safetyThreshold: 15 },
    });
    console.log("Ensured inventory:", created.materialName, created.stockMeters);
  }

  // 2. Simplify Hoodie's material options to fabric name only, and map
  //    each to its substrate + the DTG ink it uses.
  const updated = await prisma.product.update({
    where: { sku: "HD-001" },
    data: {
      material_options: ["Cotton Fleece", "Cotton/Poly Blend", "Heavyweight Fleece"],
      materialUsageMap: {
        material: {
          "Cotton Fleece": [
            { type: "substrate", name: "cotton_fleece", usagePerUnit: 1.8 },
            { type: "ink", name: "cmyk_full_color", usagePerUnit: 10.0 },
          ],
          "Cotton/Poly Blend": [
            { type: "substrate", name: "cotton_poly_fleece", usagePerUnit: 1.8 },
            { type: "ink", name: "cmyk_full_color", usagePerUnit: 10.0 },
          ],
          "Heavyweight Fleece": [
            { type: "substrate", name: "heavyweight_fleece", usagePerUnit: 1.8 },
            { type: "ink", name: "cmyk_full_color", usagePerUnit: 10.0 },
          ],
        },
      },
    },
  });
  console.log(`Updated [${updated.id}] ${updated.name} — material_options:`, updated.material_options);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());