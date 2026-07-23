import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PushSubscription } from '@prisma/client';
import * as webpush from 'web-push';
import { PushNotificationPayload } from './dto/push-payload.types';
import { SubscriptionRepository } from './subscription.repository';

type SendResult = {
  sent: number;
  failed: number;
  removed: number;
};

/**
 * Thin wrapper around web-push. Does not build messages or query benefits.
 */
@Injectable()
export class WebPushService implements OnModuleInit {
  private readonly logger = new Logger(WebPushService.name);
  private configured = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  onModuleInit(): void {
    const publicKey = this.configService.get<string>('vapid.publicKey');
    const privateKey = this.configService.get<string>('vapid.privateKey');
    const email =
      this.configService.get<string>('vapid.email') ??
      'mailto:benefitai@example.com';

    if (!publicKey || !privateKey) {
      this.logger.warn(
        'VAPID keys are not configured — push notifications are disabled',
      );
      this.configured = false;
      return;
    }

    webpush.setVapidDetails(email, publicKey, privateKey);
    this.configured = true;
    this.logger.log('Web Push VAPID configured');
  }

  assertConfigured(): void {
    if (!this.configured) {
      throw new ServiceUnavailableException(
        'VAPID keys are not configured (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)',
      );
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  getPublicKey(): string | null {
    return this.configService.get<string>('vapid.publicKey') ?? null;
  }

  /**
   * Send payload to every subscription for the user.
   * Invalid endpoints are removed; one failure never aborts the batch.
   */
  async sendToUser(
    userId: string,
    payload: PushNotificationPayload,
  ): Promise<SendResult> {
    this.assertConfigured();

    const subscriptions =
      await this.subscriptionRepository.findByUserId(userId);

    return this.sendToSubscriptions(subscriptions, payload);
  }

  async sendToAll(payload: PushNotificationPayload): Promise<SendResult> {
    this.assertConfigured();

    const subscriptions = await this.subscriptionRepository.findAll();
    return this.sendToSubscriptions(subscriptions, payload);
  }

  private async sendToSubscriptions(
    subscriptions: PushSubscription[],
    payload: PushNotificationPayload,
  ): Promise<SendResult> {
    const body = JSON.stringify(payload);
    let sent = 0;
    let failed = 0;
    let removed = 0;

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          body,
        );
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode = this.getStatusCode(error);

        if (statusCode === 404 || statusCode === 410) {
          try {
            await this.subscriptionRepository.deleteById(subscription.id);
            removed += 1;
            this.logger.warn(
              `Removed invalid push subscription ${subscription.id} (${statusCode})`,
            );
          } catch (deleteError) {
            this.logger.error(
              `Failed to remove invalid subscription ${subscription.id}`,
              deleteError instanceof Error
                ? deleteError.stack
                : String(deleteError),
            );
          }
        } else {
          this.logger.error(
            `Failed to send push to ${subscription.id}: ${this.stringifyError(error)}`,
          );
        }
      }
    }

    return { sent, failed, removed };
  }

  private getStatusCode(error: unknown): number | null {
    if (!error || typeof error !== 'object') {
      return null;
    }

    const statusCode = (error as { statusCode?: unknown }).statusCode;
    return typeof statusCode === 'number' ? statusCode : null;
  }

  private stringifyError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
