import { Module } from '@nestjs/common';
import { RecommendationController } from './recommendation.controller';
import { RecommendationRepository } from './recommendation.repository';
import { RecommendationService } from './recommendation.service';

@Module({
  controllers: [RecommendationController],
  providers: [RecommendationService, RecommendationRepository],
  exports: [RecommendationService],
})
export class RecommendationModule {}
