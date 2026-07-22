import { Coupon } from '@prisma/client';
import { CouponResponseDto } from '../dto/coupon-response.dto';
import { computeDisplayName } from '../normalizers/coupon.normalizer';

/**
 * Maps a persisted Coupon to the API response shape (adds computed displayName).
 */
export function toCouponResponseDto(coupon: Coupon): CouponResponseDto {
  return {
    id: coupon.id,
    merchant: coupon.merchant,
    brand: coupon.brand,
    displayName: computeDisplayName(coupon),
    title: coupon.title,
    category: coupon.category,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minimumSpend: coupon.minimumSpend,
    maximumDiscount: coupon.maximumDiscount,
    couponCode: coupon.couponCode,
    expiryDate: coupon.expiryDate,
    source: coupon.source,
    rawText: coupon.rawText,
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt,
  };
}

export function toCouponResponseDtoList(
  coupons: Coupon[],
): CouponResponseDto[] {
  return coupons.map(toCouponResponseDto);
}
