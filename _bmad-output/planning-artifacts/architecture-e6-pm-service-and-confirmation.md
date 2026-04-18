# Architecture — E6 Project Manager Service & Confirmation

- **Feature slug:** `e6-pm-service-and-confirmation`
- **Repo:** `sell-house-for-free` (Next.js 16.2.3, React 19.2.4, Tailwind v4)
- **Upstream:** `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` §4 E6
- **Depends on:** E1 (Site Foundation — route shell, primitives, `buildMetadata`), E3 (Seller Submission Flow — `/get-started/thanks` route + `submissionId`), E5 (Offervana Host-Admin Submission — returns `ReferralCode` that keys our assignment record)
- **Feeds:** E8 (Launch Readiness — Sentry hooks + env var inventory + ops runbook)
- **Author:** Noah (Architect) · 2026-04-17
- **Status:** draft — ready for PM decomposition

---

## 1. Summary

E6 delivers the **PM assignment backend + confirmation surface** that closes the submission loop:

1. **Supabase** (new dedicated project) is the system of record for the PM roster (`project_managers`) and the submission↔PM mapping (`pm_assignments`), keyed by Offervana's `ReferralCode`.
2. A Postgres stored procedure (`assign_next_pm`) performs **transactional, concurrency-safe round-robin** assignment — one SELECT-FOR-UPDATE-SKIP-LOCKED on the roster, one INSERT on `pm_assignments`, idempotent on duplicate `ReferralCode`.
3. E5's successful Offervana submit calls `assignPmAndNotify()` (new in `src/lib/pm-service/`); the seller gets a confirmation email, the PM gets a lead notification, both via **SendGrid direct** (`@sendgrid/mail`).
4. E3's confirmation stub at `/get-started/thanks` is **replaced** with a Server Component that reads `?ref=<referralCode>`, fetches the assignment from Supabase, and renders the assigned PM's first name + photo + contact window.
5. Failures degrade gracefully — Supabase/SendGrid outages don't block the confirmation page render; the seller sees a "your PM will reach out within X hours" fallback and ops gets an alert.

**Affected services:**

| Service | Role | Change |
|---|---|---|
| `sell-house-for-free` | **Authoritative** | New PM service code + Supabase client + email sender + confirmation page rewrite |
| Supabase (new project `shf-pm-service`) | **Authoritative** | New schema: `project_managers`, `pm_assignments`, `notification_log`, `assign_next_pm` function |
| SendGrid (existing Zoodealio account) | Consumer | New dynamic templates: seller-confirmation, pm-notification. No schema or account changes. |
| Offervana_SaaS | **Read-only consumer** (upstream) | No changes. E6 uses Offervana's `ReferralCode` / `CustomerId` / `UserId` return values from E5; does not call Offervana back. |

**Pattern adherence snapshot**

| Area | Choice | Pattern source |
|---|---|---|
| DB access | Server-side only, service-role key, `@supabase/supabase-js` v2 | Supabase standard; matches plan Q11a |
| Assignment algorithm | Postgres stored procedure with `FOR UPDATE SKIP LOCKED` | Postgres concurrency idiom; avoids app-level race conditions |
| Idempotency | Unique constraint on `pm_assignments.referral_code` + RPC checks existing before insert | Mirrors Offervana's own "don't double-create on retry" posture in `CreateHostAdminCustomer` |
| Email transport | `@sendgrid/mail` direct (not via Offervana `Integrations/` service call) | Deviation — see §5 |
| Email templating | SendGrid Dynamic Templates, template IDs in env | SendGrid convention; shared sending domain with Offervana for DKIM |
| Confirmation page | Server Component, reads `searchParams` Promise, renders synchronously | Next.js 16 `02-guides/forms.md` + `use-search-params.md` |
| Error boundary | Supabase timeouts → fallback copy + Sentry event; never block page | Plan §3 resilience posture |
| Migrations | `supabase/migrations/*.sql` committed; `supabase db push` is the application step | Supabase CLI convention |
| Seed | `supabase/seed.sql` committed; placeholder PMs only; real roster applied post-launch via separate migration | Avoids env-var-driven seeds |
| Secrets | `SUPABASE_SERVICE_ROLE_KEY`, `SENDGRID_API_KEY` in Vercel env; never in client bundle | Plan §3 non-functional: "secrets never exposed client-side" |

---

## 2. Component diagram

```
                          /get-started  (E3 form)
                                    │
                                    ▼
              ┌─────────────────────────────────────────────┐
              │ src/app/get-started/actions.ts              │
              │   submitSellerForm()  ← E5 owns happy path  │
              │   1. zod validate                            │
              │   2. E5: POST Offervana /CreateHostAdmin…    │
              │      → returns {customerId,userId,           │
              │                  referralCode}               │
              │   3. E6: await assignPmAndNotify({...})  ◀── new call site
              │   4. redirect('/get-started/thanks           │
              │                 ?ref='+referralCode)         │
              └──────────────┬──────────────────────────────┘
                             │
                             ▼
              ┌─────────────────────────────────────────────┐
              │ src/lib/pm-service/assign.ts                │
              │   assignPmAndNotify(input): Promise<…>      │
              │     a. supabase.rpc('assign_next_pm', {…})  │ ─── Supabase
              │        ↳ returns assignment_id + pm preview │      (service role)
              │     b. fire seller email (best-effort)      │
              │     c. fire PM email (best-effort)          │
              │     d. write notification_log rows          │
              │     e. return {assignmentId, pm:{firstName, │
              │                 photoUrl,…}}                │
              │   Hard timeout: 5s. On error → log to       │
              │   Sentry, return {error:'…'} — caller       │
              │   redirects anyway.                         │
              └──────┬───────────────────┬──────────────────┘
                     │                   │
                     ▼                   ▼
              ┌──────────────┐    ┌──────────────────────────┐
              │ Supabase     │    │ src/lib/email/send.ts    │
              │ (us-west-2)  │    │   sendSellerConfirmation │
              │              │    │   sendPmNotification     │
              │ project_     │    │   uses @sendgrid/mail    │
              │  managers    │    │   retries: 3 w/backoff   │
              │ pm_          │    │   timeout: 3s per send   │
              │  assignments │    └────────┬─────────────────┘
              │ notification │             │
              │  _log        │             ▼
              │              │        SendGrid API
              │ assign_next  │        api.sendgrid.com/v3
              │  _pm() fn    │        (dynamic templates)
              └──────▲───────┘
                     │ read
                     │
              ┌──────┴──────────────────────────────────────┐
              │ src/app/get-started/thanks/page.tsx         │ (Server)
              │   getAssignmentByReferralCode(ref)          │
              │   → renders <PmPreview pm={…}/> + contact   │
              │     window copy + submission ref            │
              │   fallback: "Your PM will reach out within  │
              │              24 hrs — we've notified them"  │
              └─────────────────────────────────────────────┘

    Modules:
      src/lib/supabase.ts           — server-only client factory
      src/lib/pm-service/
        ├── assign.ts               — orchestrator (assignPmAndNotify)
        ├── read.ts                 — getAssignmentByReferralCode
        ├── types.ts                — Assignment, PmPreview, AssignInput
        └── __tests__/              — unit tests (mocked supabase)
      src/lib/email/
        ├── send.ts                 — sendgrid wrapper
        ├── templates.ts            — template ID constants
        └── __tests__/
      src/components/confirmation/
        ├── pm-preview.tsx          — PM card (photo, name, contact window)
        └── submission-ref.tsx      — displays Offervana referral code
      supabase/
        ├── config.toml             — supabase CLI project config
        ├── migrations/
        │   ├── 20260417000000_pm_roster.sql
        │   ├── 20260417000001_pm_assignments.sql
        │   ├── 20260417000002_notification_log.sql
        │   └── 20260417000003_assign_next_pm_fn.sql
        └── seed.sql                — placeholder PMs (dev/preview only)
```

---

## 3. Per-service changes

### 3.1 Supabase — new project `shf-pm-service`

**Provisioning:** new dedicated Supabase project in region `us-west-2` (closest to AZ users and Vercel IAD/SFO regions). Free tier suffices for MVP (~100-500 submissions/month). Upgrade to Pro when we approach free-tier row limits or need point-in-time recovery.

**Schema (four migrations, applied in order):**

#### `20260417000000_pm_roster.sql`

```sql
create extension if not exists "pgcrypto";

create table public.project_managers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null unique,
  phone text,
  photo_url text,
  bio text,
  active boolean not null default true,
  coverage_regions text[] not null default '{}', -- ['phoenix','tucson','all']
  -- Round-robin fairness bookkeeping
  last_assigned_at timestamptz,
  total_assignments int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_managers_active_idx
  on public.project_managers (active, last_assigned_at nulls first, total_assignments);

-- RLS: default-deny for anon/authenticated. Service role bypasses RLS.
alter table public.project_managers enable row level security;
-- No policies = no anon/auth access. Service role only.

comment on table public.project_managers is
  'Roster of assignable Zoodealio PMs for sell-house-for-free submissions. MVP managed via migrations; admin UI deferred.';
```

#### `20260417000001_pm_assignments.sql`

```sql
create table public.pm_assignments (
  id uuid primary key default gen_random_uuid(),
  -- Correlation keys
  referral_code text not null unique,       -- Offervana ReferralCode (authoritative key)
  submission_id text not null,              -- E3 idempotency UUID
  offervana_customer_id int,                -- Offervana CustomerId
  offervana_user_id bigint,                 -- Offervana UserId
  pm_id uuid not null references public.project_managers(id) on delete restrict,
  -- Seller snapshot (denormalized for confirmation page + email templating;
  -- this table is the ONLY place the seller's PII lives in our DB)
  seller_first_name text not null,
  seller_last_name text not null,
  seller_email text not null,
  seller_phone text,
  seller_address_line1 text not null,
  seller_city text not null,
  seller_zip text not null,
  pillar_hint text,                         -- 'listing' | 'cash-offers' | 'cash-plus-repairs' | 'renovation-only' | null
  -- Assignment metadata
  assignment_strategy text not null default 'round-robin',
  assigned_at timestamptz not null default now(),
  -- Notification tracking
  seller_email_sent_at timestamptz,
  pm_email_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index pm_assignments_pm_idx on public.pm_assignments (pm_id, assigned_at desc);
create index pm_assignments_submission_idx on public.pm_assignments (submission_id);

alter table public.pm_assignments enable row level security;
-- Service role only; confirmation page reads via service role from the server.
```

#### `20260417000002_notification_log.sql`

```sql
create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.pm_assignments(id) on delete cascade,
  channel text not null,                    -- 'email.seller' | 'email.pm'
  provider text not null,                   -- 'sendgrid'
  provider_message_id text,                 -- X-Message-Id returned by SendGrid
  status text not null,                     -- 'sent' | 'failed' | 'retry_pending'
  error text,                               -- error message on failure
  attempt int not null default 1,
  created_at timestamptz not null default now()
);

create index notification_log_assignment_idx on public.notification_log (assignment_id);
create index notification_log_status_idx on public.notification_log (status, created_at desc);

alter table public.notification_log enable row level security;
```

#### `20260417000003_assign_next_pm_fn.sql`

```sql
create or replace function public.assign_next_pm(
  p_referral_code text,
  p_submission_id text,
  p_offervana_customer_id int,
  p_offervana_user_id bigint,
  p_seller_first_name text,
  p_seller_last_name text,
  p_seller_email text,
  p_seller_phone text,
  p_seller_address_line1 text,
  p_seller_city text,
  p_seller_zip text,
  p_pillar_hint text
)
returns table (
  assignment_id uuid,
  pm_id uuid,
  pm_first_name text,
  pm_last_name text,
  pm_email text,
  pm_phone text,
  pm_photo_url text
)
language plpgsql
security invoker
as $$
declare
  v_existing_assignment pm_assignments%rowtype;
  v_pm project_managers%rowtype;
  v_new_assignment_id uuid;
begin
  -- Idempotency: if we've already assigned a PM to this referral code,
  -- return the existing assignment. The caller should still be safe to
  -- re-dispatch notifications (we gate those on *_email_sent_at columns).
  select * into v_existing_assignment
  from pm_assignments
  where referral_code = p_referral_code;

  if found then
    select * into v_pm from project_managers where id = v_existing_assignment.pm_id;
    return query
      select v_existing_assignment.id, v_pm.id, v_pm.first_name, v_pm.last_name,
             v_pm.email, v_pm.phone, v_pm.photo_url;
    return;
  end if;

  -- Pick the least-recently-assigned active PM. SKIP LOCKED avoids
  -- two concurrent submissions both grabbing the same row.
  select * into v_pm
  from project_managers
  where active = true
  order by last_assigned_at nulls first, total_assignments asc, id
  limit 1
  for update skip locked;

  if not found then
    raise exception 'E6_NO_ACTIVE_PMS' using errcode = 'P0001';
  end if;

  update project_managers
     set last_assigned_at = now(),
         total_assignments = total_assignments + 1,
         updated_at = now()
   where id = v_pm.id;

  insert into pm_assignments (
    referral_code, submission_id, offervana_customer_id, offervana_user_id,
    pm_id, seller_first_name, seller_last_name, seller_email, seller_phone,
    seller_address_line1, seller_city, seller_zip, pillar_hint
  ) values (
    p_referral_code, p_submission_id, p_offervana_customer_id, p_offervana_user_id,
    v_pm.id, p_seller_first_name, p_seller_last_name, p_seller_email, p_seller_phone,
    p_seller_address_line1, p_seller_city, p_seller_zip, p_pillar_hint
  ) returning id into v_new_assignment_id;

  return query
    select v_new_assignment_id, v_pm.id, v_pm.first_name, v_pm.last_name,
           v_pm.email, v_pm.phone, v_pm.photo_url;
end;
$$;

comment on function public.assign_next_pm is
  'Idempotent round-robin PM assignment. Safe under concurrency via SELECT FOR UPDATE SKIP LOCKED. Returns assignment + PM preview in one round-trip.';
```

#### `supabase/seed.sql` (dev/preview only — NOT run against production)

```sql
insert into public.project_managers
  (first_name, last_name, email, phone, photo_url, bio, active, coverage_regions)
values
  ('Jordan',  'Alvarez', 'jordan.placeholder@sellyourhousefree.com',  null, null, 'Placeholder PM — replace before launch', true, '{all}'),
  ('Morgan',  'Lee',     'morgan.placeholder@sellyourhousefree.com',  null, null, 'Placeholder PM — replace before launch', true, '{all}'),
  ('Taylor',  'Nguyen',  'taylor.placeholder@sellyourhousefree.com',  null, null, 'Placeholder PM — replace before launch', true, '{all}')
on conflict (email) do nothing;
```

**Production roster** ships via a separate, hand-curated migration (e.g. `20260420000000_seed_prod_roster.sql`) before launch cutover. Gated by E6-S8 ops runbook.

### 3.2 `sell-house-for-free` — Next.js code

#### New files

| File | Shape | Notes |
|---|---|---|
| `src/lib/supabase.ts` | Server-only client factory | Exports `getSupabaseAdmin()` — returns singleton `SupabaseClient` built from `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Throws on import if used in a Client Component (guard via `import 'server-only'`). Auto-configures with `{ auth: { persistSession: false, autoRefreshToken: false } }`. |
| `src/lib/pm-service/types.ts` | TS types | `AssignInput` (all params for `assign_next_pm`), `AssignResult` (`{ assignmentId, pm: PmPreview }` \| `{ error, fallback: true }`), `PmPreview` (`firstName`, `lastName`, `photoUrl?`, — **no email/phone** in the preview that the confirmation page renders), `Assignment` (full row for internal use). |
| `src/lib/pm-service/assign.ts` | `assignPmAndNotify(input: AssignInput): Promise<AssignResult>` | Orchestrator. Calls `supabase.rpc('assign_next_pm', {...})` with a 5s timeout (`AbortController`). On success, fires seller + PM emails in parallel via `src/lib/email/send.ts` (best-effort, 3s timeout each). Updates `pm_assignments.seller_email_sent_at` / `pm_email_sent_at` when emails succeed. Writes `notification_log` rows for each attempt. Returns `PmPreview` for the redirect handoff. On any error (RPC timeout, RPC exception, no active PMs), returns `{ error, fallback: true }` and logs Sentry event `pm_assignment_failed`. |
| `src/lib/pm-service/read.ts` | `getAssignmentByReferralCode(ref: string): Promise<AssignmentView \| null>` | Consumed by `/get-started/thanks/page.tsx`. Returns the PM preview + `assignedAt` + `contactWindowHours` (from config) given a referral code. Returns `null` if no assignment found. Does **not** return seller PII beyond first name (the visitor is the seller; confirming their own name is fine). |
| `src/lib/pm-service/config.ts` | Constants | `CONTACT_WINDOW_HOURS = 24`, `RPC_TIMEOUT_MS = 5000`, `EMAIL_TIMEOUT_MS = 3000`, `EMAIL_MAX_ATTEMPTS = 3`. |
| `src/lib/email/send.ts` | SendGrid wrapper | Exports `sendSellerConfirmation({ to, submissionRef, pm, seller }): Promise<SendResult>` and `sendPmNotification({ to, submissionRef, seller, pillarHint, offervanaAdminLink }): Promise<SendResult>`. Initializes `@sendgrid/mail` with `SENDGRID_API_KEY`. Uses Dynamic Template IDs from env. Retries on 429 / 5xx up to `EMAIL_MAX_ATTEMPTS` with exponential backoff (500ms, 1s, 2s). Returns `{ ok: true, messageId }` or `{ ok: false, error }`. |
| `src/lib/email/templates.ts` | Template ID constants | `SENDGRID_TEMPLATES = { sellerConfirmation: env.SENDGRID_TEMPLATE_SELLER_CONFIRMATION, pmNotification: env.SENDGRID_TEMPLATE_PM_NOTIFICATION }`. |
| `src/lib/email/dynamic-data.ts` | Template data builders | Pure functions: `buildSellerConfirmationData({pm, seller, submissionRef, contactWindowHours})` returns the dynamic-template payload. Same for PM notification. Kept separate from `send.ts` for testability. |
| `src/components/confirmation/pm-preview.tsx` | `<PmPreview pm contactWindowHours />` Server Component | Renders PM card — photo (or initials fallback), first name only, role ("Your Project Manager"), and the contact-window commitment ("Jordan will reach out within 24 hours"). Uses E1 `<Card>` primitive. |
| `src/components/confirmation/submission-ref.tsx` | `<SubmissionRef code />` | Small "Submission reference: ABC-123" display with subtle copy-to-clipboard. |
| `src/components/confirmation/fallback-message.tsx` | `<FallbackMessage seller? />` | Shown when assignment lookup fails / times out. "Thanks — your Project Manager will reach out within 24 hours. You'll also get a confirmation email shortly." No PM name. |

#### Modified files

| File | Edit | Notes |
|---|---|---|
| `src/app/get-started/thanks/page.tsx` | **Replace body** (E3 landed a stub) | Server Component. Signature: `export default async function Page({ searchParams }: PageProps<'/get-started/thanks'>) { const { ref } = await searchParams; ... }`. If `ref` missing → render `<FallbackMessage />`. Else `const assignment = await getAssignmentByReferralCode(ref)`. If `assignment` → render `<PmPreview>` + `<SubmissionRef>`; else → render `<FallbackMessage seller />`. Export `metadata` via `buildMetadata({ title: "Thanks — we'll be in touch", path: '/get-started/thanks', noindex: true })`. |
| `src/app/get-started/actions.ts` | **Add E6 call site** (E5 owns the rest of this file) | After Offervana POST succeeds and returns `{ customerId, userId, referralCode }`, call `await assignPmAndNotify({ referralCode, submissionId, offervanaCustomerId: customerId, offervanaUserId: userId, seller: {...}, pillarHint })`. The call is awaited (so the confirmation page has a row to read), but the result is only used for observability — failure falls through to redirect with the referral code, and the confirmation page handles the null-assignment case. |
| `src/lib/routes.ts` | Ensure `/get-started/thanks` is `excludeFromSitemap: true` | E3 already set this; E6 verifies. |

#### No changes

- `src/app/get-started/page.tsx` (E3 owns)
- `src/app/get-started/actions.ts` **body of validation + Offervana POST** (E5 owns)
- `src/lib/seller-form/*` (E3 owns)
- E1 primitives (`button.tsx`, `card.tsx`, etc.) — consumed as-is
- `next.config.ts` (E1/E8)

### 3.3 Packages added

| Package | Version (approx) | Purpose | Where |
|---|---|---|---|
| `@supabase/supabase-js` | ^2.46.x | Server-side Supabase client (RPC + basic queries) | `src/lib/supabase.ts` |
| `@sendgrid/mail` | ^8.x | SendGrid transactional email | `src/lib/email/send.ts` |
| `server-only` | ^0.0.x | Dev-time guard — throws if module accidentally imported into a Client Component | `src/lib/supabase.ts`, `src/lib/pm-service/*`, `src/lib/email/*` |

No client-side deps. No Supabase JS in the browser.

### 3.4 Environment variables (new)

All server-only; none are `NEXT_PUBLIC_*`.

| Var | Required | Used by | Notes |
|---|---|---|---|
| `SUPABASE_URL` | yes | `src/lib/supabase.ts` | e.g. `https://xyzabc.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | `src/lib/supabase.ts` | **Server-only. Never prefix with `NEXT_PUBLIC_`.** Vercel env scoped to `Production` + `Preview`. |
| `SENDGRID_API_KEY` | yes | `src/lib/email/send.ts` | SendGrid scoped API key (`Mail Send` permission only). |
| `SENDGRID_FROM_EMAIL` | yes | `src/lib/email/send.ts` | e.g. `hello@sellyourhousefree.com` — must be an authenticated sender domain shared with Offervana for DKIM consistency. |
| `SENDGRID_FROM_NAME` | yes | `src/lib/email/send.ts` | `Sell Your House Free` |
| `SENDGRID_REPLY_TO_EMAIL` | yes | seller confirmation email | e.g. `hello@sellyourhousefree.com` (or dynamically set to the assigned PM's email — decide in dev). |
| `SENDGRID_TEMPLATE_SELLER_CONFIRMATION` | yes | `src/lib/email/send.ts` | SendGrid dynamic template ID (e.g. `d-abc123…`). |
| `SENDGRID_TEMPLATE_PM_NOTIFICATION` | yes | `src/lib/email/send.ts` | SendGrid dynamic template ID. |
| `OFFERVANA_ADMIN_DASHBOARD_URL` | yes | PM email deep-link | e.g. `https://app.offervana.com` — the PM email builds `${OFFERVANA_ADMIN_DASHBOARD_URL}/customers/${offervanaCustomerId}`. |
| `PM_CONTACT_WINDOW_HOURS` | optional (default `24`) | `src/lib/pm-service/config.ts` | Overridable if we tighten SLA. |

**Secret hygiene:** Vercel env vars are scoped per-environment; rotation runbook lives in E8. `.env.local` not committed; `.env.example` updated with placeholder keys and a comment block pointing at the onboarding doc.

### 3.5 `supabase/` directory (new)

Adopted Supabase CLI layout so the schema is version-controlled and replayable.

```
supabase/
├── config.toml                     # project ref, pooler, etc.
├── migrations/
│   ├── 20260417000000_pm_roster.sql
│   ├── 20260417000001_pm_assignments.sql
│   ├── 20260417000002_notification_log.sql
│   └── 20260417000003_assign_next_pm_fn.sql
└── seed.sql                        # placeholder PMs — dev/preview only
```

**Application flow:** developer runs `supabase link --project-ref <ref>` once, then `supabase db push` applies pending migrations. Pattern matches `patterns.md` baseline safety rule: **EF migrations halt for user application confirmation** — same principle, extended to Supabase. CI never auto-applies migrations; a manual `supabase db push` step is part of the E8 launch runbook.

### 3.6 Assets

Minor. The confirmation page is content-light.

| Path | Asset | Notes |
|---|---|---|
| `public/images/pm-placeholders/jordan.jpg` etc. | Placeholder PM photos | Three silhouettes so the UI shows real photos during dev/preview. Real PM photos uploaded to Supabase Storage (see §6 open questions) or referenced via `photo_url` pointing at `public/pm/*.jpg` committed alongside the prod-roster migration. |

---

## 4. Integration contracts

E6 has one *inbound* contract (E5 → E6 within this repo) and two *outbound* contracts (Supabase + SendGrid to external systems). Offervana is touched transitively via E5's call, not directly.

### 4.1 E5 → E6 (within `sell-house-for-free`)

**Call site:** `src/app/get-started/actions.ts`, inside `submitSellerForm()`, immediately after a successful Offervana POST.

**Contract:**

```ts
// src/lib/pm-service/types.ts
export type AssignInput = {
  referralCode: string                    // Offervana ReferralCode (unique; idempotency key)
  submissionId: string                    // E3's crypto.randomUUID()
  offervanaCustomerId: number             // Offervana CustomerId
  offervanaUserId: bigint | number        // Offervana UserId
  seller: {
    firstName: string
    lastName: string
    email: string
    phone?: string
    address: { line1: string; city: string; zip: string }
  }
  pillarHint?: 'listing' | 'cash-offers' | 'cash-plus-repairs' | 'renovation-only'
}

export type PmPreview = {
  firstName: string
  lastName: string
  photoUrl?: string
}

export type AssignResult =
  | { ok: true; assignmentId: string; pm: PmPreview }
  | { ok: false; error: string; fallback: true }

export async function assignPmAndNotify(input: AssignInput): Promise<AssignResult>
```

**Call pattern:**

```ts
// inside actions.ts after Offervana success
const assignResult = await assignPmAndNotify({
  referralCode,
  submissionId,
  offervanaCustomerId: customerId,
  offervanaUserId: userId,
  seller: { firstName, lastName, email, phone, address: { line1, city, zip } },
  pillarHint,
})
// Intentionally do NOT fail the redirect on assignResult.ok === false.
// The confirmation page handles the null-assignment case.
redirect(`/get-started/thanks?ref=${referralCode}`)
```

**Guarantees E6 offers E5:**
- Awaits until either assignment row is committed OR the 5s hard timeout fires.
- Never throws — failures return `{ ok: false, error, fallback: true }` and are logged to Sentry.
- Idempotent — if called twice with the same `referralCode` (e.g., E5 retried a flaky Offervana call that actually succeeded server-side), returns the existing assignment without re-running round-robin.
- Does not mutate or read any E3/E5-owned data structures.

### 4.2 E6 → Supabase

**Transport:** `@supabase/supabase-js` v2 over HTTPS (PostgREST + RPC endpoints).

**Endpoints consumed:**

| Operation | Method | Path | Body / params |
|---|---|---|---|
| Assign PM | `POST` | `/rest/v1/rpc/assign_next_pm` | JSON body with the 12 parameters from §3.1's function signature |
| Lookup assignment | `GET` | `/rest/v1/pm_assignments?select=*,project_managers(first_name,last_name,photo_url)&referral_code=eq.{ref}` | — |
| Update email-sent timestamps | `PATCH` | `/rest/v1/pm_assignments?id=eq.{id}` | `{ seller_email_sent_at: '…' }` or `{ pm_email_sent_at: '…' }` |
| Write notification log | `POST` | `/rest/v1/notification_log` | `{ assignment_id, channel, provider, provider_message_id, status, error, attempt }` |

**Auth:** `apikey` header + `Authorization: Bearer <SERVICE_ROLE_KEY>`. RLS bypassed by service role — that is the intended posture; no table has any policies.

**Error handling:**
- Network error / 5xx → surface as `{ ok: false, error, fallback: true }`. No retry at the Supabase layer (the operation is at the boundary of a user action; a slow retry adds latency without resilience benefit).
- RPC raise `E6_NO_ACTIVE_PMS` → special-case: alert Sentry with severity `critical`, fall back.
- Duplicate `referral_code` → handled by the RPC itself (returns existing assignment).

**Timeouts:** 5s hard timeout via `AbortController` passed to Supabase fetch. Default Supabase client retry is disabled.

**Quotas:** Supabase free tier allows ~200 concurrent connections; we're well under. Monitor via Supabase dashboard.

### 4.3 E6 → SendGrid

**Transport:** `@sendgrid/mail` → `POST https://api.sendgrid.com/v3/mail/send`.

**Endpoints consumed:**

| Operation | Method | Path | Body |
|---|---|---|---|
| Send templated email | `POST` | `/v3/mail/send` | `{ from, personalizations: [{ to, dynamic_template_data }], template_id, reply_to? }` |

**Auth:** `Authorization: Bearer ${SENDGRID_API_KEY}`. API key scoped to `Mail Send` only.

**Templates (dynamic data contract):**

**Seller confirmation (`SENDGRID_TEMPLATE_SELLER_CONFIRMATION`):**

```json
{
  "seller_first_name": "Jane",
  "pm_first_name": "Jordan",
  "pm_photo_url": "https://…/jordan.jpg",
  "contact_window_hours": 24,
  "submission_ref": "R-ABC123",
  "site_url": "https://sellyourhousefree.com",
  "support_email": "hello@sellyourhousefree.com"
}
```

**PM notification (`SENDGRID_TEMPLATE_PM_NOTIFICATION`):**

```json
{
  "pm_first_name": "Jordan",
  "seller_first_name": "Jane",
  "seller_last_name": "Doe",
  "seller_email": "jane@example.com",
  "seller_phone": "(602) 555-0102",
  "property_address_line1": "123 Main St",
  "property_city": "Phoenix",
  "property_zip": "85001",
  "pillar_hint": "renovation-only",
  "pillar_hint_label": "Renovation-only interest",
  "submission_ref": "R-ABC123",
  "offervana_admin_link": "https://app.offervana.com/customers/12345",
  "submitted_at": "2026-04-17T20:15:00Z"
}
```

**Error handling:**
- 4xx with `errors[].field` → log details, mark `notification_log.status = 'failed'` with error, do not retry (4xx is a client error — address bad, key revoked, etc.).
- 429 / 5xx → retry with backoff (500ms, 1s, 2s), up to `EMAIL_MAX_ATTEMPTS = 3`.
- Network error / timeout (3s per attempt) → same retry policy.
- On final failure → log to `notification_log` with `status = 'failed'` and Sentry event `pm_email_failed` with `channel` breadcrumb. Assignment row still exists; ops can re-send manually.

**Retry / backoff rationale:** seller confirmation + PM notification are best-effort — we'd rather return fast and let the PM email catch up than block the user's confirmation page on email infrastructure.

**Idempotency:** SendGrid has no server-side idempotency; we gate re-sends on `pm_assignments.*_email_sent_at` being null before calling. On the rare happy path of `assign_next_pm` returning an *existing* assignment (E5 retry case), both timestamps will be non-null → we skip re-sending.

### 4.4 E3 → E6 (confirmation page handoff — already reserved by E3)

`/get-started/thanks` was scaffolded by E3 with signature `Page({ searchParams })` reading `?ref=`. E6 replaces the body. No new contract needed from E3 — E3's contract (§4.5 of E3 arch) already promised the page would "accept `?ref=` and display a static placeholder until E6 fills in." E6 delivers that.

### 4.5 E6 ↔ Offervana (no direct call; transitive via E5)

**E6 does NOT call Offervana.** Offervana's involvement is:
- Source of `ReferralCode`, `CustomerId`, `UserId` (via E5's response).
- Deep-link target of the PM's lead-notification email (`${OFFERVANA_ADMIN_DASHBOARD_URL}/customers/${customerId}`).

If Offervana's admin URL scheme changes, E6's env var (`OFFERVANA_ADMIN_DASHBOARD_URL`) and the template data builder change — no runtime dependency.

---

## 5. Pattern decisions + deviations

### Decisions (with citations)

1. **Supabase as DB** — plan §7 Q11a: "Storage: Supabase (used for everything DB-side in this repo)". Locked.
2. **Stored procedure for assignment** — `SELECT ... FOR UPDATE SKIP LOCKED` is the canonical Postgres pattern for lock-free, fair, concurrent work-queue pickers. Cheaper and simpler than an application-side Redis lock, and it's the only way to avoid two concurrent submissions both grabbing the same PM given that we want low total request latency.
3. **Idempotency via `referral_code` unique constraint + RPC lookup** — Offervana itself is idempotent on retry (plan §E5 requirement). E6 inherits that guarantee by keying on the `ReferralCode` Offervana returned. Matches the same pattern Offervana's `CreateHostAdminCustomer` uses internally.
4. **Server-side only Supabase** — avoids shipping Supabase JS in the client bundle (~60KB min + deep chain of network/auth code), avoids RLS complexity, avoids exposing the service role key. All reads + writes through Server Actions + Server Components per Next.js 16 `02-guides/forms.md`.
5. **Round-robin (least-recently-assigned) algorithm** — plan §4 E6: "start with round-robin; evolve to area-aware". Implemented as `ORDER BY last_assigned_at NULLS FIRST, total_assignments` so a newly-activated PM immediately gets traffic (nulls first) and ties break on assignment count.
6. **PM roster via migrations + seed, no admin UI** — plan §4 E6: "Seedable from env or admin-managed". MVP seeds via migration file; admin UI deferred. Env-based seeding rejected (can't express multi-row data cleanly; env mutation requires redeploy; migration file is version-controlled and reviewable).
7. **SendGrid Dynamic Templates (not MJML/Handlebars in-repo)** — template content lives in SendGrid UI, referenced by ID. Lets marketing/ops edit copy without a code deploy, which matches how Offervana's own email stack works (per `patterns.md`: "SendGrid for email via `Integrations/` project"). Keeps `@sendgrid/mail` usage tiny — just API key + template ID + dynamic data.
8. **Shared Zoodealio SendGrid sending domain** — per plan §E6 "inherit DKIM + templates". Same sending domain authenticated in SendGrid (e.g. `sellyourhousefree.com` as a subdomain of `zoodealio.com`-adjacent infra) — prevents a separate warmup cycle + keeps DKIM/DMARC alignment.
9. **Server Component for confirmation page** — data is rendered once on submit-redirect; no reactivity needed. Next.js 16 `rendering` docs prefer Server Components for data-fetching by default. Also: PM photo URL is an uncacheable detail that should be resolved server-side, not shipped as a client-side fetch.
10. **`server-only` package guard** — prevents accidental client imports of `src/lib/supabase.ts`, `src/lib/pm-service/*`, `src/lib/email/*`. Cited in Next.js 16 `02-guides/data-security.md` §"Keeping server-only code out of the client".
11. **Confirmation page renders PM first name + photo only — NOT email/phone** — the channel is PM-initiated outreach; putting the PM's direct contact info on a public URL keyed only by a mildly-guessable referral code is a minor data exposure we don't need to take. The PM emails the seller; the seller replies to that. Matches plan §1 "trust posture is a first-class product surface".
12. **Best-effort email dispatch, don't block confirmation page render** — if emails fail, the user still sees their confirmation, the assignment row exists, and the PM can be notified via ops Slack alert or a subsequent scheduled re-send. Blocking the redirect on email success would degrade perceived performance without improving actual outcomes (the email is async delivery anyway).
13. **Hard 5s timeout on `assign_next_pm` RPC** — the user waited through Offervana POST (another 1-3s). Another RPC timing out into hang territory ruins the perceived responsiveness. 5s is enough for Supabase cold-start + network + DB work (`SELECT FOR UPDATE` on a small active set is sub-ms).
14. **`notification_log` table for audit** — lets us answer "did the seller actually get their email?" three months later without grep'ing logs. Also supports a future scheduled re-send worker without schema changes.
15. **Region: us-west-2** — closest Supabase region to AZ users + Vercel's SFO region. Plan §7 "Architecture-phase decisions: Supabase project provisioning + region (E6 architecture)".

### Deviations (with justification)

| Deviation | From | Why | Who accepts the risk |
|---|---|---|---|
| **SendGrid direct from our BFF, NOT via Offervana `Integrations/`** | `patterns.md` baseline: "SendGrid for email via `Integrations/` project" (which is an internal .NET project, not a public service) | There is no anonymous Offervana HTTP endpoint for sending arbitrary transactional emails — `Integrations/` is a .NET internal project callable only within Offervana_SaaS's own API surface. We'd need Offervana to expose a new `[AllowAnonymous]` endpoint, which is a cross-repo epic with platform-team review. MVP uses `@sendgrid/mail` with the same sending domain + API key-family to inherit DKIM/DMARC + brand consistency at the account level. If Offervana exposes a public email endpoint later, we can switch by replacing `send.ts` internals without changing the `sendSellerConfirmation` / `sendPmNotification` call sites. | Noah — captured in §6 as a long-term question; cleanly reversible. |
| **Supabase, not OffervanaDb** | `patterns.md`: "Two-database pattern — every service that needs Offervana data has its own DbContext + a read-only `OffervanaDbContext` via a `LegacyData` project" | We do not need Offervana data. We have our own, non-Offervana entity (PM assignment) that has no counterpart in OffervanaDb. Creating an OffervanaDbContext here would be a no-op. Plan §7 Q11a locks Supabase; this deviation is plan-ratified. | Noah / plan §7. |
| **No Temporal for notification reliability** | `patterns.md`: "Temporal.io for durable workflows (Offervana, Chat, MLS use it)" | Temporal is the right answer for multi-step workflows with compensation/retry over minutes-to-days (ATTOM AVM refreshes, MLS photo ingestion). A single email fire with a 3s timeout is a durable-queue overkill. MVP: best-effort inline + `notification_log` for audit. If we later need guaranteed delivery SLAs, a Temporal or Inngest adapter can replace the inline call. | Noah — same reversibility argument. |
| **PM assignment in this repo, not Offervana_SaaS** | Normally platform-wide features belong in Offervana_SaaS | Plan §E6 explicitly calls this out: Offervana does not have a PM assignment system, and building one there is a cross-team cross-repo effort. Plan defers "whether the PM service eventually graduates into Offervana_SaaS" until operations feedback is in. | Noah / plan §E6. |
| **No Row-Level Security policies on Supabase tables** | Supabase best-practice default | We access Supabase only via the service role (bypasses RLS). We never expose Supabase directly to authenticated users (there are no authenticated users — MVP is public submit + one-shot confirmation). RLS adds maintenance cost with no threat reduction when all access is server-side. | Noah — if we ever add a seller dashboard or PM self-service UI, RLS becomes essential and lands with that epic. |
| **Service role key used directly (not a scoped API key)** | Some teams prefer anon key + RLS even for server-side | Service role is Supabase's supported "server knows best" pattern; scoping with RLS when there is only one server client and no user-scoped access buys nothing. Confirmed with Supabase docs §"Server-side admin tasks". | Noah. |
| **Sync (awaited) call to `assignPmAndNotify` inside the Server Action, not queued** | A queue (e.g. Vercel Queues, Inngest, BullMQ) would decouple submit-latency from PM-assignment-latency | The user is looking at the "Submit" button spinner. Any async-queued approach means the `/get-started/thanks` page can't render PM info (the assignment doesn't exist yet) — we'd be back to the E3 placeholder. The inline call keeps the UX tight with the 5s timeout as the safety valve. | Noah — reversible with a short-TTL polling page if volumes explode. |
| **Confirmation page does not stream** | Next.js 16 RSC streaming is encouraged for async data | The assignment lookup is a single Supabase query (sub-100ms). Streaming would show a skeleton then swap — worse UX for a page the user sees once. Non-streaming Server Component with `<Suspense>` is fine; we skip the streaming boundary. | Noah. |
| **No CAPTCHA / rate-limit on `/get-started/thanks`** | Defensive default | The page only reads by `referral_code` which Offervana generates. It's not a direct public POST target. Rate-limit belongs at the submission boundary (E8 will add it to `/get-started`) not at the confirmation read. | Noah — E8. |

---

## 6. Open questions

Non-blocking. Answer during dev or downstream.

1. **Supabase region confirmation** — us-west-2 is our proposal; verify with Vercel deployment region for lowest cross-region latency. Decide before E6-S1 PR.
2. **Production PM roster** — who authors it (Noah vs. operations lead)? What's the go-live list? Captured in E6-S8 runbook, resolved before E8 launch.
3. **PM photo hosting** — three options: (a) commit small JPEGs to `public/images/pm/` per-roster-migration, (b) Supabase Storage bucket with SAS URLs, (c) third-party CDN like Cloudinary. MVP lean: option (a) — simplest, no new infra, tied to the migration that adds the PM. Revisit when we have >10 PMs or want hot-swap photos without deploys.
4. **Seller confirmation email "reply-to"** — should replies go to a general `hello@` inbox or directly to the assigned PM's email? Ops preference call. Default: `hello@` with the PM's name + first-call intent in the body — reduces noise if a seller replies before the PM reaches out.
5. **PM email deep-link format** — `${OFFERVANA_ADMIN_DASHBOARD_URL}/customers/${customerId}` is a guess; confirm against Offervana admin dashboard URL scheme (likely `/commerce-site/admin/customers/:id` or similar). Verify during E6-S7 with an Offervana dev.
6. **Area-aware assignment** — defer, but instrument now. `coverage_regions` column on `project_managers` exists so we can light it up without a migration.
7. **SendGrid template authorship** — who designs the HTML? If Offervana's existing templates cover "transactional confirmation" shape, clone + re-brand. If not, Noah writes minimal MJML in a scratch repo and exports to SendGrid. Resolve in E6-S7.
8. **Failure alerting channel** — `pm_assignment_failed` and `pm_email_failed` Sentry events need an alert rule. Slack webhook is the fastest path; decide in E8.
9. **SMS / Slack PM notifications** — plan §E6: "email at minimum ... optionally SMS / Slack". Defer; email-only for MVP. If we want SMS, Twilio via Offervana patterns is the path.
10. **Eventual migration to Offervana_SaaS** — plan §E6 long-term question. Revisit post-launch once PM ops feedback is available.

---

## 7. Handoff notes for PM (suggested story boundaries)

Proposed decomposition into ADO User Stories under an E6 Feature. Critical path: S1 → S2 → S3 → S5 → S6. S4 and S7 can run in parallel once S3 lands.

| # | Story | Size | Notes |
|---|---|---|---|
| E6-S1 | **Supabase project provisioning + schema migrations + server client** — create Supabase project in us-west-2; commit `supabase/config.toml`; write four migration files (`pm_roster`, `pm_assignments`, `notification_log`, `assign_next_pm_fn`); apply to dev project; add `src/lib/supabase.ts` with service-role client factory + `server-only` guard; add `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` to `.env.example` + Vercel dev/preview/prod env | M | Unblocks everything else. **Migration apply is a manual step — do not auto-apply from CI.** Write a short `docs/supabase-runbook.md` describing `supabase link` + `supabase db push`. |
| E6-S2 | **Placeholder PM seed + local dev harness** — `supabase/seed.sql` with 3 placeholder PMs; documented `supabase db reset` flow for local; verify `assign_next_pm` RPC returns a PM end-to-end via `supabase` CLI query | S | Depends on S1. Produces a working local PM-assignment loop (no UI yet). |
| E6-S3 | **PM service core — types + `assignPmAndNotify` orchestrator (no email yet) + `getAssignmentByReferralCode`** — `src/lib/pm-service/{types,assign,read,config}.ts`; `AbortController` 5s timeout wrapping the RPC; Sentry hooks; idempotency tests | M | The `send.ts` calls are stubbed (return `{ ok: true, messageId: 'stub' }`) so the orchestration is testable before email lands. Full unit-test coverage (mocked Supabase client). |
| E6-S4 | **SendGrid integration — `src/lib/email/{send,templates,dynamic-data}.ts`** — `@sendgrid/mail` setup; `sendSellerConfirmation` + `sendPmNotification` with retry + backoff + `notification_log` write; env vars wired; placeholder template IDs so dev can use real SendGrid dynamic templates | M | Parallel with S5 after S3 lands. Template authorship coordinated with E2/E7 for brand + consent wording. |
| E6-S5 | **Wire E5's actions.ts to call `assignPmAndNotify`** — add the E6 call site in `src/app/get-started/actions.ts` (between Offervana success and redirect); ensure existing E5 error paths remain unchanged; add structured logging on assign success/failure; update E5 story's tests if they existed | S | Requires S3 merged. Small code change; risk is integration, not implementation. |
| E6-S6 | **Confirmation page rewrite** — replace `src/app/get-started/thanks/page.tsx` body with the Server-Component version that reads `?ref=`, fetches assignment, renders `<PmPreview>` + `<SubmissionRef>` or `<FallbackMessage>`; add the three components under `src/components/confirmation/`; metadata `noindex: true` via `buildMetadata` | M | Visual + content work. Coordinate with E2 for copy tone alignment ("Meet Your Project Manager" brand voice). |
| E6-S7 | **SendGrid template content (HTML + plaintext)** — author dynamic templates in SendGrid UI (seller confirmation + PM notification); brand-aligned HTML; plaintext fallback; stamp template IDs in Vercel env across dev/preview/prod | S | Parallel with S5/S6. Gated on E7 for the TCPA-safe footer wording (see E7 coord note). |
| E6-S8 | **Ops runbook + prod roster seed + observability pass** — `docs/pm-ops-runbook.md` covering "add PM", "disable PM", "re-run an assignment", "re-send an email", "manual assignment on Supabase outage"; separate migration `20260420…_seed_prod_roster.sql` with real PM data (NOT committed if it contains PII we can't publish — author locally + apply via `supabase db push`); Sentry alert rules for `pm_assignment_failed` + `pm_email_failed` | M | Runs late — requires Ops input on the real roster + Sentry access from E8. Closes the epic. |

**Critical sequencing:** S1 blocks all. S2 blocks S3. S3 blocks S4/S5. S6 requires S3 (for `getAssignmentByReferralCode`). S8 closes.

**Parallelism:** S4 + S5 + S6 + S7 can be four contributors once S3 lands.

**Acceptance criteria cadence** — every E6 story must include:

- `next build` passes; `/get-started/thanks` prerenders only the error/fallback variant; the PM-preview variant is dynamic (data dependency on Supabase).
- Supabase client + `@sendgrid/mail` + `server-only` imports do **not** appear in the client bundle — verify with `next build` output + a quick `grep` in `.next/static/chunks/` for `SUPABASE_SERVICE_ROLE_KEY`.
- No third-party network requests fire on `/get-started/thanks` beyond `va.vercel-scripts.com` in prod (plan §3 NF).
- Unit tests for: idempotency (same referral code called twice returns same assignment), no-active-PMs error path, Supabase timeout path, SendGrid retry-then-fail path.
- `pm_assignments` row has correct seller snapshot after an E2E test submit (local or preview env).
- Seller confirmation email + PM notification email land in real inboxes on a preview-env E2E.
- Lighthouse run on `/get-started/thanks` with a real referral code: LCP < 2.5s (plan §3 NF).

**Not in E6 scope** (for PM planning clarity): rate-limit / CAPTCHA / Sentry project creation (E8), production SendGrid DKIM/DMARC domain setup (infra task, likely Zoodealio.Infrastructure/E8), area-aware or capacity-aware assignment evolution, PM admin UI, SMS/Slack PM alerts, seller self-service dashboard, any Offervana_SaaS changes, any cross-service changes to `Zoodealio.MLS` or `Zoodealio.Shared`.

---

## 8. References

- Project plan: `_bmad-output/planning-artifacts/project-plan-sell-house-for-free.md` §4 E6, §7 Q11/Q11a
- E1 architecture: `_bmad-output/planning-artifacts/architecture-e1-site-foundation.md` (E6 owns `@supabase/supabase-js` dep per §5)
- E3 architecture: `_bmad-output/planning-artifacts/architecture-e3-seller-submission-flow.md` §4.5 (E3 → E6 confirmation handoff)
- Zoodealio baseline patterns: `_bmad/memory/zoo-core/curated/patterns.md` (SendGrid via `Integrations/` — see §5 deviation)
- Next.js 16 Server Actions: `node_modules/next/dist/docs/01-app/02-guides/forms.md`
- Next.js 16 data security / `server-only`: `node_modules/next/dist/docs/01-app/02-guides/data-security.md`
- Supabase CLI + migrations: https://supabase.com/docs/guides/cli
- SendGrid Mail Send v3 + Dynamic Templates: https://www.twilio.com/docs/sendgrid/api-reference/mail-send/mail-send
- Postgres `SELECT FOR UPDATE SKIP LOCKED` pattern (for the RPC): https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE
- Offervana behavioral reference: `Offervana.Application/Customer/CustomerAppServiceV2.cs` `CreateHostAdminCustomer` return value shape — the `ReferralCode` is E6's correlation key (plan §7 known facts)
