const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.product.findMany({
    where: { deleted_at: null },
    select: { print_type: true },
    distinct: ["print_type"],
  });
  console.log(rows.map((r) => r.print_type));
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());