// scripts/updateSizeOptions.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  await prisma.product.updateMany({
    where: {
      OR: [
        { category: { contains: "shirt", mode: "insensitive" } },
        { category: { contains: "hoodie", mode: "insensitive" } },
        { category: { contains: "jersey", mode: "insensitive" } },
      ],
    },
    data: { size_options: ["Small", "Medium", "Large", "XL", "2XL"] },
  });
  console.log("done");
}
run().finally(() => prisma.$disconnect());