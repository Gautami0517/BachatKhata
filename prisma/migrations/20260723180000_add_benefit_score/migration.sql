-- AlterTable
ALTER TABLE "coupons" ADD COLUMN "benefitScore" INTEGER;

-- CreateIndex
CREATE INDEX "coupons_benefitScore_idx" ON "coupons"("benefitScore");
