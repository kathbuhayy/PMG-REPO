-- CreateTable
CREATE TABLE "OrderAssignment" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "assigned_to_id" INTEGER NOT NULL,
    "assigned_by_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "OrderAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderAssignment_order_id_idx" ON "OrderAssignment"("order_id");

-- CreateIndex
CREATE INDEX "OrderAssignment_assigned_to_id_status_idx" ON "OrderAssignment"("assigned_to_id", "status");

-- CreateIndex
CREATE INDEX "OrderAssignment_assigned_by_id_idx" ON "OrderAssignment"("assigned_by_id");

-- CreateIndex
CREATE INDEX "OrderAssignment_branch_id_idx" ON "OrderAssignment"("branch_id");

-- AddForeignKey
ALTER TABLE "OrderAssignment" ADD CONSTRAINT "OrderAssignment_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAssignment" ADD CONSTRAINT "OrderAssignment_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAssignment" ADD CONSTRAINT "OrderAssignment_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAssignment" ADD CONSTRAINT "OrderAssignment_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
