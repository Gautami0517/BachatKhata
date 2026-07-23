import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationService } from './notification.service';

/**
 * Hourly expiry scan. Orchestration only — no Prisma / web-push here.
 */
@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(private readonly notificationService: NotificationService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiringBenefits(): Promise<void> {
    this.logger.debug('Running hourly expiry notification scan');

    try {
      const results = await this.notificationService.processExpiringBenefits();
      const sent = results.reduce((sum, r) => sum + r.sent, 0);

      if (results.length > 0) {
        this.logger.log(
          `Expiry scan complete: ${results.length} benefit(s), ${sent} push(es) sent`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Expiry notification scheduler failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
