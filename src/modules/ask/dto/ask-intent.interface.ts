export const SORT_PREFERENCES = [
  'BEST_MATCH',
  'HIGHEST_DISCOUNT',
  'EXPIRING_SOON',
] as const;

export type SortPreference = (typeof SORT_PREFERENCES)[number];

/**
 * Structured search intent extracted by Gemini.
 * Gemini must never search, recommend, or rank — only fill this shape.
 */
export interface AskIntent {
  merchant: string | null;
  brand: string | null;
  category: string | null;
  product: string | null;
  expectedSpend: number | null;
  sortPreference: SortPreference | null;
}
