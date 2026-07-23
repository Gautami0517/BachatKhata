import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Optional search for merchant/brand filter option lists. */
export class FilterOptionsQueryDto {
  @ApiPropertyOptional({
    type: String,
    description: 'Case-insensitive substring match. Omit to return all.',
    example: 'ama',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;
}

export class MerchantsResponseDto {
  @ApiProperty({
    type: [String],
    example: ['Amazon', 'Flipkart', 'Myntra'],
  })
  merchants!: string[];
}

export class BrandsResponseDto {
  @ApiProperty({
    type: [String],
    example: ['Nike', 'Samsung', 'Apple'],
  })
  brands!: string[];
}

export class CategoriesResponseDto {
  @ApiProperty({
    type: [String],
    example: ['Fashion', 'Food', 'Electronics'],
  })
  categories!: string[];
}
