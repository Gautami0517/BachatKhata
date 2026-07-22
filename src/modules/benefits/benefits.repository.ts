import { Injectable } from '@nestjs/common';
import { Coupon, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BenefitsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.CouponCreateInput): Promise<Coupon> {
    return this.prisma.coupon.create({ data });
  }

  findById(id: string): Promise<Coupon | null> {
    return this.prisma.coupon.findUnique({ where: { id } });
  }
}
