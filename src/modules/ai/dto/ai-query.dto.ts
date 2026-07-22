import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AiQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  prompt?: string;
}
