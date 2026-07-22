import { Injectable } from '@nestjs/common';
import { Coupon, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SortOption } from './dto/list-benefits.dto';

@Injectable()
export class BenefitsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.CouponCreateInput): Promise<Coupon> {
    return this.prisma.coupon.create({ data });
  }

  findById(id: string): Promise<Coupon | null> {
    return this.prisma.coupon.findUnique({ where: { id } });
  }

  async findAll(
    sort: SortOption = SortOption.EXPIRING_SOON,
  ): Promise<Coupon[]> {
    switch (sort) {
      case SortOption.EXPIRING_SOON:
        return this.prisma.coupon.findMany({
          where: { expiryDate: { gte: new Date() } },
          orderBy: [
            { expiryDate: { sort: 'asc', nulls: 'last' } },
            { createdAt: 'desc' },
          ],
        });

      case SortOption.NEWEST: {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        return this.prisma.coupon.findMany({
          where: { createdAt: { gte: threeDaysAgo } },
          orderBy: { createdAt: 'desc' },
        });
      }

      case SortOption.HIGHEST_DISCOUNT_PCT:
        return this.prisma.coupon.findMany({
          where: { discountType: 'PERCENTAGE' },
          orderBy: [
            { discountValue: { sort: 'desc', nulls: 'last' } },
            { createdAt: 'desc' },
          ],
        });

      case SortOption.HIGHEST_SAVINGS:
        return this.prisma.coupon.findMany({
          orderBy: [
            { maximumDiscount: { sort: 'desc', nulls: 'last' } },
            { createdAt: 'desc' },
          ],
        });

      case SortOption.BRAND_AZ:
        return this.prisma.coupon.findMany({
          orderBy: [
            { brand: { sort: 'asc', nulls: 'last' } },
            { merchant: { sort: 'asc', nulls: 'last' } },
            { expiryDate: { sort: 'asc', nulls: 'last' } },
          ],
        });

      case SortOption.CATEGORY:
        return this.prisma.coupon.findMany({
          orderBy: [
            { category: { sort: 'asc', nulls: 'last' } },
            { expiryDate: { sort: 'asc', nulls: 'last' } },
          ],
        });

      default:
        return this.prisma.coupon.findMany({
          where: { expiryDate: { gte: new Date() } },
          orderBy: [
            { expiryDate: { sort: 'asc', nulls: 'last' } },
            { createdAt: 'desc' },
          ],
        });
    }
  }
}
