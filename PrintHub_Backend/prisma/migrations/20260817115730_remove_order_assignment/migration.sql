/*
  Warnings:

  - You are about to drop the `OrderAssignment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "OrderAssignment" DROP CONSTRAINT "OrderAssignment_assigned_by_fkey";

-- DropForeignKey
ALTER TABLE "OrderAssignment" DROP CONSTRAINT "OrderAssignment_order_id_fkey";

-- DropForeignKey
ALTER TABLE "OrderAssignment" DROP CONSTRAINT "OrderAssignment_staff_id_fkey";

-- DropTable
DROP TABLE "OrderAssignment";
