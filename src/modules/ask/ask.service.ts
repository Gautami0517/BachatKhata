import { Injectable } from '@nestjs/common';
import { computeDisplayName } from '../benefits/normalizers/coupon.normalizer';
import { AIIntentService } from './ai-intent.service';
import { AskBenefitDto } from './dto/ask-benefit.dto';
import { AskResponseDto, AskResultDto } from './dto/ask-response.dto';
import { RankedCoupon } from './search.ranker';
import { SearchService } from './search.service';

const NO_RESULTS_MESSAGE = 'No matching benefits found in your Benefit Vault.';

@Injectable()
export class AskService {
  constructor(
    private readonly aiIntentService: AIIntentService,
    private readonly searchService: SearchService,
  ) {}

  async ask(dto: AskBenefitDto, userId: string): Promise<AskResponseDto> {
    const query = dto.query.trim();

    // One Gemini call — intent only
    const intent = await this.aiIntentService.extractIntent(query);

    // Deterministic DB search + ranking
    const ranked = await this.searchService.searchByIntent(intent, userId);

    if (ranked.length === 0) {
      return {
        query,
        intent,
        totalResults: 0,
        results: [],
        message: NO_RESULTS_MESSAGE,
      };
    }

    return {
      query,
      intent,
      totalResults: ranked.length,
      results: ranked.map((coupon) => this.toResultDto(coupon)),
    };
  }

  private toResultDto(coupon: RankedCoupon): AskResultDto {
    return {
      id: coupon.id,
      merchant: coupon.merchant,
      brand: coupon.brand,
      displayName: computeDisplayName(coupon),
      title: coupon.title,
      category: coupon.category,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minimumSpend: coupon.minimumSpend,
      maximumDiscount: coupon.maximumDiscount,
      couponCode: coupon.couponCode,
      expiryDate: coupon.expiryDate,
      score: coupon.score,
    };
  }
}
