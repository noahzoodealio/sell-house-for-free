# Zoodealio.Shared — Architecture

## What this package is

`Zoodealio.Shared` is a **single .NET class library** (`Zoodealio.Shared.csproj`, `Zoodealio.Shared.sln`) distributed as a NuGet package on the Azure Artifacts feed `zoodealioshared`. It's the authoritative source for three kinds of cross-service contracts:

1. **Offer DTOs** — the serialized shape of offers that flow between every service in the platform.
2. **Shared EF Core models** — three distinct DbContexts (OffervanaDb, InvestorPortalDb, TradeInHoldingsDb) packaged together so any consuming service can read/write those databases without duplicating entity definitions.
3. **DI registration helpers** — one-line `services.Add*DbContext(...)` extension methods consumers call in `Program.cs`.

It is **not a service** — no `Program.cs`, no `Startup`, no web host, no Docker image, no deployment pipeline beyond `dotnet pack` + `nuget push`. It builds on every push to `main` and publishes a version-stamped package.

## Single-project solution

```
Zoodealio.Shared.sln
└── Zoodealio.Shared.csproj   (single project, net10.0, PackageId="Zoodealio.Shared")
```

No `Api/Application/Domain/Infrastructure` layering because the package isn't a service — it's the substrate other services' Domain and Infrastructure layers *import*. The internal folder layout is by **consumer**, not by layer:

```
Zoodealio.Shared/
├── Dtos/Offers/                     (Zoodealio.Shared.Dtos.Offers namespace)
├── Offervana/LegacyData/            (Offervana.LegacyData namespace)
│   ├── Entities/                    (31 entity classes)
│   ├── Enums/                       (6 enum files)
│   ├── OffervanaDbContextBase.cs
│   ├── OffervanaDbContext.cs
│   ├── OffervanaReadOnlyDbContext.cs
│   ├── OffervanaDbContextRegistration.cs
│   └── OffervanaModelConfiguration.cs
├── InvestorPortal/
│   ├── Domain/Entities/             (ZoodealioInvestorPortal.Domain.Entities, 15 classes)
│   ├── Domain/Enum/                 (14 enum-ish files incl. EnumHelper, RoleHierarchy)
│   ├── Domain/Exceptions/UserFriendlyException.cs
│   └── Infrastructure/
│       ├── InvestorPortalDbContext.cs
│       └── InvestorPortalDbContextRegistration.cs
└── TradeInHoldings/
    ├── Domain/Entities/             (incl. TransactionWorkflows/Configs & /WorkingEntities)
    ├── Domain/Enums/                (6 enum-ish files incl. EnumHelper)
    ├── Domain/Exceptions/           (UserFriendlyException, ChangeRequestRequiredException)
    └── Infrastructure/
        ├── TradeInHoldingsDbContext.cs
        └── TradeInHoldingsDbContextRegistration.cs
```

Three root folders = three consumer realms. Namespaces deliberately differ (`Offervana.LegacyData`, `ZoodealioInvestorPortal.Domain.*`, `TradeInHoldings.Domain.*`) to match the expectations of each downstream service.

## Dependencies

```
PackageReferences (all from Zoodealio.Shared.csproj):
  Newtonsoft.Json                                       13.0.4
  Microsoft.EntityFrameworkCore                         10.0.5
  Microsoft.EntityFrameworkCore.SqlServer               10.0.5
  Microsoft.EntityFrameworkCore.Relational              10.0.5
  Microsoft.Extensions.Configuration.Abstractions       10.0.5
  Microsoft.Extensions.DependencyInjection.Abstractions 10.0.5
```

- **EF Core 10** + **SQL Server provider** — hard dependency; all three models are SQL Server-only. Consumers get the same EF version by importing the package.
- **Newtonsoft.Json** is present because `GetPropertyOfferDto` uses `JArray.Parse` to consume embedded JSON (`resaleoffersJson`, `additionaloffersJson`). System.Text.Json is not used.
- **Configuration.Abstractions + DependencyInjection.Abstractions** — the minimum needed to provide `IServiceCollection.Add*DbContext(IConfiguration, ...)` extension methods without forcing consumers into a specific host model.

## Build & distribution

### `global.json`
```json
{ "sdk": { "version": "10.0.100", "rollForward": "latestFeature", "allowPrerelease": false } }
```

Enforces .NET SDK 10.0.100 (or any later feature band in 10.x). No prerelease SDKs allowed.

### `azure-pipelines.yml`
Trigger: `main` only; PR builds disabled (`pr: none`).
Pool: `windows-latest`.
Steps:
1. `NuGetAuthenticate@1` — auth against the Azure Artifacts feed.
2. Set `PackageVersion` in PowerShell:
   - On `refs/heads/main`: stable version `<major>.<minor>.(<patch> + $(Build.BuildId))` — i.e. patch component becomes `originalPatch + buildId`.
   - Other branches: pre-release `<base>-ci-<buildId>` (e.g. `0.1.0-ci-12345`). README shows this format but the `csproj` pins `<Version>0.0.0</Version>` — the pipeline is the sole source of versioning truth.
3. `dotnet restore` → `dotnet build -c Release --no-restore` → `dotnet pack Zoodealio.Shared.csproj -c Release --no-build -o <ArtifactStaging> -p:PackageVersion=$(PackageVersion)`.
4. `NuGetCommand@2 push` publishes `*.nupkg` + `*.snupkg` to `$(System.TeamProject)/zoodealioshared` with `allowPackageConflicts: true` (ignore duplicate-version failures).

`<IncludeSymbols>true</IncludeSymbols>` + `<SymbolPackageFormat>snupkg</SymbolPackageFormat>` — symbols ship alongside the package.

### Consumption
From README:
```
dotnet nuget add source "https://pkgs.dev.azure.com/{org}/{project}/_packaging/zoodealioshared/nuget/v3/index.json" \
  --name ZoodealioShared --username az --password <PAT> --store-password-in-clear-text
```
Then `<PackageReference Include="Zoodealio.Shared" Version="0.1.0-ci-<buildId>" />` (or a stable build-id-stamped version).

## Integrations (as seen through this package)

- **SQL Server** via EF Core 10 — the only storage dependency. No other databases (Redis, Cosmos, blobs) referenced from the entity classes, though some entities model external resources:
  - `BlobFile` entity (Offervana) represents rows that describe Azure Blob Storage objects — the entity holds metadata; the actual blob client lives in consumer services.
  - `Document` entities (ZIP + TIH) similarly carry `BlobName`, `ContentType`, `FileUrl` — pointers to blob storage managed by the consuming service.
  - `SlackPropertyThread` (Offervana) holds Slack integration metadata (`ThreadTimestamp`) — actual Slack client lives in the Offervana service.
- **ABP Zero framework** (Offervana) — visible via `[dbo].[AbpUsers]`, `[dbo].[AbpEditions]`, `[dbo].[AbpTenants]` table mappings on `OffervanaUser`, `Edition`, `Tenant`. The shared library exposes *readable* projections of these ABP tables but does not depend on ABP itself — ABP runtime lives only inside Offervana_SaaS.
- **Investor Portal ↔ TIH bi-directional link** is modeled via `FundingRequestZipUserUserAssociation.ZipUserId Guid` (TIH side) pointing at `ZoodealioInvestorPortal.Domain.Entities.User.Id` (ZIP side). The shared package defines both sides of that junction.
- **Investor Portal ↔ Offervana link** — `IBuyerOffer.InvestorPortalUserId/CompanyId Guid?` + `Counter{By,Response}InvestorUserId Guid?` + `ModifiedByInvestorUserId Guid?` in Offervana carry ZIP user/company IDs. Similarly `OfferNote.CreatorInvestorUserId Guid?`. `InvestorHiddenProperties` / `InvestorWatchlistProperties` store `InvestorPortalUserId Guid`.

## Durable workflows / background jobs

**None in this package.** No Temporal client, no hosted services, no `IHostedService`, no scheduled jobs. Workflow orchestration runs inside consumer services (Offervana_SaaS, Zoodealio.Chat, Zoodealio.MLS use Temporal). This package only defines the *entity shapes* those workflows operate on — e.g. TIH's `Workflow`/`WorkflowStage`/`WorkflowStageTask` entities are a domain-model workflow implementation (approval-gated multi-stage work) distinct from Temporal workflows.

## Access boundary rules (from `CLAUDE.md` workspace map + evidence in code)

- **OffervanaDb is written by Offervana_SaaS only.** Other services use `OffervanaReadOnlyDbContext` (the `AddOffervanaReadOnlyDbContext` registration defaults to the `FailoverDb` connection string, implying read-replica wiring). `OffervanaDbContext` (read-write) is also registered by the library but should only be pointed at the primary DB from the writer service.
- **InvestorPortalDb is written by investor-portal only.** `AddInvestorPortalDbContext` requires the caller pass `migrationsAssembly` — migrations are owned by the consumer, not the shared package.
- **TradeInHoldingsDb is written by Zoodealio.TradeInHoldings only.** Same pattern — caller supplies `migrationsAssembly`.
- The package does *not* enforce these rules — it just provides the contexts; enforcement is organizational.

## Layered project structure (does not apply here)

Per `CLAUDE.md`, consumer services follow `Api / Application / Domain / Infrastructure / LegacyData / Integrations`. `Zoodealio.Shared` is what fills the `LegacyData` project in consumers that need cross-DB access. It is itself unlayered — a single flat class library.

## Known architectural tensions

- **`GetPropertyOfferDto.cs` carries ~900 lines of offer calculation logic** — the comment inside acknowledges it duplicates `angular/src/app/shared/services/realvalue-calculation.service.ts` and says "both methods should be updated simultaneously." That coupling is load-bearing: C# and TypeScript must stay in sync, but there is no test gate in this repo to enforce it.
- **Versioning is decoupled from code** — the csproj pins `<Version>0.0.0</Version>` and the pipeline overrides. Local `dotnet pack` builds will produce a 0.0.0 package; reproducible versioning only exists in CI.
- **`allowPackageConflicts: true`** on push means a manual re-run of the same build can overwrite an already-published version silently. Consumers pinning to a specific `<patch+buildId>` are OK; consumers floating on a range could see bit-for-bit different packages at the same version.
- **PR builds are disabled.** Changes to `Zoodealio.Shared` that break downstream services won't surface until after merge to `main` + a consumer rebuild.
