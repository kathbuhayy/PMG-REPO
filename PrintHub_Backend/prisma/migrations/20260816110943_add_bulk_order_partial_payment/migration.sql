-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "amount_paid" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "is_bulk_order" BOOLEAN NOT NULL DEFAULT false;
