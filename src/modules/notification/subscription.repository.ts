import { Injectable } from '@nestjs/common';
import { PushSubscription, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsertByEndpoint(data: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }): Promise<PushSubscription> {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      create: data,
      update: {
        userId: data.userId,
        p256dh: data.p256dh,
        auth: data.auth,
      },
    });
  }

  deleteByEndpoint(endpoint: string): Promise<Prisma.BatchPayload> {
    return this.prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });
  }

  findByUserId(userId: string): Promise<PushSubscription[]> {
    return this.prisma.pushSubscription.findMany({
      where: { userId },
    });
  }

  findAll(): Promise<PushSubscription[]> {
    return this.prisma.pushSubscription.findMany();
  }

  deleteById(id: string): Promise<PushSubscription> {
    return this.prisma.pushSubscription.delete({ where: { id } });
  }
}
