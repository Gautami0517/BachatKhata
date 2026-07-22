import {
  BadRequestException,
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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
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
import { CouponPreviewDto } from './dto/coupon-preview.dto';
import { CouponResponseDto } from './dto/coupon-response.dto';
import { ImportBenefitDto } from './dto/import-benefit.dto';
import { ListBenefitsDto, SortOption } from './dto/list-benefits.dto';
import { SaveExtractedDto } from './dto/save-extracted.dto';
import { Public } from '../auth/decorators/public.decorator';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

@ApiTags('benefits')
@Public()
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

  @Post('extract-image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!file || !ALLOWED_IMAGE_MIME.has(file.mimetype)) {
          return cb(
            new BadRequestException(
              'file must be a JPEG, PNG, GIF or WebP image (at most 5 MB)',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Coupon screenshot (JPEG/PNG/GIF/WebP, at most 5 MB)',
        },
        source: {
          type: 'string',
          description:
            'Optional origin of the screenshot (e.g. gpay, phonepe, myntra).',
        },
      },
      required: ['file'],
    },
  })
  @ApiOperation({
    summary: 'Extract coupon fields from an image (preview, not saved)',
    description:
      'Step 1 of the two-step image import flow. Accepts a coupon ' +
      'screenshot, extracts structured fields via Gemini vision, and ' +
      'returns a preview for the client to review. Nothing is persisted. ' +
      'To save, POST the (optionally edited) result to /benefits/save.',
  })
  @ApiOkResponse({
    type: CouponPreviewDto,
    description: 'Extracted coupon fields (preview).',
  })
  @ApiBadRequestResponse({
    description: 'No image uploaded, unsupported type, or exceeds 5 MB',
  })
  @ApiBadGatewayResponse({
    description: 'AI provider returned an unusable response',
  })
  @ApiServiceUnavailableResponse({
    description: 'GEMINI_API_KEY is not configured',
  })
  extractFromImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('source') source?: string,
  ): Promise<CouponPreviewDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('An image file is required');
    }
    return this.benefitsService.extractFromImage(file.buffer, source);
  }

  @Post('save')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Persist a reviewed extraction (step 2 of image import)',
    description:
      'Persists a coupon from a previously-reviewed extraction (e.g. the ' +
      'preview returned by /benefits/extract-image). No AI call. The client ' +
      'may edit fields before sending. rawText is the required audit trail.',
  })
  @ApiCreatedResponse({ type: CouponResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiUnprocessableEntityResponse({
    description: 'Coupon failed normalization (e.g. missing title)',
  })
  saveExtraction(@Body() dto: SaveExtractedDto): Promise<CouponResponseDto> {
    return this.benefitsService.saveExtraction(dto);
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
