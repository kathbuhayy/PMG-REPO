// reset-orders.js
// Wipes all Order and OrderItem rows and resets their id sequences back to 1.
// Run with: node reset-orders.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Rating and ProductReview both hold RESTRICT foreign keys into
  // Order/OrderItem, so they must be cleared first or the deletes below
  // will fail with a foreign key constraint error.
  const deletedRatings = await prisma.rating.deleteMany({});
  console.log(`Deleted ${deletedRatings.count} Rating rows.`);

  const deletedReviews = await prisma.productReview.deleteMany({});
  console.log(`Deleted ${deletedReviews.count} ProductReview rows.`);

  // OrderItem must go before Order — it holds the foreign key (orderId) into Order.
  const deletedItems = await prisma.orderItem.deleteMany({});
  console.log(`Deleted ${deletedItems.count} OrderItem rows.`);

  const deletedOrders = await prisma.order.deleteMany({});
  console.log(`Deleted ${deletedOrders.count} Order rows.`);

  // Reset auto-increment counters so the next created row starts back at id 1.
  await prisma.$executeRawUnsafe(
    `ALTER SEQUENCE "Order_id_seq" RESTART WITH 1;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER SEQUENCE "OrderItem_id_seq" RESTART WITH 1;`
  );
  console.log("Reset Order_id_seq and OrderItem_id_seq to 1.");

  console.log("Done — Order and OrderItem are both empty.");
}

main()
  .catch((err) => {
    console.error("Reset failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });