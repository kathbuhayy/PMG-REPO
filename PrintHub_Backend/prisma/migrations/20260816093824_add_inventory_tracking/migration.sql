-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "ink_color_channel" TEXT,
ADD COLUMN     "ink_usage_per_unit" DOUBLE PRECISION,
ADD COLUMN     "substrate_material_name" TEXT,
ADD COLUMN     "substrate_usage_per_unit" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "InventorySubstrate" (
    "id" SERIAL NOT NULL,
    "material_name" TEXT NOT NULL,
    "stock_meters" DOUBLE PRECISION NOT NULL,
    "safety_threshold" DOUBLE PRECISION NOT NULL DEFAULT 15.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventorySubstrate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryInk" (
    "id" SERIAL NOT NULL,
    "color_channel" TEXT NOT NULL,
    "volume_ml" DOUBLE PRECISION NOT NULL,
    "safety_threshold" DOUBLE PRECISION NOT NULL DEFAULT 15.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryInk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventorySubstrate_material_name_key" ON "InventorySubstrate"("material_name");

-- CreateIndex
CREATE INDEX "InventorySubstrate_material_name_idx" ON "InventorySubstrate"("material_name");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryInk_color_channel_key" ON "InventoryInk"("color_channel");

-- CreateIndex
CREATE INDEX "InventoryInk_color_channel_idx" ON "InventoryInk"("color_channel");
