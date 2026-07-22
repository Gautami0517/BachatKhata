/**
 * LLM extraction contract — not the DB entity.
 * Gemini returns this shape; a normalizer maps it to Coupon / Prisma input.
 */
export interface CouponExtraction {
  merchant: string | null;
  brand: string | null;
  title: string | null;
  category: string | null;
  discountType: string | null;
  discountValue: number | null;
  minimumSpend: number | null;
  maximumDiscount: number | null;
  couponCode: string | null;
  /** ISO date/datetime string from the model; mapped to DB `expiryDate`. */
  expiryDate: string | null;
  source: string | null;
}
