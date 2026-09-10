// scripts/seedBranchInventory.js
//
// One-time (but safe to re-run) script: for every active Branch, ensures
// a copy of every InventorySubstrate/InventoryInk/InventoryUnit "template"
// row (the ones with branch_id = null) exists for that branch too, with
// the same starting stock/safetyThreshold/cost. Existing branch_id = null
// rows are left untouched — this only ADDS missing branch copies, it
// never deletes or modifies anything that's already there.
//
// Run from PrintHub_Backend/:
//   node scripts/seedBranchInventory.js

const prisma = require("../db/prisma");

async function seedSubstrates(branches) {
  const templates = await prisma.inventorySubstrate.findMany({
    where: { branchId: null },
  });

  let created = 0;
  for (const branch of branches) {
    for (const t of templates) {
      const existing = await prisma.inventorySubstrate.findFirst({
        where: { materialName: t.materialName, branchId: branch.id },
      });
      if (existing) continue;

      await prisma.inventorySubstrate.create({
        data: {
          materialName: t.materialName,
          stockMeters: t.stockMeters,
          safetyThreshold: t.safetyThreshold,
          costPerMeter: t.costPerMeter,
          branchId: branch.id,
        },
      });
      created++;
      console.log(`  + substrate "${t.materialName}" → ${branch.name}`);
    }
  }
  return created;
}

async function seedInks(branches) {
  const templates = await prisma.inventoryInk.findMany({
    where: { branchId: null },
  });

  let created = 0;
  for (const branch of branches) {
    for (const t of templates) {
      const existing = await prisma.inventoryInk.findFirst({
        where: { colorChannel: t.colorChannel, branchId: branch.id },
      });
      if (existing) continue;

      await prisma.inventoryInk.create({
        data: {
          colorChannel: t.colorChannel,
          volumeMl: t.volumeMl,
          safetyThreshold: t.safetyThreshold,
          costPerMl: t.costPerMl,
          branchId: branch.id,
        },
      });
      created++;
      console.log(`  + ink "${t.colorChannel}" → ${branch.name}`);
    }
  }
  return created;
}

async function seedUnits(branches) {
  const templates = await prisma.inventoryUnit.findMany({
    where: { branchId: null },
  });

  let created = 0;
  for (const branch of branches) {
    for (const t of templates) {
      const existing = await prisma.inventoryUnit.findFirst({
        where: { itemName: t.itemName, branchId: branch.id },
      });
      if (existing) continue;

      await prisma.inventoryUnit.create({
        data: {
          itemName: t.itemName,
          stockUnits: t.stockUnits,
          safetyThreshold: t.safetyThreshold,
          costPerUnit: t.costPerUnit,
          branchId: branch.id,
        },
      });
      created++;
      console.log(`  + unit "${t.itemName}" → ${branch.name}`);
    }
  }
  return created;
}

async function main() {
  const branches = await prisma.branch.findMany({ where: { active: true } });
  if (branches.length === 0) {
    console.log("No active branches found — nothing to seed.");
    return;
  }
  console.log(`Seeding inventory for ${branches.length} branch(es): ${branches.map((b) => b.name).join(", ")}`);

  const substrateCount = await seedSubstrates(branches);
  const inkCount = await seedInks(branches);
  const unitCount = await seedUnits(branches);

  console.log("\nDone.");
  console.log(`  Substrates created: ${substrateCount}`);
  console.log(`  Inks created:       ${inkCount}`);
  console.log(`  Units created:      ${unitCount}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });