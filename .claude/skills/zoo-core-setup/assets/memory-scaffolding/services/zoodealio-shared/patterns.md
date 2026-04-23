# Zoodealio.Shared — Patterns

Observed conventions inside this package. "Observed" = present in the code; "absent" = conspicuously not present compared to the workspace-level conventions in `CLAUDE.md`.

## Framework & language

- **.NET 10 (`net10.0`) / C# 12+** — uses primary constructors on both standalone-DbContext declarations (ZIP & TIH: `InvestorPortalDbContext(DbContextOptions<...> options) : DbContext(options)`), collection expressions, and `required` members (TIH `DbContext` DbSets all declared `public required DbSet<...>`).
- **`Nullable` enabled, `ImplicitUsings` enabled.** Non-nullable reference types in scope across the codebase — but applied inconsistently (many legacy Offervana entity string properties are declared non-nullable but allowed to be null via `null!` initializers or missing `?`, which would fail strict nullability checks if those warnings were upgraded to errors).
- **No async method suffix enforcement** — repo has no `*Async` methods because it's declaration-only; consumers own async.

## Persistence / EF Core

- **EF Core 10** — SQL Server provider only.
- **Two-context pattern for Offervana** — `OffervanaDbContext` (RW) + `OffervanaReadOnlyDbContext` (NoTracking) sharing `OffervanaDbContextBase`. Reflects the workspace-level rule: "Legacy DB → MediatR CQRS" pairs read-only context with query handlers, read-write with command handlers.
- **Single-context pattern for ZIP + TIH** — only a RW context is registered. (No equivalent `*ReadOnlyDbContext` shipped for ZIP or TIH.)
- **`ValueGeneratedNever` for Guid PKs (TIH)** — client generates Guids in application code. Not applied in ZIP (relies on EF's default Guid generation).
- **`NEWSEQUENTIALID()` for append-only history tables** — used on `UnderwriteOfferHistory.Id` to get sequential Guids for better index locality. This is the only TIH table using server-generated Guids.
- **Money columns `decimal(18,2)` + percentage columns `decimal(8,4)` (newer) or `decimal(5,2)` (older, e.g. `FundingRequest.InterestRate`)** — explicit `HasPrecision` or `HasColumnType` in model builder. Not done via attributes.
- **Unique constraints + check constraints are declared in `OnModelCreating`, not attributes.** Centralized in the context to keep entity classes pure POCOs. Only exceptions are a few `[StringLength]` / `[Required]` / `[EmailAddress]` validation attributes that double as column hints.
- **Cascade policy, explicit and varied.** Rule of thumb observed in TIH:
  - `Cascade` for pure-ownership child relationships (UnderwriteOffer → Items, Workflow → WorkflowStages, Department → DepartmentTeamMembers).
  - `Restrict` / `NoAction` / `SetNull` for audit and cross-reference FKs (anything "user who did X" — preserves history if the user is deleted).
  - Composite enforcement via `CK_` check constraints where a DB-level invariant is needed (e.g. `ChangeRequest` targeting exactly one of two FKs).

## Namespace conventions

- **Per-consumer namespaces**, not per-package:
  - `Zoodealio.Shared.Dtos.Offers` — offer DTOs (the one "shared-shared" namespace).
  - `Offervana.LegacyData[.Entities|.Enums]` — Offervana legacy DB.
  - `ZoodealioInvestorPortal.Domain[.Entities|.Enum|.Exceptions]` + `.Infrastructure` — ZIP.
  - `TradeInHoldings.Domain[.Entities|.Enums|.Exceptions]` + `.Infrastructure` — TIH.

  Note `ZoodealioInvestorPortal` (no dot) vs. `Zoodealio.InvestorPortal` / `Zoodealio.TradeInHoldings` naming in other repos — the shared library deliberately uses the flat identifier to match ZIP's in-service namespace.

## DTO / contract patterns

- **"Full DTO" + "Get DTO" duality for offer subtypes.** For each of the six offer types there's both `{X}TypeDto` (includes DB `Id`, used in persisted/returned payloads) and `Get{X}TypeDto` (no `Id`, used in create/update inputs and for calculated views). The two shapes overlap heavily with renamed or re-arranged fields.
- **`OfferDto` is the canonical "envelope"** — ~70 fields including one nullable pointer per subtype DTO. Consumers must null-check and dispatch.
- **`OfferType` enum has `[Description]`** — serialized as int (0–5), but human-readable labels retrievable via `EnumHelper.GetEnumDescription`. Applied across both ZIP (`AccountType`, `BusinessType`, `BuyingStrategy`, `InvestorType`, `PropertyType`, `Role`, `UsState`) and TIH (`UsState`, `CustomFieldControlType`) enums.
- **`[Required]` applied sparingly** — `CreateOfferDto.IbuyerId`/`PropertyId` are `[Required]`; `UpdateOfferDto` has no `[Required]` attributes. Consumers are expected to validate at the controller edge.
- **Newtonsoft.Json is the chosen serializer** — imports in `GetPropertyOfferDto.cs`. No System.Text.Json usage in this package. Consumers that use System.Text.Json must accept Newtonsoft attributes for interop (though none are declared in the DTOs — the `[Description]` attributes are reflection-consumed, not serialization-driven).
- **Property name `HoldbackPercantage` (sic)** — the typo is stable across `CashOfferPlusType`, `FixListType`, `SellLeasebackType`, their DTOs, the `Get*` DTOs, and the DB column. Don't "fix" it — renaming breaks every downstream JSON wire format.

## Exception / error handling patterns

- **`UserFriendlyException`** appears in both ZIP (`ZoodealioInvestorPortal.Domain.Exceptions`) and TIH (`TradeInHoldings.Domain.Exceptions`). Two separate implementations — same name, same shape, same intent (thrown where the `Message` should be displayed to the end user; consumer services catch it in an exception filter and return a recognizable HTTP status + forward the message to the UI). The ZIP comment notes the filter is "not yet implemented"; per TIH agent output the filter in TIH returns HTTP 499 — **verify in consumer repos before relying on status code**.
- **`ChangeRequestRequiredException : UserFriendlyException`** (TIH) — specialization thrown when an action requires routing through the ChangeRequest approval workflow instead of executing directly.

## Authorization pattern (ZIP only)

- **`RoleHierarchy.ToAllowedRoleNames(roles, includeAdmin=true)`** — expands a set of declared roles to their full allowed set (including superiors + Admin by default). Used with `[AuthorizeRoles(...)]` endpoint filters in the ZIP service. `SuperiorRoles` is a static dict (currently: `Investor ← [Enterprise]`). `Admin` is universally included when `includeAdmin` is true.

## Config/working duality (TIH only)

- **Every `*Config` entity has a runtime `*` counterpart.** Templates (`WorkflowConfig`, `WorkflowStageConfig`, `WorkflowStageTaskConfig`, `CustomFieldConfig`, `CustomFieldLayoutConfig`) define structure; working entities (`Workflow`, `WorkflowStage`, `WorkflowStageTask`, `CustomPropertyField`, `CustomFieldLayout`) are per-transaction instances that point back at their config. Configs have an `IsLocked bool?` immutability toggle.

## Approval-gated mutation (TIH only)

- **`ChangeRequest` routes mutations of `IsChangeRequestRequired` working entities through a Pending/Approved/Rejected workflow** with explicit `InitiatorUser`, `ApproverUser` (or `ApproverDepartment`), and `ResolvedByUser`. The CK constraint on `ChangeRequest` ensures exactly one of two possible targets (`WorkflowStageTask` or `CustomFieldLayout`) is set — a dual-foreign-key polymorphic pattern.

## Enum presentation

- **`EnumHelper` duplicated verbatim in ZIP and TIH.** Same methods (`GetEnumDescription<TEnum>(int)`, `GetEnumAsListTyped<T>()`, obsolete `GetEnumAsList<T>()`), same supporting `EnumAsListItem { int? index, string? name, string? desc }`. Copy-paste, not shared. Changes in one must be mirrored.
- **`UsState` duplicated** in ZIP and TIH (identical 0..50 members including the `DC = 50 [Description("Washington")]` typo in both).

## Table-naming conventions

- **Offervana** — multi-schema SQL layout with explicit `[Table("Name", Schema="...")]` on many entities. Schemas observed: `dbo`, `Customer`, `Brokerage`, `Admin`, `History`, `BinaryStorage`, `Common`, `Realvalue`, `Integration`.
- **ZIP** — pluralized defaults (`Users`, `Companies`, `CompanyUsers`) with explicit `ToTable("CompanyInvites")` override on one entity to match a pre-existing table name.
- **TIH** — pluralized defaults across the board, except `UnderwriteOfferHistory` (singular, explicit `entity.ToTable("UnderwriteOfferHistory")`).

## Patterns not present (deliberately)

- No MediatR — this is a shared library, not a service. No command/query definitions.
- No AutoMapper — no mapping profiles. Each consumer defines its own profiles around these DTOs/entities.
- No validators (FluentValidation etc.) — validation attributes only.
- No logging — no `ILogger` usage anywhere.
- No controllers / API endpoints — see api-catalog.md.
- No JWT Bearer auth configuration — consumer services wire that up.
- No Azure Blob Storage client — entities model blob metadata, consumers manage the storage client.
- No Temporal.io client — see workflows.md.
- No SendGrid integration — consumers own email.
- No feature flags, no rate limiting, no health checks.

## Tooling / DX

- Solution format: VS 2019-era `sln` (`Format Version 12.00`, `FAE04EC0-301F-11D3-BF4B-00C04F79EFBC` C# GUID). Works equally in VS 2022, Rider, dotnet CLI.
- `.gitignore` is minimal (76 bytes) — watches for common build output only. No solution-level editorconfig in the repo root.
