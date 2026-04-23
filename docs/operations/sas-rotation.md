# MLS photo SAS rotation runbook

**Expiry:** 2027-02-11. **Reminder filed:** 2027-01-15.

Listing photos surfaced by `<EnrichmentConfirm>` are served from the
Zoodealio MLS Azure Blob account (`zoodealiomls.blob.core.windows.net`).
URLs carry a shared-access-signature (SAS) token with a fixed expiry. When
the SAS expires, every photo returns **HTTP 403** and the confirm strip
silently disappears — users see no error; the funnel continues, but the
"is this your home?" trust signal is gone.

This runbook is the single source of truth for rotating the SAS without
that outage.

## Ownership

- **MLS side (token issuance):** `Zoodealio.MLS` service owner. SAS is
  generated in the MLS service and embedded into listing-image URLs at
  fetch time. Rotation means restarting / redeploying the MLS service
  with the new token configured.
- **Consumer side (this repo):** no code changes are required. The SAS
  is embedded in the URL we receive; we re-fetch fresh URLs on every
  cache miss (24h TTL).
- **Calendar owner:** whoever is on the E4 epic at the time (or the
  operations rotation if E4 is retired). Don't rely on a named person.

## Calendar reminder

A GitHub issue with milestone `2027-01-15` must exist and be referenced
from this doc. If the link below 404s, file a new issue and update this
section immediately.

> **TODO for the person shipping E4-S10:** open an issue titled
> "MLS SAS rotation reminder — expires 2027-02-11" on
> `noahzoodealio/sell-house-for-free`, tag the milestone `2027-01-15`,
> paste this runbook's URL in the body, and paste the issue URL here.
>
> Placeholder: `https://github.com/noahzoodealio/sell-house-for-free/issues/TBD`

Team-calendar alternative (if GitHub milestones aren't in use): a Google
Calendar event on 2027-01-15 with this runbook linked. One of the two
must exist.

## Rotation procedure

Run this on **2027-01-15** (four weeks of cushion before expiry).

1. **Confirm MLS team has rotated server-side.** Ping the MLS service
   owner in the team channel. Ask for a sample listing URL from the
   post-rotation state.
2. **Pull a new SAS-bearing URL.** Hit a known-listed Arizona address
   via `/api/enrich` in staging with the new MLS env vars pointed at
   the rotated service. Inspect the `photos[0].url` in the response —
   the `sig=` query param should differ from prod's current value.
3. **Decode through `next/image` in staging.** Visit
   `/get-started?address=…` for the listed address. The confirm strip
   must render 3 thumbnails without 403s in DevTools → Network.
4. **Deploy to production.** Promote the staging deploy or ship via the
   regular Vercel pipeline. No code changes; only the upstream MLS data
   has changed.
5. **Monitor for a week.** Watch the Vercel Analytics dashboard for a
   spike in `enrichment_status` events with `status: "ok"` where the
   user also dropped off the funnel on the property step — that's the
   signature of photos silently 403-ing. Also grep logs for
   `enrichment_status:ok` paired with user reports of "no photos".

## Stopgap if MLS doesn't rotate on time

If expiry hits and photos 403 before rotation lands:

1. **First line:** ping MLS team Slack, escalate to on-call. Rotation
   is an MLS-side release; no code change on our side fixes it.
2. **Second-line stopgap:** edit
   `src/components/get-started/enrichment-confirm.tsx` and flip
   `unoptimized={true}` on the `<Image>` tag. This bypasses `next/image`
   optimization and may surface a different error state (or render the
   403 placeholder instead of a blank), but does **not** fix the 403
   itself. Useful only if the photo URLs themselves have been rotated
   but the cached optimizer output is stale. Revert after the next
   deploy once MLS has rotated.
3. **Third line:** hide the `<EnrichmentConfirm>` entirely by having
   the service layer strip `photos` from the envelope. Fails silently,
   funnel keeps working.

Architecture §5 deviation 7 prefers optimized `<Image>`. The stopgap
above trades that for uptime; revert once rotation is live.

## References

- Architecture: `_bmad-output/planning-artifacts/architecture-e4-property-data-enrichment.md` §5 deviation 7, §6 "SAS rotation tracking".
- Plan: `_bmad-output/planning-artifacts/plan-e4-property-data-enrichment.md` §7.
- Related runbook: [`../e4-operations.md`](../e4-operations.md).
