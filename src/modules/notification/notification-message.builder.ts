import { Injectable } from '@nestjs/common';
import { NotificationType } from './dto/notification-type.enum';
import {
  ExpiryMessageInput,
  PushNotificationPayload,
} from './dto/push-payload.types';

/**
 * Category-aware push copy. No AI — templates only.
 */
@Injectable()
export class NotificationMessageBuilder {
  buildExpiryReminder(benefit: ExpiryMessageInput): PushNotificationPayload {
    const category = (benefit.category ?? '').trim().toLowerCase();
    const merchantLabel =
      benefit.merchant?.trim() ||
      benefit.brand?.trim() ||
      'saved';

    const template = this.resolveTemplate(category, merchantLabel);

    return {
      title: template.title,
      body: template.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      url: '/',
      type: NotificationType.EXPIRY,
      benefitId: benefit.id,
    };
  }

  private resolveTemplate(
    category: string,
    merchantLabel: string,
  ): { title: string; body: string } {
    if (this.matches(category, ['fashion', 'apparel', 'clothing', 'shoes'])) {
      return {
        title: '👟 BenefitAI Reminder',
        body: `Your ${merchantLabel} benefit expires tomorrow.\n\nPlanning to shop?`,
      };
    }

    if (this.matches(category, ['food', 'dining', 'restaurant', 'groceries'])) {
      return {
        title: '🍔 BenefitAI Reminder',
        body: 'Your food benefit expires tonight.\n\nDon\'t let it go unused.',
      };
    }

    if (
      this.matches(category, [
        'electronics',
        'gadgets',
        'tech',
        'mobile',
        'phones',
      ])
    ) {
      return {
        title: '💻 BenefitAI Reminder',
        body: 'Your electronics benefit expires tomorrow.\n\nPotential savings waiting.',
      };
    }

    if (this.matches(category, ['travel', 'flight', 'hotel', 'trip'])) {
      return {
        title: '✈️ BenefitAI Reminder',
        body: 'Your travel benefit expires soon.\n\nBook before it expires.',
      };
    }

    return {
      title: '💡 BenefitAI Reminder',
      body: 'One of your saved benefits expires tomorrow.',
    };
  }

  private matches(category: string, keywords: string[]): boolean {
    return keywords.some(
      (keyword) => category === keyword || category.includes(keyword),
    );
  }
}
