import { Injectable } from '@nestjs/common';
import { AskIntent } from './dto/ask-intent.interface';
import { RankedCoupon, SearchRanker } from './search.ranker';
import { SearchRepository } from './search.repository';

/**
 * Deterministic benefit search from structured intent.
 * Reusable by Ask and (later) RecommendationEngine.
 * Never calls Gemini.
 */
@Injectable()
export class SearchService {
  constructor(
    private readonly searchRepository: SearchRepository,
    private readonly searchRanker: SearchRanker,
  ) {}

  async searchByIntent(intent: AskIntent): Promise<RankedCoupon[]> {
    const candidates = await this.searchRepository.findCandidates(intent);
    return this.searchRanker.rank(candidates, intent);
  }
}
