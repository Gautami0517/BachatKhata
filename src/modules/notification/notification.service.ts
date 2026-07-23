import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Coupon } from '@prisma/client';
import { NotificationMessageBuilder } from './notification-message.builder';
import { NotificationRepository } from './notification.repository';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import { NotificationType } from './dto/notification-type.enum';
import { SubscriptionRepository } from './subscription.repository';
import { WebPushService } from './web-push.service';

export type ExpiryDispatchResult = {
  benefitId: string;
  type: NotificationType;
  sent: number;
  failed: number;
  removed: number;
  markedSent: boolean;
};

/**
 * Orchestrates subscription storage and expiry notification delivery.
 * Subscriptions and sends are scoped to the authenticated user id.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly messageBuilder: NotificationMessageBuilder,
    private readonly webPushService: WebPushService,
  ) {}

  getVapidPublicKey(): { publicKey: string } {
    const publicKey = this.webPushService.getPublicKey();
    if (!publicKey || !this.webPushService.isConfigured()) {
      throw new ServiceUnavailableException(
        'VAPID keys are not configured (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)',
      );
    }

    return { publicKey };
  }

  async subscribe(dto: SubscribePushDto, userId: string) {
    const subscription = await this.subscriptionRepository.upsertByEndpoint({
      userId,
      endpoint: dto.endpoint.trim(),
      p256dh: dto.keys.p256dh.trim(),
      auth: dto.keys.auth.trim(),
    });

    return {
      id: subscription.id,
      endpoint: subscription.endpoint,
      userId: subscription.userId,
      createdAt: subscription.createdAt,
    };
  }

  async unsubscribe(endpoint: string, userId: string) {
    const result = await this.subscriptionRepository.deleteByEndpointForUser(
      endpoint.trim(),
      userId,
    );

    return {
      removed: result.count > 0,
      count: result.count,
    };
  }

  /**
   * Process all benefits due for an expiry reminder (scheduler entrypoint).
   */
  async processExpiringBenefits(): Promise<ExpiryDispatchResult[]> {
    if (!this.webPushService.isConfigured()) {
      this.logger.warn('Skipping expiry scan — VAPID not configured');
      return [];
    }

    const benefits =
      await this.notificationRepository.findExpiringWithin24Hours();

    const results: ExpiryDispatchResult[] = [];

    for (const benefit of benefits) {
      try {
        const result = await this.sendExpiryNotification(benefit);
        results.push(result);
      } catch (error) {
        this.logger.error(
          `Expiry notification failed for benefit ${benefit.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return results;
  }

  /**
   * Demo / hackathon: send expiry reminder for a benefit owned by this user.
   */
  async sendTestExpiryNotification(
    benefitId: string,
    userId: string,
  ): Promise<ExpiryDispatchResult> {
    const benefit = await this.notificationRepository.findBenefitByIdForUser(
      benefitId,
      userId,
    );

    if (!benefit) {
      throw new NotFoundException(`Benefit ${benefitId} not found`);
    }

    return this.sendExpiryNotification(benefit, { force: true });
  }

  /**
   * Send an EXPIRY notification for a benefit and mark it as reminded.
   * Pushes only to subscriptions belonging to benefit.userId.
   */
  async sendExpiryNotification(
    benefit: Coupon,
    options: { force?: boolean } = {},
  ): Promise<ExpiryDispatchResult> {
    if (!options.force && benefit.expiryNotificationSentAt) {
      return {
        benefitId: benefit.id,
        type: NotificationType.EXPIRY,
        sent: 0,
        failed: 0,
        removed: 0,
        markedSent: false,
      };
    }

    if (!benefit.userId) {
      this.logger.warn(
        `Skipping expiry push for benefit ${benefit.id}: no owning userId`,
      );
      return {
        benefitId: benefit.id,
        type: NotificationType.EXPIRY,
        sent: 0,
        failed: 0,
        removed: 0,
        markedSent: false,
      };
    }

    const payload = this.messageBuilder.buildExpiryReminder(benefit);

    const pushResult = await this.webPushService.sendToUser(
      benefit.userId,
      payload,
    );

    await this.notificationRepository.markExpiryNotificationSent(benefit.id);

    return {
      benefitId: benefit.id,
      type: NotificationType.EXPIRY,
      sent: pushResult.sent,
      failed: pushResult.failed,
      removed: pushResult.removed,
      markedSent: true,
    };
  }
}
