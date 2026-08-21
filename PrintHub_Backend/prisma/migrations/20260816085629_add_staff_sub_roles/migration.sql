-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('DESIGN_APPROVER', 'PRINT_TECHNICIAN', 'QUALITY_ASSURANCE_INSPECTOR', 'LOGISTICS_PACKER', 'INVENTORY_CONTROLLER', 'PROCUREMENT_OFFICER');

-- CreateTable
CREATE TABLE "UserStaffRole" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" "StaffRole" NOT NULL,
    "assigned_by" INTEGER,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMP(3),

    CONSTRAINT "UserStaffRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserStaffRole_user_id_idx" ON "UserStaffRole"("user_id");

-- CreateIndex
CREATE INDEX "UserStaffRole_role_idx" ON "UserStaffRole"("role");

-- CreateIndex
CREATE UNIQUE INDEX "UserStaffRole_user_id_role_key" ON "UserStaffRole"("user_id", "role");

-- AddForeignKey
ALTER TABLE "UserStaffRole" ADD CONSTRAINT "UserStaffRole_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
