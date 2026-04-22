---
artifact: schemas
service: offervana-saas
commit-sha: 61581dc184777cb7293ae594294d917556a35ca4
generated-at: 2026-04-16
---

# Offervana_SaaS — Schemas

## Overview

**Database(s):** OffervanaDb (SQL Server) — single database, multi-tenant via ABP TenantId
**ORM:** Entity Framework Core 8.0.6 (via ABP Zero framework)
**Migration Strategy:** EF Core code-first migrations (100+ migrations since 2017)
**Connection:** `Default` connection string (with failover support via `FailoverConnectionString`)

## Database Contexts

### OffervanaDbContext

**Connection:** `Default` (from `OffervanaConsts.ConnectionStringName`)
**Purpose:** Primary application context — all domain entities for the Offervana SaaS platform
**Base:** `AbpZeroDbContext<Tenant, Role, User, OffervanaDbContext>`, `IAbpPersistedGrantDbContext`
**Command Timeout:** 5 minutes
**Failover:** Static `DefaultConnectionString` + `FailoverConnectionString` fields for read-replica switching

### Configuration Methods (OnModelCreating)

1. **ConfigureOneToOneRelations** — User↔Agent, User↔Customer, User↔GoogleToken, User↔Links, TwilioMessage↔TwilioMedia
2. **ConfigureIndexes** — Extensive coverage on Property, Customer, IBuyerOffer, Agent, and blast execution tables
3. **ConfigureCascadeDelete** — Comprehensive cascade chains (see Relationships section)

## SQL Server Schemas

| Schema | Purpose | Key Tables |
|--------|---------|-----------|
| `dbo` | ABP framework + defaults | AbpUsers, AbpTenants, AbpRoles, AbpPermissions, AppBinaryObjects, PersistedGrants, OfferBonuses |
| `Admin` | System config | IBuyers, LoanTypes, MarketingSettings, AppearanceSettings, Banners, ContactList, SourceKeys, ReleaseNotes |
| `Brokerage` | Tenant/agent config | Brokerages, Agents, ChecklistStages, Checklists, Pixels, ApiKeys, OfferTypeConfiguration, AgentZipCodes, GoogleTokens, SoftDeleteAgentHistory |
| `Customer` | Core business data | Customers, Properties, IBuyerOffers, Notes, CustomerNotes, OfferNotes, OfferDocuments, Messages, PropertyDocuments, PartialLeads, OfferStatuses, PropertyOfferStatuses, InvestorWatchlist/Hidden, LenderContacts, ToDoTasks, CsvImport.* |
| `Blast` | Home Report campaigns | Editions, JobExecutables, DestinationUsers, SubjectLines, ShareReports, BouncedAddresses |
| `Realvalue` | Offer pricing config | RealvalueConfigurations, CashOfferConfig, CashOfferPlusConfig, CashBuyerConfig, FixListConfig, SellLeasebackConfig |
| `Common` | Shared utilities | Groups, Links, LandingTexts, NotificationPermissions, PhoneVerificationCodes, LoginAlerts |
| `History` | Activity tracking | HistoryLogs, AgentNotifications, Activities |
| `BinaryStorage` | File storage | BlobFiles |
| `ThirdPartyService` | External integrations | TwilioMessages, TwilioMedia |
| `Integration` | Service connections | SlackPropertyThreads |
| `Staging` | Data staging | Surveys, PropertySurveys |
| `BackgroundWorkers` | Background jobs | Timetable, PropertyActivities |
| `Commerce` | Marketing | CommerceAttributions, PodcastUsers |

## Entities

### Multi-Tenant Platform (ABP Framework)

#### Tenant

**Table:** `dbo.AbpTenants` (ABP managed)
**Purpose:** Multi-tenant root — each brokerage is a tenant

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| Id | int | No | PK, auto |
| Name | string | No | Tenant display name |
| TenancyName | string | No | Unique tenant code |
| SubscriptionEndDateUtc | DateTime? | Yes | Subscription expiry |
| IsInTrialPeriod | bool | No | Trial flag |
| CustomCssId / LogoId / FaviconId | Guid? | Yes | Branding binary objects |
| AdditionalLogoId | Guid? | Yes | Secondary logo |
| RecurlyAccountCode / RecurlySubscriptionId / RecurlyHostedLoginToken | string | Yes | Recurly billing |
| RecurlySubscriptionType | string | Yes | Plan period |
| CustomDomain | string | Yes | Custom domain URL |
| IsCustomDomain / IsAzureDomain | bool | No | Domain config flags |
| CustomDomainRecord / SSLCustomDomainRecord | varchar(253) | Yes | DNS records |
| CheckoutCode | string | Yes | Registration checkout code |
| BlastEditionId | int? | Yes | FK → BlastEdition |
| RegistrationLinkEnabled | bool | No | Default false |
| MaxUsersCount | int? | Yes | Seat limit |
| IsHidden | bool | No | Default false |

**Relationships:** 1:1 Brokerage (cascade), 1:N Agents, 1:N Customers, 1:N Groups (cascade), 1:1 NotificationPermissions

#### User

**Table:** `dbo.AbpUsers` (ABP managed)
**Purpose:** All user types — customers, agents, managers, admins

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| Id | long | No | PK, auto |
| ProfilePictureId | Guid? | Yes | Binary object reference |
| ShouldChangePasswordOnNextLogin | bool | No | |
| UnsubscirbeEmails | bool | No | Email opt-out |
| UnsubscribeWeeklyDigestEmails | bool? | Yes | Digest opt-out |
| UnsubscribeBlastDigest | bool? | Yes | HR digest opt-out |
| UnsubscribeSellerSource | bool? | Yes | Seller source opt-out |
| SignInToken / SignInTokenExpireTimeUtc | string / DateTime? | Yes | Passwordless sign-in |
| GoogleAuthenticatorKey | string | Yes | 2FA TOTP |
| LastLoginAt | DateTime? | Yes | |
| IsZapRun | bool? | Yes | Zapier sync flag |
| LogoId / AdditionalLogoId | Guid? | Yes | User logos |
| Address / City / StateCd / ZipCode | string | Yes | User address |
| SendOffers | bool | No | Offer notification pref |
| EmailValid | bool? | Yes | Validation status |
| EmailVerified | bool | No | |
| Otp / OtpExpirationTime | int? / DateTime? | Yes | One-time passcode |
| IsOfferTabViewed | bool | No | UI state |
| SoftDelete | SoftDelete? | Yes | Active=0, Inactive=1, Deleted=2 |

**Relationships:** 1:1 Agent (cascade), 1:1 Customer (cascade), 1:1 GoogleToken (cascade), 1:1 Links (cascade), 1:N SentMessages, 1:N ReceivedMessages

#### SubscribableEdition

**Table:** `dbo.AbpEditions` (ABP managed)
**Purpose:** Subscription tier definitions with Recurly pricing

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| Id | int | No | PK |
| Period | PaymentPeriod? | Yes | Billing frequency |
| MonthlyPrice / AnnualPrice / DailyPrice / WeeklyPrice | decimal? | Yes | Tier pricing |
| MonthlyPlanCode / AnnualPlanCode | string | Yes | Recurly plan codes |
| TrialDayCount | int? | Yes | Trial period |
| MaxUsersCount | int | No | Seat limit |
| IsEnterprise | bool | No | Enterprise flag |
| WaitingDayAfterExpire | int? | Yes | Grace period |

#### EditionTenant (Join Table)

**Table:** `dbo.EditionTenants`
**Composite Key:** (EditionId, TenantId)
**Purpose:** Per-tenant edition pricing overrides (seat price)

---

### Brokerage Domain

#### Agent

**Table:** `Brokerage.Agents`
**Base:** `AuditedEntity<int>`, `IMustHaveTenant`
**Purpose:** Agent/manager/admin user profile + hierarchy

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| Id | int | No | PK, auto |
| UserId | long | No | FK → User (1:1) |
| ManagerId | int? | Yes | FK → Agent (self-ref, manager) |
| AdminId | int? | Yes | FK → Agent (self-ref, brokerage admin) |
| TenantId | int | No | FK → Tenant |
| ReferralCode | string | Yes | Unique agent referral code (indexed) |
| IsRoundRobin | bool | No | In round-robin pool |
| RoundRobinTurnOrder | int? | Yes | Round-robin order |
| InternalPhoneNumber | string | Yes | Twilio provisioned number |
| PhoneNumberSid | string | Yes | Twilio SID |
| BlastEditionId | int? | Yes | FK → BlastEdition |
| FaviconId | Guid? | Yes | Binary object reference |
| SoftDeleteAgentHistoryId | int? | Yes | FK → SoftDeleteAgentHistory |

**Relationships:** Self-ref hierarchy (Manager→Agents, Admin→AgentsUnderAdmin), 1:N Groups (cascade), 1:N ToDoTasks (cascade), 1:N Customers, 1:N OpenHouseSchedules (cascade), 1:N AgentZipCodes, 1:1 NotificationPermissions, 1:1 LenderContact, 1:1 SellerSourceAgent

#### Brokerage

**Table:** `Brokerage.Brokerages`
**Base:** `AuditedEntity<int>`, `IMustHaveTenant`
**Purpose:** Brokerage company details — one per tenant

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| Id | int | No | PK |
| TenantId | int | No | FK → Tenant (1:1, cascade) |
| Name | varchar(50) | No | Required |
| Address / City / StateCd / ZipCode | varchar | No | Brokerage address |
| Email / Phone / Fax | string | Yes | Contact info |
| IsRoundRobin | bool | No | Round-robin enabled |

#### Checklist / ChecklistStage

**Table:** `Brokerage.Checklists` / `Brokerage.ChecklistStages`
**Purpose:** Pipeline stage configuration per tenant

#### Pixels

**Table:** `Brokerage.Pixels`
**Purpose:** Tracking pixel scripts (Facebook, Google, TikTok) per tenant/agent

#### OuterApiKey

**Table:** `Brokerage.ApiKeys`
**Purpose:** External API authentication keys per tenant

#### OfferTypeConfiguration

**Table:** `Brokerage.OfferTypeConfiguration`
**Purpose:** Per-tenant offer type enable/disable + sort order

---

### Customer Domain

#### Customer

**Table:** `Customer.Customers`
**Base:** `FullAuditedEntity<int>`, `IMustHaveTenant`
**Purpose:** Homeowner/seller record

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| Id | int | No | PK |
| UserId | long | No | FK → User (1:1, cascade) |
| AgentId | int? | Yes | FK → Agent |
| TenantId | int | No | FK → Tenant |
| FirstName / LastName | string | Yes | |
| Email / PhoneNumber | string | Yes | |
| Address1 / Address2 / City / StateCd / ZipCode | string | Yes | |
| ReferralCode | string | Yes | Unique customer ref (indexed) |
| IsBuyer | bool | No | Buyer vs seller |
| CustomerLeadSource | CustomerLeadSource? | Yes | 13-value enum |
| CustomerLeadType | CustomerLeadType? | Yes | 15-value enum |
| CustomerLeadStatus | CustomerLeadStatus? | Yes | 12-value enum |
| PropertySubmissionSource | PropertySubmissionSource? | Yes | Agent or Homeowner |
| SubmitterRole | SubmitterRole? | Yes | 4-value enum |
| TotalScore | int? | Yes | Engagement score |
| NormalizedEmail | string | Yes | **Computed column** — strips +zoodealio/+lll suffixes |
| AssignedByUserId | long? | Yes | FK → User |
| SoftDeleteAgentHistoryId | int? | Yes | FK → SoftDeleteAgentHistory |
| GhlContactId | string | Yes | GoHighLevel sync |

**Relationships:** 1:N Properties (cascade), 1:N CustomerNotes (cascade), 1:N AgentNotifications

#### Property

**Table:** `Customer.Properties`
**Base:** `FullAuditedEntity<int>`, `IMustHaveTenant`
**Purpose:** Property record — central entity with most relationships in the system

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| Id | int | No | PK |
| CustomerId | int? | Yes | FK → Customer (cascade) |
| TenantId | int | No | FK → Tenant |
| ClientTypeId | int? | Yes | FK → ClientType |
| Address1 / Address2 / City / StateCd / ZipCode / Country | string | Yes | All indexed |
| AddressKey | string | Yes | Composite address key (indexed) |
| Latitude / Longitude | string | Yes | Geocoordinates (composite index) |
| SurveyJson | string | Yes | Full survey data (JSON) |
| avmValue | float? | Yes | Current AVM estimate |
| Realvalue | float? | Yes | Calculated real value |
| MortgageLienAmount | decimal? | Yes | Outstanding mortgage |
| ClosingCostAmount | decimal? | Yes | Closing costs |
| ClosingCostPercentage | decimal? | Yes | Closing cost % |
| IsEnrolled | bool | No | In blast/HR campaign |
| DashboardViewCount / OfferDashboardViewCount | int | No | Analytics |
| GhlSyncStatus | GhlSyncStatus? | Yes | GoHighLevel sync |
| GhlOffersSyncStatus | GhlOffersSyncStatus? | Yes | GHL offers sync |
| PropertyCsvImportFileLogId | int? | Yes | FK → CsvImportFileLog |

**Relationships:** 1:N IBuyerOffers (cascade), 1:N PropertyDocuments (cascade), 1:N ListedPropertyOffers (cascade), 1:N Notes (cascade), 1:N ToDoTasks (cascade), 1:N PropertySurveys (cascade), 1:N PropertyGroups (cascade), 1:N PropertyActivities (cascade), 1:N OpenHouseSchedules (cascade), 1:N ClickToLists (cascade), 1:N PropertyAvmValues, 1:N PropertyCompanyStatuses, 1:N PropertyOfferStatuses (**NoAction** — avoids cascade cycles), 1:N HistoryLogs

---

### Offer Domain

#### IBuyerOffer

**Table:** `Customer.IBuyerOffers`
**Base:** `FullAuditedEntity<int>`, `IMustHaveTenant`
**Purpose:** Offer record — aggregation root for all offer type details

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| Id | int | No | PK |
| PropertyId | int | No | FK → Property |
| IBuyerId | int | No | FK → IBuyer |
| IsPreliminary | bool | No | Preliminary vs formal |
| IsCurrent | bool | No | Current version flag (indexed) |
| IsAccepted / IsDeclined / IsDisabled / IsExpired | bool | No | Status flags |
| ExpirationDate | DateTime? | Yes | Offer expiry |
| Notes | string | Yes | Offer notes |
| IsSharedToCustomer | bool | No | Shared to dashboard |
| OfferVersion | int? | Yes | Version number |
| OfferEventType | OfferEventType? | Yes | Created/HostEdit/AgentCounter/HostCounter/Accepted/Rejected |
| CounterOfferDirection | CounterOfferDirection? | Yes | None/AgentToHost/HostToAgent |
| IsCounterOffer | bool | No | Counter offer flag |
| CounterOfferResponseStatus | bool? | Yes | null=pending, true=accepted, false=rejected |
| IBuyerOfferRefID | int? | Yes | FK → IBuyerOffer (self-ref, parent offer) |
| PropertyOfferStatusId | int? | Yes | FK → PropertyOfferStatus |
| InvestorPortalCompanyId | int? | Yes | Investor Portal company (indexed) |
| InvestorPortalUserId | int? | Yes | Investor Portal user (indexed) |
| OfferSource | string | Yes | Agent/Investor/OffersDepartment |
| AcceptedFromPage | AcceptedFromPage? | Yes | UI source |
| MortgageLienAmount | decimal? | Yes | Snapshot at offer time |

**Relationships:** 1:1 CashOfferType (cascade), 1:1 CashOfferPlusType (cascade), 1:1 FixListType (cascade), 1:1 SellLeasebackType (cascade), 1:1 CashBuyerType (cascade), 1:1 ListOnMarketType (cascade), 1:N OfferNotes (cascade), 1:N OfferDocuments (cascade), 1:N PropertyOfferStatuses as StatusHistory (cascade)

#### Offer Type Sub-Entities

All in `Customer` schema, `FullAuditedEntity<int>` base, FK: `IBuyerOfferId`:

| Entity | Table | Key Fields |
|--------|-------|-----------|
| CashOfferType | Customer.CashOfferTypes | OfferAmount, ClosingCostPercentage, ClosingCostAmount, ServiceChargePercentage, LessMortgage, NetAmount |
| CashOfferPlusType | Customer.CashOfferPlusTypes | OfferAmount, HoldbackPercentage, HoldbackAmount, UpsidePercentage, ImmediateCashAmount |
| FixListType | Customer.FixListTypes | OfferAmount, RepairEscrow, RepairBudget, HoldbackPercentage, HoldbackAmount |
| SellLeasebackType | Customer.SellLeasebackTypes | OfferAmount, LeaseTermMonths, MonthlyRent, BuybackPrice |
| CashBuyerType | Customer.CashBuyerTypes | OfferAmount, ClosingCostPercentage, EMDAmount |
| ListOnMarketType | Customer.ListOnMarketTypes | ListPrice, Commission, EstimatedNetProceeds |

#### OfferBonus (new 2026-04-03)

**Table:** `OfferBonuses` (default `dbo` schema)
**Base:** `AuditedEntity<int>`, `IPassivable`
**Migration:** `20260403174128_AddOfferBonusTable`
**Purpose:** Time-bound bonus promotions tied to one or more offer types

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| Id | int | No | PK |
| OfferTypes | varchar(100) | No | Comma-separated offer-type keys (multi-type targeting) |
| BonusAmount | decimal(18,2) | No | Flat bonus $ amount |
| StartDate | DateTime | No | Promotion window start |
| EndDate | DateTime | No | Promotion window end |
| IsActive | bool | No | Default true; toggled via `IPassivable` |

**Relationships:** standalone — no FKs. Selected via `OfferBonusAppService.GetActiveAsync` (filters on `IsActive` + date range).

#### IBuyer

**Table:** `Admin.IBuyers`
**Base:** `FullAuditedEntity<int>`, `IMayHaveTenant`
**Purpose:** iBuyer/investor configuration

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| Id | int | No | PK |
| Name / DisplayName | string | No | |
| OfferType | OfferType | No | Enum: Cash, Cash+, SellLeaseback, FixList, CashBuyer, ListOnMarket |
| IsActive | bool | No | |
| ServiceChargePercentage | decimal | No | |
| IBuyerOptions | string | Yes | Buybox JSON |
| Url / Address | string | Yes | |
| TenantId | int? | Yes | null = host-level |

#### OfferStatus

**Table:** `Customer.OfferStatuses`
**Key:** `Guid`
**Purpose:** Pipeline status definitions (label, color, sort order)

#### PropertyOfferStatus

**Table:** `Customer.PropertyOfferStatuses`
**Purpose:** Offer-to-status tracking (join with timestamps)
**FKs:** OfferId → IBuyerOffer, PropertyId → Property, OfferStatusId → OfferStatus

#### OfferNote

**Table:** `Customer.OfferNotes`
**Purpose:** Categorized notes on offers (Client, Agent, Internal, CounterOffer)

#### OfferDocument

**Table:** `Customer.OfferDocuments`
**Purpose:** Document records linked to offers with BlobFile FK (cascade).
**Migration (2026-04-09):** `20260409055722_AddOfferDocumentFlags` added slot flags for **Comparables Analysis** and **Offer Explainer** document types surfaced on offer tiles (PRs 8839 / 8844).

---

### Messaging Domain

#### CustomerMessage

**Table:** `Customer.CustomerMessages`
**Purpose:** Unified message container (SMS or in-app)
**FKs:** FromUserId → User (cascade), ToUserId → User (cascade), TwilioMessageId → TwilioMessage (cascade), InAppMessageId → Message (cascade)

#### TwilioMessage / TwilioMedia

**Tables:** `ThirdPartyService.TwilioMessages`, `ThirdPartyService.TwilioMedia`
**Purpose:** SMS message records with media attachments (1:1 cascade)

---

### Blast (Home Report) Domain

#### BlastEdition

**Table:** `Blast.Editions`
**Purpose:** Home Report subscription tiers with Recurly integration

#### BlastJobExecutable

**Table:** `Blast.JobExecutables`
**Purpose:** Individual email delivery records — heavily indexed for execution scheduling

| Key Indexes |
|-------------|
| MessageId |
| (ExecuteOn + IsExecuted + IsSuccess + IsException) composite |
| (IsDelivered + IsSuccess) composite |
| DestinationUserViewed |
| DestinationUserAction |
| IsUnsubscribed |

#### BlastDestinationUsers

**Table:** `Blast.DestinationUsers`
**Purpose:** User enrollment in blast campaigns

#### BouncedAddress

**Table:** `Blast.BouncedAddresses`
**Purpose:** Email bounce tracking from SendGrid

#### BlastShareReport

**Table:** `Blast.ShareReports`
**Purpose:** Shareable Home Report links with verification codes

---

### History & Activity Domain

#### HistoryLog

**Table:** `History.HistoryLogs`
**Purpose:** Legacy activity log (indexed on AmplitudeId)

#### Activity

**Table:** `History.Activities`
**Migrations (2026-04-07, 2026-04-08):** `20260407145701_ActivityMessageLengthUpdate` + `20260408143655_ActivityMessageLengthUpdate2` widened the Message column for richer activity descriptions.

#### PropertyActivity

**Table:** `BackgroundWorkers.PropertyActivities`
**Purpose:** Property-level activity events (indexed on PropertyId, unique)

#### AgentNotification

**Table:** `History.AgentNotifications`
**Purpose:** Agent notification records (indexed on CreationTime)

---

### Realvalue Configuration Domain

All in `Realvalue` schema — per-state, per-account-type offer pricing configurations:

| Entity | Table | Purpose |
|--------|-------|---------|
| RealvalueConfiguration | Realvalue.RealvalueConfigurations | Base value multiplier per state |
| CashOfferConfig | Realvalue.CashOfferConfigs | Cash offer formula config |
| CashOfferPlusConfig | Realvalue.CashOfferPlusConfigs | Cash+ formula config |
| CashBuyerConfig | Realvalue.CashBuyerConfigs | Cash buyer formula config |
| FixListConfig | Realvalue.FixListConfigs | Fix/list formula config |
| SellLeasebackConfig | Realvalue.SellLeasebackConfigs | Sell-leaseback formula config |

---

### Common Domain

#### Group

**Table:** `Common.Groups`
**Base:** `FullAuditedEntity<int>`, `IMustHaveTenant`
**Purpose:** Customer/property grouping for organization

#### Links

**Table:** `Common.Links`
**Purpose:** Agent link configuration (1:1 with User, cascade)

#### LandingText

**Table:** `Common.LandingTexts`
**Purpose:** Landing page text with role-hierarchy fallback

#### NotificationPermissions

**Table:** `Common.NotificationPermissions`
**Purpose:** Per-agent/tenant notification preferences

---

### File Storage

#### BlobFile

**Table:** `BinaryStorage.BlobFiles`
**Purpose:** Azure Blob Storage metadata

#### PropertyDocument / OfferDocument

**Tables:** `Customer.PropertyDocuments`, `Customer.OfferDocuments`
**Purpose:** Document records linked to properties/offers with BlobFile FK (cascade)

---

### Investor Portal Integration

#### InvestorHiddenProperties / InvestorWatchlistProperties

**Tables:** `Customer.InvestorHiddenProperties`, `Customer.InvestorWatchlistProperties`
**Purpose:** Investor Portal user preferences — unique composite index (InvestorPortalUserId + PropertyId)

---

### CSV Import

#### PropertyCsvImportFileLog / CsvImportEntry / CsvFileInProgress

**Tables:** `Customer.Properties.CsvImport.*`
**Purpose:** Bulk import tracking — file logs, individual entries, progress state

---

## Enums

| Enum | Entity | Values |
|------|--------|--------|
| OfferType | IBuyer, OfferTypeConfiguration | CashOffer=0, CashOfferPlus=1, SellLeaseback=2, FixList=3, CashBuyer=4, ListOnMarket=5 |
| AccountTypes | Offer configs | Agent=0, Team=1, Broker=2, Enterprise=3 |
| CustomerLeadSource | Customer | Unknown=0..HomeReport=12 (13 values) |
| CustomerLeadStatus | Customer | NewLead=0..ListingCancelled=11 (12 values) |
| CustomerLeadType | Customer | Probate=0..PaidSearchAd=14 (15 values) |
| PropertySubmissionSource | Customer | Agent=0, Homeowner=1 |
| SubmitterRole | Customer | Homeowner=0, HomeownerAndAgent=1, Agent=2, Admin=3 |
| OfferEventType | IBuyerOffer | Created=0, HostEdit=1, AgentCounter=2, HostCounter=3, Accepted=4, Rejected=5 |
| CounterOfferDirection | IBuyerOffer | None=0, AgentToHost=1, HostToAgent=2 |
| OfferNoteCategory | OfferNote | Client=0, Agent=1, Internal=2, CounterOffer=3 |
| SoftDelete | User | Active=0, Inactive=1, Deleted=2 |
| GhlSyncStatus | Property | Pending=0, Synced=1, Skipped=2, Failed=3 |
| USStates | Offer configs | All 50 US states |
| UserType (Flags) | Banner | SingleAgent=1, Agent=2, Manager=4, TeamTenantAdmin=8, BrokerageAdmin=16 |

## Relationships

### Core Entity Relationships

| From | To | Type | FK | Cascade |
|------|-----|------|-----|---------|
| User | Agent | 1:1 | Agent.UserId | Yes |
| User | Customer | 1:1 | Customer.UserId | Yes |
| User | GoogleToken | 1:1 | GoogleToken.UserId | Yes |
| User | Links | 1:1 | Links.UserId | Yes |
| Tenant | Brokerage | 1:1 | Brokerage.TenantId | Yes |
| Customer | Property | 1:N | Property.CustomerId | Yes |
| Customer | CustomerNote | 1:N | CustomerNote.CustomerId | Yes |
| Property | IBuyerOffer | 1:N | IBuyerOffer.PropertyId | Yes |
| Property | Note | 1:N | Note.PropertyId | Yes |
| Property | ToDoTask | 1:N | ToDoTask.PropertyId | Yes |
| Property | PropertyDocument | 1:N | PropertyDocument.PropertyId | Yes |
| Property | PropertyOfferStatus | 1:N | PropertyOfferStatus.PropertyId | **NoAction** |
| IBuyerOffer | CashOfferType | 1:1 | CashOfferType.IBuyerOfferId | Yes |
| IBuyerOffer | CashOfferPlusType | 1:1 | CashOfferPlusType.IBuyerOfferId | Yes |
| IBuyerOffer | FixListType | 1:1 | FixListType.IBuyerOfferId | Yes |
| IBuyerOffer | SellLeasebackType | 1:1 | SellLeasebackType.IBuyerOfferId | Yes |
| IBuyerOffer | CashBuyerType | 1:1 | CashBuyerType.IBuyerOfferId | Yes |
| IBuyerOffer | ListOnMarketType | 1:1 | ListOnMarketType.IBuyerOfferId | Yes |
| IBuyerOffer | OfferNote | 1:N | OfferNote.IBuyerOfferId | Yes |
| IBuyerOffer | OfferDocument | 1:N | OfferDocument.IBuyerOfferId | Yes |
| IBuyerOffer | IBuyerOffer | Self-ref | IBuyerOfferRefID | No |
| Agent | Agent | Self-ref (mgr) | Agent.ManagerId | No |
| Agent | Agent | Self-ref (admin) | Agent.AdminId | No |
| Agent | Group | 1:N | Group.AgentId | Yes |
| Agent | Customer | 1:N | Customer.AgentId | No |
| CustomerMessage | TwilioMessage | 1:1 | TwilioMessageId | Yes |
| CustomerMessage | Message | 1:1 | InAppMessageId | Yes |
| TwilioMessage | TwilioMedia | 1:1 | TwilioMedia.TwilioMessageId | Yes |
| PropertyDocument | BlobFile | N:1 | PropertyDocument.BlobFileId | Yes |
| OfferDocument | BlobFile | N:1 | OfferDocument.BlobFileId | Yes |

## Key Queries / Data Access Patterns

### Repository Pattern

**Custom Base:** `OffervanaRepositoryBase<T>` extends ABP generic repositories with:
- `GetAllIncluding(params Expression<>[] propertySelectors)` — eager loading
- `GetAllReadonly()` / `GetAllReadonlyIncluding()` — `AsNoTracking()` queries
- Primary/Failover datasource switching for read-replica support
- `EnsureCollectionLoadedAsync()` / `EnsurePropertyLoadedAsync()` — explicit loading

### Stored Procedures

| Procedure | Used By | Purpose |
|-----------|---------|---------|
| Bulk index SPs | IndexService | Azure Search customer/user/notification indexing |
| `usp_dashboardReports` | StatisticsAppService | Dashboard aggregation |

### Complex Query Patterns

| Pattern | Location | Description |
|---------|----------|-------------|
| Agent hierarchy CTE | CustomerServiceV2 | Recursive CTE on `Brokerage.Agents` to resolve Manager/Admin chain for data access filtering |
| Property includes | PropertyAppService | Deep include chains: Customer, IBuyerOffers (with all 6 offer types), Notes, Documents, PropertyActivities |
| Blast execution queries | BlastExecutorService | Heavily indexed queries on BlastJobExecutable composite indexes for email scheduling |

### Computed Column

**Customer.NormalizedEmail** — persisted computed SQL column that strips `+zoodealio` and `+lll` suffixes from email addresses for deduplication.

### Notable Indexes

| Entity | Index | Type |
|--------|-------|------|
| Property | AddressKey | Non-unique |
| Property | (Latitude, Longitude) | Composite |
| Customer | NormalizedEmail | Non-unique (computed) |
| IBuyerOffer | (IsDeleted, PropertyId, IsPreliminary, IsCurrent) | Composite |
| PropertyOfferStatus | (OfferId, CreatedUtc DESC) | Composite |
| InvestorHiddenProperties | (InvestorPortalUserId, PropertyId) | **Unique** |
| InvestorWatchlistProperties | (InvestorPortalUserId, PropertyId) | **Unique** |
| Agent | ReferralCode | Non-unique |
| Customer | ReferralCode | Non-unique |
| BlastJobExecutable | (ExecuteOn, IsExecuted, IsSuccess, IsException) | Composite |

## Recent Migrations (2026-04-03 → 2026-04-09)

| Migration | Purpose |
|-----------|---------|
| `20260403174128_AddOfferBonusTable` | Adds `OfferBonuses` table (new domain) |
| `20260407145701_ActivityMessageLengthUpdate` | Widens `History.Activities.Message` |
| `20260408143655_ActivityMessageLengthUpdate2` | Follow-up widening for `Activities.Message` |
| `20260409055722_AddOfferDocumentFlags` | Adds flags on `Customer.OfferDocuments` for Comparables Analysis + Offer Explainer slots |
