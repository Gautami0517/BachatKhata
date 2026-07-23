import { Module } from '@nestjs/common';
import { NotificationMessageBuilder } from './notification-message.builder';
import { NotificationController } from './notification.controller';
import { NotificationRepository } from './notification.repository';
import { NotificationScheduler } from './notification.scheduler';
import { NotificationService } from './notification.service';
import { SubscriptionRepository } from './subscription.repository';
import { WebPushService } from './web-push.service';

@Module({
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationScheduler,
    NotificationRepository,
    SubscriptionRepository,
    WebPushService,
    NotificationMessageBuilder,
  ],
  exports: [NotificationService, WebPushService],
})
export class NotificationModule {}
