const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const inventoryItems = [
  {
    itemName: "plain_ceramic_mug",
    stockUnits: 300,
    safetyThreshold: 15,
    costPerUnit: 40,
    branchId: null,
  },
  {
    itemName: "plain_cap",
    stockUnits: 200,
    safetyThreshold: 15,
    costPerUnit: 60,
    branchId: null,
  },
  {
    itemName: "plain_cotton_tshirt",
    stockUnits: 98,
    safetyThreshold: 15,
    costPerUnit: 60,
    branchId: null,
  },
  {
    itemName: "plain_polyester_tshirt",
    stockUnits: 100,
    safetyThreshold: 15,
    costPerUnit: 50,
    branchId: null,
  },
  {
    itemName: "plain_cotton_sweatshirt",
    stockUnits: 100,
    safetyThreshold: 15,
    costPerUnit: 100,
    branchId: null,
  },
  {
    itemName: "plain_cotton_poly_sweatshirt",
    stockUnits: 100,
    safetyThreshold: 15,
    costPerUnit: 100,
    branchId: null,
  },
  {
    itemName: "plain_heavyweight_sweatshirt",
    stockUnits: 100,
    safetyThreshold: 15,
    costPerUnit: 110,
    branchId: null,
  },
  {
    itemName: "plain_cotton_hoodie",
    stockUnits: 100,
    safetyThreshold: 15,
    costPerUnit: 120,
    branchId: null,
  },
  {
    itemName: "plain_cotton_poly_hoodie",
    stockUnits: 100,
    safetyThreshold: 15,
    costPerUnit: 110,
    branchId: null,
  },
  {
    itemName: "plain_heavyweight_hoodie",
    stockUnits: 100,
    safetyThreshold: 15,
    costPerUnit: 130,
    branchId: null,
  },
  {
    itemName: "plain_jersey_poly_140",
    stockUnits: 100,
    safetyThreshold: 15,
    costPerUnit: 100,
    branchId: null,
  },
  {
    itemName: "plain_jersey_poly_160",
    stockUnits: 110,
    safetyThreshold: 15,
    costPerUnit: 110,
    branchId: null,
  },
  {
    itemName: "plain_jersey_moisture_wicking",
    stockUnits: 100,
    safetyThreshold: 15,
    costPerUnit: 120,
    branchId: null,
  },
];

async function restoreInventory() {
  try {
    console.log("Checking InventoryUnit...\n");

    for (const item of inventoryItems) {
      const existing = await prisma.inventoryUnit.findFirst({
        where: {
          itemName: item.itemName,
        },
      });

      if (existing) {
        console.log(
          `✓ Already exists: ${item.itemName} (ID: ${existing.id})`
        );
        continue;
      }

      const created = await prisma.inventoryUnit.create({
        data: {
          itemName: item.itemName,
          stockUnits: item.stockUnits,
          safetyThreshold: item.safetyThreshold,
          costPerUnit: item.costPerUnit,
          branchId: item.branchId,
        },
      });

      console.log(
        `+ Added: ${created.itemName} (ID: ${created.id})`
      );
    }

    console.log("\n================================");
    console.log("Inventory restoration complete!");
    console.log("================================\n");

    const allItems = await prisma.inventoryUnit.findMany({
      orderBy: {
        id: "asc",
      },
    });

    console.log(`Total records: ${allItems.length}\n`);

    for (const item of allItems) {
      console.log(
        `${item.id} | ${item.itemName} | Stock: ${item.stockUnits} | Branch: ${item.branchId}`
      );
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreInventory();