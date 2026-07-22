import { DiscountType } from '@prisma/client';

export { DiscountType };

export type CouponEntity = {
  id: string;
  merchant: string | null;
  brand: string | null;
  title: string;
  category: string | null;
  discountType: DiscountType;
  discountValue: number | null;
  minimumSpend: number | null;
  maximumDiscount: number | null;
  couponCode: string | null;
  expiryDate: Date | null;
  source: string | null;
  rawText: string;
  createdAt: Date;
  updatedAt: Date;
};
