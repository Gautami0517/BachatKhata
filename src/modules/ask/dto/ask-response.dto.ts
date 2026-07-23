import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType } from '@prisma/client';
import { AskIntent, SortPreference } from './ask-intent.interface';

export class AskIntentDto implements AskIntent {
  @ApiPropertyOptional({ nullable: true, type: String, example: 'Myntra' })
  merchant!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: 'Nike' })
  brand!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: 'Fashion' })
  category!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: 'Shoes' })
  product!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Number, example: 5000 })
  expectedSpend!: number | null;

  @ApiPropertyOptional({
    nullable: true,
    enum: ['BEST_MATCH', 'HIGHEST_DISCOUNT', 'EXPIRING_SOON'],
    example: 'BEST_MATCH',
  })
  sortPreference!: SortPreference | null;
}

export class AskResultDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  merchant!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  brand!: string | null;

  @ApiProperty()
  displayName!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  category!: string | null;

  @ApiProperty({ enum: DiscountType })
  discountType!: DiscountType;

  @ApiPropertyOptional({ nullable: true, type: Number })
  discountValue!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  minimumSpend!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  maximumDiscount!: number | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  couponCode!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  expiryDate!: Date | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    description: 'Deterministic C-Vault usefulness score (0–10)',
    example: 9,
  })
  benefitScore!: number | null;

  @ApiProperty({
    description: 'Deterministic relevance score from SearchRanker',
    example: 96,
  })
  score!: number;
}

export class AskResponseDto {
  @ApiProperty({ example: 'Need shoes' })
  query!: string;

  @ApiProperty({ type: AskIntentDto })
  intent!: AskIntentDto;

  @ApiProperty({ example: 4 })
  totalResults!: number;

  @ApiProperty({ type: [AskResultDto] })
  results!: AskResultDto[];

  @ApiPropertyOptional({
    nullable: true,
    enum: ['product', 'category_fallback', 'general'],
    description:
      'How results were matched. category_fallback means no product hits; showing same-category offers.',
    example: 'category_fallback',
  })
  matchType?: 'product' | 'category_fallback' | 'general' | null;

  @ApiPropertyOptional({
    description:
      'Present when empty, or when returning category fallback after no product-specific hits.',
    example:
      'No benefits found specifically for Shoes, but here are similar offers in Fashion.',
  })
  message?: string;
}
