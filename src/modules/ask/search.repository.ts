import { Injectable } from '@nestjs/common';
import { Coupon, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AskIntent } from './dto/ask-intent.interface';

/**
 * Deterministic Prisma queries for ask / recommendation search.
 * No AI calls. No ranking. Always scoped to the authenticated user.
 */
@Injectable()
export class SearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Product-first candidates: must match product on title/rawText.
   * Brand/merchant are AND constraints when present.
   */
  findProductCandidates(intent: AskIntent, userId: string): Promise<Coupon[]> {
    if (!intent.product) {
      return Promise.resolve([]);
    }

    const andFilters: Prisma.CouponWhereInput[] = [
      { userId },
      this.unexpiredFilter(),
      {
        OR: [
          { title: { contains: intent.product, mode: 'insensitive' } },
          { rawText: { contains: intent.product, mode: 'insensitive' } },
        ],
      },
    ];

    const brandFilter = this.brandFilter(intent.brand);
    if (brandFilter) {
      andFilters.push(brandFilter);
    }

    const merchantFilter = this.merchantFilter(intent.merchant);
    if (merchantFilter) {
      andFilters.push(merchantFilter);
    }

    const spendFilter = this.buildSpendFilter(intent.expectedSpend);
    if (spendFilter) {
      andFilters.push(spendFilter);
    }

    return this.prisma.coupon.findMany({
      where: { AND: andFilters },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Category-only candidates (used as fallback when product has no hits).
   */
  findCategoryCandidates(intent: AskIntent, userId: string): Promise<Coupon[]> {
    if (!intent.category) {
      return Promise.resolve([]);
    }

    const andFilters: Prisma.CouponWhereInput[] = [
      { userId },
      this.unexpiredFilter(),
      {
        OR: [
          { category: { equals: intent.category, mode: 'insensitive' } },
          { category: { contains: intent.category, mode: 'insensitive' } },
        ],
      },
    ];

    const spendFilter = this.buildSpendFilter(intent.expectedSpend);
    if (spendFilter) {
      andFilters.push(spendFilter);
    }

    return this.prisma.coupon.findMany({
      where: { AND: andFilters },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * General candidates when intent has no product (merchant / brand / category OR).
   */
  findGeneralCandidates(intent: AskIntent, userId: string): Promise<Coupon[]> {
    const filters = this.buildGeneralMatchFilters(intent);

    if (filters.length === 0) {
      return Promise.resolve([]);
    }

    const spendFilter = this.buildSpendFilter(intent.expectedSpend);

    return this.prisma.coupon.findMany({
      where: {
        AND: [
          { userId },
          this.unexpiredFilter(),
          { OR: filters },
          ...(spendFilter ? [spendFilter] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private buildGeneralMatchFilters(
    intent: AskIntent,
  ): Prisma.CouponWhereInput[] {
    const filters: Prisma.CouponWhereInput[] = [];

    if (intent.merchant) {
      filters.push({
        merchant: { equals: intent.merchant, mode: 'insensitive' },
      });
      filters.push({
        merchant: { contains: intent.merchant, mode: 'insensitive' },
      });
    }

    if (intent.brand) {
      filters.push({ brand: { equals: intent.brand, mode: 'insensitive' } });
      filters.push({ brand: { contains: intent.brand, mode: 'insensitive' } });
    }

    if (intent.category) {
      filters.push({
        category: { equals: intent.category, mode: 'insensitive' },
      });
      filters.push({
        category: { contains: intent.category, mode: 'insensitive' },
      });
    }

    return filters;
  }

  private brandFilter(brand: string | null): Prisma.CouponWhereInput | null {
    if (!brand) {
      return null;
    }

    return {
      OR: [
        { brand: { equals: brand, mode: 'insensitive' } },
        { brand: { contains: brand, mode: 'insensitive' } },
      ],
    };
  }

  private merchantFilter(
    merchant: string | null,
  ): Prisma.CouponWhereInput | null {
    if (!merchant) {
      return null;
    }

    return {
      OR: [
        { merchant: { equals: merchant, mode: 'insensitive' } },
        { merchant: { contains: merchant, mode: 'insensitive' } },
      ],
    };
  }

  private unexpiredFilter(): Prisma.CouponWhereInput {
    return {
      AND: [
        { isUsed: false },
        {
          OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }],
        },
      ],
    };
  }

  private buildSpendFilter(
    expectedSpend: number | null,
  ): Prisma.CouponWhereInput | null {
    if (expectedSpend === null || expectedSpend === undefined) {
      return null;
    }

    return {
      OR: [{ minimumSpend: null }, { minimumSpend: { lte: expectedSpend } }],
    };
  }
}
