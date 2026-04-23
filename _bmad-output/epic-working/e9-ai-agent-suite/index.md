---
slug: e9-ai-agent-suite
ado-epic-id: 7895
ado-url: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7895
ado-work-item-type: Feature
ado-parent-epic: 7776  # Sell Your House Free (AZ) umbrella
mode: mcp
started-at: 2026-04-23T17:35:00Z
architecture: _bmad-output/planning-artifacts/architecture-e9-ai-agent-suite.md
---

# Sidecar — E9 AI Agent Suite (ADO Feature #7895)

## Filing summary

- **Parent Epic:** #7776 (Sell Your House Free (AZ) — umbrella)
- **Work-item type:** Feature (siblings are E1–E8; same taxonomy)
- **Area / Iteration path:** `Offervana_SaaS` / `Offervana_SaaS` (matches E1–E8)
- **Title:** `E9 — AI Agent Suite (Transaction Manager + Comping Agent)`
- **Tags:** `arizona; sell-house-for-free; ai; anthropic; vercel-ai-sdk`
- **Initial state:** New

## Collapsed structure note

Architecture doc internally organizes as three sub-epics (E9 Foundation / E10 Transaction Manager / E11 Comping) but per user direction ("features under 1 parent epic similar to e1 e2 e3 e4 etc") the whole AI suite is filed as **one ADO Feature** with **23 stories across three phases** (A/B/C), mirroring the pattern of E1–E8 each being a single Feature.

If downstream story volume proves unwieldy, the Feature can be split into E9/E10/E11 later without invalidating story numbering — phase boundaries in the description map 1:1 to that possible split.

## Stories queued for creation

Not yet filed. Use `/zoo-core-create-story` with the E9 Feature (#7895) as the parent to create each of the 23 stories listed in the Feature description. The story table in the Feature is the authoritative list — copy titles verbatim to keep grep-ability.

## Next steps (when user asks)

1. `/zoo-core-create-story` per row of the table (23 stories), linking each as child of #7895
2. Apply ordering + dependencies per the Feature's "Critical sequencing" paragraph
3. Optionally kick off E9-S1 via `/zoo-core-dev-story` once stories are filed — S1 (Supabase migrations + bucket) is the only story with no dependencies

## Posture retained (key correction, see feedback memory)

- Sell Your House Free is a **tech platform**, not a brokerage. JK Realty is a third-party service provider.
- AI is a **knowledgeable friend** — opinionated advice on negotiations, contracts, offers. Not hedged.
- Doesn't act on the seller's behalf (no signing, no sending as the seller, no committing).
- Required three-part disclaimer on every artifact: **AI / not a licensed real-estate professional / not a fiduciary**. Enforced at Zod-schema level (required `disclaimer` field on every artifact payload), not prompt-only.
- `OfferAnalysisPayload.friendlyTake` required (product value is in having a take).
