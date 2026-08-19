const prisma = require("../db/prisma");
(async () => {
  await prisma.branch.createMany({
    data: [
      { name: "Tejero Branch", address: "Barangay, 470 Holgado Building, General Trias Dr, Tejero, General Trias, 4107 Cavite" },
      { name: "Bacoor Branch", address: "214, Conrado Bldg, Niog, Bacoor, Cavite" },
    ],
    skipDuplicates: true,
  });
  process.exit(0);
})();