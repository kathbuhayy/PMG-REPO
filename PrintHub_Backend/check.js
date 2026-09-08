const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.findUnique({ where: { id: 103 } });
  console.log("print_type:", product.print_type);
  console.log("setupFee:", product.setupFee);
  console.log("materialUsageMap:", JSON.stringify(product.materialUsageMap, null, 2));

  const unit = await prisma.inventoryUnit.findUnique({
    where: { itemName: "plain_cotton_sweatshirt" },
  });
  console.log("plain_cotton_sweatshirt costPerUnit:", unit?.costPerUnit);

  const ink = await prisma.inventoryInk.findUnique({
    where: { colorChannel: "cmyk_full_color" },
  });
  console.log("cmyk_full_color costPerMl:", ink?.costPerMl);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());