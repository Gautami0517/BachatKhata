import { Type } from '@google/genai';

/**
 * Gemini responseSchema for ask-intent extraction.
 */
export const askIntentResponseSchema = {
  type: Type.OBJECT,
  properties: {
    merchant: { type: Type.STRING, nullable: true },
    brand: { type: Type.STRING, nullable: true },
    category: { type: Type.STRING, nullable: true },
    product: { type: Type.STRING, nullable: true },
    expectedSpend: { type: Type.NUMBER, nullable: true },
    sortPreference: {
      type: Type.STRING,
      nullable: true,
      enum: ['BEST_MATCH', 'HIGHEST_DISCOUNT', 'EXPIRING_SOON', null],
    },
  },
  required: [
    'merchant',
    'brand',
    'category',
    'product',
    'expectedSpend',
    'sortPreference',
  ],
};
