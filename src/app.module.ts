import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from './common/logger/logger.module';
import { configuration, validate } from './config';
import { AiModule } from './modules/ai/ai.module';
import { AskModule } from './modules/ask/ask.module';
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
    LoggerModule,
    PrismaModule,
    BenefitsModule,
    AskModule,
    AiModule,
    SearchModule,
    RecommendationModule,
  ],
})
export class AppModule {}
