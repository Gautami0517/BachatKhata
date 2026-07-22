/**
 * LLM extraction contract — not the DB entity.
 * Gemini returns this shape; a normalizer maps it to Coupon / Prisma input.
 */
export interface CouponExtraction {
  brand: string | null;
  title: string | null;
  category: string | null;
  discountType: string | null;
  discountValue: number | null;
  minimumSpend: number | null;
  maximumDiscount: number | null;
  couponCode: string | null;
  expiry: string | null;
  source: string | null;
}
