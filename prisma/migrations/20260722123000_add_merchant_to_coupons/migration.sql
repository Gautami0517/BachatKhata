-- AlterTable
ALTER TABLE "coupons" ADD COLUMN "merchant" TEXT;

-- CreateIndex
CREATE INDEX "coupons_merchant_idx" ON "coupons"("merchant");

-- CreateIndex
CREATE INDEX "coupons_brand_idx" ON "coupons"("brand");
