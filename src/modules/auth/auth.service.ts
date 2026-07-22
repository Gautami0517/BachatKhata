import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID, createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { JwtAccessPayload } from './jwt.strategy';
import { InvalidOtpError, OtpRateLimitError, OtpService } from './otp.service';
import { SignupDto } from './dto/signup.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async signup(dto: SignupDto): Promise<void> {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    await this.prisma.user.create({
      data: { email, name: dto.name.trim(), isVerified: false },
    });

    await this.dispatchOtp(email, dto.name.trim());
  }

  async requestOtp(emailRaw: string): Promise<void> {
    const email = emailRaw.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    });

    // Anti-enumeration: never reveal that the email is unknown.
    if (user) {
      await this.dispatchOtp(email, user.name);
    } else {
      this.logger.log(`OTP request for unknown email ${email} (suppressed)`);
    }
  }

  private async dispatchOtp(email: string, name: string): Promise<void> {
    const { code } = await this.otpService.issueOtp(email, 'LOGIN');

    await this.mailService.send({
      to: email,
      subject: 'Your C-Vault login code',
      text: `Hi ${name},\n\nYour C-Vault login code is ${code}. It expires in 10 minutes.\n\nIf you did not request this, you can safely ignore this email.`,
      html: `<p>Hi ${name},</p><p>Your C-Vault login code is <strong style="font-size:20px;letter-spacing:2px">${code}</strong>.</p><p>It expires in 10 minutes.</p><p>If you did not request this, you can safely ignore this email.</p>`,
    });
  }

  async verifyOtp(emailRaw: string, otp: string): Promise<AuthResponseDto> {
    const email = emailRaw.trim().toLowerCase();

    try {
      await this.otpService.verify(email, otp);
    } catch (error) {
      if (error instanceof OtpRateLimitError) {
        throw new UnauthorizedException(error.message);
      }
      if (error instanceof InvalidOtpError) {
        throw new UnauthorizedException(error.message);
      }
      throw error;
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isVerified) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
    }

    return this.issueTokens({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  }

  async refresh(refreshTokenRaw: string): Promise<AuthResponseDto> {
    const tokenHash = this.hashToken(refreshTokenRaw);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revokedAt) {
      // Reuse detection: a revoked token presented again -> burn the family.
      await this.burnFamily(stored.userId, stored.familyId);
      this.logger.warn(
        `Refresh token reuse detected for user ${stored.userId}; family ${stored.familyId} revoked`,
      );
      throw new UnauthorizedException('Session invalidated due to token reuse');
    }

    if (stored.expiresAt < new Date()) {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    // Rotate within the same family: mint a new refresh token, then revoke
    // the presented one and point it at its replacement.
    const newRefresh = this.generateRefreshTokenValue();
    const newRecord = await this.prisma.refreshToken.create({
      data: {
        userId: stored.user.id,
        tokenHash: this.hashToken(newRefresh),
        familyId: stored.familyId,
        expiresAt: new Date(
          Date.now() + this.parseExpiryMs('jwt.refreshExpires'),
        ),
      },
    });

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedById: newRecord.id },
    });

    const accessToken = await this.jwtService.signAsync({
      sub: stored.user.id,
      email: stored.user.email,
      name: stored.user.name,
    });

    return {
      accessToken,
      refreshToken: newRefresh,
      user: {
        id: stored.user.id,
        email: stored.user.email,
        name: stored.user.name,
        isVerified: true,
        createdAt: new Date(),
      },
    };
  }

  async getMe(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        isVerified: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  async logout(refreshTokenRaw: string): Promise<void> {
    const tokenHash = this.hashToken(refreshTokenRaw);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: { id: true, revokedAt: true, userId: true, familyId: true },
    });

    if (!stored || stored.revokedAt) {
      return;
    }

    await this.burnFamily(stored.userId, stored.familyId);
  }

  private async burnFamily(userId: string, familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(
    user: { id: string; email: string; name: string },
    options: {
      refreshToken?: string;
      familyId?: string;
    } = {},
  ): Promise<AuthResponseDto> {
    const payload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    const refreshToken =
      options.refreshToken ?? this.generateRefreshTokenValue();
    const refreshHash = this.hashToken(refreshToken);
    const familyId = options.familyId ?? randomUUID();

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshHash,
        familyId,
        expiresAt: new Date(
          Date.now() + this.parseExpiryMs('jwt.refreshExpires'),
        ),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isVerified: true,
        createdAt: new Date(),
      },
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateRefreshTokenValue(): string {
    return randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
  }

  private parseExpiryMs(
    configKey: 'jwt.accessExpires' | 'jwt.refreshExpires',
  ): number {
    const raw = this.configService.get<string>(configKey) ?? '30d';
    const match = raw.match(/^(\d+)\s*([smhd])$/i);
    if (!match) return 30 * 24 * 60 * 60_000;
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60_000,
      h: 60 * 60_000,
      d: 24 * 60 * 60_000,
    };
    return value * multipliers[unit];
  }
}
