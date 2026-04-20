import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Tracking-SDK guard — see docs/analytics-policy.md.
// Warn (not error) so CI surfaces the nudge without blocking; policy doc is the final arbiter.
const trackingSdkGuard = {
  rules: {
    "no-restricted-imports": [
      "warn",
      {
        patterns: [
          {
            group: [
              "react-ga4",
              "hotjar",
              "@segment/analytics-next",
              "@segment/analytics-node",
              "react-intercom",
              "mixpanel-browser",
              "posthog-js",
              "@hubspot/*",
              "@fullstory/*",
              "logrocket",
              "@amplitude/*",
              "react-facebook-pixel",
              "react-gtm-module",
              "@microsoft/clarity",
            ],
            message:
              "Third-party tracking SDKs require an ADR — see docs/analytics-policy.md.",
          },
        ],
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  trackingSdkGuard,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
