import { Injectable } from '@nestjs/common';
import { DiscountType } from '@prisma/client';

/** Input shape for deterministic C-Vault scoring (no DB / AI). */
export type ScorableBenefit = {
  merchant?: string | null;
  brand?: string | null;
  discountType?: DiscountType | string | null;
  discountValue?: number | null;
  minimumSpend?: number | null;
  maximumDiscount?: number | null;
  expiryDate?: Date | string | null;
};

const FINAL_WEIGHTS = {
  EXPIRY: 0.4,
  VALUE: 0.3,
  POPULARITY: 0.2,
  PERSONAL: 0.1,
} as const;

const VALUE_THRESHOLDS: Array<{ min: number; score: number }> = [
  { min: 5000, score: 100 },
  { min: 2500, score: 90 },
  { min: 1000, score: 80 },
  { min: 500, score: 60 },
  { min: 250, score: 40 },
  { min: 100, score: 20 },
];

const DEFAULT_VALUE_SCORE = 10;
const NO_EXPIRY_SCORE = 50;
const UNKNOWN_POPULARITY_SCORE = 50;
const MVP_PERSONAL_SCORE = 100;

/** Case-insensitive merchant/brand popularity lookup. */
const POPULARITY_LOOKUP: Record<string, number> = {
  amazon: 100,
  flipkart: 95,
  myntra: 90,
  swiggy: 90,
  zomato: 90,
  ajio: 85,
  blinkit: 85,
  croma: 80,
  uber: 80,
  bigbasket: 80,
  'big basket': 80,
  dominos: 75,
  "domino's": 75,
  domino: 75,
};

/**
 * Deterministic C-Vault Score (0–10).
 * Component scores stay on a 0–100 scale; the weighted total is scaled to 0–10.
 * No repositories, AI, or HTTP — pure scoring logic.
 */
@Injectable()
export class BenefitScoringService {
  /**
   * FinalScore (0–10) =
   *   round((0.40 × Expiry + 0.30 × Value + 0.20 × Popularity + 0.10 × Personal) / 10)
   */
  calculate(benefit: ScorableBenefit): number {
    const expiryScore = this.calculateExpiryScore(benefit.expiryDate ?? null);
    const valueScore = this.calculateValueScore(benefit);
    const popularityScore = this.calculatePopularityScore(
      benefit.merchant ?? null,
      benefit.brand ?? null,
    );
    const personalScore = this.calculatePersonalScore(benefit);

    const weightedOnHundred =
      FINAL_WEIGHTS.EXPIRY * expiryScore +
      FINAL_WEIGHTS.VALUE * valueScore +
      FINAL_WEIGHTS.POPULARITY * popularityScore +
      FINAL_WEIGHTS.PERSONAL * personalScore;

    return this.clampScore(Math.round(weightedOnHundred / 10));
  }

  calculateExpiryScore(expiryDate: Date | string | null): number {
    if (expiryDate === null || expiryDate === undefined) {
      return NO_EXPIRY_SCORE;
    }

    const expiry = this.toDate(expiryDate);
    if (!expiry) {
      return NO_EXPIRY_SCORE;
    }

    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysUntilExpiry = Math.floor(
      (this.startOfUtcDay(expiry).getTime() -
        this.startOfUtcDay(now).getTime()) /
        msPerDay,
    );

    if (daysUntilExpiry < 0) {
      return 0;
    }
    if (daysUntilExpiry === 0) {
      return 100;
    }
    if (daysUntilExpiry === 1) {
      return 90;
    }
    if (daysUntilExpiry <= 3) {
      return 80;
    }
    if (daysUntilExpiry <= 7) {
      return 70;
    }
    if (daysUntilExpiry <= 15) {
      return 50;
    }
    if (daysUntilExpiry <= 30) {
      return 30;
    }
    return 10;
  }

  calculateValueScore(benefit: ScorableBenefit): number {
    const savingsAmount = this.resolveSavingsAmount(benefit);

    if (savingsAmount == null || savingsAmount <= 0) {
      return DEFAULT_VALUE_SCORE;
    }

    for (const threshold of VALUE_THRESHOLDS) {
      if (savingsAmount >= threshold.min) {
        return threshold.score;
      }
    }

    return DEFAULT_VALUE_SCORE;
  }

  calculatePopularityScore(
    merchant: string | null,
    brand: string | null,
  ): number {
    const fromMerchant = this.lookupPopularity(merchant);
    if (fromMerchant != null) {
      return fromMerchant;
    }

    const fromBrand = this.lookupPopularity(brand);
    if (fromBrand != null) {
      return fromBrand;
    }

    return UNKNOWN_POPULARITY_SCORE;
  }

  /**
   * MVP: always 100. Hook for future user-behaviour personalization.
   */
  calculatePersonalScore(_benefit: ScorableBenefit): number {
    return MVP_PERSONAL_SCORE;
  }

  /**
   * Prefer maximumDiscount; else estimate from discountValue + minimumSpend.
   */
  private resolveSavingsAmount(benefit: ScorableBenefit): number | null {
    if (
      benefit.maximumDiscount != null &&
      Number.isFinite(benefit.maximumDiscount) &&
      benefit.maximumDiscount > 0
    ) {
      return benefit.maximumDiscount;
    }

    return this.estimateSavingsFromDiscount(benefit);
  }

  private estimateSavingsFromDiscount(benefit: ScorableBenefit): number | null {
    const discountValue = benefit.discountValue;
    if (discountValue == null || !Number.isFinite(discountValue) || discountValue <= 0) {
      return null;
    }

    const discountType = String(benefit.discountType ?? '')
      .trim()
      .toUpperCase();

    if (
      discountType === DiscountType.PERCENTAGE ||
      discountType.includes('PERCENT')
    ) {
      const base = benefit.minimumSpend != null && benefit.minimumSpend > 0
        ? benefit.minimumSpend
        : 1000;
      return (base * discountValue) / 100;
    }

    // FLAT / CASHBACK / FREEBIE / OTHER — treat numeric value as rupee savings
    return discountValue;
  }

  private lookupPopularity(name: string | null): number | null {
    if (!name?.trim()) {
      return null;
    }

    const key = name.trim().toLowerCase();
    if (POPULARITY_LOOKUP[key] != null) {
      return POPULARITY_LOOKUP[key];
    }

    for (const [known, score] of Object.entries(POPULARITY_LOOKUP)) {
      if (key.includes(known) || known.includes(key)) {
        return score;
      }
    }

    return null;
  }

  private toDate(value: Date | string): Date | null {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private startOfUtcDay(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  private clampScore(score: number): number {
    if (score < 0) {
      return 0;
    }
    if (score > 10) {
      return 10;
    }
    return score;
  }
}
