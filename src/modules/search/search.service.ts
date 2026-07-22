import { Injectable } from '@nestjs/common';
import { CouponResponseDto } from '../benefits/dto/coupon-response.dto';
import { toCouponResponseDtoList } from '../benefits/mappers/coupon.mapper';
import { SearchRepository } from './search.repository';
import { SearchQueryDto } from './dto/search-query.dto';

@Injectable()
export class SearchService {
  constructor(private readonly searchRepository: SearchRepository) {}

  async search(dto: SearchQueryDto): Promise<CouponResponseDto[]> {
    const coupons = await this.searchRepository.search(dto.q.trim());
    return toCouponResponseDtoList(coupons);
  }
}
