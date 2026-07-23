import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum SortOption {
  EXPIRING_SOON = 'expiring_soon',
  NEWEST = 'newest',
  HIGHEST_DISCOUNT_PCT = 'highest_discount_pct',
  HIGHEST_SAVINGS = 'highest_savings',
  /** Sort by brand A→Z, then merchant A→Z (nulls last). */
  BRAND_AZ = 'brand_az',
  CATEGORY = 'category',
}

export enum StatusFilter {
  UNUSED = 'unused',
  USED = 'used',
  ALL = 'all',
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

  @ApiPropertyOptional({
    type: String,
    description:
      'Filter by category (case-insensitive exact match). Omit to return all categories.',
    example: 'Fashion',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @ApiPropertyOptional({
    enum: StatusFilter,
    enumName: 'StatusFilter',
    default: StatusFilter.UNUSED,
    description:
      'Filter by used status. Defaults to "unused" (excludes used coupons). ' +
      'Use "used" to see used history, or "all" for everything.',
  })
  @IsOptional()
  @IsEnum(StatusFilter)
  status: StatusFilter = StatusFilter.UNUSED;
}
