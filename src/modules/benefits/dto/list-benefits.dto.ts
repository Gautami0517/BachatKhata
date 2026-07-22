import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum SortOption {
  EXPIRING_SOON = 'expiring_soon',
  NEWEST = 'newest',
  HIGHEST_DISCOUNT_PCT = 'highest_discount_pct',
  HIGHEST_SAVINGS = 'highest_savings',
  /** Sort by brand A→Z, then merchant A→Z (nulls last). */
  BRAND_AZ = 'brand_az',
  CATEGORY = 'category',
}

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

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
    type: Number,
    default: DEFAULT_LIMIT,
    minimum: 1,
    maximum: MAX_LIMIT,
    description: `Max coupons to return (1-${MAX_LIMIT}). Defaults to ${DEFAULT_LIMIT}.`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit: number = DEFAULT_LIMIT;

  @ApiPropertyOptional({
    type: Number,
    default: 0,
    minimum: 0,
    description: 'Number of coupons to skip for pagination. Defaults to 0.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;

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
}
