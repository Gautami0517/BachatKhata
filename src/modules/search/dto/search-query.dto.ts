import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SearchQueryDto {
  @ApiProperty({
    description:
      'Search query — matched against brand, title, category, and couponCode (case-insensitive substring).',
    example: 'myntra',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  q!: string;
}
