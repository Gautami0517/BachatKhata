import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType } from '@prisma/client';

export class CouponResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  brand!: string | null;

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

  @ApiPropertyOptional({ nullable: true, type: String })
  source!: string | null;

  @ApiProperty()
  rawText!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
