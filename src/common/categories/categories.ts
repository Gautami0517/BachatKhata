/**
 * Closed category taxonomy for BenefitAI.
 * Used by import extraction, Ask intent, dashboard filters, and notifications.
 */
export const CANONICAL_CATEGORIES = [
  'Fashion',
  'Electronics',
  'Food',
  'Groceries',
  'Travel',
  'Home',
  'Health',
  'Beauty',
  'Other',
] as const;

export type CanonicalCategory = (typeof CANONICAL_CATEGORIES)[number];

/**
 * Synonyms / free-text labels → canonical category.
 * Keys must be lowercase.
 */
const SYNONYM_TO_CATEGORY: Record<string, CanonicalCategory> = {
  // Fashion
  fashion: 'Fashion',
  apparel: 'Fashion',
  clothing: 'Fashion',
  clothes: 'Fashion',
  shoes: 'Fashion',
  footwear: 'Fashion',
  eyewear: 'Fashion',
  optics: 'Fashion',
  glasses: 'Fashion',
  spectacles: 'Fashion',
  lenses: 'Fashion',
  'contact lenses': 'Fashion',
  jewellery: 'Fashion',
  jewelry: 'Fashion',
  accessories: 'Fashion',

  // Electronics
  electronics: 'Electronics',
  gadgets: 'Electronics',
  tech: 'Electronics',
  mobile: 'Electronics',
  mobiles: 'Electronics',
  phone: 'Electronics',
  phones: 'Electronics',
  smartphone: 'Electronics',
  laptop: 'Electronics',
  laptops: 'Electronics',
  computer: 'Electronics',
  appliances: 'Electronics',

  // Food
  food: 'Food',
  dining: 'Food',
  dinner: 'Food',
  lunch: 'Food',
  breakfast: 'Food',
  restaurant: 'Food',
  restaurants: 'Food',
  cafe: 'Food',
  café: 'Food',
  'food delivery': 'Food',
  meal: 'Food',
  meals: 'Food',

  // Groceries
  groceries: 'Groceries',
  grocery: 'Groceries',
  supermarket: 'Groceries',
  kirana: 'Groceries',

  // Travel
  travel: 'Travel',
  flight: 'Travel',
  flights: 'Travel',
  hotel: 'Travel',
  hotels: 'Travel',
  trip: 'Travel',
  holiday: 'Travel',
  vacation: 'Travel',
  booking: 'Travel',

  // Home
  home: 'Home',
  'home appliances': 'Home',
  'home safety': 'Home',
  furniture: 'Home',
  kitchen: 'Home',
  decor: 'Home',
  décor: 'Home',

  // Health
  health: 'Health',
  fitness: 'Health',
  pharmacy: 'Health',
  medicine: 'Health',
  medical: 'Health',
  wellness: 'Health',

  // Beauty
  beauty: 'Beauty',
  makeup: 'Beauty',
  skincare: 'Beauty',
  cosmetics: 'Beauty',
  salon: 'Beauty',

  // Other
  other: 'Other',
  misc: 'Other',
  miscellaneous: 'Other',
  general: 'Other',
};

/** High-confidence merchant → category hints (used when Gemini category is weak/missing). */
const MERCHANT_CATEGORY_HINTS: Record<string, CanonicalCategory> = {
  lenskart: 'Fashion',
  myntra: 'Fashion',
  ajio: 'Fashion',
  nykaa: 'Beauty',
  zomato: 'Food',
  swiggy: 'Food',
  'swiggy instamart': 'Groceries',
  blinkit: 'Groceries',
  zepto: 'Groceries',
  bigbasket: 'Groceries',
  makemytrip: 'Travel',
  goibibo: 'Travel',
  booking: 'Travel',
  croma: 'Electronics',
  'reliance digital': 'Electronics',
  flipkart: 'Electronics',
  amazon: 'Other',
};

/**
 * Map any free-text category (or synonym phrase) to a canonical category.
 * Unknown values become Other (never leave free-form labels in the DB).
 */
export function normalizeCategory(
  value: string | null | undefined,
): CanonicalCategory | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const lower = collapseWhitespace(trimmed).toLowerCase();

  for (const canonical of CANONICAL_CATEGORIES) {
    if (canonical.toLowerCase() === lower) {
      return canonical;
    }
  }

  if (SYNONYM_TO_CATEGORY[lower]) {
    return SYNONYM_TO_CATEGORY[lower];
  }

  // Prefer longer synonym keys first (e.g. "contact lenses" before "lenses")
  const synonyms = Object.keys(SYNONYM_TO_CATEGORY).sort(
    (a, b) => b.length - a.length,
  );
  for (const synonym of synonyms) {
    if (lower.includes(synonym)) {
      return SYNONYM_TO_CATEGORY[synonym];
    }
  }

  return 'Other';
}

/**
 * Resolve category from extraction + optional merchant hint.
 */
export function resolveCategory(input: {
  category?: string | null;
  merchant?: string | null;
  brand?: string | null;
  title?: string | null;
}): CanonicalCategory | null {
  const fromCategory = normalizeCategory(input.category);
  if (fromCategory && fromCategory !== 'Other') {
    return fromCategory;
  }

  const merchantHint = hintFromName(input.merchant);
  if (merchantHint) {
    return merchantHint;
  }

  const fromTitle = normalizeCategory(input.title);
  if (fromTitle && fromTitle !== 'Other') {
    return fromTitle;
  }

  const fromBrand = normalizeCategory(input.brand);
  if (fromBrand && fromBrand !== 'Other') {
    return fromBrand;
  }

  return fromCategory; // may be Other or null
}

/**
 * Map Ask/user query fragments (e.g. "restaurants", "dinner") into a category.
 */
export function categoryFromQueryText(
  text: string | null | undefined,
): CanonicalCategory | null {
  if (!text?.trim()) {
    return null;
  }

  return normalizeCategory(text);
}

export function isCanonicalCategory(value: string): value is CanonicalCategory {
  return (CANONICAL_CATEGORIES as readonly string[]).includes(value);
}

function hintFromName(name: string | null | undefined): CanonicalCategory | null {
  if (!name?.trim()) {
    return null;
  }

  const lower = collapseWhitespace(name).toLowerCase();
  if (MERCHANT_CATEGORY_HINTS[lower]) {
    return MERCHANT_CATEGORY_HINTS[lower];
  }

  for (const [merchant, category] of Object.entries(MERCHANT_CATEGORY_HINTS)) {
    if (lower.includes(merchant)) {
      return category;
    }
  }

  return null;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
