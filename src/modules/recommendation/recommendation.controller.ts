import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RecommendationService } from './recommendation.service';

@ApiTags('recommendation')
@Controller('recommendation')
export class RecommendationController {
  constructor(
    private readonly recommendationService: RecommendationService,
  ) {}
}
