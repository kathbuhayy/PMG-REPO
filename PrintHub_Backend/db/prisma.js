const { PrismaClient, Prisma } = require("@prisma/client");

console.log("Prisma engine version info:", JSON.stringify(Prisma.prismaVersion));

const prisma = new PrismaClient({
  log: [
    { emit: "event", level: "error" },
    { emit: "stdout", level: "warn" },
  ],
});

prisma.$on("error", (e) => {
  console.error("PRISMA RAW ERROR EVENT:", JSON.stringify(e));
});

module.exports = prisma;