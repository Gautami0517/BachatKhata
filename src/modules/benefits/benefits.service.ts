import { Injectable } from '@nestjs/common';
import { GeminiService } from '../ai/gemini.service';
import { BenefitsRepository } from './benefits.repository';
import { CouponResponseDto } from './dto/coupon-response.dto';
import { ImportBenefitDto } from './dto/import-benefit.dto';
import { ListBenefitsDto, SortOption } from './dto/list-benefits.dto';
import {
  toCouponResponseDto,
  toCouponResponseDtoList,
} from './mappers/coupon.mapper';
import { normalizeCouponExtraction } from './normalizers/coupon.normalizer';

@Injectable()
export class BenefitsService {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly benefitsRepository: BenefitsRepository,
  ) {}

  async importBenefit(dto: ImportBenefitDto): Promise<CouponResponseDto> {
    const rawText = dto.rawText.trim();
    const source = dto.source?.trim() || 'user_paste';

    const extraction = await this.geminiService.extractCoupon(rawText);

    const couponData = normalizeCouponExtraction(extraction, {
      rawText,
      source,
    });

    const coupon = await this.benefitsRepository.create(couponData);
    return toCouponResponseDto(coupon);
  }

  async findAll(dto: ListBenefitsDto): Promise<CouponResponseDto[]> {
    const coupons = await this.benefitsRepository.findAll(
      dto.sort ?? SortOption.EXPIRING_SOON,
    );
    return toCouponResponseDtoList(coupons);
  }
}
