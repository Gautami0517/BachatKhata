import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum SortOption {
  EXPIRING_SOON = 'expiring_soon',
  NEWEST = 'newest',
  HIGHEST_DISCOUNT_PCT = 'highest_discount_pct',
  HIGHEST_SAVINGS = 'highest_savings',
  /** Highest C-Vault benefitScore first (0–10). Null scores last. */
  HIGHEST_SCORE = 'highest_score',
  /** Sort by brand A→Z, then merchant A→Z (nulls last). */
  BRAND_AZ = 'brand_az',
  CATEGORY = 'category',
}

export enum StatusFilter {
  UNUSED = 'unused',
  USED = 'used',
  ALL = 'all',
}

/**
 * Accepts one or many values:
 * - ?category=Fashion
 * - ?category=Fashion&category=Food
 * - ?category=Fashion,Food
 */
function toFilterValues(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const rawParts = Array.isArray(value)
    ? value.flatMap((entry) => String(entry).split(','))
    : String(value).split(',');

  const cleaned = rawParts
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  return cleaned.length > 0 ? cleaned : undefined;
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
    type: [String],
    description:
      'Filter by one or more categories (case-insensitive). Repeat param or comma-separate.',
    example: ['Fashion', 'Food'],
  })
  @IsOptional()
  @Transform(({ value }) => toFilterValues(value))
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  category?: string[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'Filter by one or more merchants (case-insensitive). Repeat param or comma-separate.',
    example: ['Amazon', 'Myntra'],
  })
  @IsOptional()
  @Transform(({ value }) => toFilterValues(value))
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  merchant?: string[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'Filter by one or more brands (case-insensitive). Repeat param or comma-separate.',
    example: ['Nike', 'Adidas'],
  })
  @IsOptional()
  @Transform(({ value }) => toFilterValues(value))
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  brand?: string[];

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
