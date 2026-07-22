import { Injectable } from '@nestjs/common';
import { Coupon, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string): Promise<Coupon[]> {
    const term = `%${q}%`;

    const rows = await this.prisma.$queryRaw<Coupon[]>(Prisma.sql`
      SELECT *
      FROM "coupons"
      WHERE (
        "merchant" ILIKE ${term}
        OR "brand"    ILIKE ${term}
        OR "title"    ILIKE ${term}
        OR "rawText"  ILIKE ${term}
      )
      AND ("expiryDate" IS NULL OR "expiryDate" >= NOW())
      ORDER BY
        CASE
          WHEN "brand"    ILIKE ${term} THEN 0
          WHEN "merchant" ILIKE ${term} THEN 1
          WHEN "title"    ILIKE ${term} THEN 2
          ELSE 3
        END,
        "expiryDate" ASC NULLS LAST,
        "createdAt" DESC
    `);

    return rows;
  }
}
