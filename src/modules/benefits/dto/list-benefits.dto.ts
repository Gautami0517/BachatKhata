import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum SortOption {
  EXPIRING_SOON = 'expiring_soon',
  NEWEST = 'newest',
  HIGHEST_DISCOUNT_PCT = 'highest_discount_pct',
  HIGHEST_SAVINGS = 'highest_savings',
  /** Sort by brand A→Z, then merchant A→Z (nulls last). */
  BRAND_AZ = 'brand_az',
  CATEGORY = 'category',
}

export class ListBenefitsDto {
  @ApiPropertyOptional({
    enum: SortOption,
    enumName: 'SortOption',
    default: SortOption.EXPIRING_SOON,
    description: 'Sort order for returned coupons. Defaults to expiring_soon.',
  })
  @IsOptional()
  @IsEnum(SortOption)
  sort: SortOption = SortOption.EXPIRING_SOON;
}
