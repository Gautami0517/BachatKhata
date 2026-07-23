import { Injectable } from '@nestjs/common';
import { Coupon, DiscountType } from '@prisma/client';
import { AskIntent } from './dto/ask-intent.interface';

export type RankedCoupon = Coupon & { score: number };

const SCORE = {
  MERCHANT_EXACT: 100,
  MERCHANT_PARTIAL: 80,
  BRAND_EXACT: 70,
  BRAND_PARTIAL: 60,
  CATEGORY_EXACT: 50,
  CATEGORY_PARTIAL: 40,
  PRODUCT_MATCH: 30,
  HIGHER_DISCOUNT: 20,
  EARLIER_EXPIRY: 15,
  RECENTLY_ADDED: 10,
  /** Spend-aware (only when intent.expectedSpend is set) */
  SPEND_USABLE: 25,
  SPEND_NO_MINIMUM: 15,
  SPEND_MIN_FIT_MAX: 20,
  SPEND_SAVINGS_MAX: 40,
} as const;

/**
 * Deterministic scoring / ranking for ask (and future recommendation) results.
 * When expectedSpend is present, boosts offers that fit the budget and save more.
 */
@Injectable()
export class SearchRanker {
  rank(coupons: Coupon[], intent: AskIntent): RankedCoupon[] {
    if (coupons.length === 0) {
      return [];
    }

    const now = Date.now();
    const maxDiscount = Math.max(
      0,
      ...coupons.map((c) => this.discountMagnitude(c)),
    );
    const soonestExpiryMs = this.minExpiryMs(coupons);
    const newestCreatedMs = Math.max(
      ...coupons.map((c) => c.createdAt.getTime()),
    );

    const expectedSpend = intent.expectedSpend;
    const estimatedSavings =
      expectedSpend != null && expectedSpend > 0
        ? coupons.map((c) => this.estimateSavings(c, expectedSpend))
        : [];
    const maxEstimatedSavings =
      estimatedSavings.length > 0 ? Math.max(0, ...estimatedSavings) : 0;

    const ranked = coupons.map((coupon, index) => ({
      ...coupon,
      score: this.scoreCoupon(coupon, intent, {
        now,
        maxDiscount,
        soonestExpiryMs,
        newestCreatedMs,
        maxEstimatedSavings,
        estimatedSavings:
          expectedSpend != null && expectedSpend > 0
            ? estimatedSavings[index]!
            : 0,
      }),
    }));

    ranked.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return this.compareBySortPreference(a, b, intent);
    });

    return ranked;
  }

  private scoreCoupon(
    coupon: Coupon,
    intent: AskIntent,
    ctx: {
      now: number;
      maxDiscount: number;
      soonestExpiryMs: number | null;
      newestCreatedMs: number;
      maxEstimatedSavings: number;
      estimatedSavings: number;
    },
  ): number {
    let score = 0;

    if (intent.merchant) {
      if (this.isExact(coupon.merchant, intent.merchant)) {
        score += SCORE.MERCHANT_EXACT;
      } else if (this.isPartial(coupon.merchant, intent.merchant)) {
        score += SCORE.MERCHANT_PARTIAL;
      }
    }

    if (intent.brand) {
      if (this.isExact(coupon.brand, intent.brand)) {
        score += SCORE.BRAND_EXACT;
      } else if (this.isPartial(coupon.brand, intent.brand)) {
        score += SCORE.BRAND_PARTIAL;
      }
    }

    if (intent.category) {
      if (this.isExact(coupon.category, intent.category)) {
        score += SCORE.CATEGORY_EXACT;
      } else if (this.isPartial(coupon.category, intent.category)) {
        score += SCORE.CATEGORY_PARTIAL;
      }
    }

    if (intent.product && this.hasProductMatch(coupon, intent.product)) {
      score += SCORE.PRODUCT_MATCH;
    }

    const discountBoost =
      intent.sortPreference === 'HIGHEST_DISCOUNT'
        ? SCORE.HIGHER_DISCOUNT * 1.5
        : SCORE.HIGHER_DISCOUNT;
    if (
      ctx.maxDiscount > 0 &&
      this.discountMagnitude(coupon) >= ctx.maxDiscount
    ) {
      score += discountBoost;
    }

    const expiryBoost =
      intent.sortPreference === 'EXPIRING_SOON'
        ? SCORE.EARLIER_EXPIRY * 1.5
        : SCORE.EARLIER_EXPIRY;
    if (
      coupon.expiryDate &&
      ctx.soonestExpiryMs !== null &&
      coupon.expiryDate.getTime() === ctx.soonestExpiryMs
    ) {
      score += expiryBoost;
    }

    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    if (
      ctx.now - coupon.createdAt.getTime() <= threeDaysMs ||
      coupon.createdAt.getTime() === ctx.newestCreatedMs
    ) {
      score += SCORE.RECENTLY_ADDED;
    }

    if (intent.expectedSpend != null && intent.expectedSpend > 0) {
      score += this.spendAwareBoost(
        coupon,
        intent.expectedSpend,
        ctx.estimatedSavings,
        ctx.maxEstimatedSavings,
      );
    }

    return Math.round(score);
  }

  /**
   * Boost coupons that fit the typed spend and save more on that amount.
   * Candidates are already filtered to minimumSpend <= expectedSpend (or null).
   */
  private spendAwareBoost(
    coupon: Coupon,
    expectedSpend: number,
    estimatedSavings: number,
    maxEstimatedSavings: number,
  ): number {
    let boost = 0;

    if (coupon.minimumSpend == null) {
      boost += SCORE.SPEND_NO_MINIMUM;
    } else if (coupon.minimumSpend <= expectedSpend) {
      boost += SCORE.SPEND_USABLE;

      // Closer min-spend to the typed amount → better "fit" for that purchase
      const ratio = coupon.minimumSpend / expectedSpend;
      boost += SCORE.SPEND_MIN_FIT_MAX * Math.min(1, Math.max(0, ratio));
    }

    if (maxEstimatedSavings > 0 && estimatedSavings > 0) {
      boost +=
        SCORE.SPEND_SAVINGS_MAX * (estimatedSavings / maxEstimatedSavings);
    }

    return boost;
  }

  /**
   * Rough savings if the user spends `expectedSpend` on this offer.
   */
  private estimateSavings(coupon: Coupon, expectedSpend: number): number {
    const value = coupon.discountValue;
    const maxCap = coupon.maximumDiscount;

    switch (coupon.discountType) {
      case DiscountType.PERCENTAGE: {
        if (value == null || value <= 0) {
          return 0;
        }
        const raw = (expectedSpend * value) / 100;
        return maxCap != null ? Math.min(raw, maxCap) : raw;
      }
      case DiscountType.FLAT:
      case DiscountType.CASHBACK: {
        if (value == null || value <= 0) {
          return maxCap ?? 0;
        }
        return maxCap != null ? Math.min(value, maxCap) : value;
      }
      case DiscountType.FREEBIE: {
        return value ?? maxCap ?? 0;
      }
      default: {
        if (value != null && value > 0) {
          return maxCap != null ? Math.min(value, maxCap) : value;
        }
        return maxCap ?? 0;
      }
    }
  }

  private compareBySortPreference(
    a: RankedCoupon,
    b: RankedCoupon,
    intent: AskIntent,
  ): number {
    if (intent.expectedSpend != null && intent.expectedSpend > 0) {
      const spend = intent.expectedSpend;
      const savingsDiff =
        this.estimateSavings(b, spend) - this.estimateSavings(a, spend);
      if (savingsDiff !== 0) {
        return savingsDiff;
      }
    }

    switch (intent.sortPreference) {
      case 'HIGHEST_DISCOUNT':
        return this.discountMagnitude(b) - this.discountMagnitude(a);
      case 'EXPIRING_SOON': {
        const aExp = a.expiryDate?.getTime() ?? Number.POSITIVE_INFINITY;
        const bExp = b.expiryDate?.getTime() ?? Number.POSITIVE_INFINITY;
        return aExp - bExp;
      }
      default:
        return b.createdAt.getTime() - a.createdAt.getTime();
    }
  }

  private discountMagnitude(coupon: Coupon): number {
    if (coupon.discountValue == null) {
      return coupon.maximumDiscount ?? 0;
    }

    if (coupon.discountType === DiscountType.PERCENTAGE) {
      return coupon.discountValue;
    }

    return coupon.discountValue;
  }

  private minExpiryMs(coupons: Coupon[]): number | null {
    const expiries = coupons
      .map((c) => c.expiryDate?.getTime())
      .filter((t): t is number => typeof t === 'number');

    if (expiries.length === 0) {
      return null;
    }

    return Math.min(...expiries);
  }

  private hasProductMatch(coupon: Coupon, product: string): boolean {
    return (
      this.isPartial(coupon.title, product) ||
      this.isPartial(coupon.rawText, product)
    );
  }

  private isExact(value: string | null, target: string): boolean {
    if (!value) {
      return false;
    }

    return value.trim().toLowerCase() === target.trim().toLowerCase();
  }

  private isPartial(value: string | null, target: string): boolean {
    if (!value) {
      return false;
    }

    return value.toLowerCase().includes(target.trim().toLowerCase());
  }
}
