# Zoo-Core Shared Memory Index

Orientation doc for every zoo-core skill. Read this on activation, then selectively load only what's relevant to the current task.

---

## Services indexed

_Populated by `zoo-core-full-index` as services are indexed; per-service summaries are one line each._

<!-- service-summaries:start -->
- **offervana-saas** — .NET 8 (ABP Zero) + Angular 15 multi-tenant SaaS core platform; system of record for OffervanaDb. ~340 endpoints across 88+ AppServices + 8 OuterApi controllers + Azure Functions; JWT + `[OuterApiKeyFilter]` + Function Key + Cookie + impersonation. 40+ entities across 13 SQL schemas; EF Core 8.0.6 with failover read-replica; multi-tenant via ABP TenantId. 40+ Temporal workflows (Zoodealio.Temporal worker) — Blast email, GHL sync, Logs import, Bulk HR ops, Azure scaling, Onboarding AVM (new shared). **Flags:** secrets in appsettings.json; 3 scheduler frameworks (only Temporal active); duplicate FunctionApp+Functions; Migrator on netcoreapp3.1; minimal test coverage. **Recent (since 2026-04-06):** OfferBonus domain (PR 8746), Comparables Analysis + Offer Explainer document slots (PRs 8839/8844), Onboarding shared-layer refactor + 2 new Temporal workflows (PR 8730 AVM re-arch), BlogSeoMiddleware (PR 8741).
- **investor-portal** — .NET 10 + Angular 21 / PrimeNG 21 ZIP (Zoodealio Investor Portal). 139 endpoints / 15 areas; JWT + custom `[AuthorizeRoles]` / `[AuthorizeRolesOrInviteToken]` + DB-backed API-key gate for `/openapi/*`. 16 entities (Domain + DbContext live in `zoodealio-shared`); **no `LegacyData` — writes directly to OffervanaDb + TradeInHoldingsDb contradicting "Offervana-only writer" baseline.** No Temporal, no scheduled jobs; 1 BackgroundService (`ServiceBusQueueConsumer`) with test-queue-only wiring. MediatR CQRS, AutoMapper, Scalar OpenAPI, data annotations (no FluentValidation), no Serilog, no backend tests. Frontend: standalone components + OnPush + `inject()` + `_` prefix enforced by **10 custom ESLint rules**; zero signals (pure RxJS). Flags: 5 webhook endpoints `[AllowAnonymous]` without signature; Service Bus consumer silently drops failed messages; auto-migrate on startup outside Dev.
- **zoodealio-chat** — Chainlit 2.9.2 / Python 3.13 AI chat assistant over OpenAI + Temporal. Two-process Container Apps deploy (Chainlit web + Temporal worker). Stateless (no DB); consumes ~13 Offervana BLAST endpoints. Dual agent paths via `AGENT_MODE` (hybrid streaming vs pure-Temporal single-workflow). 5 workflows declared / 2 registered; 29 activities. **No in-service auth (trusts upstream `user_env.token`); multiple live drift bugs flagged: `GetSurvey` vs `GetBlastSurvey`, `userid` vs `customerUserId`, partial `analyze_portfolio_equity`, unreachable `list_properties_for_rental_comparison`.**
- **zoodealio-infrastructure** — Terraform IaC (azurerm 3.111.0 pinned). 4 modules + 3 byte-identical env stacks (`dev`/`uat`/`prod`); provisions RG + ACR + Container App Env + Container App + Log Analytics per env. Only deployed workload is `zoodealiotemporal:latest`. **No remote backend, no CI, ACR admin creds unredacted in state, Log Analytics orphaned.**
- **zoodealio-mls** — .NET 8 MLS property catalog + photo-processing service. 7 HTTP endpoints (3 JWT-protected API + 4 anonymous Azure Functions) over Azure AI Search (`mlsdata` index, ~248 fields on `PropertySearchDocument`), Blob, Table, and Service Bus (`mls-photo-processing-queue`). **No SQL DbContext / no `LegacyData`.** 1 Temporal workflow (`PhotoProcessingWorkflow`) hosted in-process with the API via `TemporalHostedService`; scheduled `0 6,18 * * *` on `Europe/Kyiv`. Functions use custom `IHandler<TContext>` chain, not MediatR. Flags: all Functions anonymous in code, JWT symmetric HMAC with no roles/scopes, no test project, schedule-drift risk (host only creates — never updates — the schedule).
- **zoodealio-shared** — NuGet package (`net10.0`, EF Core 10) bundling cross-service offer DTOs + three EF models (OffervanaDb RW/RO, InvestorPortalDb, TradeInHoldingsDb) + DI registration helpers. No runtime, no workflows.
- **zoodealio-strapi** — Strapi 5.23.4 headless CMS on Azure App Service Windows (IIS + iisnode). 21 auto-generated REST endpoints across 5 content types + 5 `shared.*` components; zero custom routes/controllers. No tests, no lint, no Temporal/cron/lifecycle hooks; consumed only by the Angular marketing app.
- **zoodealio-trade-in-holdings** — .NET 10 + Angular 21/PrimeNG 21 internal ops platform for TIH. 163 endpoints / 17 areas across 28 controllers; 38 own entities (Domain + DbContext live in `zoodealio-shared`); JWT + custom `[RequirePermission("dot.path.key")]` auto-synced at startup; MediatR 14 used selectively only when crossing to OffervanaDb or InvestorPortalDb. **No durable/background/scheduled work — fully synchronous.** Flags: 7 controllers missing permission gates; Offervana "read-only" context is written by 2 commands; HTTP 499 non-standard user-friendly error contract; `appsettings.json` ships live-looking secrets; double `MigrateAsync` at startup; no test project.
<!-- service-summaries:end -->

See `staleness.md` for per-service indexed-date + SHA.

## Curated files

- `curated/patterns.md` — Zoodealio architectural baseline (load on activation)
- `curated/recent-changes.md` — distilled cross-service change log (load when recency matters)
- `curated/user-preferences.md` — user-specific stylistic + workflow preferences (load on activation; consumer-local)

## Per-service knowledge

`services/{service-name}/` contains 5 files per service: `api-catalog.md`, `schemas.md`, `architecture.md`, `patterns.md`, `workflows.md`. Load only the service directories your current task touches.

## Daily activity log

`daily/YYYY-MM-DD.md` — append-only per-agent activity log (consumer-local). Load only when cross-agent handoff context matters.

## Budget

This file has a soft 200-line budget. When it crosses that, `zoo-core-curate-memory` is due — trims prose, preserves every service + curated pointer.
