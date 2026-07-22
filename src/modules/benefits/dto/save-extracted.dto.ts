import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Body for `POST /benefits/save` — the second step of the two-step image
 * import flow. The client sends back the (optionally edited) extraction
 * produced by `POST /benefits/extract-image`. No AI call happens here.
 *
 * Field names mirror `CouponExtraction` so the existing normalizer can be
 * reused. `rawText` is required (the NOT NULL audit trail).
 */
export class SaveExtractedDto {
  @ApiPropertyOptional({ nullable: true, type: String, example: 'Myntra' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  merchant?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: 'Nike' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  brand?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    example: 'Flat 38% OFF',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: 'Fashion' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    description: 'PERCENTAGE | FLAT | CASHBACK | FREEBIE | OTHER',
    example: 'PERCENTAGE',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  discountType?: string | null;

  @ApiPropertyOptional({ nullable: true, type: Number, example: 38 })
  @IsOptional()
  @IsNumber()
  discountValue?: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number, example: 3000 })
  @IsOptional()
  @IsNumber()
  minimumSpend?: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number, example: 1200 })
  @IsOptional()
  @IsNumber()
  maximumDiscount?: number | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    example: 'RIPPLESAFEG1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  couponCode?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    format: 'date-time',
    example: '2026-08-15T23:59:59.000Z',
  })
  @IsOptional()
  @IsString()
  expiryDate?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: 'gpay' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  source?: string | null;

  @ApiProperty({
    description:
      'Audit trail. For image imports, echo the `rawText` returned by /benefits/extract-image. For manual saves, provide any descriptive text.',
    example: '[Image import via gpay at 2026-07-22T18:30:00.000Z]',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20_000)
  rawText!: string;
}
