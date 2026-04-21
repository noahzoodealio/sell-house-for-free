---
work-item-id: 7797
work-item-type: story
code: E2-S1
parent-feature: 7778
parent-epic: 7776
repo: sell-house-for-free
branch: feature/e2-core-marketing-pages-7778
branch-mode: shared-epic-branch
commit-prefix: "e2-s1(7797):"
file-groups:
  - name: Group A — deps + config (package.json, next.config.ts)
    files: [package.json, package-lock.json, next.config.ts]
  - name: Group B — mdx-components + tokens
    files: [src/mdx-components.tsx, src/app/globals.css]
  - name: Group C — smoke test (temporary)
    files: [src/app/(marketing)/__mdx-smoke/page.mdx]
    note: deleted before story close-out per AC #12
last-completed-step: 1
last-completed-file-group: null
started-at: 2026-04-20T20:23:00Z
ado-state: In Development
---

# E2-S1 — MDX infrastructure sidecar

Feature 7778 / Story 7797. Scope: wire `@next/mdx` + required `src/mdx-components.tsx` + `.prose-custom` block. No route content. No components under `src/components/*` (those are S2/S3).

Shared-branch context: `feature/e2-core-marketing-pages-7778` is the single epic branch; commits scoped to this story use prefix `e2-s1(7797): …`. PR deferred to S11 close-out.
