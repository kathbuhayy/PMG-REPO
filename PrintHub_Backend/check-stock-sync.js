const prisma = require("./db/prisma");

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  console.log("\n========== PRODUCTS ==========\n");

  const products = await prisma.product.findMany({
    where: {
      active: true,
      deleted_at: null,
    },
    orderBy: {
      name: "asc",
    },
  });

  for (const product of products) {
    console.log(`PRODUCT: ${product.name}`);
    console.log(`Category: ${product.category}`);
    console.log(`Product.stock: ${product.stock}`);

    const productName = normalize(product.name);
    const productCategory = normalize(product.category);

    const units = await prisma.inventoryUnit.findMany({
      orderBy: {
        itemName: "asc",
      },
    });

let expectedProductType = null;

if (
  productName === "t shirt" ||
  productName === "tshirt" ||
  productCategory === "tshirt" ||
  productCategory === "t shirt"
) {
  expectedProductType = "tshirt";
} else if (
  productName.includes("sweatshirt") ||
  productCategory === "sweatshirt"
) {
  expectedProductType = "sweatshirt";
} else if (
  productName.includes("hoodie") ||
  productCategory === "hoodie"
) {
  expectedProductType = "hoodie";
} else if (
  productName.includes("cap") ||
  productCategory === "cap"
) {
  expectedProductType = "cap";
} else if (
  productName.includes("mug") ||
  productCategory === "mug"
) {
  expectedProductType = "mug";
}

const matches = units.filter((unit) => {
  const itemName = normalize(unit.itemName);

  const isRawBlank =
    itemName.includes("plain") ||
    itemName.includes("blank") ||
    itemName.includes("raw");

  if (!isRawBlank || !expectedProductType) {
    return false;
  }

  const words = itemName.split(" ");

  const inventoryProductType = words[words.length - 1];

  return inventoryProductType === expectedProductType;
});
    console.log("MATCHING RAW UNITS:");

    if (matches.length === 0) {
      console.log("  ❌ NONE");
      console.log("");
      continue;
    }

    let total = 0;

    for (const unit of matches) {
      console.log(
        `  ✅ ${unit.itemName} = ${unit.stockUnits}`
      );

      total += Number(unit.stockUnits || 0);
    }

    console.log(`SYNCED STOCK: ${total}`);
    console.log("");
  }
}

main()
  .catch((error) => {
    console.error("\n❌ ERROR:");
    console.error(error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });