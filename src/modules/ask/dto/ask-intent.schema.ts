import { z } from 'zod';
import { AskIntent, SORT_PREFERENCES } from './ask-intent.interface';

const nullableTrimmedString = z
  .union([z.string(), z.null()])
  .transform((value) => {
    if (value === null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const nullableNonNegativeNumber = z
  .union([z.number(), z.null()])
  .refine(
    (value) => value === null || (Number.isFinite(value) && value >= 0),
    { message: 'Must be a non-negative finite number or null' },
  );

const nullableSortPreference = z
  .union([z.enum(SORT_PREFERENCES), z.null()])
  .catch(null);

/**
 * Zod schema for Gemini ask-intent JSON (pre-normalization).
 */
export const askIntentSchema: z.ZodType<AskIntent> = z.object({
  merchant: nullableTrimmedString,
  brand: nullableTrimmedString,
  category: nullableTrimmedString,
  product: nullableTrimmedString,
  expectedSpend: nullableNonNegativeNumber,
  sortPreference: nullableSortPreference,
});
