import "server-only";

import { createHmac, randomUUID } from "node:crypto";

// Mirrors Zoodealio.MLS.Application/JwtToken/JwtTokenService.cs. The MLS API
// validates iss/aud/exp/sig with zero clock skew, HS256 over the ASCII bytes
// of Jwt:SecretKey. No HTTP endpoint mints tokens — callers must sign their
// own with the shared secret.
const ISSUER = "zoodealio-mls-api";
const AUDIENCE = "zoodealio-mls-clients";
const CUSTOMER_ID = "sell-house-for-free";
const TOKEN_TTL_SECONDS = 60 * 60; // 1h — refresh well under MLS's 1-day prod lifetime
const REFRESH_SKEW_SECONDS = 60; // re-mint a minute before expiry

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

type CachedToken = { token: string; expiresAt: number };
let cache: CachedToken | null = null;

function mint(secret: string): CachedToken {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + TOKEN_TTL_SECONDS;

  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    // ClaimTypes.NameIdentifier is serialized as this URI by default.
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier":
      CUSTOMER_ID,
    sub: CUSTOMER_ID,
    jti: randomUUID(),
    iss: ISSUER,
    aud: AUDIENCE,
    exp,
    iat: now,
    nbf: now,
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(payload),
  )}`;
  const sig = createHmac("sha256", Buffer.from(secret, "ascii"))
    .update(signingInput)
    .digest();
  const token = `${signingInput}.${base64url(sig)}`;

  return { token, expiresAt: exp };
}

export function getMlsBearerToken(): string | null {
  // Static override takes precedence — lets an operator paste a long-lived
  // token for debugging without standing up the secret.
  const fixed = process.env.MLS_API_TOKEN;
  if (fixed && fixed.length > 0) return fixed;

  const secret = process.env.MLS_JWT_SECRET;
  if (!secret || secret.length === 0) return null;

  const now = Math.floor(Date.now() / 1000);
  if (cache && cache.expiresAt - REFRESH_SKEW_SECONDS > now) {
    return cache.token;
  }

  cache = mint(secret);
  return cache.token;
}
