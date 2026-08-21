-- CreateEnum
CREATE TYPE "RequisitionStatus" AS ENUM ('PENDING', 'ORDERED', 'RECEIVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "PurchaseRequisition" (
    "id" SERIAL NOT NULL,
    "material_type" TEXT NOT NULL,
    "material_name" TEXT NOT NULL,
    "current_stock" DOUBLE PRECISION NOT NULL,
    "safety_threshold" DOUBLE PRECISION NOT NULL,
    "requested_amount" DOUBLE PRECISION NOT NULL,
    "status" "RequisitionStatus" NOT NULL DEFAULT 'PENDING',
    "triggered_by_order_id" INTEGER,
    "documentText" TEXT NOT NULL,
    "generated_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "PurchaseRequisition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseRequisition_status_idx" ON "PurchaseRequisition"("status");

-- CreateIndex
CREATE INDEX "PurchaseRequisition_material_name_idx" ON "PurchaseRequisition"("material_name");
