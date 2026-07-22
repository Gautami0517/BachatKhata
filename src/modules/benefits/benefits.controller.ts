import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { BenefitsService } from './benefits.service';
import { CouponResponseDto } from './dto/coupon-response.dto';
import { ImportBenefitDto } from './dto/import-benefit.dto';

@ApiTags('benefits')
@Controller('benefits')
export class BenefitsController {
  constructor(private readonly benefitsService: BenefitsService) {}

  @Post('import')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Import a coupon from raw text',
    description:
      'Extracts structured coupon fields via Gemini, validates with Zod, normalizes, and persists to PostgreSQL.',
  })
  @ApiCreatedResponse({ type: CouponResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiUnprocessableEntityResponse({
    description: 'Extracted coupon failed validation',
  })
  @ApiBadGatewayResponse({
    description: 'AI provider returned an unusable response',
  })
  @ApiServiceUnavailableResponse({
    description: 'GEMINI_API_KEY is not configured',
  })
  importBenefit(@Body() dto: ImportBenefitDto): Promise<CouponResponseDto> {
    return this.benefitsService.importBenefit(dto);
  }
}
