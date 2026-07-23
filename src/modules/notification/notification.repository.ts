import { Injectable } from '@nestjs/common';
import { Coupon, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Benefits expiring within the next 24 hours that have not been reminded yet.
   */
  findExpiringWithin24Hours(now = new Date()): Promise<Coupon[]> {
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return this.prisma.coupon.findMany({
      where: {
        userId: { not: null },
        expiryDate: {
          gt: now,
          lte: in24Hours,
        },
        expiryNotificationSentAt: null,
      },
      orderBy: { expiryDate: 'asc' },
    });
  }

  findBenefitById(id: string): Promise<Coupon | null> {
    return this.prisma.coupon.findUnique({ where: { id } });
  }

  findBenefitByIdForUser(
    id: string,
    userId: string,
  ): Promise<Coupon | null> {
    return this.prisma.coupon.findFirst({
      where: { id, userId },
    });
  }

  markExpiryNotificationSent(
    id: string,
    sentAt = new Date(),
  ): Promise<Coupon> {
    return this.prisma.coupon.update({
      where: { id },
      data: { expiryNotificationSentAt: sentAt },
    });
  }

  markExpiryNotificationSentMany(
    ids: string[],
    sentAt = new Date(),
  ): Promise<Prisma.BatchPayload> {
    if (ids.length === 0) {
      return Promise.resolve({ count: 0 });
    }

    return this.prisma.coupon.updateMany({
      where: { id: { in: ids } },
      data: { expiryNotificationSentAt: sentAt },
    });
  }
}
