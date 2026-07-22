import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AIIntentService } from './ai-intent.service';
import { AskController } from './ask.controller';
import { AskService } from './ask.service';
import { SearchRanker } from './search.ranker';
import { SearchRepository } from './search.repository';
import { SearchService } from './search.service';

/**
 * Ask BenefitAI — intent extraction + deterministic benefit search.
 * SearchService is exported for future RecommendationEngine reuse.
 */
@Module({
  imports: [AiModule],
  controllers: [AskController],
  providers: [
    AskService,
    AIIntentService,
    SearchService,
    SearchRepository,
    SearchRanker,
  ],
  exports: [AskService, SearchService, SearchRanker],
})
export class AskModule {}
