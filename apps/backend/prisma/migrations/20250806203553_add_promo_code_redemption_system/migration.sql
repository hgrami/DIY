/*
  Warnings:

  - You are about to drop the column `discountType` on the `promo_codes` table. All the data in the column will be lost.
  - You are about to drop the column `discountValue` on the `promo_codes` table. All the data in the column will be lost.
  - Added the required column `subscriptionType` to the `promo_codes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "promo_code_redemptions" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "promo_codes" DROP COLUMN "discountType",
DROP COLUMN "discountValue",
ADD COLUMN     "durationDays" INTEGER,
ADD COLUMN     "subscriptionType" TEXT NOT NULL;

-- DropEnum
DROP TYPE "DiscountType";
