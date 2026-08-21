-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "design_review_notes" TEXT,
ADD COLUMN     "design_review_status" TEXT DEFAULT 'submitted',
ADD COLUMN     "design_reviewed_at" TIMESTAMP(3),
ADD COLUMN     "design_reviewed_by" INTEGER;
