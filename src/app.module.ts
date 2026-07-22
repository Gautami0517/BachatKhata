import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from './common/logger/logger.module';
import { configuration, validate } from './config';
import { AiModule } from './modules/ai/ai.module';
import { AskModule } from './modules/ask/ask.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { BenefitsModule } from './modules/benefits/benefits.module';
import { RecommendationModule } from './modules/recommendation/recommendation.module';
import { SearchModule } from './modules/search/search.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
    LoggerModule,
    PrismaModule,
    AuthModule,
    BenefitsModule,
    AskModule,
    AiModule,
    SearchModule,
    RecommendationModule,
  ],
  providers: [
    // Order matters: ThrottlerGuard runs first (cheap), then JwtAuthGuard.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
