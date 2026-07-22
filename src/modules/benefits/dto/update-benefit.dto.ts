import { ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Partial update for a coupon. All fields are optional.
 *
 * Semantics:
 *  - Field absent (undefined): not touched.
 *  - Field null: clears the stored value (where the column is nullable).
 *  - Field provided: replaces the stored value.
 */
export class UpdateBenefitDto {
  @ApiPropertyOptional({
    nullable: true,
    description:
      'Platform/retailer where the benefit is redeemed. Send null to clear.',
    example: 'Myntra',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  merchant?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Product brand being promoted, if any. Send null to clear.',
    example: 'Nike',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  brand?: string | null;

  @ApiPropertyOptional({
    description: 'Short offer / product title.',
    example: 'Flat 38% OFF on Smart Gas Leak Detector',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Category (e.g. Fashion, Travel). Send null to clear.',
    example: 'Fashion',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string | null;

  @ApiPropertyOptional({
    enum: DiscountType,
    enumName: 'DiscountType',
    description: 'Type of discount.',
  })
  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    description:
      'Discount value (percent for PERCENTAGE, amount for FLAT/CASHBACK). Send null to clear.',
    example: 38,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    description:
      'Minimum spend required to use the coupon. Send null to clear.',
    example: 3000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumSpend?: number | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    description: 'Maximum discount cap. Send null to clear.',
    example: 1200,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumDiscount?: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Coupon code. Send null to clear. NEVER fabricated.',
    example: 'RIPPLESAFEG1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  couponCode?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    format: 'date-time',
    description: 'Expiry date (ISO-8601). Send null to mark as "no expiry".',
    example: '2026-08-15T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiryDate?: string | null;
}
