-- AlterTable
ALTER TABLE "Inquiry" ADD COLUMN     "isRushOrder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rushOrderFee" DECIMAL(14,2),
ADD COLUMN     "sizeSurcharge" DECIMAL(14,2);
