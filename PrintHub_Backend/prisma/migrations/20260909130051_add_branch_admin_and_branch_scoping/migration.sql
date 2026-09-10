/*
  Warnings:

  - A unique constraint covering the columns `[color_channel,branch_id]` on the table `InventoryInk` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[material_name,branch_id]` on the table `InventorySubstrate` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[item_name,branch_id]` on the table `InventoryUnit` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "InventoryInk_color_channel_key";

-- DropIndex
DROP INDEX "InventorySubstrate_material_name_key";

-- DropIndex
DROP INDEX "InventoryUnit_item_name_key";

-- AlterTable
ALTER TABLE "InventoryInk" ADD COLUMN     "branch_id" INTEGER;

-- AlterTable
ALTER TABLE "InventorySubstrate" ADD COLUMN     "branch_id" INTEGER;

-- AlterTable
ALTER TABLE "InventoryUnit" ADD COLUMN     "branch_id" INTEGER;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "branch_id" INTEGER;

-- AlterTable
ALTER TABLE "PurchaseRequisition" ADD COLUMN     "branch_id" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "branch_id" INTEGER;

-- CreateIndex
CREATE INDEX "InventoryInk_branch_id_idx" ON "InventoryInk"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryInk_color_channel_branch_id_key" ON "InventoryInk"("color_channel", "branch_id");

-- CreateIndex
CREATE INDEX "InventorySubstrate_branch_id_idx" ON "InventorySubstrate"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "InventorySubstrate_material_name_branch_id_key" ON "InventorySubstrate"("material_name", "branch_id");

-- CreateIndex
CREATE INDEX "InventoryUnit_branch_id_idx" ON "InventoryUnit"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryUnit_item_name_branch_id_key" ON "InventoryUnit"("item_name", "branch_id");

-- CreateIndex
CREATE INDEX "Product_branch_id_idx" ON "Product"("branch_id");

-- CreateIndex
CREATE INDEX "PurchaseRequisition_branch_id_idx" ON "PurchaseRequisition"("branch_id");

-- CreateIndex
CREATE INDEX "User_branch_id_idx" ON "User"("branch_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySubstrate" ADD CONSTRAINT "InventorySubstrate_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryInk" ADD CONSTRAINT "InventoryInk_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryUnit" ADD CONSTRAINT "InventoryUnit_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequisition" ADD CONSTRAINT "PurchaseRequisition_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
