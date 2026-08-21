-- CreateEnum
CREATE TYPE "ProductionStatus" AS ENUM ('PENDING_FILE_CHECK', 'PRINTING_QUEUE', 'QUALITY_ASSURANCE', 'PACKAGING_READY', 'COMPLETED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "base_color_hex" TEXT,
ADD COLUMN     "mockup_image_url" TEXT,
ADD COLUMN     "print_height_inches" DOUBLE PRECISION,
ADD COLUMN     "print_width_inches" DOUBLE PRECISION,
ADD COLUMN     "production_status" "ProductionStatus" NOT NULL DEFAULT 'PENDING_FILE_CHECK';

-- CreateTable
CREATE TABLE "OrderAssignment" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "staff_id" INTEGER NOT NULL,
    "role" "StaffRole" NOT NULL,
    "status" "ProductionStatus",
    "assigned_by" INTEGER,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMP(3),

    CONSTRAINT "OrderAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderAssignment_order_id_idx" ON "OrderAssignment"("order_id");

-- CreateIndex
CREATE INDEX "OrderAssignment_staff_id_idx" ON "OrderAssignment"("staff_id");

-- CreateIndex
CREATE INDEX "OrderAssignment_role_idx" ON "OrderAssignment"("role");

-- CreateIndex
CREATE INDEX "Order_production_status_idx" ON "Order"("production_status");

-- AddForeignKey
ALTER TABLE "OrderAssignment" ADD CONSTRAINT "OrderAssignment_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAssignment" ADD CONSTRAINT "OrderAssignment_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAssignment" ADD CONSTRAINT "OrderAssignment_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
