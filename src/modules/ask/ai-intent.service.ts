import {
  BadGatewayException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { GeminiService } from '../ai/gemini.service';
import { normalizeProperName } from '../benefits/normalizers/coupon.normalizer';
import { AskIntent } from './dto/ask-intent.interface';
import { askIntentResponseSchema } from './dto/ask-intent.response-schema';
import { askIntentSchema } from './dto/ask-intent.schema';
import {
  ASK_INTENT_SYSTEM_INSTRUCTION,
  buildAskIntentPrompt,
} from './prompts/ask-intent.prompt';

/**
 * Converts natural-language queries into structured search intent via Gemini.
 * Does NOT search, recommend, rank, or calculate savings.
 */
@Injectable()
export class AIIntentService {
  private readonly logger = new Logger(AIIntentService.name);

  constructor(private readonly geminiService: GeminiService) {}

  async extractIntent(query: string): Promise<AskIntent> {
    const outputText = await this.geminiService.generateStructuredJson({
      contents: buildAskIntentPrompt(query),
      systemInstruction: ASK_INTENT_SYSTEM_INSTRUCTION,
      responseSchema: askIntentResponseSchema,
      errorMessage: 'Failed to extract ask intent via Gemini',
    });

    const parsed = this.parseJson(outputText);

    try {
      const intent = askIntentSchema.parse(parsed);
      return this.normalizeIntent(intent);
    } catch (error) {
      if (error instanceof ZodError) {
        this.logger.warn(
          `Ask intent failed Zod validation: ${error.message}`,
        );
        throw new BadGatewayException(
          'Gemini returned JSON that does not match the ask-intent schema',
        );
      }

      throw error;
    }
  }

  private normalizeIntent(intent: AskIntent): AskIntent {
    return {
      merchant: normalizeProperName(intent.merchant),
      brand: normalizeProperName(intent.brand),
      category: normalizeProperName(intent.category),
      product: normalizeProperName(intent.product),
      expectedSpend: intent.expectedSpend,
      sortPreference: intent.sortPreference ?? 'BEST_MATCH',
    };
  }

  private parseJson(outputText: string): unknown {
    const jsonPayload = this.extractJsonPayload(outputText);

    try {
      return JSON.parse(jsonPayload);
    } catch {
      this.logger.warn(
        `Malformed Gemini ask-intent JSON: ${outputText.slice(0, 500)}`,
      );
      throw new BadGatewayException('Gemini returned malformed intent JSON');
    }
  }

  private extractJsonPayload(outputText: string): string {
    const fencedMatch = outputText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
      return fencedMatch[1].trim();
    }

    const objectStart = outputText.indexOf('{');
    const objectEnd = outputText.lastIndexOf('}');

    if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
      return outputText.slice(objectStart, objectEnd + 1);
    }

    return outputText;
  }
}
