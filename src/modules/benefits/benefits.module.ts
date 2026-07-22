import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { BenefitsController } from './benefits.controller';
import { BenefitsRepository } from './benefits.repository';
import { BenefitsService } from './benefits.service';

@Module({
  imports: [AiModule],
  controllers: [BenefitsController],
  providers: [BenefitsService, BenefitsRepository],
  exports: [BenefitsService],
})
export class BenefitsModule {}
