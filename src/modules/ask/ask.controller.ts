import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AskService } from './ask.service';
import { AskBenefitDto } from './dto/ask-benefit.dto';
import { AskResponseDto } from './dto/ask-response.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('benefits')
@Public()
@Controller('benefits')
export class AskController {
  constructor(private readonly askService: AskService) {}

  @Post('ask')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ask BenefitAI',
    description:
      'AI-powered search assistant (not a chatbot). Gemini extracts structured intent only; ' +
      'searching, filtering, and ranking are deterministic on the backend. Always returns HTTP 200.',
  })
  @ApiOkResponse({ type: AskResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiBadGatewayResponse({
    description: 'Gemini returned unusable intent JSON',
  })
  @ApiServiceUnavailableResponse({
    description: 'GEMINI_API_KEY is not configured',
  })
  ask(@Body() dto: AskBenefitDto): Promise<AskResponseDto> {
    return this.askService.ask(dto);
  }
}
