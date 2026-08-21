-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "unit_material_name" TEXT,
ADD COLUMN     "unit_usage_per_unit" INTEGER;

-- CreateTable
CREATE TABLE "InventoryUnit" (
    "id" SERIAL NOT NULL,
    "item_name" TEXT NOT NULL,
    "stock_units" INTEGER NOT NULL,
    "safety_threshold" INTEGER NOT NULL DEFAULT 15,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryUnit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryUnit_item_name_key" ON "InventoryUnit"("item_name");

-- CreateIndex
CREATE INDEX "InventoryUnit_item_name_idx" ON "InventoryUnit"("item_name");
