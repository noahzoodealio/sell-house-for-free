# Zoodealio.Shared — Schemas (entities, DbContexts, relationships)

**Scope:** `Zoodealio.Shared` bundles *three separate* EF Core models — one per consuming database. Each model has its own `DbContext`, its own table naming, its own conventions. They do not share FKs across models.

| Model | DbContext(s) | Namespace | Target DB | Conventions |
|---|---|---|---|---|
| Offervana Legacy | `OffervanaDbContext` (RW) + `OffervanaReadOnlyDbContext` (NoTracking) | `Offervana.LegacyData` | `OffervanaDb` / `FailoverDb` | `dbo` default schema; strings default `MaxLength(255)` via `ConfigureConventions`; derived tables use named schemas (`Customer.`, `Brokerage.`, `Admin.`, `History.`, `BinaryStorage.`, `Common.`, `Realvalue.`, `Integration.`) |
| Investor Portal | `InvestorPortalDbContext` | `ZoodealioInvestorPortal.Domain` / `.Infrastructure` | `InvestorPortalDb` | Default schema; migrations assembly supplied by consumer |
| Trade In Holdings | `TradeInHoldingsDbContext` | `TradeInHoldings.Domain` / `.Infrastructure` | `TradeInHoldingsDb` | Default schema; Guid PKs `ValueGeneratedNever` (client-generated); migrations assembly supplied by consumer |

**DI registration** (see `api-catalog.md §2`): `AddOffervanaDbContext` / `AddOffervanaReadOnlyDbContext` (no migrations assembly needed — Offervana_SaaS owns migrations); `AddInvestorPortalDbContext(..., migrationsAssembly, ...)`; `AddTradeInHoldingsDbContext(..., migrationsAssembly, ...)`.

---

# Part 1 — Offervana Legacy Model (`Offervana.LegacyData`)

Read-write via `OffervanaDbContext`; read-only mirror via `OffervanaReadOnlyDbContext` (`ChangeTracker.QueryTrackingBehavior = NoTracking`). Both derive from `OffervanaDbContextBase`. Model config lives in `OffervanaModelConfiguration.Configure(ModelBuilder)`.

**Model-builder rules (`OffervanaModelConfiguration`):**
- Default schema `dbo`.
- `Tenant` 1:1 `Brokerage` (FK `TenantId` on Brokerage).
- `IBuyerOffer` 1:1 with each of the six offer-type subtypes via `IBuyerOfferId` FK on the subtype side.
- `IBuyerOffer.CurrentPropertyOfferStatus` 1:1 via `PropertyOfferStatusId` (optional, `OnDelete = NoAction`).
- `PropertyOfferStatus` indexes: `(OfferId, CreatedUtc desc)` and `PropertyId`.
- `Property → PropertyOfferStatuses` 1:N with `OnDelete = NoAction`.
- `OfferStatus.Properties` collection is `Ignored` (legacy compat).
- All strings default to `MaxLength(255)` via `ConfigureConventions`.

## 1.1 Enums

**`AcceptedFromPage`** (int): `OffersTab=0`, `OffersDashboard=1`, `BlastDashboard=2`
**`OfferEventType`** (int): `Created=0`, `HostEdit=1`, `AgentCounter=2`, `HostCounter=3`, `Accepted=4`, `Rejected=5`
**`CounterOfferDirection`** (int): `None=0`, `AgentToHost=1`, `HostToAgent=2`
**`OfferNoteCategory`** (int): `Client=0`, `Agent=1`, `Internal=2`, `CounterOffer=3`
**`PropertyStatus`** (int): `New=1`, `Reviewed=2`, `SubmittedOffer=3`
**`SubmitterRole`** (int): `Homeowner=0`, `HomeownerAndAgent=1`, `Agent=2`, `Admin=3`

## 1.2 Entities

### `Activity` — `[History].[Activities]` (int PK)
`Id int`, `Message string?(255)`, `NotificationId int`, `PropertyId int?`, `Duration long? default 0`, `ContainerType long? default 0`.

### `Agent` — `[Brokerage].[Agents]` (int PK)
`Id`, `FirstName/LastName/CellPhone/Email string?(255)`, `IsManager/IsAdmin bool default false`, `ReferralCode/CustomDomain string?(255)`, `IsCustomDomain bool default false`, `UserId long`, `ManagerId int?`, `AdminId int?`, `TenantId int`.
Navigations: `Manager` (self-ref via `ManagerId`, inverse `Agents`); `Admin` (self-ref via `AdminId`, inverse `AgentsUnderAdmin`); `Tenant`; `NotificationPermissions`; `User → OffervanaUser` via `UserId`.

### `AgentNotification` — `[History].[AgentNotifications]` (int PK)
`Id`, `IsViewed/IsAgentAction bool default false`, `CustomerId int?`, `NotificationType NotificationType (ZIP enum)`, `CreationTime/UpdateTime DateTime default UtcNow`, `ActorUserId long?`, `ActorType ActorType? (ZIP enum)`, `Priority string?(255)`, `NotificationClosed bool default false`.
Navigations: `Customer`.

### `BinaryObjects` — `[dbo].[AppBinaryObjects]` (Guid PK)
`Id Guid`, `TenantId int?`, `Bytes byte[]?`.

### `BlobFile` — `[BinaryStorage].[BlobFiles]` (int PK)
`Id`, `CreationTime DateTime`, `CreatorUserId long?`, `LastModificationTime DateTime?`, `LastModifierUserId long?`, `FileName string(128) varchar(128)`, `ThumbnailFileName string?(256) varchar(256)`, `ContainerName string(255)`, `Label string?(512) varchar(512)`, `Extension string(255)`.
Navigations: `PropertyDocuments`, `OfferDocuments`.

### `Brokerage` — `[Brokerage].[Brokerages]` (int PK)
`Id`, `Name string?(255)`, `TenantId int`.
Navigations: `Tenant` (1:1 per model config).

### `CashBuyerType` — `[dbo].[CashBuyerType]` (int PK)
`Id`, `ServiceFee(Amount/Percentage) decimal?`, `ClosingCost(Amount/Percentage) decimal?`, `ViewCommission(Amount/Percentage) decimal?`, `IBuyerOfferId int?`.
Navigations: `IBuyerOffer`.

### `CashOfferPlusType` — `[dbo].[CashOfferPlusType]` (int PK)
43+ decimal fields — all of: OfferAmount, ServiceFee(Amount1/Percentage1/Amount2/Percentage2), ResaleFee(same), Holdback(Amount/Percantage sic), ClosingCost, ViewCommission, BrokerServiceCharge. Plus computed/display columns: NetOfferAmount, ServiceFee{Percentage,Amount}Total, AgentComResaleClosingPercentage, ResaleFee{Amount,Percentage}Total, FirstPayout, SecondPayout, TotalPayouts, RangeMax, Holdback{Amount,Percantage}Display, ClosingCost{Amount,Percentage}Display, ComBrkServiceTotal{Amount,Percentage}Display. Holding costs: ProjectedDaysOnMarket int?, HoldingCostDeduction decimal?, InterimOwnershipCostsIncluded bool?, InterimHoldingCost(Amount/Percentage), HasMonthlyHoldingCosts bool?, MonthlyHoldingCost(Amount/Percentage/Label string?(255)). FK: `IBuyerOfferId int?`.

### `CashOfferType` — `[dbo].[CashOfferType]` (int PK)
OfferAmount, ServiceFee, BrokerServiceCharge, ClosingCost, ViewCommission, Holdback (all Amount/Percentage pairs, decimal?), NetOfferAmount, ServiceFee/ClosingCost/BrokerServiceCharge/Holdback/ComBrkServiceTotal display variants, `IBuyerOfferId int?`.

### `Customer` — `[Customer].[Customers]` (int PK)
`Id`, `FirstName/LastName/PhoneNumber/Email string?(255)`, `TenantId int`, scoring fields (`BaseScore/HighIntentScore/MediumIntentScore/TimeBonusScore/ExtraFlagsScore/TotalScore int default 0`), `IsSellerSource bool default false`, `SubmitterRole SubmitterRole?`, `ReferralCode string(255)`, `ReferralLink string?(255)`, `AgentId int?`.
Navigations: `Tenant`, `Agent`, `Properties`.

### `Edition` — `[dbo].[AbpEditions]` (int PK)
`Id`, `Name/DisplayName string?(255)`, `IsEnterprise bool default false`.
Navigations: `Tenants`.

### `FixListType` — `[dbo].[FixListType]` (int PK)
Same shape as `CashOfferPlusType` plus `EstimatedRepairsAmount/Percentage`. FK: `IBuyerOfferId int?`.

### `IBuyer` — `[Admin].[IBuyers]` (int PK)
`Id`, `Name/DisplayName/Address/Url string?(255)`, `ServiceChargePercentage decimal`, `IsActive bool default false`, `OfferType Zoodealio.Shared.Dtos.Offers.OfferType?`, `IsInvestorPortalStatic bool?`. (Note: TenantId is referenced from `IBuyerDto` but **not** present here — asymmetry between DTO and entity.)

### `IBuyerOffer` — `[Customer].[IBuyerOffers]` (int PK)
The central offer entity. 50+ columns: `OfferAmount decimal`, notes (`Notes/AgentNotes/InternalNotes string?(255)`), state flags (`IsSatisfied/IsAccepted/IsCurrent/IsSharedToCustomer/IsPreliminary/IsUserEnabled/IsRenewalRequested/IsDisabled/IsNewOffer/IsDeleted/IsEditLocked/IsCounterOffer bool?`), timestamps (`ExpirationDate/CreationTime/LastModificationTime/AcceptedDate/DeletedDate/EscrowOpenedDate/ClosingDate DateTime?`), audit (`AcceptedFromPage AcceptedFromPage?`, `AcceptedByUserId long?`, `LastModifierUserId long?`, `OfferEventType OfferEventType default Created`, `OfferVersion int default 1`, `ModifiedByInvestorUserId Guid?`), JSON blobs (`BuyboxValidationJson/AdditionaloffersJson/ResaleoffersJson string?(255)`), counter-offer block (`CounterOffer{Date/Amount/Notes/ByUserId/Direction/ResponseStatus/ResponseDate/ResponseNotes/ResponseByUserId}`, plus `CounterByInvestorUserId/CounterResponseByInvestorUserId Guid?`), investor-portal link (`InvestorPortalCompanyId/InvestorPortalUserId Guid?`), `IBuyerOfferRefID int?`, FKs (`PropertyId int`, `IBuyerId int`, `PropertyOfferStatusId Guid?`).
Navigations: `Property`, `IBuyer`, `CurrentPropertyOfferStatus`, one of `CashOfferType/CashOfferPlusType/SellLeasebackType/FixListType/CashBuyerType/ListOnMarketType` (1:1), `OfferDocuments`.
Computed/[NotMapped]: `IsExpired => ExpirationDate != null && ExpirationDate <= DateTime.Now`; `DeadlineDate => AcceptedDate?.AddDays(30)`.

### `InvestorHiddenProperties` — `[Customer].[InvestorHiddenProperties]` (Guid PK)
`Id Guid [Key]`, `InvestorPortalUserId Guid`, `PropertyId int`. Nav `Property`.

### `InvestorWatchlistProperties` — `[Customer].[InvestorWatchlistProperties]` (Guid PK)
Same shape as `InvestorHiddenProperties`.

### `PropertyDocument` (DbSet name `ListedPropertyDocuments`) — `[Customer].[PropertyDocuments]` (int PK)
`Id`, `CreationTime DateTime`, `CreatorUserId long?`, `LastModificationTime DateTime?`, `LastModifierUserId long?`, `PropertyId int`, `BlobFileId int`, `IsPhoto bool default false`. Navs: `Property`, `BlobFile`.

### `ListOnMarketType` — `[dbo].[ListOnMarketType]` (int PK)
`OfferAmount`, `DaysOnMarket int?`, `Commission/ClosingCost/StateTax (Amount/Percentage)`, Net/TotalPayouts/RangeMin/RangeMax/ClosingCostAmountDisplay/CommissionAmountDisplay, `IBuyerOfferId int?`.

### `NotificationPermissions` — `[Common].[NotificationPermissions]` (int PK)
`Id`, multiple SMS/Email toggle bools (`offerAcceptedSMS/Email`, `newOfferSMS/Email`, `newClientSMS/Email`, `dashboardViewedSMS/Email`), `TenantId int?`, `AgentId int?`. Navs: `Tenant`, `Agent`.

### `OfferDocument` — `[Customer].[OfferDocuments]` (int PK)
`Id`, audit fields, `IsComparablesAnalysis/IsOfferExplainer bool default false`, `OfferId int`, `BlobFileId int`. Navs: `Offer → IBuyerOffer`, `BlobFile`.

### `OfferNote` — `[Customer].[OfferNotes]` (int PK)
`Id`, `TextBody string(2048) nvarchar(2048)`, `Category OfferNoteCategory`, `OfferVersion int?`, `OfferId int`, `TenantId int`, `CreatorInvestorUserId Guid?`, `CreationTime DateTime`, `CreatorUserId long?`. Nav: `CreatorUser → OffervanaUser`.

### `OfferStatus` — `[Customer].[OfferStatuses]` (Guid PK)
`Id Guid`, `DisplayName/SystemName/HexColorCode string?(255)`, `SortOrder int?`. Nav `Properties` **Ignored** per config.

### `OffervanaUser` — `[dbo].[AbpUsers]` (nullable long? PK — ABP Zero quirk)
`Id long?`, `LastLoginAt DateTime?`, address block, `BrokerageDisplayName`, `SendOffers/EmailValid/EmailVerified bool?`, `UserName`, `TenantId int?`, `EmailAddress/Name/Surname/PhoneNumber string?(255)`, `UnsubscirbeEmails bool default false (sic)`, `SecurityStamp string?(255)`.

### `Property` — `[Customer].[Properties]` (int PK)
`Id`, address columns (`GpsCoordinates/Address1/Address2/City/StateCd/ZipCode/Country string?(255)`), `SurveyJson/AttomSurveyJson string?(255)`, `CreationTime DateTime`, `LastModificationTime DateTime?`, geo (`Latitude/Longitude decimal? decimal(10,7)`), physical (`Floors decimal?`, `YearBuilt short?`, `LotSize int?`, `SquareFootage decimal`, `BedroomsCount byte?`, `BathroomsCount decimal?`), `RealValue float?`, `MortgageLienAmount decimal?`, `PropertyType string?(255)`, `CustomerId int`.
Navigations: `Customer`, `IBuyerOffers`, `PropertyAvmValues`, `PropertyCompanyStatuses`, `HiddenProperties`, `WatchlistProperties`, `PropertyOfferStatuses`, `PropertyDocuments`.

### `PropertyAvmValue` — `[dbo].[PropertyAvmValues]` (int PK)
`Id`, `AvmValue/Min/Max float?`, `IsManual bool default false`, `CreationTime DateTime`, `PropertyId int`. Nav `Property`.

### `PropertyCompanyStatus` — `[Customer].[PropertyCompanyStatuses]` (Guid PK)
`Id Guid`, `CompanyId Guid`, `PropertyId int`, `Status PropertyStatus`. Nav `Property`.

### `PropertyOfferStatus` — `[Customer].[PropertyOfferStatuses]` (Guid PK)
`Id Guid [Key]`, `OfferId int`, `PropertyId int`, `OfferStatusId Guid`, `CreatedUtc DateTime`. Navs: `Offer → IBuyerOffer`, `OfferStatus`, `Property`. Indexes: `(OfferId, CreatedUtc desc)`, `(PropertyId)`.

### `RealValueConfiguration` — `[Realvalue].[RealvalueConfigurations]` (int PK)
`Id`, `State UsState? (ZIP enum)`, `Value float`, `AccountType AccountType? (ZIP enum)`, `TenantId int?`. Nav `Tenant`.

### `SellLeasebackType` — `[dbo].[SellLeasebackType]` (int PK)
40+ decimal? fields — OfferAmount, ServiceFee, ResaleFee, `IsRentFlat bool?`, RentFlat/Min/Max (Amount/Percentage), ClosingCost, Holdback (`Percantage` sic), ViewCommission, BrokerServiceCharge + display + computed variants. `IBuyerOfferId int?`.

### `SlackPropertyThread` — `[Integration].[SlackPropertyThreads]` (Guid PK, though field typed `int Id` per agent output — **verify if re-indexing**)
`Id Guid`, `PropertyId int`, `ThreadTimestamp string?(50)`, `CreatedUtc DateTime`.

### `Tenant` — `[dbo].[AbpTenants]` (int PK)
`Id`, `Name/TenancyName/CustomDomain/LogoFileType string?(255)`, `IsCustomDomain bool default false`, `EditionId int?`, `LogoId Guid?`. Navs: `Edition`, `NotificationPermissions`, `Brokerage` (1:1 via Brokerage.TenantId).

## 1.3 Offervana relationship summary

- Tenant ⬅(1:1)➡ Brokerage (Brokerage.TenantId is unique)
- Tenant 1:N NotificationPermissions / Agents / Customers / RealValueConfigurations / IBuyers-via-Admin schema
- Agent self-ref by Manager / Admin (Agents hierarchy)
- Customer 1:N Property 1:N IBuyerOffer
- Property 1:N PropertyOfferStatus (NoAction on delete)
- IBuyerOffer 1:1 {CashOfferType, CashOfferPlusType, SellLeasebackType, FixListType, CashBuyerType, ListOnMarketType} — enforce-by-convention exactly one non-null
- IBuyerOffer.CurrentPropertyOfferStatus 1:1 via PropertyOfferStatusId (optional, NoAction)
- IBuyerOffer 1:N OfferDocument → BlobFile
- Property 1:N PropertyDocument → BlobFile
- OfferStatus N:1 PropertyOfferStatus

---

# Part 2 — Investor Portal Model (`ZoodealioInvestorPortal.Domain` / `.Infrastructure`)

`InvestorPortalDbContext(DbContextOptions<...> options) : DbContext(options)`. Model-builder config (partial list below — full rules already captured in api-catalog.md §2):
- `CompanyUser(CompanyId, UserId)` unique; User↔Company many-to-many via `CompanyUsers` join table.
- `UserRelation.ParentUser/ChildUser` FKs (Restrict).
- `CompanyInvite` mapped to `CompanyInvites` table; `Token` unique; `ParentUser` Restrict; `AcceptedUser` SetNull.
- `Document.UploadedBy` Restrict; `Document.Company` Cascade.
- `User.CreatedDate` defaults to `GETDATE()`.
- `GlobalInviteLink.Token` unique.
- `Company` self-ref `ParentCompany` (Restrict); `OwnerUser` SetNull.
- `UserTenancy.User` Cascade; `SourceCompany` SetNull; unique `(UserId, TenancyId, SourceCompanyId)`.

## 2.1 Enums

- **`AccountType`** (int, `[Description]`): `Agent=0`, `Team=1`, `Broker=2`, `EnterPrise=3`.
- **`ActiveStatus`** (int, `[Description]`): `Approved=0`, `Denied=1`, `Pending=2`, `Closed=3`. Default for `Company.IsActive` is `Pending`.
- **`BusinessType`** (int, `[Description]`): `Llc=0 "Limited Liability Company (LLC)"`, `Inc=1 "Corporation (Inc or Corp)"`, `Sole=2`, `Partnership=3`.
- **`BuyingStrategy`** (int, `[Description]`): `FixAndFlip=0`, `BuyAndHold=1 "Buy & Hold (Long-Term Rental)"`, `ShortTermRental=2 "ShortTermRental (Airbnb)"`, `Brrrr=3 "BRRRR (Buy, Rehab, Rent, Refinance, Repeat)"`.
- **`InvestorType`** (int, `[Description]`): `Buyer=1`, `Funder=2`, `BothBuyerFunder=3 "Buyer & Funder"`.
- **`PropertyType`** (int, `[Description]`): `SingleFamilyHome=0`, `Townhome=1`, `Condominium=2`, `Duplex=3`.
- **`ReferringAgentRole`** (int): `Agent=1`, `Manager=2`, `BrokerageAdmin=3`, `AccountAdmin=4`, `Owner=5`.
- **`Role`** (int, `[Description]`): `Investor=1`, `AccountManager=2`, `Collaborator=3`, `Admin=4`, `Enterprise=5`. **Note:** numbered out of declaration order.
- **`TenancySource`** (int): `Direct=0`, `Company=1`.
- **`UsState`** (int, `[Description]`): 0–50 (AL..WY + DC=50). **`DC` Description is "Washington" (typo — should be "District of Columbia").**
- **`InviteStatus`**: file exists but commented out / not active.
- **`NotificationPriority`** (1=High, 2=Medium, 3=Low), **`ActorType`** (0=System, 1=Client, 2=Agent, 3=Manager, 4=BrokerageAdmin, 5=HostAdmin), **`NotificationType`** (66 members `0..65`) — declared here (Offervana `AgentNotification` imports them).
- **`HistorylogNames`** — check agent output for values if needed.

## 2.2 Entities

### `User` (Guid PK)
`Id Guid [Key,Required]`, `FName/LName/Phone string`, `Email string [Required, EmailAddress]`, `ReferringAgentRole ReferringAgentRole?`, `Username string [Required]`, `PasswordHash string [Required]`, `Role Role [Required]`, `RefreshToken string?`, `RefreshTokenExpiryTime DateTime?`, `LastLogin DateTime?`, `CreatedDate DateTime default GETDATE()`, `FirstLoginAfterCompanyApprovalAt DateTime?`, `IsIndividualBuyerAgency bool?`, `AcceptedTermsOn DateTime?`, `AcceptedTermsFromIp string?`, `ApiKey Guid?`, `CanSeeAllProperties bool`.
Navs: `Documents`, `Buyboxes` (via `BuyboxUser`), `Companies` (M:N via `CompanyUser`), `AcceptedComplianceDocuments`.

### `Company` (Guid PK)
`Id Guid`, `ParentCompanyId Guid? (self-ref, Restrict)`, `OwnerUserId Guid? (FK User, SetNull)`, `IsEnterprise bool`, `IsBuyerAgencyDefault bool?`, `PrimaryName/PrimaryLName/PrimaryEmail/PrimaryPhone string?` (Email w/ `[EmailAddress]`), `BusinessName string?`, `State_Of_Incorporation_Or_Registration UsState?`, `Business_EIN_Or_Tax_Id string?`, `BusinessAddressLine/BusinessCity string?`, `BusinessState UsState?`, `BusinessZip string?`, `How_Heard_About_Us string?`, `IsActive ActiveStatus default Pending`, `TenancyId int?`, `TenancyGuid Guid?`, `BusinessType BusinessType?`, `InvestorType InvestorType?`, `IsAccreditedInvestor/IsAgreedToTermsAndConditions/IsBuyerAgency bool?`.
Navs: `ParentCompany`/`ChildCompanies` (self), `OwnerUser`, `Users` (M:N), `Documents`, `GlobalInviteLinks`.

### `CompanyUser` — `CompanyUsers` (Guid PK; unique `(CompanyId, UserId)`)
`Id Guid`, `CompanyId Guid [FK,Required]`, `UserId Guid [FK,Required]`, `InviteId Guid? [FK]`, `IsActive bool default true`, `DateAdded DateTime default UtcNow`.
Navs: `Company`, `User`, `Invite → CompanyInvite`.

### `Document` (Guid PK)
`FileName/BlobName/ContentType/FileUrl string [Required]`, `Size long`, `UploadedAt DateTime default UtcNow`, `LastModified DateTime?`, `UploadedById Guid [FK User Restrict]`, `CompanyId Guid [FK Company Cascade]`.

### `CompanyInvite` — `CompanyInvites` (Guid PK; `Token` unique)
`Email string [Required, EmailAddress]`, `InvitedRole Role [Required]`, `InvitedByUserId Guid [FK User Restrict]`, `Token string [Required, Unique]`, `IsActive bool default true`, `IsAccepted bool`, `AcceptedUserId Guid? [FK User SetNull]`, `UpdatedAt DateTime default UtcNow`, `RespondedAt DateTime?`, `ExpiresAt DateTime [Required]`, `CreatedAt DateTime default UtcNow`.
Navs: `ParentUser`, `AcceptedUser`.

### `PasswordResetToken` (Guid PK)
`Email/Token string [Required]`, `CreatedAt/ExpiresAt DateTime`, `IsUsed bool`, `UsedAt DateTime?`.

### `UserRelation` (Guid PK)
`ParentUserId/ChildUserId Guid [Required]` (both FK to `User` with Restrict), `InviteId Guid? [FK CompanyInvite]`, `IsActive bool default true`, `CreatedAt DateTime default UtcNow`.

### `GlobalInviteLink` (Guid PK; `Token` unique)
`IssuedByUserId Guid [Required]`, `CompanyId Guid?`, `TargetRole Role [Required]`, `Token string [Required, Unique]`, `IsRevoked bool`, `CreatedAt DateTime default UtcNow`, `ExpiresAt DateTime?`. (FKs are undecorated.)

### `Buybox` (Guid PK)
`Title string`, min/max ranges for `Price/Sqft/Stories/Bedrooms/Bathrooms/YearBuilt/LotSize` (all `decimal?`), `CreatedByUserId Guid?`.
Navs: `PropertyTypes`, `BuyingStrategies`, `Locations`, `Users`.

### `BuyboxUser` (Guid PK)
`UserId Guid?`, `BuyboxId Guid?`.

### `BuyboxLocation` (Guid PK)
`City string?`, `UsState UsState`, `BuyboxId Guid?`.

### `BuyboxPropertyType` (Guid PK)
`PropertyType PropertyType`, `BuyboxId Guid?`.

### `BuyboxBuyingStrategy` (Guid PK)
`BuyingStrategy BuyingStrategy`, `BuyboxId Guid?`.

### `InvestorComplianceDocument` (Guid PK)
`FileName/BlobName/ContentType/FileUrl string`, `Size long`, `UploadedAt DateTime default UtcNow`, `RichTextContent string?`, `MustComplyOnLogin bool`, `IsArchived bool? default false`, `CompanyId Guid [FK]`.
Navs: `Company`, `AcceptedBy`.

### `InvestorComplianceDocumentAcceptance` (Guid PK)
`AcceptedAt DateTime default UtcNow`, `AcceptedFromIp string?`, `InvestorComplianceDocumentId Guid [FK]`, `UserId Guid [FK]`.

### `UserTenancy` (Guid PK; unique `(UserId, TenancyId, SourceCompanyId)`)
`UserId Guid`, `TenancyId int`, `Source TenancySource`, `SourceCompanyId Guid?`, `IsActive bool default true`, `CreatedAt DateTime default UtcNow`.
Navs: `User` (Cascade), `SourceCompany` (SetNull).

## 2.3 Utilities

- **`EnumHelper`** — reflection on `[Description]` attributes. `GetEnumDescription<TEnum>(int)`, obsolete `GetEnumAsList<T>()`, typed `GetEnumAsListTyped<T>() : List<EnumAsListItem>`. Supporting record `EnumAsListItem { int? index, string? name, string? desc }`.
- **`RoleHierarchy`** — `SuperiorRoles` static dict maps base roles to arrays of superior roles. Current rule: `Role.Investor` inherits from `Role.Enterprise` (Enterprise includes Investor access). Method `ToAllowedRoleNames(IEnumerable<Role>, bool includeAdmin=true) → HashSet<string>` (case-insensitive) — used by `[AuthorizeRoles(...)]` endpoints to expand a declared role set to its full allowed set.
- **`UserFriendlyException`** — plain `Exception` subclass with three ctors. Per in-file comment, meant to be caught by an exception filter (not yet implemented) and returned as a specific HTTP status; frontend displays the message.

---

# Part 3 — Trade In Holdings Model (`TradeInHoldings.Domain` / `.Infrastructure`)

`TradeInHoldingsDbContext(DbContextOptions<...> options) : DbContext(options)`. All `DbSet` properties use the `required` keyword (C# 11). Model-builder rules (highlights — see api-catalog §2 for more): most Guid PKs `ValueGeneratedNever` (client-generated); many unique constraints and check constraints; money `decimal(18,2)`, percentages `decimal(5,2)` or `decimal(8,4)`; `UnderwriteOfferHistory.Id` uses `NEWSEQUENTIALID()`.

## 3.1 Enums

- **`ChangeRequestActionType`**: `FieldLayoutSave=0`, `TaskComplete=1`, `TaskReview=2`.
- **`ChangeRequestStatus`**: `Pending=0`, `Approved=1`, `Rejected=2`.
- **`ContractorType`**: `ClassA=1`, `ClassB=2`, `ClassC=3`.
- **`WorkflowConfigStatus`**: `Draft=0`, `Published=1`.
- **`UsState`**: same 0..50 shape as ZIP. Note: `DC` also labeled `"Washington"` (same typo in both models — diverge at your peril).
- **`CustomFieldControlType`** (declared inside `CustomFieldConfig.cs`): `TextFieldInput=0`, `TextAreaInput=1`, `NumberInput=2`, `CurrencyInput=3`, `DateInput=4`, `DropdownSelectInput=5`, `CheckboxInput=6`, `ToggleInput=7`, `FileUploadInput=8`, `EmailInput=9`, `PhoneInput=10`, `TitleField=11`, `SubtitleField=12`, `UrlField=13`, `DividerField=14`.
- **`EnumHelper`** + `EnumAsListItem` — same pattern as ZIP.

## 3.2 Core user/access entities

### `User` (Guid PK)
`Id Guid`, `FName/LName/Phone string?`, `Email string [Required, EmailAddress, Unique]`, `Username/PasswordHash string [Required]`, `IsHostAdmin bool?`, `RefreshToken/RefreshTokenExpiryTime/LastLogin nullable`, `CreatedDate DateTime`, `RoleId Guid? [FK Role, SetNull on delete]`.

### `Role` (Guid PK; `Name` unique)
`Name string [Required, MaxLength(100), Unique]`, `Description string? [MaxLength(500)]`, `IsHostAdmin bool`, `CreatedAt/UpdatedAt DateTime`. Navs: `RolePermissions`, `Users`.

### `Permission` (Guid PK; `PermissionKey` unique)
`Module string [Required, MaxLength(100)]`, `Action string [Required, MaxLength(20)]`, `PermissionKey string [Required, MaxLength(150), Unique]`, `Description string? [MaxLength(500)]`, `CreatedAt DateTime`. Nav: `RolePermissions`.

### `RolePermission` (Guid PK; unique `(RoleId, PermissionId)`)
`RoleId/PermissionId Guid [Required, FK]`, `CreatedAt DateTime`. Both FKs Cascade.

### `PasswordResetToken` (Guid PK)
Same shape as ZIP `PasswordResetToken`.

## 3.3 Department & team

### `Department` (Guid PK; `Title` unique)
`Title string [Required, StringLength(200), Unique]`, `Description string?`, `CreatedByUserId Guid [Required, FK User Restrict]`, `CreatedDate DateTime`, `UpdatedByUserId Guid? [FK User SetNull]`, `UpdatedDate DateTime?`. Navs: `CreatedByUser`, `UpdatedByUser`, `DepartmentTeamMembers`.

### `DepartmentTeamMember` (composite PK `(DepartmentId, TeamMemberId)`)
`DepartmentId Guid [FK Department Cascade]`, `TeamMemberId Guid [FK User Cascade]`. Extra index on `TeamMemberId`.

## 3.4 Contacts / notes

### `Contractor` (Guid PK)
`FirstName/LastName/CompanyName string?`, `Type ContractorType?`, `AreaCoverage/Address/City string?`, `State string? [StringLength(2)]`, `Zip string?`, `EmailAddress string? [EmailAddress]`, `PhoneNumber/LicenseNumber string?`, audit fields (`CreatedByUserId/CreatedDate`, `UpdatedByUserId?/UpdatedOn?`).

### `ContractorNote` (Guid PK)
`ContractorId Guid [FK Contractor Cascade]`, `Note string [Required]`, audit fields.

### `Investor` (Guid PK)
`FirstName/LastName/EntityName/City string?`, `State string? [StringLength(2)]`, `PrimaryEmail/SecondaryEmail string? [EmailAddress]`, `PhoneNumber string?`, audit fields.

### `InvestorNote` (Guid PK)
`InvestorId Guid [FK Investor Cascade]`, `Note string [Required]`, audit fields.

## 3.5 Documents / listings

### `Document` (Guid PK)
`FileName/BlobName/ContentType/FileUrl string [Required]`, `Size long`, `UploadedAt DateTime`, `LastModified DateTime?`, `UploadedById Guid [Required, FK User Restrict]`, `CreatedByUserId Guid [Required]`, `CreatedDate DateTime`, `UpdatedByUserId Guid?`, `UpdatedOn DateTime?`. Index on `UploadedById`.

### `PropertyListing` (Guid PK; index on `PropertyId`)
`Name string [Required, StringLength(200)]`, `Url string [Required, StringLength(2000)]`, `CreatedOn DateTime`, `UpdatedOn DateTime?`, `PropertyId int [Required]` (external property ID — **no FK to a Property entity**; TIH doesn't own property data locally), `LastModifiedByUserId Guid? [FK User SetNull]`.

## 3.6 Underwriting

### `Underwrite` (Guid PK; unique `(PropertyId, CreatedByUserId)`)
`PropertyId int [Required]`, `PropertyAddress/Subdivision string?` + physical attrs (`YearBuilt short?`, `GarageCount int?`, `HasPool bool?`, `PoolType/NumberOfFloors string?`, `BedroomsCount int?`, `BathroomsCount decimal(5,1)?`, `SquareFootage decimal(12,2)?`, `LotSize int?`, `ConditionRating decimal(4,1)?`), image URLs, `InstantCashOffer decimal(18,2)?`, `{Reserve,Program,Resale}Percentage decimal(8,4)?`, `CurrentBase/ProgramFee/RealValue/RvPerSqftPrice decimal(18,2)?`, `PropertyDensity string?`, `ClosingCost/AgentCommissions/LoanAmount decimal(18,2)?`, `LoanTerm string?`, `YearRecorded int?`, `EstimatedPayoff decimal(18,2)?`, `IsListed bool?`, `ListedStatus string?`, `LastListedPrice decimal(18,2)?`, `ListedDate/OffMarketDate string?`, audit fields. Many child collections.

### `UnderwriteHoa` (Guid PK)
`UnderwriteId Guid [FK Cascade]`, `HoaType string? [StringLength(50)]`, `MonthlyDue decimal(18,2)?`.

### `UnderwriteResourceLink` (Guid PK)
`UnderwriteId Guid [FK Cascade]`, `Name/Url string?`.

### `UnderwriteComparableAdjustment` (Guid PK; unique `(UnderwriteId, ComparablePropertyId, Field)`; CK `AdjustmentType IN ('add','deduct')`, `Amount >= 0`)
`ComparablePropertyId string [Required, StringLength(50)]` (MLS mlsNumber), `Field string [Required, StringLength(100)]`, `AdjustmentType string [RegEx ^(add|deduct)$]`, `Amount decimal(18,2) [Required, Range(0,Max)]`, `Note string?`, `CreatedDate DateTime`.

### `UnderwriteComparableNote` (Guid PK)
`ComparablePropertyId string [Required, StringLength(50)]`, `Title string [Required, StringLength(200)]`, `Content string [Required, StringLength(2000)]`, `AuthorName/AuthorInitials string?`, `CreatedDate/UpdatedDate`.

### `UnderwriteSelectedComparable` (Guid PK; unique `(UnderwriteId, ComparablePropertyId)`)
`ComparablePropertyId string [Required]`, `SortOrder int`.

### `UnderwriteOffer` (Guid PK; unique `(UnderwriteId, OfferType)`; CK OfferType ∈ {CashOffer, CashPlus, SellNowMoveLater, FixList, CashBuyer, ListOnMarket}; CK Status ∈ {Draft, PendingManagerReview, Approved, Rejected, Published})
~60 columns (all monetary `decimal(18,2)?`, percentages `decimal(8,4)?`). `OfferType string [Required]`, `Status string default "Draft"`, `Level/AssignedTo string?`, plus comprehensive set of money/percentage pairs for Basis, OfferAmount, Reserve, ProgramFee, ResaleFee, ClosingCost, MortgagePayoff, AdditionalCompensation, ServiceFee/ServiceFee2, BrokerServiceCharge, ViewCommission, Holdback, FirstMonthRent, RentFlat/Min/Max, EstimatedRepairs, InterimHoldingCost, MonthlyHoldingCost (plus `HasMonthlyHoldingCosts`, `InterimOwnershipCostsIncluded`, `MonthlyHoldingCostLabel`), `ProjectedDaysOnMarket int?`, CashBuyerServiceFee, DaysOnMarket, Commission, StateTax, FirstPayoutAmount, SecondPayoutAmount, NetOffer, AgentCompensation, TotalPayouts, `Version int default 1`, audit fields. Navs: `Underwrite`, `OfferItems`, `History`.

### `UnderwriteOfferItem` (Guid PK; CK Section ∈ {'additional','resale'})
`OfferId Guid [FK Cascade]`, `Section string [Required, StringLength(20)]`, `Name string [Required, StringLength(200)]`, `Amount decimal(18,2)`, `IsCredit bool`, `SortOrder int`.

### `UnderwriteOfferNote` (Guid PK; index on UnderwriteId)
`Content string [Required, StringLength(4000)]`, `AssigneeUserId Guid?`, `AssigneeName/AuthorName/AuthorInitials string?`, audit.

### `UnderwriteOfferHistory` — mapped to table `UnderwriteOfferHistory` (singular, Guid PK default `NEWSEQUENTIALID()`; indexes on `OfferId` and `UnderwriteId`)
`OfferId Guid [FK Cascade]`, `UnderwriteId Guid [FK NoAction]`, `Version int`, `OfferType/Status string [Required]`, `Level string?`, decimal fields: `OfferAmount/NetOffer/Reserve/ClosingCost/MortgagePayoff/FirstPayoutAmount/SecondPayoutAmount/AgentCompensation decimal(18,2)?`, `ProgramFeePercentage/ResaleFeePercentage decimal(8,4)?`, `SnapshotJson string?`, `Action string [Required, StringLength(50)]`, `ChangedByUserId Guid [Required]`, `ChangedByName string?`, `ChangedDate DateTime`.

## 3.7 Funding

### `FundingRequest` (Guid PK; index on `TransactionId`)
Physical (`Sqft/Stories/Bedrooms/Bathrooms/YearBuilt/LotSize int?`), monetary (`PurchasePrice/EstResaleAmount/Reserve/FundingAmount/RepairBid/FlatFee decimal(18,2)?`, `InterestRate decimal(5,2)` — but model config applies `HasColumnType("decimal(5,2)")`), `ProjHoldingPeriod string?`, `FundingStructure string [Required] default "flat_fee"`, `ProgramFeeSplit1/2 decimal(5,2)?`, `ResponseDeadline/ClosingDate DateTime?`, `Renovation/LinksJson/DocumentIdsJson string?` (JSON arrays), audit, `PropertyId int [Required]` (external ID), `TransactionId Guid [Required, FK PropertyTransaction Restrict]`, `CreatedByUserId Guid [FK User Restrict]`.

### `FundingRequestZipUserUserAssociation` (composite PK `(FundingRequestId, ZipUserId)`)
`ZipUserId Guid` — cross-service reference to ZIP users. `IsAccepted/IsDeclined bool?`. Index on `ZipUserId`.

## 3.8 Transaction workflows — Configs (templates)

### `CustomFieldConfig` (Guid PK; `Name` unique)
`Name/Description string`, audit, `IsLocked bool? default false`, `ManifestJson string?`, `ControlType CustomFieldControlType`.

### `CustomFieldLayoutConfig` (Guid PK)
`Name/Description string`, audit, `ManifestJson string?`, `IsLocked bool? default false`, `IsChangeRequestRequired bool`, `ChangeRequestApproverUserId Guid? [FK SetNull]`, `ChangeRequestApproverDepartmentId Guid? [FK SetNull]`. Nav `WorkflowConfigs` M:N via join table `WorkflowConfigCustomFieldLayoutConfigs`.

### `WorkflowConfig` (Guid PK; `Name` unique)
`Name/Description string`, `SortOrder int`, `Status WorkflowConfigStatus default Draft`, audit, `IsLocked bool?`. Navs: `CustomFieldLayoutConfigs`, `WorkflowStageConfigs` (Cascade).

### `WorkflowStageConfig` (Guid PK)
`Name/Description string`, `SortOrder int`, audit, `IsLocked bool?`, `WorkflowConfigId Guid?`. Nav `WorkflowStageTaskConfigs` (Cascade).

### `WorkflowStageTaskConfig` (Guid PK)
`Name/Description string`, `SortOrder int`, `IsRequired/IsReviewRequired bool`, `TaskFieldsJson string?`, `DueDays/DueWeeks/DueMonths int?`, audit, `IsLocked bool?`, `IsChangeRequestRequired bool`, `WorkflowStageConfigId Guid?`, plus assignment/review/approver FKs (all NoAction or SetNull) to User and Department.

## 3.9 Transaction workflows — Working entities (runtime instances)

### `PropertyTransaction` (Guid PK; index on `PropertyId`)
`Name/Description string`, `IsActive/IsCompleted/IsEditLocked bool`, `CreatedOn/UpdatedOn DateTime`, `CurrentWorkflowId Guid?`, `IsTerminated bool?`, `PropertyId int`.
Navs: `Workflows`, `ChangeRequests`.

### `Workflow` (Guid PK)
`Name/Description string`, `CreatedOn/UpdatedOn/CreatedByUserId/UpdatedByUserId`, `SortOrder int`, `WorkflowConfigId Guid [FK]`, `PropertyTransactionId Guid [FK Cascade via model builder]`.
Navs: `WorkflowConfig`, `PropertyTransaction`, `CustomFieldLayouts`, `WorkflowStages`.

### `WorkflowStage` (Guid PK)
`Name/Description string`, audit, `SortOrder int`, `WorkflowId Guid? [FK Cascade]`.
Nav `WorkflowStageTasks` (Cascade).

### `WorkflowStageTask` (Guid PK)
Same shape as `WorkflowStageTaskConfig` but with `WorkflowStageId Guid?` (instead of `WorkflowStageConfigId`) and additional runtime FKs: `CompletedByUserId Guid? [FK NoAction]`, `ReviewedByUserId Guid? [FK NoAction]`. All assignment/review/approver FKs are NoAction or SetNull (preserves history when users/departments are deleted).

### `CustomFieldLayout` (Guid PK)
`Name/Description string`, audit, `ManifestJson string?`, `IsChangeRequestRequired bool`, `WorkflowId Guid`, approver FKs SetNull.

### `CustomPropertyField` (Guid PK; unique `(PropertyId, CustomFieldConfigId)`)
`Value string`, `PropertyId int`, `CustomFieldConfigId Guid [FK Cascade]`.

### `TransactionNote` (Guid PK; index on `PropertyTransactionId`)
`Content string [Required]`, `CreatedOn DateTime`, `PropertyTransactionId Guid [FK Cascade]`, `CreatedByUserId Guid [FK NoAction]`.

### `ChangeRequest` (Guid PK; CK `exactly one of WorkflowStageTaskId / CustomFieldLayoutId is set`)
`ActionType ChangeRequestActionType (stored int)`, `Status ChangeRequestStatus (stored int, default Pending)`, `Comment string`, `PayloadJson/ChangeSummaryJson/RejectionReason string?`, `CreatedOn/ApprovedOn?/RejectedOn? DateTime`, FKs to `PropertyTransaction [Restrict]`, `InitiatorUser [Restrict]`, optional approver user/department (NoAction), optional `ResolvedByUser` (NoAction), optional `WorkflowStageTask` (NoAction), optional `CustomFieldLayout` (NoAction).

## 3.10 TIH exception types

- **`UserFriendlyException`** — plain `Exception` subclass. Message is shown directly to the user; per comment, an exception filter returns HTTP 499 with the message.
- **`ChangeRequestRequiredException : UserFriendlyException`** — specialized, thrown when an operation requires routing through the ChangeRequest workflow.

## 3.11 Cross-service / integration notes (TIH)

- **`PropertyListing`, `PropertyTransaction`, `Underwrite`, `FundingRequest`, `CustomPropertyField`** all carry `PropertyId int` as an external reference — there is no `Property` entity inside the TIH model. Property data lives in Offervana (read via the shared Offervana model).
- **`FundingRequestZipUserUserAssociation.ZipUserId`** is an explicit pointer to an investor-portal `User.Id` (Guid). The join table links TIH `FundingRequest` rows to one or more ZIP users who can accept/decline the funding offer. This is the primary bi-directional integration seam between TIH and ZIP.
- **Config/Working duality** — Every `*Config` entity has a working counterpart. Configs are templates mutable only while unlocked; working entities are per-transaction instances that reference the config they were spawned from. This supports the approval-gated workflow model: changes on working entities that are `IsChangeRequestRequired` must route through `ChangeRequest`.

## 3.12 Conventions summary

- **Key generation:** all Guid PKs `ValueGeneratedNever` (client-generated by app code). Exception: `UnderwriteOfferHistory.Id` uses `NEWSEQUENTIALID()`.
- **Decimal precision:** money `decimal(18,2)`, percentages `decimal(8,4)` (newer) or `decimal(5,2)` (older configs), measurements specialized.
- **Unique constraints (single-column):** `User.Email`, `Role.Name`, `Permission.PermissionKey`, `Department.Title`, `CustomFieldConfig.Name`, `WorkflowConfig.Name`.
- **Unique constraints (composite):** `RolePermission(RoleId, PermissionId)`, `Underwrite(PropertyId, CreatedByUserId)`, `UnderwriteOffer(UnderwriteId, OfferType)`, `UnderwriteSelectedComparable(UnderwriteId, ComparablePropertyId)`, `UnderwriteComparableAdjustment(UnderwriteId, ComparablePropertyId, Field)`, `CustomPropertyField(PropertyId, CustomFieldConfigId)`, `DepartmentTeamMember(DepartmentId, TeamMemberId)`, `FundingRequestZipUserUserAssociation(FundingRequestId, ZipUserId)`.
- **Check constraints:** enumerated in §3.6/3.7/3.9.
- **Default cascade behaviors:** relationships that preserve history (audit, approvals, assignment) use `NoAction` or `SetNull`; relationships representing ownership (UnderwriteHoa→Underwrite, UnderwriteOfferItem→UnderwriteOffer, WorkflowStage→Workflow, WorkflowStageTask→WorkflowStage, RolePermission→Role/Permission, ContractorNote→Contractor) use `Cascade`.
