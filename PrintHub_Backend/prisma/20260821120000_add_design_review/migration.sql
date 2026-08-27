-- AlterTable
ALTER TABLE "Order" ADD COLUMN "design_review_status" TEXT DEFAULT 'submitted';
ALTER TABLE "Order" ADD COLUMN "design_review_notes" TEXT;
ALTER TABLE "Order" ADD COLUMN "design_reviewed_at" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "design_reviewed_by" INTEGER;