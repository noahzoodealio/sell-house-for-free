---
work-item-id: 7934
work-item-type: User Story
work-item-code: E11-S6
parent-feature: 7920
parent-epic: 7776
repo: sell-house-for-free
branch: feature/e11-team-member-portal
last-completed-step: 5
file-groups:
  - migration-util
  - server-actions
  - components-page
started-at: 2026-04-24T23:35:00Z
---

# E11-S6 — Documents vault sidecar

## Files added

- `supabase/migrations/20260424193000_e11_s6_documents_deleted_event.sql` — adds `document_deleted` to event_type check.
- `src/lib/team/documents.ts` — bucket/kind/status enums, filename sanitizer, storage-path builder, `listDocumentsForSubmission` with uploader-name resolution.
- `src/app/team/submissions/[id]/documents/actions.ts` — `mintUploadUrl`, `finalizeUpload`, `downloadDocument`, `deleteDocument`, `updateDocumentField`.
- `src/components/team/documents/DocumentUploader.tsx` — drag/drop + picker client island.
- `src/components/team/documents/DocumentRow.tsx` — row + section components.
- `src/app/team/submissions/[id]/documents/page.tsx` — three-section page (Seller Docs, Seller Photos, Team Uploads).

## Engineering decisions

### EDR-1: Mint-then-PUT direct to Storage

Per AC. Server actions never stream the file body — `mintUploadUrl` returns a signed-upload URL, the client PUTs directly to Storage, then `finalizeUpload` writes the metadata row. Avoids serverless timeout/memory pressure on large uploads.

### EDR-2: 10% size-mismatch tamper guard

`finalizeUpload` reads back the actual byte size from `storage.from(bucket).list(...)` and rejects (+ deletes the orphaned object) if it differs from the declared size by more than max(1KB, 10%). Catches the "client lied about size to bypass cap" scenario without being fragile to client-reported size precision.

### EDR-3: 10-minute signed download URLs

Short enough to bound leak risk; long enough for slow connections to finish a 25 MB file. `last_downloaded_at` updated on every URL mint as a coarse activity signal.

### EDR-4: Hard delete

Per AC #8. Soft-delete adds query complexity to every list. Recovery from Supabase backup is the safety net; the audit row in `team_activity_events` preserves the fact-of-existence.

### EDR-5: `mintUploadUrl` uses admin client; RLS not enforced on the URL

The signed-upload URL is minted with service-role bypass — necessary because the Storage RLS policy requires the user already be the assignee, but checking that *and* minting is what we do in this action. The action's authorization function (`authorizeSubmission`) is the gate. Direct browser PUTs to the signed URL succeed for the lifetime of the URL (60 min default); we use a tight token by passing the file straight from the client.

### EDR-6: Filename sanitization

`sanitizeFilename` strips path traversal (`..`, leading `/` or `\`), control characters, the disallowed Windows characters, collapses whitespace, lowercases the extension, and caps at 200 chars. Always wrapped with a `<submission_id>/<base36-timestamp>-<sanitized>` path so duplicates don't clash and an attacker cannot break out of the per-submission prefix.

### EDR-7: Page-level role gate

The page is `notFound()` (not 403) for non-assignee non-admin team members. Matches AC #8's posture for the admin route — don't leak existence of routes by role.

### EDR-8: No previews in v1

Per AC #11. All downloads open a new tab via `window.open(signedUrl, '_blank', 'noopener,noreferrer')`.

## Open follow-ups

- Orphan-storage sweep cron (S10 owns).
- Inline preview (future story).
- E-signature integration (future epic).

## Halt expected

After commit: pause for user to apply `20260424193000_e11_s6_documents_deleted_event.sql` (one-line check-constraint update).

## Manual smoke

1. Upload a 2 MB PDF as the assignee → verify it lands in Seller Docs.
2. Download as the same user → verify file downloads + audit row appears.
3. Sign in as a different non-admin team member → confirm /team/submissions/<id>/documents 404s.
4. Upload as seller (manual SQL or wait for seller portal upload UI) to seller-photos → verify team can read.
5. Try uploading a 30 MB file → confirm rejection at the size check.

## References

- Story: https://dev.azure.com/tf-offervana/Offervana_SaaS/_workitems/edit/7934
- Storage upload pattern: https://supabase.com/docs/guides/storage/uploads/standard-uploads
- Signed URLs: https://supabase.com/docs/reference/javascript/storage-from-createsignedurl
