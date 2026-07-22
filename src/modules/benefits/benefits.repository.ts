import { Injectable } from '@nestjs/common';
import { Coupon, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ListBenefitsDto, SortOption } from './dto/list-benefits.dto';

export type FindAllResult = {
  data: Coupon[];
  total: number;
};

@Injectable()
export class BenefitsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.CouponCreateInput): Promise<Coupon> {
    return this.prisma.coupon.create({ data });
  }

  findById(id: string): Promise<Coupon | null> {
    return this.prisma.coupon.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.CouponUpdateInput): Promise<Coupon> {
    return this.prisma.coupon.update({ where: { id }, data });
  }

  delete(id: string): Promise<Coupon> {
    return this.prisma.coupon.delete({ where: { id } });
  }

  async findAll(dto: ListBenefitsDto): Promise<FindAllResult> {
    const sort = dto.sort ?? SortOption.EXPIRING_SOON;
    const limit = dto.limit;
    const offset = dto.offset;

    // Base filter — optional category (case-insensitive exact match).
    const baseWhere: Prisma.CouponWhereInput = {};
    if (dto.category) {
      baseWhere.category = { equals: dto.category, mode: 'insensitive' };
    }

    let where: Prisma.CouponWhereInput = baseWhere;
    let orderBy: Prisma.CouponOrderByWithRelationInput[];

    switch (sort) {
      case SortOption.EXPIRING_SOON:
        where = { ...baseWhere, expiryDate: { gte: new Date() } };
        orderBy = [
          { expiryDate: { sort: 'asc', nulls: 'last' } },
          { createdAt: 'desc' },
        ];
        break;

      case SortOption.NEWEST: {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        where = { ...baseWhere, createdAt: { gte: threeDaysAgo } };
        orderBy = [{ createdAt: 'desc' }];
        break;
      }

      case SortOption.HIGHEST_DISCOUNT_PCT:
        where = { ...baseWhere, discountType: 'PERCENTAGE' };
        orderBy = [
          { discountValue: { sort: 'desc', nulls: 'last' } },
          { createdAt: 'desc' },
        ];
        break;

      case SortOption.HIGHEST_SAVINGS:
        orderBy = [
          { maximumDiscount: { sort: 'desc', nulls: 'last' } },
          { createdAt: 'desc' },
        ];
        break;

      case SortOption.BRAND_AZ:
        orderBy = [
          { brand: { sort: 'asc', nulls: 'last' } },
          { merchant: { sort: 'asc', nulls: 'last' } },
          { expiryDate: { sort: 'asc', nulls: 'last' } },
        ];
        break;

      case SortOption.CATEGORY:
        orderBy = [
          { category: { sort: 'asc', nulls: 'last' } },
          { expiryDate: { sort: 'asc', nulls: 'last' } },
        ];
        break;

      default:
        where = { ...baseWhere, expiryDate: { gte: new Date() } };
        orderBy = [
          { expiryDate: { sort: 'asc', nulls: 'last' } },
          { createdAt: 'desc' },
        ];
        break;
    }

    const [data, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return { data, total };
  }
}
