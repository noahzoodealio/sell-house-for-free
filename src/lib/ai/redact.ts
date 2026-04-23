import "server-only";

/**
 * PII redactor for log lines and JSON payloads. Three regex pipelines —
 * address → phone → email — in that order so the address's leading number
 * token is consumed before the phone regex sees it (story AC #14).
 *
 * Heuristic, not a gazetteer. The false-positive fixtures are the contract.
 */

const STREET_SUFFIXES = [
  "St",
  "Street",
  "Ave",
  "Avenue",
  "Blvd",
  "Boulevard",
  "Rd",
  "Road",
  "Dr",
  "Drive",
  "Ln",
  "Lane",
  "Way",
  "Pl",
  "Place",
  "Ct",
  "Court",
  "Pkwy",
  "Parkway",
];

const STREET_SUFFIX_GROUP = STREET_SUFFIXES.join("|");

// <digits> [optional NSEW direction] [1-4 word tokens] <suffix>
const ADDRESS_RE = new RegExp(
  String.raw`\b\d{1,6}\s+(?:[NSEW]\.?\s+)?(?:[A-Za-z0-9][A-Za-z0-9']*\s+){1,4}(?:${STREET_SUFFIX_GROUP})\b`,
  "gi",
);

const PHONE_PATTERNS: RegExp[] = [
  // International prefix, +1 or +44 style, then 10-ish more digits with optional separators
  /\+\d{1,2}[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/g,
  // (xxx) xxx-xxxx — parens are non-word chars; don't require a word-boundary before "("
  /(?<!\d)\(\d{3}\)[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/g,
  // xxx-xxx-xxxx / xxx.xxx.xxxx / xxx xxx xxxx — explicit separator required
  /(?<!\d)\d{3}[\s.-]\d{3}[\s.-]\d{4}(?!\d)/g,
  // Raw 10-digit run, not adjacent to more digits (rules out 11-digit bare runs
  // and longer numeric strings).
  /(?<!\d)\d{10}(?!\d)/g,
];

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

export function redact(input: string): string {
  if (typeof input !== "string" || input.length === 0) return input;

  let out = input.replace(ADDRESS_RE, "[redacted-address]");
  for (const re of PHONE_PATTERNS) {
    out = out.replace(re, "[redacted-phone]");
  }
  out = out.replace(EMAIL_RE, "[redacted-email]");
  return out;
}

export const redactLog = redact;

export function redactObject<T>(value: T): T {
  if (value == null) return value;
  if (typeof value === "string") return redact(value) as unknown as T;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((item) => redactObject(item)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = redactObject(v);
  }
  return out as unknown as T;
}
