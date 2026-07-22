import { Injectable } from '@nestjs/common';
import { Coupon } from '@prisma/client';
import { GeminiService } from '../ai/gemini.service';
import { BenefitsRepository } from './benefits.repository';
import { ImportBenefitDto } from './dto/import-benefit.dto';
import { ListBenefitsDto, SortOption } from './dto/list-benefits.dto';
import { normalizeCouponExtraction } from './normalizers/coupon.normalizer';

@Injectable()
export class BenefitsService {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly benefitsRepository: BenefitsRepository,
  ) {}

  async importBenefit(dto: ImportBenefitDto): Promise<Coupon> {
    const rawText = dto.rawText.trim();
    const source = dto.source?.trim() || 'user_paste';

    // Gemini → Extraction DTO (Zod-validated inside GeminiService)
    const extraction = await this.geminiService.extractCoupon(rawText);

    // Extraction DTO → Benefit entity / Prisma create input
    const couponData = normalizeCouponExtraction(extraction, {
      rawText,
      source,
    });

    return this.benefitsRepository.create(couponData);
  }

  async findAll(dto: ListBenefitsDto): Promise<Coupon[]> {
    return this.benefitsRepository.findAll(
      dto.sort ?? SortOption.EXPIRING_SOON,
    );
  }
}
