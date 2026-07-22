import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { BenefitsService } from './benefits.service';
import { CouponResponseDto } from './dto/coupon-response.dto';
import { ImportBenefitDto } from './dto/import-benefit.dto';
import { ListBenefitsDto, SortOption } from './dto/list-benefits.dto';

@ApiTags('benefits')
@Controller('benefits')
export class BenefitsController {
  constructor(private readonly benefitsService: BenefitsService) {}

  @Get()
  @ApiOperation({
    summary: 'List coupons with sorting',
    description:
      'Returns coupons sorted by the requested option. Defaults to expiring_soon (unexpired coupons, soonest first).',
  })
  @ApiQuery({
    name: 'sort',
    enum: SortOption,
    enumName: 'SortOption',
    required: false,
    description: 'Sort order. Defaults to expiring_soon.',
  })
  @ApiOkResponse({ type: [CouponResponseDto] })
  listBenefits(@Query() dto: ListBenefitsDto): Promise<CouponResponseDto[]> {
    return this.benefitsService.findAll(dto);
  }

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
