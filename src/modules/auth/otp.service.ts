import { randomInt } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';

export const OTP_TTL_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
const MAX_OTP_PER_WINDOW = 3;
const OTP_WINDOW_MINUTES = 10;

@Injectable()
export class OtpService {
  private readonly saltRounds: number;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    this.saltRounds =
      configService.get<string>('nodeEnv') === 'production' ? 10 : 4;
  }

  generateCode(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  hash(code: string): Promise<string> {
    return bcrypt.hash(code, this.saltRounds);
  }

  async compare(code: string, hash: string): Promise<boolean> {
    return bcrypt.compare(code, hash);
  }

  async issueOtp(email: string, purpose: 'LOGIN') {
    const windowStart = new Date(Date.now() - OTP_WINDOW_MINUTES * 60_000);

    const recentCount = await this.prisma.otpCode.count({
      where: { email, createdAt: { gte: windowStart } },
    });

    if (recentCount >= MAX_OTP_PER_WINDOW) {
      throw new OtpRateLimitError(
        `Too many OTP requests. Try again in a few minutes.`,
      );
    }

    const code = this.generateCode();
    const codeHash = await this.hash(code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

    return {
      code,
      record: await this.prisma.otpCode.create({
        data: { email, codeHash, purpose, expiresAt },
      }),
    };
  }

  async verify(email: string, otp: string) {
    const record = await this.prisma.otpCode.findFirst({
      where: { email, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new InvalidOtpError('Invalid or expired code');
    }

    if (record.expiresAt < new Date()) {
      throw new InvalidOtpError('Code has expired');
    }

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      throw new InvalidOtpError(
        'Too many failed attempts. Request a new code.',
      );
    }

    const ok = await this.compare(otp, record.codeHash);
    if (!ok) {
      await this.prisma.otpCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new InvalidOtpError('Invalid code');
    }

    await this.prisma.otpCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });

    return record;
  }
}

export class OtpRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OtpRateLimitError';
  }
}

export class InvalidOtpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidOtpError';
  }
}
