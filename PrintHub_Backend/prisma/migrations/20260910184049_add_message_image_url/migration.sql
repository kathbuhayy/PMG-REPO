/*
  Warnings:

  - You are about to drop the column `attachment_type` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `attachment_url` on the `Message` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Message" DROP COLUMN "attachment_type",
DROP COLUMN "attachment_url",
ADD COLUMN     "image_url" TEXT;
