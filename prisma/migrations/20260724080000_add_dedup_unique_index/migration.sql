-- Deduplication: prevent the same user from importing the same coupon twice.
-- Partial unique index — only applies when couponCode is present (NULLs are ignored,
-- so coupons without a code are still allowed to duplicate, since there's nothing to match on).
CREATE UNIQUE INDEX "coupons_userId_couponCode_expiryDate_uidx"
  ON "coupons" ("userId", "couponCode", "expiryDate")
  WHERE "couponCode" IS NOT NULL;
