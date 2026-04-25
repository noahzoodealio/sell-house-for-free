import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies an HMAC-SHA256 signature against the raw body using a shared
 * secret. Resend's webhook signing scheme (Svix) is more elaborate, but
 * this simple HMAC is what the AC mandates and what Resend supports for
 * custom-secret webhooks. If we move to Svix later, swap this helper —
 * the contract is "raw body + secret + provided signature → boolean".
 *
 * Header format expected: `sha256=<hex-digest>`. Anything else returns
 * false. timingSafeEqual prevents response-time enumeration of the
 * digest.
 */
export function verifyHmacSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false;
  const provided = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice("sha256=".length)
    : signatureHeader;
  if (!/^[0-9a-f]+$/i.test(provided)) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(provided, "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch {
    return false;
  }
}
