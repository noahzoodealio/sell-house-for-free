---
name: zoo-core-attom-reference
description: Provides inline ATTOM Data API context to parent workflows when they touch ATTOM-integrated code. Invoked as a subprocess by parent workflows; not user-facing.
---

# Zoo-Core ATTOM Reference

## Overview

Subprocess workflow — **not user-facing**, no slash command, no menu. Parent workflows (like `zoo-core-dev-story`, `zoo-core-dev-bug`, `zoo-core-create-architecture`) invoke this as a subroutine when they detect that the code or feature being worked on touches ATTOM Data API integrations (property data, AVMs, comps, valuations).

Fetches live ATTOM docs, cross-references against Zoodealio's internal ATTOM service wrappers, and returns inline context the parent can use to stay accurate. Returns nothing to disk; output is purely inline to the caller.

Act as a focused domain expert on ATTOM integrations — resolve the question, return, don't linger.

## On Activation

Load config from `{project-root}/_bmad/config.yaml` if available.

**Preflight:** invoke `zoo-core-onboard` (auto-trigger — handles pending installs + first-time setup silently).

No greeting, no menu — this is a subprocess. Take the parent's context and start.

## Inputs

Passed by the parent workflow:

- **Parent context** — what file/feature/endpoint is being worked on that touches ATTOM
- **Specific question** (optional) — e.g., "what's the request shape for the AVM endpoint," "does this service wrap the ATTOM comps API"

## Outputs

Inline context returned to the parent:

- **Relevant ATTOM API surface** — endpoints, request/response shapes, auth, rate limits
- **Internal service wrappers** — which Zoodealio services wrap which ATTOM endpoints, with source file citations
- **Known gotchas** — from `curated/patterns.md` or internal mapping docs: response variability, auth quirks, rate-limit surprises, retry patterns

No file writes. Everything returned to the caller as structured text.

## Implementation

1. Parse the parent's context to identify which ATTOM surfaces are relevant (AVM, comps, rental estimate, sale history, etc.)
2. Fetch live ATTOM docs via WebFetch from the official ATTOM developer portal (https://api.developer.attomdata.com/docs — confirm URL if it has changed)
3. Cross-reference internal wrappers by searching `{project-root}/_bmad/memory/zoo-core/services/*/integrations.md` (if present) and `architecture.md` files for ATTOM mentions + the wrapper class names (commonly `IAttomService`, `AttomClient`, etc.)
4. Consult `{project-root}/_bmad/memory/zoo-core/curated/patterns.md` for any distilled ATTOM lessons
5. Synthesize inline context and return to parent

**Graceful fallback.** If WebFetch fails (network issue, site changed), return a note to the parent ("ATTOM live docs unavailable right now") plus whatever internal-wrapper context is available from shared memory. The parent workflow continues, possibly with a flag noting reduced confidence.

**Never over-fetch.** Only pull the ATTOM sections the parent's context implicates. Agents don't need the whole ATTOM catalog — they need the specific surface their task touches.

## Related Skills

- Called by parent workflows only — `zoo-core-dev-story`, `zoo-core-dev-bug`, `zoo-core-create-architecture` when they detect ATTOM-touching code
- Not called by users directly; no command file is registered for this skill
