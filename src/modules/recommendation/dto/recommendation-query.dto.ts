import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RecommendationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;
}
