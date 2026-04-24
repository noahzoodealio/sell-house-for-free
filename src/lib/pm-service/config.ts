import "server-only";

function parseIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const RPC_TIMEOUT_MS = parseIntEnv("PM_ASSIGN_TIMEOUT_MS", 5000);

export const CONTACT_WINDOW_HOURS = parseIntEnv(
  "EMAIL_CONTACT_WINDOW_HOURS",
  24,
);

export const EMAIL_TIMEOUT_MS = 3000;
export const EMAIL_MAX_ATTEMPTS = 3;
