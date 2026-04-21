const raw = process.env.NEXT_PUBLIC_SITE_URL;

if (!raw) {
  throw new Error(
    "Missing NEXT_PUBLIC_SITE_URL, set it in .vercel/.env.development.local or the Vercel env UI.",
  );
}

try {
  new URL(raw);
} catch {
  throw new Error(`Invalid NEXT_PUBLIC_SITE_URL: ${raw}`);
}

export const SITE = {
  name: "Sell Your House Free",
  shortName: "SYHF",
  url: raw.replace(/\/$/, ""),
  description:
    "Sell your Arizona home for free, no agent, no listing fees.",
  locale: "en_US",
  region: "AZ",
  broker: {
    name: "JK Realty",
    // TODO(E7): confirm AZ license number with JK Realty
    licenseNumber: "LC-TBD",
    stateOfRecord: "AZ",
  },
} as const;
