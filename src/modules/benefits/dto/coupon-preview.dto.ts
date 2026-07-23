import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Preview of a coupon extracted from an image (step 1 of the two-step
 * image import flow). Nothing is persisted yet — the client reviews this
 * and POSTs it (optionally edited) to `POST /benefits/save`.
 *
 * Mirrors `CouponExtraction` plus an auto-generated `rawText` audit string.
 */
export class CouponPreviewDto {
  @ApiPropertyOptional({ nullable: true, type: String, example: 'Myntra' })
  merchant!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: 'Nike' })
  brand!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    example: 'Flat 38% OFF',
  })
  title!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: 'Fashion' })
  category!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: 'PERCENTAGE' })
  discountType!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Number, example: 38 })
  discountValue!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number, example: 3000 })
  minimumSpend!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number, example: 1200 })
  maximumDiscount!: number | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    example: 'RIPPLESAFEG1',
  })
  couponCode!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    format: 'date-time',
    example: '2026-08-15T23:59:59.000Z',
  })
  expiryDate!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: 'gpay' })
  source!: string | null;

  @ApiProperty({
    description:
      'Auto-generated audit string for image imports. Echo this back to /benefits/save unchanged.',
    example: '[Image import via gpay at 2026-07-22T18:30:00.000Z]',
  })
  rawText!: string;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    description:
      'Preview C-Vault score (0–10). Recalculated on save; not persisted until POST /benefits/save.',
    example: 9,
  })
  benefitScore?: number | null;
}
