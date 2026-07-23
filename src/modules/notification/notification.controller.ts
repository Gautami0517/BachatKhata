import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import { TestExpiryNotificationDto } from './dto/test-expiry-notification.dto';
import { UnsubscribePushDto } from './dto/unsubscribe-push.dto';
import { NotificationService } from './notification.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('subscribe')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Store a Web Push subscription',
    description:
      'Called by the PWA after the user grants notification permission.',
  })
  @ApiCreatedResponse({ description: 'Subscription stored' })
  @ApiBadRequestResponse({ description: 'Invalid subscription payload' })
  subscribe(@Body() dto: SubscribePushDto) {
    return this.notificationService.subscribe(dto);
  }

  @Delete('subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove a Web Push subscription by endpoint',
  })
  @ApiOkResponse({ description: 'Subscription removed (or already absent)' })
  @ApiBadRequestResponse({ description: 'Invalid endpoint' })
  unsubscribe(@Body() dto: UnsubscribePushDto) {
    return this.notificationService.unsubscribe(dto.endpoint);
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Demo: send expiry notification for a benefit immediately',
    description:
      'Hackathon / demo only. Builds a category-aware expiry reminder and pushes it now.',
  })
  @ApiOkResponse({ description: 'Notification dispatch result' })
  @ApiNotFoundResponse({ description: 'Benefit not found' })
  @ApiServiceUnavailableResponse({
    description: 'VAPID keys are not configured',
  })
  @ApiBadRequestResponse({ description: 'Invalid benefitId' })
  testExpiry(@Body() dto: TestExpiryNotificationDto) {
    return this.notificationService.sendTestExpiryNotification(dto.benefitId);
  }
}
