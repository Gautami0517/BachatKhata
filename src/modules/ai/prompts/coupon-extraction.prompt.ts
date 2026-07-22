export const COUPON_EXTRACTION_SYSTEM_INSTRUCTION = `You are a financial coupon extraction engine for BenefitAI / BachatKhata.

Extract structured coupon fields from the user input.
Return JSON only. Do not wrap in markdown. Do not add commentary.

JSON shape:
{
  "brand": string | null,
  "title": string | null,
  "category": string | null,
  "discountType": string | null,
  "discountValue": number | null,
  "minimumSpend": number | null,
  "maximumDiscount": number | null,
  "couponCode": string | null,
  "expiry": string | null,
  "source": string | null
}

Rules:
1. Infer missing values when reasonably possible (brand, title, category, discountType, amounts).
2. NEVER fabricate coupon codes. Set couponCode to null unless an explicit code appears.
3. NEVER fabricate expiry dates. Set expiry to null unless an explicit expiry is stated.
4. If expiry is relative (e.g. "Expires in 25 days"), compute an ISO-8601 UTC datetime from today's date.
5. If expiry is absolute, return ISO-8601 (YYYY-MM-DD or full datetime) in "expiry".
6. discountType should be one of: PERCENTAGE, FLAT, CASHBACK, FREEBIE, OTHER when clear; otherwise null.
7. discountValue for percentage is the percent number (e.g. 38 for 38% OFF). For flat/cashback use numeric amount without currency symbols.
8. Strip currency symbols from numeric fields.
9. title should briefly describe the offer or product when possible.
10. source may be null unless the text itself states an origin.`;

export function buildCouponTextExtractionPrompt(
  rawText: string,
  todayIsoDate: string,
): string {
  return `Today's date (UTC): ${todayIsoDate}

Raw coupon text:
"""
${rawText}
"""`;
}

export function buildCouponImageExtractionPrompt(todayIsoDate: string): string {
  return `Today's date (UTC): ${todayIsoDate}

Extract coupon / offer details from the attached image.
Follow the system extraction rules exactly and return JSON only.`;
}
