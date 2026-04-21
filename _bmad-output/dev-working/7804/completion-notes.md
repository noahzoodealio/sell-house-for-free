# E2-S8 (7804) — Completion Notes

**Commits on `feature/e2-core-marketing-pages-7778`:**
- `2c62cd8` — e2-s8(7804): extract placeholder trust claims (shared by home + pillars)
- `d16e9c1` — e2-s8(7804): four pillar pages

**AC outcome:** 18/21 green. ACs #16 (Lighthouse), #17 (responsive screenshots) deferred to S11 QA sweep consistent with every prior E2 close-out. AC #20 (legal sign-off on pillar copy) queued for the Feature-level PR body. ACs #18 (split option) and #21 (Offer subtype) are n/a.

**Surprises / deviations:** none. The four pages parallel cleanly in structure; the copy differences land in `PILLAR_STEPS`, the hero heading, and the prose body — which is exactly the design intent of not generalizing them behind a single `<Pillar>` component.

**Follow-ups for downstream stories:**
- S7 (secondary prose routes `/how-it-works`, `/why-its-free`, `/about`) can reuse the same shared `PLACEHOLDER_HOME_TRUST_CLAIMS` if any of those pages surfaces the trust bar.
- S11 cleanup: `placeholder-claims.tsx` deletion + 5-file import redirect to `src/content/anti-broker/claims.ts`. Now a single-file surgical change instead of 5 inline swaps.
- Feature PR description must flag: "Pillar copy — especially commission language and broker attribution — needs JK Realty / legal eyes before merge or immediately post-merge" per AC #19.
