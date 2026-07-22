import { ApiProperty } from '@nestjs/swagger';
import { CouponResponseDto } from './coupon-response.dto';

/**
 * Paginated coupon list response.
 */
export class PaginatedCouponsDto {
  @ApiProperty({
    type: [CouponResponseDto],
    description: 'Coupons for the current page.',
  })
  data!: CouponResponseDto[];

  @ApiProperty({
    type: Number,
    description:
      'Total number of coupons matching the query (across all pages).',
    example: 137,
  })
  total!: number;

  @ApiProperty({
    type: Number,
    description: 'Page size used for this request.',
    example: 20,
  })
  limit!: number;

  @ApiProperty({
    type: Number,
    description: 'Number of coupons skipped.',
    example: 0,
  })
  offset!: number;
}
