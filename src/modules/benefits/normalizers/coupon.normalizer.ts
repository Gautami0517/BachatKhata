import { UnprocessableEntityException } from '@nestjs/common';
import { DiscountType, Prisma } from '@prisma/client';
import { resolveCategory } from '../../../common/categories/categories';
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

  const merchant = normalizeProperName(extraction.merchant);
  const brand = normalizeProperName(extraction.brand);
  const expiryDate = normalizeExpiry(extraction.expiryDate);
  assertNotExpired(expiryDate);

  return {
    user: { connect: { id: context.userId } },
    merchant,
    brand,
    title: collapseWhitespace(title),
    category: resolveCategory({
      category: extraction.category,
      merchant,
      brand,
      title,
    }),
    discountType: normalizeDiscountType(extraction.discountType),
    discountValue,
    minimumSpend,
    maximumDiscount,
    couponCode: emptyToNull(extraction.couponCode),
    expiryDate,
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

  const trimmed = value.trim();
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new UnprocessableEntityException(
      'Extracted expiry could not be normalized to a valid date',
    );
  }

  // Date-only or midnight boundaries mean "valid through that calendar day"
  // → store end of day IST (23:59:59.999+05:30), never start of day.
  if (isDateOnlyExpiry(trimmed, parsed)) {
    return endOfCalendarDayIst(parsed);
  }

  return parsed;
}

/** Reject past expiries on import/save. No expiry (null) is still allowed. */
function assertNotExpired(expiryDate: Date | null): void {
  if (expiryDate == null) {
    return;
  }

  if (expiryDate.getTime() < Date.now()) {
    throw new UnprocessableEntityException(
      'This benefit has already expired and cannot be imported',
    );
  }
}

/**
 * True for YYYY-MM-DD strings or datetimes at 00:00:00.000Z
 * (common Gemini output for "expires today" / date-only).
 */
function isDateOnlyExpiry(raw: string, parsed: Date): boolean {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return true;
  }

  return (
    parsed.getUTCHours() === 0 &&
    parsed.getUTCMinutes() === 0 &&
    parsed.getUTCSeconds() === 0 &&
    parsed.getUTCMilliseconds() === 0
  );
}

/** End of the Asia/Kolkata calendar day for the given instant. */
function endOfCalendarDayIst(date: Date): Date {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

  return new Date(`${day}T23:59:59.999+05:30`);
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
