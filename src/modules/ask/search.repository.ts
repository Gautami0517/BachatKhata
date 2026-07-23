import { Injectable } from '@nestjs/common';
import { Coupon, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AskIntent } from './dto/ask-intent.interface';

/**
 * Deterministic Prisma queries for ask / recommendation search.
 * No AI calls. No ranking.
 */
@Injectable()
export class SearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch unexpired coupons that match any extracted intent signal.
   */
  async findCandidates(intent: AskIntent, userId: string): Promise<Coupon[]> {
    const filters = this.buildMatchFilters(intent);

    if (filters.length === 0) {
      return [];
    }

    const spendFilter = this.buildSpendFilter(intent.expectedSpend);

    return this.prisma.coupon.findMany({
      where: {
        AND: [
          { userId },
          {
            OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }],
          },
          { OR: filters },
          ...(spendFilter ? [spendFilter] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private buildMatchFilters(intent: AskIntent): Prisma.CouponWhereInput[] {
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

    if (intent.product) {
      filters.push({
        title: { contains: intent.product, mode: 'insensitive' },
      });
      // rawText stands in for description when no dedicated description field exists
      filters.push({
        rawText: { contains: intent.product, mode: 'insensitive' },
      });
    }

    return filters;
  }

  /**
   * Soft budget filter: keep offers usable within expected spend.
   */
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
