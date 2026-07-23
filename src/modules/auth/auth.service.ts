import {
  ConflictException,
  ExecutionContext,
  Injectable,
  Logger,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard, PassportStrategy } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

export interface JwtAccessPayload {
  sub: string;
  email: string;
  name: string;
}

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret')!,
      issuer: configService.get<string>('jwt.issuer'),
    });
  }

  async validate(payload: JwtAccessPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return { id: user.id, email: user.email, name: user.name };
  }
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly bcryptRounds = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signup(input: {
    email: string;
    name: string;
    password: string;
    confirmPassword: string;
  }): Promise<void> {
    if (input.password !== input.confirmPassword) {
      throw new ConflictException('Passwords do not match');
    }

    const email = input.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, this.bcryptRounds);

    await this.prisma.user.create({
      data: {
        email,
        name: input.name.trim(),
        passwordHash,
      },
    });
  }

  async login(emailRaw: string, password: string) {
    const email = emailRaw.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueTokens({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    });
  }

  async refresh(refreshTokenRaw: string) {
    const tokenHash = this.hashToken(refreshTokenRaw);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revokedAt) {
      // Reuse detected: burn the whole family.
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

    // Rotate: mint a new refresh in the same family, then revoke the old one
    // pointing to the replacement.
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
        createdAt: stored.user.createdAt,
      },
    };
  }

  async logout(refreshTokenRaw: string): Promise<void> {
    const tokenHash = this.hashToken(refreshTokenRaw);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: { userId: true, familyId: true, revokedAt: true },
    });

    if (!stored || stored.revokedAt) {
      return;
    }

    await this.burnFamily(stored.userId, stored.familyId);
  }

  async getMe(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private async issueTokens(user: {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
  }) {
    const payload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    const refreshToken = this.generateRefreshTokenValue();
    const familyId = randomUUID();

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
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
        createdAt: user.createdAt,
      },
    };
  }

  private async burnFamily(userId: string, familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
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
