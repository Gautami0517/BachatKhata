import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AskBenefitDto {
  @ApiProperty({
    description:
      'Natural-language query about shopping, brands, merchants, categories, or purchases.',
    example: 'Need running shoes under ₹5000',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  query!: string;
}
