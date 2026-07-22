import { Injectable } from '@nestjs/common';
import { Coupon } from '@prisma/client';
import { SearchRepository } from './search.repository';
import { SearchQueryDto } from './dto/search-query.dto';

@Injectable()
export class SearchService {
  constructor(private readonly searchRepository: SearchRepository) {}

  async search(dto: SearchQueryDto): Promise<Coupon[]> {
    return this.searchRepository.search(dto.q.trim());
  }
}
