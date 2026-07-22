import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SearchQueryDto {
  @ApiProperty({
    description:
      'Search query — matched against merchant, brand, title, and rawText (case-insensitive substring).',
    example: 'myn',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  q!: string;
}
