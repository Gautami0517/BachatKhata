import { Injectable } from '@nestjs/common';
import { AskIntent } from './dto/ask-intent.interface';
import { RankedCoupon, SearchRanker } from './search.ranker';
import { SearchRepository } from './search.repository';

export type AskMatchType = 'product' | 'category_fallback' | 'general';

export type SearchByIntentResult = {
  results: RankedCoupon[];
  matchType: AskMatchType | null;
  message?: string;
};

/**
 * Deterministic benefit search from structured intent.
 * Product-first; category fallback when product has no hits.
 * Never calls Gemini. Always scoped to userId.
 */
@Injectable()
export class SearchService {
  constructor(
    private readonly searchRepository: SearchRepository,
    private readonly searchRanker: SearchRanker,
  ) {}

  async searchByIntent(
    intent: AskIntent,
    userId: string,
  ): Promise<SearchByIntentResult> {
    if (intent.product) {
      return this.searchWithProduct(intent, userId);
    }

    return this.searchGeneral(intent, userId);
  }

  private async searchWithProduct(
    intent: AskIntent,
    userId: string,
  ): Promise<SearchByIntentResult> {
    const productHits = await this.searchRepository.findProductCandidates(
      intent,
      userId,
    );

    if (productHits.length > 0) {
      return {
        results: this.searchRanker.rank(productHits, intent),
        matchType: 'product',
      };
    }

    if (intent.category) {
      const categoryHits = await this.searchRepository.findCategoryCandidates(
        intent,
        userId,
      );

      if (categoryHits.length > 0) {
        return {
          results: this.searchRanker.rank(categoryHits, intent),
          matchType: 'category_fallback',
          message: this.buildCategoryFallbackMessage(
            intent.product!,
            intent.category,
          ),
        };
      }
    }

    return { results: [], matchType: null };
  }

  private async searchGeneral(
    intent: AskIntent,
    userId: string,
  ): Promise<SearchByIntentResult> {
    const candidates = await this.searchRepository.findGeneralCandidates(
      intent,
      userId,
    );

    if (candidates.length === 0) {
      return { results: [], matchType: null };
    }

    return {
      results: this.searchRanker.rank(candidates, intent),
      matchType: 'general',
    };
  }

  private buildCategoryFallbackMessage(
    product: string,
    category: string,
  ): string {
    return (
      `No benefits found specifically for ${product}, ` +
      `but here are similar offers in ${category}.`
    );
  }
}
