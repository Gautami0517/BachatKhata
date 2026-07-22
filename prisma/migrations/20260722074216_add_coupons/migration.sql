-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FLAT', 'CASHBACK', 'FREEBIE', 'OTHER');

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL,
    "brand" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "discountType" "DiscountType" NOT NULL,
    "discountValue" DOUBLE PRECISION,
    "minimumSpend" DOUBLE PRECISION,
    "maximumDiscount" DOUBLE PRECISION,
    "couponCode" TEXT,
    "expiryDate" TIMESTAMPTZ(3),
    "source" TEXT,
    "rawText" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coupons_couponCode_idx" ON "coupons"("couponCode");

-- CreateIndex
CREATE INDEX "coupons_expiryDate_idx" ON "coupons"("expiryDate");
