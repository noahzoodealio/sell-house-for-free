# E2-S1 (7797) completion notes

**Closed out:** 2026-04-20 · **Duration:** ~40 min · **Outcome:** ready for code review, all 15 ACs satisfied.

## Landed on `feature/e2-core-marketing-pages-7778`

```
9201488  e2-s1(7797): remove mdx-smoke after MDX pipeline validation
da7bf76  e2-s1(7797): add mdx-smoke route to validate MDX pipeline end-to-end
b7b8d55  e2-s1(7797): add mdx-components.tsx + .prose-custom + surface-muted token
fd2b436  e2-s1(7797): wire @next/mdx into build (deps + next.config)
```

## Net change

- **New runtime deps:** `@next/mdx`, `@mdx-js/loader`, `@mdx-js/react`, `@types/mdx` (~111 transitive pkgs).
- **New dev dep:** `schema-dts` (types-only; consumed by E2-S5).
- **New file:** `src/mdx-components.tsx` (161 lines).
- **Edited:** `next.config.ts` (stub → 11 lines with MDX wrapping); `src/app/globals.css` (adds `--color-surface-muted` token + 30-line `.prose-custom` layer).
- **No new components under `src/components/*`** — infrastructure only.
- **No new routes** in final state — smoke route added + removed.

## Deviations from AC text (both documented in review-report.md)

1. Smoke route path `mdx-smoke` instead of `__mdx-smoke` — Next 16 `_`-prefixed folders are private and opt out of routing.
2. `.prose-custom` uses `rem` literals instead of `--space-*` tokens — E1 never shipped that token scale.

Neither deviation changes behavior; both preserve AC intent.

## Follow-ups surfaced

- **Token pass for spacing scale.** If the team later wants `--space-*` tokens (arch §6 budget mentions them), the `.prose-custom` block can mechanically swap `1rem/1.5rem/2rem/2.5rem` for tokens without reshaping rules.
- **External-link aria-label fidelity.** `flattenChildrenToText` returns `"link"` for non-string children. Good enough for marketing copy but revisit if an MDX route ships rich children inside `<a>`.

## No memory candidates

E1 already captured the private-folder rule by proxy (route groups don't affect URLs is documented); nothing here surprised me that wasn't code-visible. MDX file-convention path + Turbopack string-plugin constraint are both documented in `node_modules/next/dist/docs/` — training-data-proof is the docs directory, not memory.

## Next in epic autopilot

S5 (7801) — JSON-LD helpers. Consumes `schema-dts` installed here. No further MDX plumbing needed.
