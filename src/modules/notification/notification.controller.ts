import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  CurrentUser,
  Public,
  type AuthenticatedUser,
} from '../auth/auth.service';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import { TestExpiryNotificationDto } from './dto/test-expiry-notification.dto';
import { UnsubscribePushDto } from './dto/unsubscribe-push.dto';
import { NotificationService } from './notification.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Public()
  @Get('vapid-public-key')
  @ApiOperation({
    summary: 'Get VAPID public key for Web Push subscribe',
    description:
      'Used by the PWA as applicationServerKey. No auth required.',
  })
  @ApiOkResponse({ description: '{ publicKey: string }' })
  @ApiServiceUnavailableResponse({
    description: 'VAPID keys are not configured',
  })
  getVapidPublicKey() {
    return this.notificationService.getVapidPublicKey();
  }

  @Post('subscribe')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Store a Web Push subscription for the logged-in user',
    description:
      'Called by the PWA after the user grants notification permission. ' +
      'Subscription is bound to the authenticated user id.',
  })
  @ApiCreatedResponse({ description: 'Subscription stored' })
  @ApiBadRequestResponse({ description: 'Invalid subscription payload' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  subscribe(
    @Body() dto: SubscribePushDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.subscribe(dto, user.id);
  }

  @Delete('subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove a Web Push subscription for the logged-in user',
  })
  @ApiOkResponse({ description: 'Subscription removed (or already absent)' })
  @ApiBadRequestResponse({ description: 'Invalid endpoint' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  unsubscribe(
    @Body() dto: UnsubscribePushDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.unsubscribe(dto.endpoint, user.id);
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Demo: send expiry notification for a benefit immediately',
    description:
      'Hackathon / demo only. Sends to push subscriptions owned by the logged-in user.',
  })
  @ApiOkResponse({ description: 'Notification dispatch result' })
  @ApiNotFoundResponse({ description: 'Benefit not found for this user' })
  @ApiServiceUnavailableResponse({
    description: 'VAPID keys are not configured',
  })
  @ApiBadRequestResponse({ description: 'Invalid benefitId' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  testExpiry(
    @Body() dto: TestExpiryNotificationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.sendTestExpiryNotification(
      dto.benefitId,
      user.id,
    );
  }
}
