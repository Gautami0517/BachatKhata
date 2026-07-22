import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
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
    summary: 'List coupons with sorting and optional category filter',
    description:
      'Returns coupons sorted by the requested option. Defaults to expiring_soon (unexpired coupons, soonest first). ' +
      'Optionally filter by category (case-insensitive exact match).',
  })
  @ApiQuery({
    name: 'sort',
    enum: SortOption,
    enumName: 'SortOption',
    required: false,
    description: 'Sort order. Defaults to expiring_soon.',
  })
  @ApiQuery({
    name: 'category',
    type: String,
    required: false,
    description: 'Case-insensitive category filter.',
  })
  @ApiOkResponse({ type: [CouponResponseDto] })
  listBenefits(@Query() dto: ListBenefitsDto): Promise<CouponResponseDto[]> {
    return this.benefitsService.findAll(dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Fetch a single coupon by id',
    description: 'Returns the full coupon record for tap-to-detail views.',
  })
  @ApiOkResponse({ type: CouponResponseDto })
  @ApiBadRequestResponse({ description: 'id is not a valid UUID' })
  @ApiNotFoundResponse({ description: 'No coupon exists for the given id' })
  getBenefit(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<CouponResponseDto> {
    return this.benefitsService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a coupon',
    description:
      'Permanently remove a coupon the user no longer wants (e.g. mistakenly imported).',
  })
  @ApiNoContentResponse({ description: 'Coupon deleted successfully' })
  @ApiBadRequestResponse({ description: 'id is not a valid UUID' })
  @ApiNotFoundResponse({ description: 'No coupon exists for the given id' })
  removeBenefit(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.benefitsService.remove(id);
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
