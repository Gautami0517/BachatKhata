import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ImportBenefitDto {
  @ApiProperty({
    description: 'Raw coupon / offer text pasted by the user',
    example: `Flat 38% OFF
Smart Gas Leak Detector
Voucher Code: RIPPLESAFEG1
Expires in 25 days
Valid on purchases above ₹3000
Maximum Discount ₹1200`,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20_000)
  rawText!: string;

  @ApiPropertyOptional({
    description: 'Origin of the coupon text (e.g. brand email, screenshot OCR)',
    example: 'user_paste',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  source?: string;
}
