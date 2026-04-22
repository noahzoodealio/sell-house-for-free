# Zoodealio.Shared — API Catalog (public NuGet contract)

**Package:** `Zoodealio.Shared` · **PackageId:** `Zoodealio.Shared` · **TargetFramework:** `net10.0` · **SDK:** `10.0.100`
**Distribution:** Azure Artifacts feed `zoodealioshared` (`tf-offervana/Offervana_SaaS/_packaging/zoodealioshared`). CI publishes on push to `main` as `<buildId>.0.0` stable, or `0.1.0-ci-<buildId>` pre-release on other branches (see `azure-pipelines.yml`).

**No HTTP controllers, no routes, no auth.** This package *is* the cross-service contract — every listed symbol is a public type consumed by downstream services (Offervana_SaaS, TradeInHoldings, InvestorPortal, Chat, etc.) via NuGet.

## Public surface areas

1. **Offer DTOs** — `Zoodealio.Shared.Dtos.Offers` namespace. The cross-service offer domain model.
2. **DI extension methods** — public `IServiceCollection` registration helpers for the three bundled DbContexts.
3. **Entities + DbContexts** — shared across services (schemas detailed in `schemas.md`).

---

## 1. Offer DTOs (`Zoodealio.Shared.Dtos.Offers`)

### 1.1 Core enums

- **`OfferType`** (`int`): `CashOffer=0`, `CashOfferPlus=1`, `SellLeaseback=2`, `FixList=3`, `CashBuyer=4`, `ListOnMarket=5`. Each member carries a `[Description]` attribute (e.g. `"Cash Offer with upside (cash offer+)"`). Used as the discriminator wherever an offer is serialized.

### 1.2 iBuyer DTOs

- **`IBuyerDto`** — `Id`, `Name`, `DisplayName`, `Address`, `Url`, `ServiceChargePercentage`, `IsActive`, `TenantId?`, `OfferType?`, `IBuyerOptions`.
- **`IBuyerOptionsDto`** — filters/requirements an iBuyer applies to a property: beds min/max, baths min/max, sqft min/max, stories, yearBuilt, pool, price min/max, population, `IBuyerId?`.

### 1.3 Offer request/response envelopes

- **`OfferDto`** — the primary serialized offer. 70+ fields: ids (`Id`, `PropertyId`, `IBuyerId`), monetary (`OfferAmount`, `BrokerageChargesAmount/Percentage`, `IBuyerServiceChargeAmount/Percentage`, `OtherFeesAmount/Percentage`, `RentMin/Max`), notes (`Notes`, `AgentNotes`, `InternalNotes`), state flags (`IsSatisfied`, `IsAccepted`, `IsDisabled`, `IsDeleted`, `IsExpired` computed from `ExpirationDate`, `IsSharedToCustomer`, `IsPreliminary`, `IsCurrent`, `IsUserEnabled`, `IsRenewalRequested`, `IsEditLocked`), counter-offer fields (`IsCounterOffer`, `CounterOfferId`, `CounterOfferAmount`, `CounterOfferNotes`, `CounterOfferDate`, `CounterOfferByUserId`, `CounterOfferDirection`, `CounterOfferResponseStatus/Date/Notes/ByUserId`, `CounterOfferCurrentPropertyOfferStatus`), JSON blob fields (`SurveyJson`, `FeedbackFormJson`, `BuyboxValidationJson`, `AdditionaloffersJson`, `ResaleoffersJson`), lifecycle (`OfferVersion`, `OfferEventType`, `OfferStatusId`/`OfferStatus`, `EscrowOpenedDate`, `ClosingDate`, `IBuyerOfferRefID`), InvestorPortal linkage (`InvestorPortalCompanyId`, `InvestorPortalUserId`), submitter identity (`SubmittedByFirstName/LastName/Email`), and navigation to the subtype DTO (exactly one of `CashOfferType`, `CashOfferPlusType`, `FixListType`, `SellLeasebackType`, `CashBuyerType`, `ListOnMarketType`).
- **`CreateOfferDto`** — `[Required] IbuyerId`, `[Required] PropertyId`, `ExpirationDate?`, `Notes`, `IsSharedToCustomer`, `IsPreliminary?`, `ResaleoffersJson?`, `AdditionaloffersJson?`, `IsEditLocked?`, plus exactly one of the six `Get*TypeDto` subtype variants.
- **`UpdateOfferDto`** — `Id`, `PropertyId`, `IbuyerId`, plus the same fields as `CreateOfferDto` plus `IsAccepted?`. No `[Required]` attributes.
- **`DeleteOfferDto`** — `Id` only.
- **`OfferSurveyDto`** — `ClosingDate?`, `OutstandingMortgageBalance?` (long), `OutstandingLiens?` (long).

### 1.4 Offer subtype DTOs (seven variants × two flavors)

Two parallel hierarchies exist per offer subtype: `{X}TypeDto` (full — with DB `Id` + `IBuyerOfferId`, used by `OfferDto`) and `Get{X}TypeDto` (calculate-only — no `Id`, used by `CreateOfferDto`/`UpdateOfferDto` and returned in `GetPropertyOfferDto.OfferTypeDetails`).

- **`CashOfferTypeDto` / `GetCashOfferTypeDto`** — OfferAmount, ServiceFee(Amount/Percentage), BrokerServiceCharge(Amount/Percentage), ClosingCost(Amount/Percentage), ViewCommission(Amount/Percentage), Holdback(Amount/Percentage). Calculate region adds Display doubles of each plus `ComBrkServiceTotalAmount/PercentageDisplay`.
- **`CashOfferPlusTypeDto` / `GetCashOfferPlusTypeDto`** — OfferAmount, ServiceFee(Amount1/Percentage1/Amount2/Percentage2), ResaleFee(same pairs), Holdback(Amount/`Percantage` — note misspelling), ClosingCost, ViewCommission, BrokerServiceCharge. Calculate region: Net, totals, `FirstPayout`, `SecondPayout`, `TotalPayouts`, `RangeMax`, plus holding-cost fields (`ProjectedDaysOnMarket`, `HoldingCostDeduction`, `InterimOwnershipCostsIncluded`, `InterimHoldingCost(Amount/Percentage)`, `HasMonthlyHoldingCosts`, `MonthlyHoldingCost(Amount/Percentage/Label)`).
- **`FixListTypeDto` / `GetFixListTypeDto`** — Same shape as CashOfferPlus plus `EstimatedRepairsAmount`/`EstimatedRepairsPercentage`.
- **`SellLeasebackTypeDto` / `GetSellLeasebackTypeDto`** — OfferAmount, ServiceFee, ResaleFee, `IsRentFlat?`, RentFlat(Amount/Percentage), RentMin/Max (Amount/Percentage), ClosingCost, Holdback, ViewCommission, BrokerServiceCharge. Calculate: Net, FirstPayout, SecondPayout, TotalPayouts, `MonthlyRent`, RangeMax, Display variants.
- **`CashBuyerTypeDto` / `GetCashBuyerTypeDto`** — ServiceFee, ClosingCost, ViewCommission (no OfferAmount — this variant doesn't publish an offer amount).
- **`ListOnMarketTypeDto` / `GetListOnMarketTypeDto`** — OfferAmount, DaysOnMarket, Commission, ClosingCost, StateTax. Calculate: Net, TotalPayouts, RangeMin, RangeMax, Display variants.

### 1.5 Property / offer status DTOs

- **`PropertyOfferDto`** — minimal property shape for embedding in offers: `Id`, `Address1/2`, `City`, `StateCd`, `ZipCode`, `Country`, `RealValue` (float), `MortgageLienAmount`, `CreationTime`.
- **`PropertyOfferStatusDto`** — snapshot of `PropertyOfferStatuses` row: `Id` (Guid), `OfferStatusId` (Guid), `CreatedUtc`, `OfferStatus` nav.
- **`OfferStatusDto`** — `Id` (Guid), `DisplayName`, `SystemName`, `HexColorCode`, `SortOrder?`, `IsPostAcceptanceStatus`, `Phase`.
- **`UpdateOfferStatusInput`** (co-located in `OfferStatusDto.cs`) — `OfferId` (int), `StatusId` (Guid).
- **`GetPropertyOfferDto`** — "external read model" variant constructed from an `OfferDto` + mortgage-lien amount + extra JSON. Ctor `GetPropertyOfferDto(OfferDto, decimal? mortgageLienAmount, string? resaleoffersJson, string? additionaloffersJson)`. Populates `OfferTypeDetails` as a `dynamic` (one of the `Get*TypeDto` subtypes) by delegating to internal calculation helpers. **See note in §3.** Contains ~50 fields mirroring `OfferDto` plus computed fields like `IsExpired`, `OfferTypeName` (description-attribute text).

---

## 2. DbContext DI registrations (public extension methods)

These are the "API" the shared library exposes to consumer `Program.cs` / composition roots.

### 2.1 `Offervana.LegacyData.OffervanaDbContextRegistration`

- `IServiceCollection.AddOffervanaDbContext(IConfiguration, string connectionStringName = "OffervanaDb")` — registers `OffervanaDbContext` (read-write, SQL Server).
- `IServiceCollection.AddOffervanaReadOnlyDbContext(IConfiguration, string connectionStringName = "FailoverDb")` — registers `OffervanaReadOnlyDbContext` (query-only, `NoTracking`; the `FailoverDb` default implies expected use with a read-replica / failover connection string).

### 2.2 `ZoodealioInvestorPortal.Infrastructure.InvestorPortalDbContextRegistration`

- `IServiceCollection.AddInvestorPortalDbContext(IConfiguration, string migrationsAssembly, string connectionStringName = "InvestorPortalDb")` — registers `InvestorPortalDbContext`. **`migrationsAssembly` is required** — the shared library does not own migrations; each consuming service specifies its own migrations assembly.

### 2.3 `TradeInHoldings.Infrastructure.TradeInHoldingsDbContextRegistration`

- `IServiceCollection.AddTradeInHoldingsDbContext(IConfiguration, string migrationsAssembly, string connectionStringName = "TradeInHoldingsDb")` — same pattern as investor-portal; migrations owned by the consumer.

---

## 3. Notable observations

- **Typo `Percantage` is load-bearing.** The property name `HoldbackPercantage` (sic) appears in `CashOfferPlusTypeDto`, `FixListTypeDto`, `SellLeasebackTypeDto` *and* their `Get*` counterparts. Renaming would break JSON serialization compatibility across all consuming services. Treat as an intentional frozen contract spelling.
- **`GetPropertyOfferDto.OfferTypeDetails` is typed `dynamic`.** The calculation helpers (600+ LOC inside `GetPropertyOfferDto.cs`) are part of the shared package despite being called "DTOs" — the file ports a duplicated calculation from `angular/src/app/shared/services/realvalue-calculation.service.ts` (per in-file comment: "Same logic is implemented on ... Going forward both the method should be updated simultaneously"). This is business logic bundled into the NuGet, not a pure transport object.
- **No `[Required]` on `UpdateOfferDto`** — only `CreateOfferDto` marks `IbuyerId` and `PropertyId` required. Consumers that perform updates must validate at the edge.
- **Subtype mutual exclusion is enforced by convention, not structure.** `OfferDto` has all six nullable subtype refs; semantically exactly one should be non-null (matches the DB table subclass structure — see schemas.md).
- **No service-level API exists to reference.** Downstream services (Offervana_SaaS, TIH, ZIP, Chat) expose HTTP endpoints that consume/produce these DTOs — those are documented in each service's own `api-catalog.md`.
