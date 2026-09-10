const { PrismaClient, Prisma } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

console.log(
  "Prisma engine version info:",
  JSON.stringify(Prisma.prismaVersion)
);

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
  log: [
    { emit: "event", level: "error" },
    { emit: "stdout", level: "warn" },
  ],
});

prisma.$on("error", (e) => {
  console.error("PRISMA RAW ERROR EVENT:", JSON.stringify(e));
});

(async () => {
  try {
    await prisma.$connect();
    console.log("✅ PRISMA DATABASE CONNECTION SUCCESS");
  } catch (error) {
    console.error("❌ PRISMA DATABASE CONNECTION FAILED");
    console.error(error);
  }
})();

module.exports = prisma;