import {
  BadGatewayException,
  HttpException,
  Injectable,
  Logger,
  RequestTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiError, GoogleGenAI } from '@google/genai';
import { ZodError } from 'zod';
import { CouponExtraction } from './dto/coupon-extraction.interface';
import { couponExtractionResponseSchema } from './dto/coupon-extraction.response-schema';
import { couponExtractionSchema } from './dto/coupon-extraction.schema';
import {
  COUPON_EXTRACTION_SYSTEM_INSTRUCTION,
  buildCouponImageExtractionPrompt,
  buildCouponTextExtractionPrompt,
} from './prompts/coupon-extraction.prompt';

const DEFAULT_MODEL = 'gemini-flash-latest';
const DEFAULT_TIMEOUT_MS = 30_000;

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly client: GoogleGenAI;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('gemini.apiKey') ?? '';

    this.client = new GoogleGenAI({ apiKey });
    this.model =
      this.configService.get<string>('gemini.model') ?? DEFAULT_MODEL;
    this.timeoutMs =
      this.configService.get<number>('gemini.timeoutMs') ?? DEFAULT_TIMEOUT_MS;
  }

  async extractCoupon(rawText: string): Promise<CouponExtraction> {
    this.assertConfigured();

    const todayIsoDate = new Date().toISOString().slice(0, 10);
    const outputText = await this.generateStructuredJson({
      contents: buildCouponTextExtractionPrompt(rawText, todayIsoDate),
      systemInstruction: COUPON_EXTRACTION_SYSTEM_INSTRUCTION,
      responseSchema: couponExtractionResponseSchema,
      errorMessage: 'Failed to extract coupon via Gemini',
    });

    return this.parseAndValidateExtraction(outputText);
  }

  /**
   * Low-level structured JSON generation for intent / extraction callers.
   * Callers own Zod validation of the parsed payload.
   */
  async generateStructuredJson(params: {
    contents: unknown;
    systemInstruction: string;
    responseSchema: object;
    errorMessage?: string;
  }): Promise<string> {
    this.assertConfigured();
    return this.generateJsonText(params);
  }

  async extractCouponFromImage(image: Buffer): Promise<CouponExtraction> {
    this.assertConfigured();

    if (!image?.length) {
      throw new BadGatewayException('Image buffer is empty');
    }

    const todayIsoDate = new Date().toISOString().slice(0, 10);
    const mimeType = this.detectImageMimeType(image);

    const outputText = await this.generateJsonText({
      contents: [
        {
          inlineData: {
            mimeType,
            data: image.toString('base64'),
          },
        },
        { text: buildCouponImageExtractionPrompt(todayIsoDate) },
      ],
      systemInstruction: COUPON_EXTRACTION_SYSTEM_INSTRUCTION,
      responseSchema: couponExtractionResponseSchema,
      errorMessage: 'Failed to extract coupon via Gemini',
    });

    return this.parseAndValidateExtraction(outputText);
  }

  async generateExplanation(prompt: string): Promise<string> {
    this.assertConfigured();

    const trimmed = prompt.trim();
    if (!trimmed) {
      throw new BadGatewayException('Explanation prompt is empty');
    }

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: trimmed,
        config: {
          temperature: 0.4,
          abortSignal: AbortSignal.timeout(this.timeoutMs),
        },
      });

      const text = response.text?.trim() ?? '';
      if (!text) {
        throw new BadGatewayException('Gemini returned an empty explanation');
      }

      return text;
    } catch (error) {
      this.rethrowGeminiError(error, 'Failed to generate explanation via Gemini');
    }
  }

  private async generateJsonText(params: {
    contents: unknown;
    systemInstruction: string;
    responseSchema: object;
    errorMessage?: string;
  }): Promise<string> {
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: params.contents as never,
        config: {
          systemInstruction: params.systemInstruction,
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: params.responseSchema,
          abortSignal: AbortSignal.timeout(this.timeoutMs),
        },
      });

      const text = response.text?.trim() ?? '';
      if (!text) {
        throw new BadGatewayException('Gemini returned an empty response');
      }

      return text;
    } catch (error) {
      this.rethrowGeminiError(
        error,
        params.errorMessage ?? 'Failed to generate structured JSON via Gemini',
      );
    }
  }

  private parseAndValidateExtraction(outputText: string): CouponExtraction {
    const jsonPayload = this.extractJsonPayload(outputText);

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonPayload);
    } catch {
      this.logger.warn(
        `Malformed Gemini JSON payload: ${outputText.slice(0, 500)}`,
      );
      throw new BadGatewayException('Gemini returned malformed JSON');
    }

    try {
      return couponExtractionSchema.parse(parsed);
    } catch (error) {
      if (error instanceof ZodError) {
        this.logger.warn(
          `Gemini extraction failed Zod validation: ${error.message}`,
        );
        throw new BadGatewayException(
          'Gemini returned JSON that does not match the extraction schema',
        );
      }

      throw error;
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

  private assertConfigured(): void {
    const apiKey = this.configService.get<string>('gemini.apiKey');
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'GEMINI_API_KEY is not configured',
      );
    }
  }

  private detectImageMimeType(image: Buffer): string {
    if (image.length >= 3 && image[0] === 0xff && image[1] === 0xd8) {
      return 'image/jpeg';
    }

    if (
      image.length >= 8 &&
      image[0] === 0x89 &&
      image[1] === 0x50 &&
      image[2] === 0x4e &&
      image[3] === 0x47
    ) {
      return 'image/png';
    }

    if (
      image.length >= 6 &&
      image[0] === 0x47 &&
      image[1] === 0x49 &&
      image[2] === 0x46
    ) {
      return 'image/gif';
    }

    if (
      image.length >= 12 &&
      image[0] === 0x52 &&
      image[1] === 0x49 &&
      image[2] === 0x46 &&
      image[3] === 0x46
    ) {
      return 'image/webp';
    }

    return 'image/jpeg';
  }

  private rethrowGeminiError(error: unknown, fallbackMessage: string): never {
    if (
      error instanceof BadGatewayException ||
      error instanceof ServiceUnavailableException ||
      error instanceof RequestTimeoutException ||
      error instanceof HttpException
    ) {
      throw error;
    }

    if (this.isTimeoutError(error)) {
      this.logger.error('Gemini request timed out');
      throw new RequestTimeoutException('Gemini request timed out');
    }

    const providerMessage = this.extractProviderMessage(error);

    this.logger.error(
      `${fallbackMessage}: ${providerMessage}`,
      error instanceof Error ? error.stack : String(error),
    );

    if (error instanceof ApiError) {
      if (error.status === 429) {
        throw new HttpException(
          {
            statusCode: 429,
            message: providerMessage || 'Gemini rate limit exceeded',
            error: 'Too Many Requests',
          },
          429,
        );
      }

      if (error.status === 404) {
        throw new BadGatewayException(
          providerMessage ||
            `Gemini model "${this.model}" was not found or is unavailable`,
        );
      }

      if (error.status === 401 || error.status === 403) {
        throw new ServiceUnavailableException(
          providerMessage || 'Gemini authentication failed',
        );
      }
    }

    throw new BadGatewayException(
      providerMessage
        ? `${fallbackMessage}: ${providerMessage}`
        : fallbackMessage,
    );
  }

  private extractProviderMessage(error: unknown): string {
    if (!(error instanceof Error) || !error.message) {
      return '';
    }

    try {
      const parsed = JSON.parse(error.message) as {
        error?: { message?: string };
      };
      if (parsed?.error?.message) {
        return parsed.error.message;
      }
    } catch {
      // message is plain text
    }

    return error.message;
  }

  private isTimeoutError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const maybe = error as { name?: string; code?: string; message?: string };
    return (
      maybe.name === 'TimeoutError' ||
      maybe.name === 'AbortError' ||
      maybe.code === 'ABORT_ERR' ||
      (typeof maybe.message === 'string' &&
        /timeout|aborted/i.test(maybe.message))
    );
  }
}
