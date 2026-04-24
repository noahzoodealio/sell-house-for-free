import { parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * Normalizes a phone input to E.164 (e.g. +15125550188). Defaults the
 * region to US when the seller omits a country code — the seller form
 * (E3) only accepts US numbers at submit time, so the same default
 * applies at login. Returns null when the input doesn't parse as a
 * possible number.
 */
export function normalizePhoneE164(input: string): string | null {
  const parsed = parsePhoneNumberFromString(input, "US");
  if (!parsed) return null;
  if (!parsed.isValid()) return null;
  return parsed.number;
}
