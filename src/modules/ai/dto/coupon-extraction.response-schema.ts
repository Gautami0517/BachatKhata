import { Type } from '@google/genai';

/**
 * Gemini responseSchema for structured coupon extraction.
 * Matches CouponExtraction (not the Prisma Coupon model).
 */
export const couponExtractionResponseSchema = {
  type: Type.OBJECT,
  properties: {
    brand: { type: Type.STRING, nullable: true },
    title: { type: Type.STRING, nullable: true },
    category: { type: Type.STRING, nullable: true },
    discountType: { type: Type.STRING, nullable: true },
    discountValue: { type: Type.NUMBER, nullable: true },
    minimumSpend: { type: Type.NUMBER, nullable: true },
    maximumDiscount: { type: Type.NUMBER, nullable: true },
    couponCode: { type: Type.STRING, nullable: true },
    expiry: { type: Type.STRING, nullable: true },
    source: { type: Type.STRING, nullable: true },
  },
  required: [
    'brand',
    'title',
    'category',
    'discountType',
    'discountValue',
    'minimumSpend',
    'maximumDiscount',
    'couponCode',
    'expiry',
    'source',
  ],
};
