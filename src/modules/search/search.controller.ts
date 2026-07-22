import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CouponResponseDto } from '../benefits/dto/coupon-response.dto';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Search coupons by text',
    description:
      'Case-insensitive substring search across merchant, brand, title, and rawText. ' +
      'Brand matches rank first, then merchant, then title; remaining by soonest expiry. ' +
      'Already-expired coupons are excluded by default.',
  })
  @ApiQuery({
    name: 'q',
    type: String,
    description: 'Search term (required, non-empty, up to 255 chars).',
    example: 'myn',
  })
  @ApiOkResponse({ type: [CouponResponseDto] })
  @ApiBadRequestResponse({
    description: 'Missing or empty `q` query parameter',
  })
  search(@Query() dto: SearchQueryDto): Promise<CouponResponseDto[]> {
    return this.searchService.search(dto);
  }
}
