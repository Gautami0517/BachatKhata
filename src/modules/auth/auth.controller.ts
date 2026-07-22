import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { OtpSentResponseDto } from './dto/otp-sent-response.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create a new account and send the first OTP.' })
  @ApiCreatedResponse({
    description: 'Account created; OTP dispatched.',
    type: OtpSentResponseDto,
  })
  @ApiConflictResponse({ description: 'Email already registered' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  async signup(@Body() dto: SignupDto): Promise<OtpSentResponseDto> {
    await this.authService.signup(dto);
    return { status: 'otp_sent' };
  }

  @Public()
  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Request a login OTP.',
    description:
      'Always returns 200 {status:"otp_sent"} regardless of whether the email exists, to prevent enumeration.',
  })
  @ApiOkResponse({ type: OtpSentResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid email' })
  async requestOtp(@Body() dto: RequestOtpDto): Promise<OtpSentResponseDto> {
    await this.authService.requestOtp(dto.email);
    return { status: 'otp_sent' };
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Verify OTP and receive access + refresh tokens.' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired code' })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<AuthResponseDto> {
    return this.authService.verifyOtp(dto.email, dto.otp);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Rotate refresh token; issue a new token pair.' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Invalid/expired/reused refresh token',
  })
  async refresh(@Body() dto: RefreshDto): Promise<AuthResponseDto> {
    try {
      return await this.authService.refresh(dto.refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke the refresh token family (server-side logout).',
  })
  async logout(@Body() dto: LogoutDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @ApiOperation({ summary: 'Return the currently-authenticated user.' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async me(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.authService.getMe(user.id);
  }
}
