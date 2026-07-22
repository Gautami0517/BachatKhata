import { Injectable, NotFoundException } from '@nestjs/common';
import { GeminiService } from '../ai/gemini.service';
import { BenefitsRepository } from './benefits.repository';
import { CouponPreviewDto } from './dto/coupon-preview.dto';
import { CouponResponseDto } from './dto/coupon-response.dto';
import { ImportBenefitDto } from './dto/import-benefit.dto';
import { ListBenefitsDto, SortOption } from './dto/list-benefits.dto';
import { SaveExtractedDto } from './dto/save-extracted.dto';
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

  async findOne(id: string): Promise<CouponResponseDto> {
    const coupon = await this.benefitsRepository.findById(id);
    if (!coupon) {
      throw new NotFoundException(`Coupon "${id}" was not found`);
    }
    return toCouponResponseDto(coupon);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.benefitsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Coupon "${id}" was not found`);
    }
    await this.benefitsRepository.delete(id);
  }

  async findAll(dto: ListBenefitsDto): Promise<CouponResponseDto[]> {
    const coupons = await this.benefitsRepository.findAll(
      dto.sort ?? SortOption.EXPIRING_SOON,
      dto.category,
    );
    return toCouponResponseDtoList(coupons);
  }

  /**
   * Step 1 of the two-step image import flow.
   * Sends the image bytes to Gemini vision, returns a preview for the
   * client to review. Nothing is persisted.
   */
  async extractFromImage(
    image: Buffer,
    source?: string,
  ): Promise<CouponPreviewDto> {
    const trimmedSource = source?.trim() || null;

    const extraction = await this.geminiService.extractCouponFromImage(image);

    const rawText = `[Image import via ${
      trimmedSource ?? 'user_share'
    } at ${new Date().toISOString()}]`;

    return {
      merchant: extraction.merchant,
      brand: extraction.brand,
      title: extraction.title,
      category: extraction.category,
      discountType: extraction.discountType,
      discountValue: extraction.discountValue,
      minimumSpend: extraction.minimumSpend,
      maximumDiscount: extraction.maximumDiscount,
      couponCode: extraction.couponCode,
      expiryDate: extraction.expiryDate,
      source: extraction.source ?? trimmedSource,
      rawText,
    };
  }

  /**
   * Step 2 of the two-step image import flow.
   * Persists a (possibly edited) extraction. No AI call.
   */
  async saveExtraction(dto: SaveExtractedDto): Promise<CouponResponseDto> {
    const extraction = {
      merchant: dto.merchant ?? null,
      brand: dto.brand ?? null,
      title: dto.title ?? null,
      category: dto.category ?? null,
      discountType: dto.discountType ?? null,
      discountValue: dto.discountValue ?? null,
      minimumSpend: dto.minimumSpend ?? null,
      maximumDiscount: dto.maximumDiscount ?? null,
      couponCode: dto.couponCode ?? null,
      expiryDate: dto.expiryDate ?? null,
      source: dto.source ?? null,
    };

    const couponData = normalizeCouponExtraction(extraction, {
      rawText: dto.rawText,
      source: dto.source ?? null,
    });

    const coupon = await this.benefitsRepository.create(couponData);
    return toCouponResponseDto(coupon);
  }
}
