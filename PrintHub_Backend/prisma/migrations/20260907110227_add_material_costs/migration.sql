-- AlterTable
ALTER TABLE "InventoryInk" ADD COLUMN     "cost_per_ml" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "InventorySubstrate" ADD COLUMN     "cost_per_meter" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "InventoryUnit" ADD COLUMN     "cost_per_unit" DOUBLE PRECISION;
