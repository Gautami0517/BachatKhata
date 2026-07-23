import { UnprocessableEntityException } from '@nestjs/common';
import { DiscountType, Prisma } from '@prisma/client';
import { CouponExtraction } from '../../ai/dto/coupon-extraction.interface';

const DISCOUNT_TYPE_VALUES = new Set<string>(Object.values(DiscountType));

export type NormalizeCouponContext = {
  rawText: string;
  source?: string | null;
  userId: string;
};

/**
 * Maps Gemini Extraction DTO → Prisma Coupon create input.
 */
export function normalizeCouponExtraction(
  extraction: CouponExtraction,
  context: NormalizeCouponContext,
): Prisma.CouponCreateInput {
  const title = extraction.title?.trim();
  if (!title) {
    throw new UnprocessableEntityException(
      'Coupon title could not be determined from extraction',
    );
  }

  const discountValue = normalizeNonNegativeNumber(extraction.discountValue);
  const minimumSpend = normalizeNonNegativeNumber(extraction.minimumSpend);
  const maximumDiscount = normalizeNonNegativeNumber(
    extraction.maximumDiscount,
  );

  return {
    user: { connect: { id: context.userId } },
    merchant: normalizeProperName(extraction.merchant),
    brand: normalizeProperName(extraction.brand),
    title: collapseWhitespace(title),
    category: normalizeProperName(extraction.category),
    discountType: normalizeDiscountType(extraction.discountType),
    discountValue,
    minimumSpend,
    maximumDiscount,
    couponCode: emptyToNull(extraction.couponCode),
    expiryDate: normalizeExpiry(extraction.expiryDate),
    source:
      emptyToNull(context.source) ??
      emptyToNull(extraction.source) ??
      'user_paste',
    rawText: context.rawText.trim(),
  };
}

/**
 * Trim, collapse spaces, and title-case merchant/brand-style names.
 * amazon → Amazon, MYNTRA → Myntra, ripple safe → Ripple Safe
 */
export function normalizeProperName(
  value: string | null | undefined,
): string | null {
  const trimmed = emptyToNull(value);
  if (!trimmed) {
    return null;
  }

  return collapseWhitespace(trimmed)
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function computeDisplayName(coupon: {
  brand: string | null;
  merchant: string | null;
  title: string;
}): string {
  return coupon.brand ?? coupon.merchant ?? coupon.title;
}

function normalizeDiscountType(value: string | null): DiscountType {
  if (!value) {
    return DiscountType.OTHER;
  }

  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  if (DISCOUNT_TYPE_VALUES.has(normalized)) {
    return normalized as DiscountType;
  }

  if (normalized.includes('PERCENT') || normalized.includes('%')) {
    return DiscountType.PERCENTAGE;
  }

  if (normalized.includes('CASHBACK')) {
    return DiscountType.CASHBACK;
  }

  if (normalized.includes('FREE')) {
    return DiscountType.FREEBIE;
  }

  if (
    normalized.includes('FLAT') ||
    normalized.includes('OFF') ||
    normalized.includes('AMOUNT')
  ) {
    return DiscountType.FLAT;
  }

  return DiscountType.OTHER;
}

function normalizeExpiry(value: string | null): Date | null {
  if (!value?.trim()) {
    return null;
  }

  const parsed = new Date(value.trim());
  if (Number.isNaN(parsed.getTime())) {
    throw new UnprocessableEntityException(
      'Extracted expiry could not be normalized to a valid date',
    );
  }

  return parsed;
}

function normalizeNonNegativeNumber(value: number | null): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isFinite(value) || value < 0) {
    throw new UnprocessableEntityException(
      'Extracted numeric field is invalid',
    );
  }

  return value;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
