-- AddColumn
ALTER TABLE "coupons" ADD COLUMN "isUsed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "coupons" ADD COLUMN "usedAt" TIMESTAMPTZ(3);

-- CreateIndex
CREATE INDEX "coupons_isUsed_idx" ON "coupons"("isUsed");