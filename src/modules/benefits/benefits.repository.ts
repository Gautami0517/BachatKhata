import { Injectable } from '@nestjs/common';
import { Coupon, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SortOption, StatusFilter } from './dto/list-benefits.dto';

@Injectable()
export class BenefitsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.CouponCreateInput): Promise<Coupon> {
    return this.prisma.coupon.create({ data });
  }

  findById(id: string, userId: string): Promise<Coupon | null> {
    return this.prisma.coupon.findFirst({
      where: { id, userId },
    });
  }

  delete(id: string): Promise<Coupon> {
    return this.prisma.coupon.delete({ where: { id } });
  }

  markUsed(id: string, userId: string): Promise<Coupon | null> {
    return this.prisma.coupon
      .updateMany({
        where: { id, userId },
        data: { isUsed: true, usedAt: new Date() },
      })
      .then(() => this.findById(id, userId));
  }

  markUnused(id: string, userId: string): Promise<Coupon | null> {
    return this.prisma.coupon
      .updateMany({
        where: { id, userId },
        data: { isUsed: false, usedAt: null },
      })
      .then(() => this.findById(id, userId));
  }

  async findAll(
    sort: SortOption = SortOption.EXPIRING_SOON,
    categories: string[] | undefined,
    userId: string,
    status: StatusFilter = StatusFilter.UNUSED,
    merchants?: string[],
    brands?: string[],
  ): Promise<Coupon[]> {
    const statusFilter: Prisma.CouponWhereInput =
      status === StatusFilter.ALL
        ? {}
        : { isUsed: status === StatusFilter.USED };

    const baseWhere: Prisma.CouponWhereInput = {
      AND: [
        { userId },
        statusFilter,
        this.buildMultiValueFilter('category', categories),
        this.buildMultiValueFilter('merchant', merchants),
        this.buildMultiValueFilter('brand', brands),
      ].filter((clause) => Object.keys(clause).length > 0),
    };

    switch (sort) {
      case SortOption.EXPIRING_SOON:
        return this.prisma.coupon.findMany({
          where: { ...baseWhere, expiryDate: { gte: new Date() } },
          orderBy: [
            { expiryDate: { sort: 'asc', nulls: 'last' } },
            { createdAt: 'desc' },
          ],
        });

      case SortOption.NEWEST: {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        return this.prisma.coupon.findMany({
          where: { ...baseWhere, createdAt: { gte: threeDaysAgo } },
          orderBy: { createdAt: 'desc' },
        });
      }

      case SortOption.HIGHEST_DISCOUNT_PCT:
        return this.prisma.coupon.findMany({
          where: { ...baseWhere, discountType: 'PERCENTAGE' },
          orderBy: [
            { discountValue: { sort: 'desc', nulls: 'last' } },
            { createdAt: 'desc' },
          ],
        });

      case SortOption.HIGHEST_SAVINGS:
        return this.prisma.coupon.findMany({
          where: baseWhere,
          orderBy: [
            { maximumDiscount: { sort: 'desc', nulls: 'last' } },
            { createdAt: 'desc' },
          ],
        });

      case SortOption.HIGHEST_SCORE:
        return this.prisma.coupon.findMany({
          where: baseWhere,
          orderBy: [
            { benefitScore: { sort: 'desc', nulls: 'last' } },
            { expiryDate: { sort: 'asc', nulls: 'last' } },
            { createdAt: 'desc' },
          ],
        });

      case SortOption.BRAND_AZ:
        return this.prisma.coupon.findMany({
          where: baseWhere,
          orderBy: [
            { brand: { sort: 'asc', nulls: 'last' } },
            { merchant: { sort: 'asc', nulls: 'last' } },
            { expiryDate: { sort: 'asc', nulls: 'last' } },
          ],
        });

      case SortOption.CATEGORY:
        return this.prisma.coupon.findMany({
          where: baseWhere,
          orderBy: [
            { category: { sort: 'asc', nulls: 'last' } },
            { expiryDate: { sort: 'asc', nulls: 'last' } },
          ],
        });

      default:
        return this.prisma.coupon.findMany({
          where: { ...baseWhere, expiryDate: { gte: new Date() } },
          orderBy: [
            { expiryDate: { sort: 'asc', nulls: 'last' } },
            { createdAt: 'desc' },
          ],
        });
    }
  }

  /**
   * Match any of the provided values (OR). Empty / omitted → no filter.
   */
  private buildMultiValueFilter(
    field: 'category' | 'merchant' | 'brand',
    values?: string[],
  ): Prisma.CouponWhereInput {
    if (!values?.length) {
      return {};
    }

    if (values.length === 1) {
      return {
        [field]: { equals: values[0], mode: 'insensitive' },
      };
    }

    return {
      OR: values.map((value) => ({
        [field]: { equals: value, mode: 'insensitive' as const },
      })),
    };
  }

  /**
   * Distinct non-null categories for this user (A→Z), optional substring search.
   */
  async findDistinctCategories(userId: string, q?: string): Promise<string[]> {
    const rows = await this.prisma.coupon.findMany({
      where: {
        userId,
        category: {
          not: null,
          ...(q?.trim()
            ? { contains: q.trim(), mode: 'insensitive' as const }
            : {}),
        },
      },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });

    return rows
      .map((row) => row.category)
      .filter((name): name is string => Boolean(name?.trim()));
  }

  /**
   * Distinct non-null merchants for this user (A→Z), optional substring search.
   */
  async findDistinctMerchants(userId: string, q?: string): Promise<string[]> {
    const rows = await this.prisma.coupon.findMany({
      where: {
        userId,
        merchant: {
          not: null,
          ...(q?.trim()
            ? { contains: q.trim(), mode: 'insensitive' as const }
            : {}),
        },
      },
      select: { merchant: true },
      distinct: ['merchant'],
      orderBy: { merchant: 'asc' },
    });

    return rows
      .map((row) => row.merchant)
      .filter((name): name is string => Boolean(name?.trim()));
  }

  /**
   * Distinct non-null brands for this user (A→Z), optional substring search.
   */
  async findDistinctBrands(userId: string, q?: string): Promise<string[]> {
    const rows = await this.prisma.coupon.findMany({
      where: {
        userId,
        brand: {
          not: null,
          ...(q?.trim()
            ? { contains: q.trim(), mode: 'insensitive' as const }
            : {}),
        },
      },
      select: { brand: true },
      distinct: ['brand'],
      orderBy: { brand: 'asc' },
    });

    return rows
      .map((row) => row.brand)
      .filter((name): name is string => Boolean(name?.trim()));
  }
}
