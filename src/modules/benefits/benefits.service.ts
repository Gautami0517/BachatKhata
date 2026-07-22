import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GeminiService } from '../ai/gemini.service';
import { BenefitsRepository } from './benefits.repository';
import { CouponResponseDto } from './dto/coupon-response.dto';
import { ImportBenefitDto } from './dto/import-benefit.dto';
import { ListBenefitsDto } from './dto/list-benefits.dto';
import { UpdateBenefitDto } from './dto/update-benefit.dto';
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

    // Gemini → Extraction DTO (Zod-validated inside GeminiService)
    const extraction = await this.geminiService.extractCoupon(rawText);

    // Extraction DTO → Benefit entity / Prisma create input
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

  async update(id: string, dto: UpdateBenefitDto): Promise<CouponResponseDto> {
    // Existence check → 404 if missing (instead of a raw Prisma P2025 → 500).
    const existing = await this.benefitsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Coupon "${id}" was not found`);
    }

    const input = this.toUpdateInput(dto);
    // Avoid a no-op update that would refresh `updatedAt` with no real change.
    if (Object.keys(input).length === 0) {
      return toCouponResponseDto(existing);
    }

    const coupon = await this.benefitsRepository.update(id, input);
    return toCouponResponseDto(coupon);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.benefitsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Coupon "${id}" was not found`);
    }
    await this.benefitsRepository.delete(id);
  }

  async findAll(dto: ListBenefitsDto): Promise<{
    data: CouponResponseDto[];
    total: number;
  }> {
    const { data, total } = await this.benefitsRepository.findAll(dto);
    return { data: toCouponResponseDtoList(data), total };
  }

  private toUpdateInput(dto: UpdateBenefitDto): Prisma.CouponUpdateInput {
    const input: Prisma.CouponUpdateInput = {};

    if (dto.merchant !== undefined) input.merchant = dto.merchant;
    if (dto.brand !== undefined) input.brand = dto.brand;
    if (dto.title !== undefined) input.title = dto.title;
    if (dto.category !== undefined) input.category = dto.category;
    if (dto.discountType !== undefined) input.discountType = dto.discountType;
    if (dto.discountValue !== undefined)
      input.discountValue = dto.discountValue;
    if (dto.minimumSpend !== undefined) input.minimumSpend = dto.minimumSpend;
    if (dto.maximumDiscount !== undefined)
      input.maximumDiscount = dto.maximumDiscount;
    if (dto.couponCode !== undefined) input.couponCode = dto.couponCode;
    if (dto.expiryDate !== undefined) {
      input.expiryDate =
        dto.expiryDate === null ? null : new Date(dto.expiryDate);
    }

    return input;
  }
}
