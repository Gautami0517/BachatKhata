import { z } from 'zod';
import { CouponExtraction } from './coupon-extraction.interface';

const nullableTrimmedString = z
  .union([z.string(), z.null()])
  .transform((value) => {
    if (value === null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const nullableNumber = z
  .union([z.number(), z.null()])
  .refine(
    (value) => value === null || Number.isFinite(value),
    { message: 'Must be a finite number or null' },
  );

/**
 * Zod schema for Gemini Extraction DTO (pre-normalization).
 */
export const couponExtractionSchema: z.ZodType<CouponExtraction> = z.object({
  merchant: nullableTrimmedString,
  brand: nullableTrimmedString,
  title: nullableTrimmedString,
  category: nullableTrimmedString,
  discountType: nullableTrimmedString,
  discountValue: nullableNumber,
  minimumSpend: nullableNumber,
  maximumDiscount: nullableNumber,
  couponCode: nullableTrimmedString,
  expiryDate: nullableTrimmedString,
  source: nullableTrimmedString,
});
