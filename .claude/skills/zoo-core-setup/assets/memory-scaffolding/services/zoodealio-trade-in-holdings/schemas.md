---
artifact: schemas
service: zoodealio-trade-in-holdings
commit-sha: 29a8d56facd353a71227ec0107ba88b321a7bc3a
shared-lib-commit-sha: 5f042c74c8ce9495bada0705ab902bbf3e71c5da
generated-at: 2026-04-15T00:00:00Z
entity-count: 38
---

# TIH Schemas

## Summary
- TIH owns 38 entities across the `TradeInHoldingsDbContext` (declared via 34 `DbSet<>` members; `DepartmentTeamMember`, `RolePermission` junctions, and `FundingRequestZipUserUserAssociation` are navigated through principals / exposed as dedicated DbSets).
- Cross-database touchpoints:
  - **OffervanaDbContext / OffervanaReadOnlyDbContext** — `Agent`, `Tenant`, `Brokerage`, `Customer`, `OffervanaUser`, `Property`, `IBuyer`, `IBuyerOffer`, `PropertyOfferStatus`, `OfferStatus`, `PropertyCompanyStatus`, `CashOfferType`, `CashOfferPlusType`, `SellLeasebackType`, `FixListType`, `CashBuyerType`, `ListOnMarketType` (read + write — see anti-pattern flag).
  - **InvestorPortalDbContext** — `User` (read-only via `GetZipUsersQuery`); `CompanyUser`, `Company` (read-only, used by `PublishOffersToOffervanaCommand` to resolve investor company). Remaining DbSets (Documents, PasswordResetTokens, etc.) are registered but unused by TIH.
- Soft-delete usage: **No** native soft-delete on TIH-owned tables — no `IsDeleted` / `DeletedOn` columns. Deletes are hard deletes with cascading behaviors defined in `OnModelCreating`. (Offervana `IBuyerOffer.IsDeleted` is the only soft-delete TIH reads/writes, and that lives in the legacy DB.)
- Audit fields convention: Inconsistent. Dominant TIH pattern is `CreatedByUserId` (Guid, required) + `CreatedDate` (DateTime, required) + `UpdatedByUserId` (Guid, nullable) + `UpdatedOn` (DateTime, nullable). Deviations: `ContractorNote`/`InvestorNote` use `CreatedOn` instead of `CreatedDate`; `Department` uses `UpdatedDate` instead of `UpdatedOn`; TransactionWorkflow entities (`WorkflowConfig`, `Workflow`, etc.) use `CreatedOn`/`UpdatedOn` plus non-nullable `CreatedByUserId`/`UpdatedByUserId`; `Role`/`Permission`/`RolePermission` use `CreatedAt`/`UpdatedAt`; `UnderwriteOfferHistory` uses `ChangedByUserId`/`ChangedDate`. No global query filter for audit/soft-delete is defined.
- Notable observations:
  - **Domain-in-Shared architecture.** All TIH entity classes and the `TradeInHoldingsDbContext` live in the `Zoodealio.Shared` NuGet package. The TIH service repo owns only services/controllers/handlers/profiles and the EF migrations. Schema changes require a coordinated PR in `Zoodealio.Shared` (entity + context + Fluent API) **and** a migration PR in `Zoodealio.TradeInHoldings`.
  - **Application-assigned Guid PKs** for essentially every TIH entity. `OnModelCreating` calls `.Property(x => x.Id).ValueGeneratedNever()` on Contractor, ContractorNote, Investor, InvestorNote, Department, CustomFieldConfig, CustomPropertyField, PropertyListing, Underwrite, UnderwriteHoa, UnderwriteResourceLink, UnderwriteComparableAdjustment, UnderwriteComparableNote, UnderwriteSelectedComparable, UnderwriteOffer, UnderwriteOfferItem, UnderwriteOfferNote, Document, WorkflowConfig, WorkflowStageConfig, WorkflowStageTaskConfig, CustomFieldLayout, Workflow, WorkflowStage, WorkflowStageTask, TransactionNote, PropertyTransaction, ChangeRequest, FundingRequest. The **sole exception** is `UnderwriteOfferHistory`, which uses `HasDefaultValueSql("NEWSEQUENTIALID()")` (DB-generated).
  - **External FK to Offervana `Property.Id` is denormalized as `int PropertyId` with no enforced FK.** Underwrite, PropertyListing, CustomPropertyField, PropertyTransaction, FundingRequest all carry a raw `int PropertyId` with no relational integrity to Offervana. Indexed in a few places (`PropertyListing`, `PropertyTransaction`, `CustomPropertyField`).
  - **External FK to ZIP `User.Id` is denormalized as `Guid ZipUserId`** in `FundingRequestZipUserUserAssociation` — again no enforced FK, only an index.
  - **Decimal precision enforced everywhere in fluent config.** Money fields → `(18,2)`, percentages → `(8,4)`, bathrooms → `(5,1)`, condition → `(4,1)`, square footage → `(12,2)`. Not via data annotations; via `modelBuilder`.
  - **Check constraints via Fluent API:**
    - `UnderwriteComparableAdjustment`: `CK_Adjustment_Type` (`AdjustmentType IN ('add','deduct')`), `CK_Adjustment_Amount_NonNegative` (`Amount >= 0`).
    - `UnderwriteOffer`: `CK_Offer_Type` (`OfferType IN ('CashOffer','CashPlus','SellNowMoveLater','FixList','CashBuyer','ListOnMarket')`), `CK_Offer_Status` (`Status IN ('Draft','PendingManagerReview','Approved','Rejected','Published')`).
    - `UnderwriteOfferItem`: `CK_OfferItem_Section` (`Section IN ('additional','resale')`).
    - `ChangeRequest`: `CK_ChangeRequests_ExactlyOneTarget` — ensures exactly one of `WorkflowStageTaskId` / `CustomFieldLayoutId` is non-null (polymorphic target).
  - **Unique constraints:** Role.Name, Permission.PermissionKey, User.Email, Department.Title, RolePermission(RoleId,PermissionId), Underwrite(PropertyId,CreatedByUserId), CustomFieldConfig.Name, CustomPropertyField(PropertyId,CustomFieldConfigId), WorkflowConfig.Name, UnderwriteComparableAdjustment(UnderwriteId,ComparablePropertyId,Field), UnderwriteSelectedComparable(UnderwriteId,ComparablePropertyId), UnderwriteOffer(UnderwriteId,OfferType).
  - **Polymorphic/shared-table oddities:** The `TransactionWorkflows` subsystem has two parallel trees: `Configs/*` (templates: `WorkflowConfig`, `WorkflowStageConfig`, `WorkflowStageTaskConfig`, `CustomFieldLayoutConfig`, `CustomFieldConfig`) and `WorkingEntities/*` (live instances: `Workflow`, `WorkflowStage`, `WorkflowStageTask`, `CustomFieldLayout`, `CustomPropertyField`, `PropertyTransaction`, `TransactionNote`, `ChangeRequest`). The Config tree is cloned into the Working tree at transaction start.
  - **M:N junction table `WorkflowConfigCustomFieldLayoutConfigs`** is auto-generated by EF via `UsingEntity(j => j.ToTable(...))` — no explicit junction entity.
  - **JSON columns used as denormalized blobs** — `CustomFieldConfig.ManifestJson`, `CustomFieldLayoutConfig.ManifestJson`, `CustomFieldLayout.ManifestJson`, `WorkflowStageTaskConfig.TaskFieldsJson`, `WorkflowStageTask.TaskFieldsJson`, `ChangeRequest.PayloadJson`/`ChangeSummaryJson`, `FundingRequest.LinksJson`/`DocumentIdsJson`, `UnderwriteOfferHistory.SnapshotJson`. Accepted technical debt.
  - **No `schema` specifier anywhere in TIH.** All tables are in `dbo` by default. Contrast with Offervana which uses `dbo`, `Customer`, `Admin`, `Brokerage` schemas.
  - **`FundingRequest.DocumentIdsJson` is a JSON array of Document Guids** — no FK; denormalized many-to-many.

## Source-of-truth note
**All entity classes and DbContexts for TIH live in the `Zoodealio.Shared` library, not in the TIH repo.** The TIH repo only owns: services, controllers, application/integration logic, AutoMapper profiles, MediatR handlers, and EF migrations. Schema changes require coordinated PRs across `Zoodealio.Shared` (entity + context + Fluent API config) AND `Zoodealio.TradeInHoldings` (migration). Captured at Shared SHA `5f042c7`.

## DbContext: TradeInHoldingsDbContext

`Zoodealio.Shared/TradeInHoldings/Infrastructure/TradeInHoldingsDbContext.cs`

**DbSets exposed (34):**
`Users`, `PasswordResetTokens`, `Contractors`, `ContractorNotes`, `Investors`, `InvestorNotes`, `Roles`, `Permissions`, `RolePermissions`, `Departments`, `DepartmentTeamMembers`, `Underwrites`, `UnderwriteHoas`, `UnderwriteResourceLinks`, `UnderwriteComparableAdjustments`, `UnderwriteComparableNotes`, `UnderwriteSelectedComparables`, `UnderwriteOffers`, `UnderwriteOfferItems`, `UnderwriteOfferNotes`, `UnderwriteOfferHistories`, `PropertyListings`, `Documents`, `CustomFieldConfigs`, `CustomFieldLayoutConfigs`, `WorkflowConfigs`, `WorkflowStageConfigs`, `WorkflowStageTaskConfigs`, `CustomFieldLayouts`, `CustomPropertyFields`, `PropertyTransactions`, `Workflows`, `WorkflowStages`, `WorkflowStageTasks`, `TransactionNotes`, `ChangeRequests`, `FundingRequests`, `FundingRequestZipUserUserAssociations`.

**OnModelCreating fluent configurations of note:**
- Guid PKs are **application-generated** (`ValueGeneratedNever()`) for almost every entity — the only DB-generated PK is `UnderwriteOfferHistory.Id` (`NEWSEQUENTIALID()`).
- `UnderwriteOfferHistory` is explicitly mapped to table name `UnderwriteOfferHistory` (no pluralization).
- `WorkflowConfig` has an M:N with `CustomFieldLayoutConfig` via auto-generated junction `WorkflowConfigCustomFieldLayoutConfigs`.
- `DepartmentTeamMember` has composite PK `(DepartmentId, TeamMemberId)`; `FundingRequestZipUserUserAssociation` has composite PK `(FundingRequestId, ZipUserId)`.
- Delete behaviors (selected):
  - Cascade: ContractorNote→Contractor, InvestorNote→Investor, RolePermission→Role, RolePermission→Permission, DepartmentTeamMember→Department/User, CustomPropertyField→CustomFieldConfig, Hoa/ResourceLink/ComparableAdjustment/ComparableNote/SelectedComparable/OfferNote→Underwrite, UnderwriteOffer→Underwrite, UnderwriteOfferItem→UnderwriteOffer, UnderwriteOfferHistory→UnderwriteOffer (Offer FK), WorkflowStageConfig→WorkflowConfig, WorkflowStageTaskConfig→WorkflowStageConfig, WorkflowStage→Workflow, WorkflowStageTask→WorkflowStage, TransactionNote→PropertyTransaction, FundingRequestZipUserUserAssociation→FundingRequest.
  - SetNull: User.Role (role deleted), PropertyListing.LastModifiedByUser, WorkflowStageTask.ChangeRequestApproverUser/Department, WorkflowStageTaskConfig.ChangeRequestApproverUser/Department, CustomFieldLayout.ChangeRequestApproverUser/Department, CustomFieldLayoutConfig.ChangeRequestApproverUser/Department, Department.UpdatedByUser.
  - Restrict: Department.CreatedByUser, Document.UploadedBy, ChangeRequest.PropertyTransaction, ChangeRequest.InitiatorUser, FundingRequest.Transaction, FundingRequest.CreatedBy.
  - NoAction: UnderwriteOfferHistory.Underwrite (UnderwriteId FK), TransactionNote.CreatedByUser, ChangeRequest.ApproverUser/ApproverDepartment/ResolvedByUser/WorkflowStageTask/CustomFieldLayout, WorkflowStageTask.Assigned*/Completed*/Reviewed*/ReviewRequired* FKs, WorkflowStageTaskConfig.Assigned*/ReviewRequired* FKs.
- No global query filters. No soft-delete filter.
- Enum columns: `ChangeRequest.ActionType` and `ChangeRequest.Status` are explicitly `HasConversion<int>()`. Other enum props (e.g. `Contractor.Type`, `WorkflowConfig.Status`) are persisted as default int (no explicit config).

### Entity: Contractor

**Table:** `Contractors`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/Contractor.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | Application-assigned (`ValueGeneratedNever`) |
| FirstName | string? | Yes | | |
| LastName | string? | Yes | | |
| CompanyName | string? | Yes | | |
| Type | ContractorType? | Yes | | Persisted as int |
| AreaCoverage | string? | Yes | | |
| Address | string? | Yes | | |
| City | string? | Yes | | |
| State | string? | Yes | nvarchar(2) | `[StringLength(2)]` |
| Zip | string? | Yes | | |
| EmailAddress | string? | Yes | | `[EmailAddress]` |
| PhoneNumber | string? | Yes | | |
| LicenseNumber | string? | Yes | | |
| CreatedByUserId | Guid | No | | |
| CreatedDate | DateTime | No | | |
| UpdatedByUserId | Guid? | Yes | | |
| UpdatedOn | DateTime? | Yes | | |

**Relationships:** none (no navigation properties on Contractor itself; `ContractorNote` points here via `ContractorId` with Cascade delete).

**Audit fields:** CreatedByUserId (req), CreatedDate (req), UpdatedByUserId (opt), UpdatedOn (opt).

### Entity: ContractorNote

**Table:** `ContractorNotes`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/ContractorNote.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | Application-assigned |
| ContractorId | Guid | No | FK→Contractor.Id, Cascade delete | |
| Note | string | No | | |
| CreatedByUserId | Guid | No | | |
| CreatedOn | DateTime | No | | NB: `CreatedOn`, not `CreatedDate` |
| UpdatedByUserId | Guid? | Yes | | |
| UpdatedOn | DateTime? | Yes | | |

**Relationships:**
- `Contractor Contractor` (required FK via `ContractorId`, Cascade).

**Audit fields:** CreatedByUserId / CreatedOn / UpdatedByUserId / UpdatedOn.

### Entity: Department

**Table:** `Departments`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/Department.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | Application-assigned |
| Title | string | No | nvarchar(200), **unique** | `[StringLength(200)]` + `HasIndex().IsUnique()` |
| Description | string? | Yes | | |
| CreatedByUserId | Guid | No | FK→User.Id (Restrict) | Cannot delete user who created departments |
| CreatedDate | DateTime | No | | |
| UpdatedByUserId | Guid? | Yes | FK→User.Id (SetNull) | |
| UpdatedDate | DateTime? | Yes | | NB: `UpdatedDate`, not `UpdatedOn` |

**Relationships:**
- `User? CreatedByUser` (FK `CreatedByUserId`, Restrict).
- `User? UpdatedByUser` (FK `UpdatedByUserId`, SetNull).
- `ICollection<DepartmentTeamMember> DepartmentTeamMembers`.

**Audit fields:** CreatedByUserId / CreatedDate / UpdatedByUserId / UpdatedDate.

### Entity: DepartmentTeamMember

**Table:** `DepartmentTeamMembers`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/DepartmentTeamMember.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| DepartmentId | Guid | No | Composite PK part 1, FK→Department.Id (Cascade) | |
| TeamMemberId | Guid | No | Composite PK part 2, FK→User.Id (Cascade), indexed | |

**Relationships:**
- `Department? Department` (FK `DepartmentId`, Cascade).
- `User? TeamMember` (FK `TeamMemberId`, Cascade).

**Audit fields:** None (junction only).

### Entity: Document

**Table:** `Documents`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/Document.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | Application-assigned |
| FileName | string | No | | |
| BlobName | string | No | | |
| ContentType | string | No | | |
| Size | long | No | | |
| FileUrl | string | No | | |
| UploadedAt | DateTime | No | default `DateTime.UtcNow` (C# init) | |
| LastModified | DateTime? | Yes | | |
| UploadedById | Guid | No | FK→User.Id (Restrict), indexed | |
| CreatedByUserId | Guid | No | | |
| CreatedDate | DateTime | No | | |
| UpdatedByUserId | Guid? | Yes | | |
| UpdatedOn | DateTime? | Yes | | |

**Relationships:**
- `User? UploadedBy` (FK `UploadedById`, Restrict).

**Audit fields:** UploadedById / UploadedAt (upload metadata) + CreatedByUserId / CreatedDate / UpdatedByUserId / UpdatedOn (row audit). Duplicate fields.

### Entity: FundingRequest

**Table:** `FundingRequests`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/FundingRequest.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | Application-assigned |
| Sqft | int? | Yes | | |
| Stories | int? | Yes | | |
| Bedrooms | int? | Yes | | |
| Bathrooms | int? | Yes | | |
| YearBuilt | int? | Yes | | |
| LotSize | int? | Yes | | |
| PurchasePrice | decimal? | Yes | decimal(18,2) | Fluent `HasColumnType` |
| EstResaleAmount | decimal? | Yes | decimal(18,2) | |
| Reserve | decimal? | Yes | decimal(18,2) | |
| FundingAmount | decimal? | Yes | decimal(18,2) | |
| RepairBid | decimal? | Yes | decimal(18,2) | |
| InterestRate | decimal? | Yes | decimal(5,2) | |
| ProjHoldingPeriod | string? | Yes | | |
| FundingStructure | string | No | default `"flat_fee"` | |
| FlatFee | decimal? | Yes | decimal(18,2) | |
| ProgramFeeSplit1 | decimal? | Yes | decimal(5,2) | |
| ProgramFeeSplit2 | decimal? | Yes | decimal(5,2) | |
| ResponseDeadline | DateTime? | Yes | | |
| ClosingDate | DateTime? | Yes | | |
| Renovation | string? | Yes | | |
| LinksJson | string? | Yes | | JSON array of `{ title, url }` |
| DocumentIdsJson | string? | Yes | | JSON array of Document Guids (no FK) |
| CreatedByUserId | Guid | No | FK→User.Id (Restrict) | |
| CreatedDate | DateTime | No | | |
| UpdatedByUserId | Guid? | Yes | | |
| UpdatedOn | DateTime? | Yes | | |
| PropertyId | int | No | | External Offervana ref, no FK |
| TransactionId | Guid | No | FK→PropertyTransaction.Id (Restrict), indexed | |

**Relationships:**
- `PropertyTransaction? Transaction` (FK `TransactionId`, Restrict).
- `User? CreatedBy` (FK `CreatedByUserId`, Restrict).
- `ICollection<FundingRequestZipUserUserAssociation> FundingRequestZipUserUserAssociations`.

**Audit fields:** CreatedByUserId / CreatedDate / UpdatedByUserId / UpdatedOn.

### Entity: FundingRequestZipUserUserAssociation

**Table:** `FundingRequestZipUserUserAssociations`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/FundingRequestInvestor.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| FundingRequestId | Guid | No | Composite PK part 1, FK→FundingRequest.Id (Cascade) | |
| ZipUserId | Guid | No | Composite PK part 2, indexed | External ZIP User ref, **no FK** |
| IsAccepted | bool? | Yes | | |
| IsDeclined | bool? | Yes | | |

**Relationships:**
- `FundingRequest? FundingRequest` (FK `FundingRequestId`, Cascade).

**Audit fields:** None.

### Entity: Investor

**Table:** `Investors`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/Investor.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | Application-assigned |
| FirstName | string? | Yes | | |
| LastName | string? | Yes | | |
| EntityName | string? | Yes | | |
| City | string? | Yes | | |
| State | string? | Yes | nvarchar(2) | |
| PrimaryEmail | string? | Yes | | `[EmailAddress]` |
| SecondaryEmail | string? | Yes | | `[EmailAddress]` |
| PhoneNumber | string? | Yes | | |
| CreatedByUserId | Guid | No | | |
| CreatedDate | DateTime | No | | |
| UpdatedByUserId | Guid? | Yes | | |
| UpdatedOn | DateTime? | Yes | | |

**Relationships:** none outbound (InvestorNote points here via `InvestorId`, Cascade).

**Audit fields:** CreatedByUserId / CreatedDate / UpdatedByUserId / UpdatedOn.

### Entity: InvestorNote

**Table:** `InvestorNotes`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/InvestorNote.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | Application-assigned |
| InvestorId | Guid | No | FK→Investor.Id (Cascade) | |
| Note | string | No | | |
| CreatedByUserId | Guid | No | | |
| CreatedOn | DateTime | No | | NB: `CreatedOn`, not `CreatedDate` |
| UpdatedByUserId | Guid? | Yes | | |
| UpdatedOn | DateTime? | Yes | | |

**Relationships:**
- `Investor Investor` (FK `InvestorId`, Cascade).

**Audit fields:** CreatedByUserId / CreatedOn / UpdatedByUserId / UpdatedOn.

### Entity: PasswordResetToken

**Table:** `PasswordResetTokens`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/PasswordResetToken.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | |
| Email | string | No | | |
| Token | string | No | | |
| CreatedAt | DateTime | No | | |
| ExpiresAt | DateTime | No | | |
| IsUsed | bool | No | | |
| UsedAt | DateTime? | Yes | | |

**Relationships:** none.

**Audit fields:** None (token entity, CreatedAt only).

### Entity: Permission

**Table:** `Permissions`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/Permission.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | |
| Module | string | No | nvarchar(100) | e.g. `"settings.roles"` |
| Action | string | No | nvarchar(20) | `"create"` / `"read"` / `"update"` / `"delete"` |
| PermissionKey | string | No | nvarchar(150), **unique** | Format `"{module}.{action}"` |
| Description | string? | Yes | nvarchar(500) | |
| CreatedAt | DateTime | No | default `DateTime.UtcNow` (C# init) | |

**Relationships:**
- `ICollection<RolePermission> RolePermissions`.

**Audit fields:** CreatedAt only.

### Entity: PropertyListing

**Table:** `PropertyListings`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/PropertyListing.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | Application-assigned |
| Name | string | No | nvarchar(200) | |
| Url | string | No | nvarchar(2000) | |
| CreatedOn | DateTime | No | | |
| UpdatedOn | DateTime? | Yes | | |
| PropertyId | int | No | indexed | External Offervana ref, no FK |
| LastModifiedByUserId | Guid? | Yes | FK→User.Id (SetNull) | |

**Relationships:**
- `User? LastModifiedByUser` (FK `LastModifiedByUserId`, SetNull).

**Audit fields:** LastModifiedByUserId / UpdatedOn / CreatedOn (no explicit CreatedBy).

### Entity: Role

**Table:** `Roles`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/Role.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | |
| Name | string | No | nvarchar(100), **unique** | |
| Description | string? | Yes | nvarchar(500) | |
| IsHostAdmin | bool | No | | Immutable super-admin flag |
| CreatedAt | DateTime | No | default `DateTime.UtcNow` (C# init) | |
| UpdatedAt | DateTime | No | default `DateTime.UtcNow` (C# init) | |

**Relationships:**
- `ICollection<RolePermission> RolePermissions`.
- `ICollection<User> Users`.

**Audit fields:** CreatedAt / UpdatedAt (different convention from TIH norm).

### Entity: RolePermission

**Table:** `RolePermissions`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/RolePermission.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | |
| RoleId | Guid | No | FK→Role.Id (Cascade), part of `(RoleId,PermissionId)` unique index | |
| PermissionId | Guid | No | FK→Permission.Id (Cascade), part of unique index | |
| CreatedAt | DateTime | No | default `DateTime.UtcNow` (C# init) | |

**Relationships:**
- `Role Role` (Cascade).
- `Permission Permission` (Cascade).

**Audit fields:** CreatedAt only.

### Entity: Underwrite

**Table:** `Underwrites`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/Underwrite.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | Application-assigned |
| PropertyId | int | No | Part of unique index `(PropertyId, CreatedByUserId)` | External Offervana ref, no FK |
| PropertyAddress | string? | Yes | | |
| Subdivision | string? | Yes | nvarchar(200) | |
| YearBuilt | short? | Yes | | |
| GarageCount | int? | Yes | | |
| HasPool | bool? | Yes | | |
| PoolType | string? | Yes | nvarchar(50) | |
| NumberOfFloors | string? | Yes | nvarchar(100) | |
| BedroomsCount | int? | Yes | | |
| BathroomsCount | decimal? | Yes | decimal(5,1) | |
| SquareFootage | decimal? | Yes | decimal(12,2) | |
| LotSize | int? | Yes | | |
| ConditionRating | decimal? | Yes | decimal(4,1) | |
| PhotoLink | string? | Yes | nvarchar(500) | |
| MainImageUrl | string? | Yes | nvarchar(500) | |
| MapImageUrl | string? | Yes | nvarchar(500) | |
| InstantCashOffer | decimal? | Yes | decimal(18,2) | |
| ReservePercentage | decimal? | Yes | decimal(8,4) | |
| ProgramPercentage | decimal? | Yes | decimal(8,4) | |
| ResalePercentage | decimal? | Yes | decimal(8,4) | |
| CurrentBase | decimal? | Yes | decimal(18,2) | |
| ProgramFee | decimal? | Yes | decimal(18,2) | |
| RealValue | decimal? | Yes | decimal(18,2) | |
| RvPerSqftPrice | decimal? | Yes | decimal(18,2) | |
| PropertyDensity | string? | Yes | nvarchar(100) | |
| ClosingCost | decimal? | Yes | decimal(18,2) | |
| AgentCommissions | decimal? | Yes | decimal(18,2) | |
| LoanAmount | decimal? | Yes | decimal(18,2) | |
| LoanTerm | string? | Yes | nvarchar(50) | |
| YearRecorded | int? | Yes | | |
| EstimatedPayoff | decimal? | Yes | decimal(18,2) | |
| IsListed | bool? | Yes | | |
| ListedStatus | string? | Yes | nvarchar(100) | |
| LastListedPrice | decimal? | Yes | decimal(18,2) | |
| ListedDate | string? | Yes | nvarchar(30) | Stored as string! |
| OffMarketDate | string? | Yes | nvarchar(30) | Stored as string! |
| CreatedByUserId | Guid | No | Part of unique index with PropertyId | |
| CreatedDate | DateTime | No | | |
| UpdatedByUserId | Guid? | Yes | | |
| UpdatedOn | DateTime? | Yes | | |

**Relationships:**
- `ICollection<UnderwriteHoa> Hoas` (Cascade).
- `ICollection<UnderwriteResourceLink> ResourceLinks` (Cascade).
- `ICollection<UnderwriteComparableAdjustment> ComparableAdjustments` (Cascade).
- `ICollection<UnderwriteComparableNote> ComparableNotes` (Cascade).
- `ICollection<UnderwriteSelectedComparable> SelectedComparables` (Cascade).
- `ICollection<UnderwriteOffer> Offers` (Cascade).
- `ICollection<UnderwriteOfferNote> OfferNotes` (Cascade).

**Audit fields:** CreatedByUserId / CreatedDate / UpdatedByUserId / UpdatedOn.

### Entity: UnderwriteComparableAdjustment

**Table:** `UnderwriteComparableAdjustments`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/UnderwriteComparableAdjustment.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | Application-assigned |
| UnderwriteId | Guid | No | FK→Underwrite.Id (Cascade), part of unique `(UnderwriteId, ComparablePropertyId, Field)` | |
| ComparablePropertyId | string | No | nvarchar(50), part of unique index | MLS mlsNumber |
| Field | string | No | nvarchar(100), part of unique index | e.g. `"squareFootage"` |
| AdjustmentType | string | No | nvarchar(20); **check: `IN ('add','deduct')`** | |
| Amount | decimal | No | decimal(18,2); **check: `>= 0`** | |
| Note | string? | Yes | nvarchar(500) | |
| CreatedDate | DateTime | No | | |

**Relationships:**
- `Underwrite Underwrite` (Cascade).

**Audit fields:** CreatedDate only (no CreatedByUserId).

### Entity: UnderwriteComparableNote

**Table:** `UnderwriteComparableNotes`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/UnderwriteComparableNote.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | Application-assigned |
| UnderwriteId | Guid | No | FK→Underwrite.Id (Cascade), part of composite index `(UnderwriteId, ComparablePropertyId)` | |
| ComparablePropertyId | string | No | nvarchar(50), part of composite index | MLS mlsNumber |
| Title | string | No | nvarchar(200) | |
| Content | string | No | nvarchar(2000) | |
| AuthorName | string? | Yes | nvarchar(100) | |
| AuthorInitials | string? | Yes | nvarchar(10) | |
| CreatedDate | DateTime | No | | |
| UpdatedDate | DateTime? | Yes | | |

**Relationships:**
- `Underwrite Underwrite` (Cascade).

**Audit fields:** CreatedDate / UpdatedDate only.

### Entity: UnderwriteHoa

**Table:** `UnderwriteHoas`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/UnderwriteHoa.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | Application-assigned |
| UnderwriteId | Guid | No | FK→Underwrite.Id (Cascade) | |
| HoaType | string? | Yes | nvarchar(50) | |
| MonthlyDue | decimal? | Yes | decimal(18,2) | |

**Relationships:**
- `Underwrite Underwrite` (Cascade).

**Audit fields:** None.

### Entity: UnderwriteOffer

**Table:** `UnderwriteOffers`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/UnderwriteOffer.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | Application-assigned |
| UnderwriteId | Guid | No | FK→Underwrite.Id (Cascade), part of unique `(UnderwriteId, OfferType)` | |
| OfferType | string | No | nvarchar(50); **check: `IN ('CashOffer','CashPlus','SellNowMoveLater','FixList','CashBuyer','ListOnMarket')`** | Part of unique index |
| Status | string | No | nvarchar(50) default `"Draft"`; **check: `IN ('Draft','PendingManagerReview','Approved','Rejected','Published')`** | |
| Level | string? | Yes | nvarchar(50) | |
| AssignedTo | string? | Yes | nvarchar(200) | |
| Basis | decimal? | Yes | decimal(18,2) | |
| OfferAmount | decimal? | Yes | decimal(18,2) | |
| Reserve | decimal? | Yes | decimal(18,2) | |
| ReservePercentage | decimal? | Yes | decimal(8,4) | |
| ProgramFee | decimal? | Yes | decimal(18,2) | |
| ProgramFeePercentage | decimal? | Yes | decimal(8,4) | |
| ResaleFee | decimal? | Yes | decimal(18,2) | |
| ResaleFeePercentage | decimal? | Yes | decimal(8,4) | |
| ClosingCost | decimal? | Yes | decimal(18,2) | |
| ClosingCostPercentage | decimal? | Yes | decimal(8,4) | |
| MortgagePayoff | decimal? | Yes | decimal(18,2) | |
| AdditionalCompensation | decimal? | Yes | decimal(18,2) | |
| ServiceFee | decimal? | Yes | decimal(18,2) | |
| ServiceFeePercentage | decimal? | Yes | decimal(8,4) | |
| ServiceFee2 | decimal? | Yes | decimal(18,2) | |
| ServiceFeePercentage2 | decimal? | Yes | decimal(8,4) | |
| BrokerServiceCharge | decimal? | Yes | decimal(18,2) | |
| BrokerServiceChargePercentage | decimal? | Yes | decimal(8,4) | |
| ViewCommission | decimal? | Yes | decimal(18,2) | |
| ViewCommissionPercentage | decimal? | Yes | decimal(8,4) | |
| Holdback | decimal? | Yes | decimal(18,2) | |
| HoldbackPercentage | decimal? | Yes | decimal(8,4) | |
| FirstMonthRent | decimal? | Yes | decimal(18,2) | |
| IsRentFlat | bool? | Yes | | |
| RentFlatAmount | decimal? | Yes | decimal(18,2) | |
| RentFlatPercentage | decimal? | Yes | decimal(8,4) | |
| RentMinAmount | decimal? | Yes | decimal(18,2) | |
| RentMinPercentage | decimal? | Yes | decimal(8,4) | |
| RentMaxAmount | decimal? | Yes | decimal(18,2) | |
| RentMaxPercentage | decimal? | Yes | decimal(8,4) | |
| EstimatedRepairs | decimal? | Yes | decimal(18,2) | |
| EstimatedRepairsPercentage | decimal? | Yes | decimal(8,4) | |
| InterimOwnershipCostsIncluded | bool? | Yes | | |
| InterimHoldingCost | decimal? | Yes | decimal(18,2) | |
| InterimHoldingCostPercentage | decimal? | Yes | decimal(8,4) | |
| HasMonthlyHoldingCosts | bool? | Yes | | |
| MonthlyHoldingCost | decimal? | Yes | decimal(18,2) | |
| MonthlyHoldingCostPercentage | decimal? | Yes | decimal(8,4) | |
| MonthlyHoldingCostLabel | string? | Yes | nvarchar(200) | |
| ProjectedDaysOnMarket | int? | Yes | | |
| CashBuyerServiceFee | decimal? | Yes | decimal(18,2) | |
| CashBuyerServiceFeePercentage | decimal? | Yes | decimal(8,4) | |
| DaysOnMarket | int? | Yes | | |
| Commission | decimal? | Yes | decimal(18,2) | |
| CommissionPercentage | decimal? | Yes | decimal(8,4) | |
| StateTax | decimal? | Yes | decimal(18,2) | |
| StateTaxPercentage | decimal? | Yes | decimal(8,4) | |
| FirstPayoutAmount | decimal? | Yes | decimal(18,2) | |
| SecondPayoutAmount | decimal? | Yes | decimal(18,2) | |
| NetOffer | decimal? | Yes | decimal(18,2) | |
| AgentCompensation | decimal? | Yes | decimal(18,2) | |
| TotalPayouts | decimal? | Yes | decimal(18,2) | |
| Version | int | No | default 1 | |
| CreatedByUserId | Guid | No | | |
| CreatedDate | DateTime | No | | |
| UpdatedByUserId | Guid? | Yes | | |
| UpdatedOn | DateTime? | Yes | | |

**Relationships:**
- `Underwrite Underwrite` (FK `UnderwriteId`, Cascade).
- `ICollection<UnderwriteOfferItem> OfferItems` (Cascade).
- `ICollection<UnderwriteOfferHistory> History` (Cascade via Offer FK).

**Audit fields:** CreatedByUserId / CreatedDate / UpdatedByUserId / UpdatedOn.

### Entity: UnderwriteOfferHistory

**Table:** `UnderwriteOfferHistory` (explicit, singular — not pluralized)
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/UnderwriteOfferHistory.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK, DB-generated `NEWSEQUENTIALID()` | **Only TIH entity with DB-generated PK** |
| OfferId | Guid | No | FK→UnderwriteOffer.Id (Cascade), indexed | |
| UnderwriteId | Guid | No | FK→Underwrite.Id (NoAction), indexed | |
| Version | int | No | | |
| OfferType | string | No | nvarchar(30) | |
| Status | string | No | nvarchar(30) | |
| Level | string? | Yes | nvarchar(200) | |
| OfferAmount | decimal? | Yes | decimal(18,2) | |
| NetOffer | decimal? | Yes | decimal(18,2) | |
| Reserve | decimal? | Yes | decimal(18,2) | |
| ProgramFeePercentage | decimal? | Yes | decimal(8,4) | |
| ResaleFeePercentage | decimal? | Yes | decimal(8,4) | |
| ClosingCost | decimal? | Yes | decimal(18,2) | |
| MortgagePayoff | decimal? | Yes | decimal(18,2) | |
| FirstPayoutAmount | decimal? | Yes | decimal(18,2) | |
| SecondPayoutAmount | decimal? | Yes | decimal(18,2) | |
| AgentCompensation | decimal? | Yes | decimal(18,2) | |
| SnapshotJson | string? | Yes | | JSON snapshot of full offer |
| Action | string | No | nvarchar(50) | |
| ChangedByUserId | Guid | No | | |
| ChangedByName | string? | Yes | nvarchar(200) | |
| ChangedDate | DateTime | No | | |

**Relationships:**
- `UnderwriteOffer Offer` (FK `OfferId`, Cascade).
- `Underwrite Underwrite` (FK `UnderwriteId`, NoAction to avoid multiple cascade paths).

**Audit fields:** ChangedByUserId / ChangedByName / ChangedDate (event-sourcing style).

### Entity: UnderwriteOfferItem

**Table:** `UnderwriteOfferItems`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/UnderwriteOfferItem.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | Application-assigned |
| OfferId | Guid | No | FK→UnderwriteOffer.Id (Cascade) | |
| Section | string | No | nvarchar(20); **check: `IN ('additional','resale')`** | |
| Name | string | No | nvarchar(200) | |
| Amount | decimal | No | decimal(18,2) | |
| IsCredit | bool | No | | |
| SortOrder | int | No | | |

**Relationships:**
- `UnderwriteOffer Offer` (Cascade).

**Audit fields:** None.

### Entity: UnderwriteOfferNote

**Table:** `UnderwriteOfferNotes`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/UnderwriteOfferNote.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | Application-assigned |
| UnderwriteId | Guid | No | FK→Underwrite.Id (Cascade), indexed | |
| Content | string | No | nvarchar(4000) | |
| AssigneeUserId | Guid? | Yes | | No FK configured |
| AssigneeName | string? | Yes | nvarchar(200) | |
| AuthorName | string? | Yes | nvarchar(200) | |
| AuthorInitials | string? | Yes | nvarchar(10) | |
| CreatedByUserId | Guid | No | | |
| CreatedDate | DateTime | No | | |

**Relationships:**
- `Underwrite Underwrite` (FK `UnderwriteId`, Cascade).

**Audit fields:** CreatedByUserId / CreatedDate (no Updated* fields).

### Entity: UnderwriteResourceLink

**Table:** `UnderwriteResourceLinks`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/UnderwriteResourceLink.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | Application-assigned |
| UnderwriteId | Guid | No | FK→Underwrite.Id (Cascade) | |
| Name | string? | Yes | nvarchar(200) | |
| Url | string? | Yes | nvarchar(500) | |

**Relationships:**
- `Underwrite Underwrite` (Cascade).

**Audit fields:** None.

### Entity: UnderwriteSelectedComparable

**Table:** `UnderwriteSelectedComparables`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/UnderwriteSelectedComparable.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | Application-assigned |
| UnderwriteId | Guid | No | FK→Underwrite.Id (Cascade), part of unique `(UnderwriteId, ComparablePropertyId)` | |
| ComparablePropertyId | string | No | nvarchar(50), part of unique index | MLS mlsNumber |
| SortOrder | int | No | | |

**Relationships:**
- `Underwrite Underwrite` (Cascade).

**Audit fields:** None.

### Entity: User

**Table:** `Users`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/User.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | |
| FName | string | No | | |
| LName | string | No | | |
| Email | string | No | **unique** | `[EmailAddress]`, `HasIndex().IsUnique()` |
| Phone | string | No | | |
| Username | string | No | | |
| PasswordHash | string | No | | |
| IsHostAdmin | bool? | Yes | | |
| RefreshToken | string? | Yes | | |
| RefreshTokenExpiryTime | DateTime? | Yes | | |
| LastLogin | DateTime? | Yes | | |
| CreatedDate | DateTime | No | | |
| RoleId | Guid? | Yes | FK→Role.Id (SetNull) | |

**Relationships:**
- `Role? Role` (FK `RoleId`, SetNull).

**Audit fields:** CreatedDate / LastLogin only (no CreatedBy / Updated*).

### Entity: CustomFieldConfig

**Table:** `CustomFieldConfigs`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/TransactionWorkflows/Configs/CustomFieldConfig.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | Application-assigned |
| Name | string | No | **unique** | |
| Description | string | No | | |
| CreatedOn | DateTime | No | | |
| UpdatedOn | DateTime | No | | |
| CreatedByUserId | Guid | No | | |
| UpdatedByUserId | Guid | No | | **non-nullable** (deviates from norm) |
| IsLocked | bool? | Yes | default `false` | Seed-lock flag |
| ManifestJson | string? | Yes | | JSON |
| ControlType | CustomFieldControlType | No | int | Enum: TextFieldInput, TextAreaInput, NumberInput, CurrencyInput, DateInput, DropdownSelectInput, CheckboxInput, ToggleInput, FileUploadInput, EmailInput, PhoneInput, TitleField, SubtitleField, UrlField, DividerField |

**Relationships:**
- `ICollection<CustomPropertyField> CustomPropertyFields` (Cascade).

**Audit fields:** CreatedByUserId / CreatedOn / UpdatedByUserId / UpdatedOn (non-nullable Updated* — intentional for configs).

### Entity: CustomFieldLayoutConfig

**Table:** `CustomFieldLayoutConfigs`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/TransactionWorkflows/Configs/CustomFieldLayoutConfig.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | |
| Name | string | No | | |
| Description | string | No | | |
| CreatedOn | DateTime | No | | |
| UpdatedOn | DateTime | No | | |
| CreatedByUserId | Guid | No | | |
| UpdatedByUserId | Guid | No | | |
| ManifestJson | string? | Yes | | JSON |
| IsLocked | bool? | Yes | | |
| IsChangeRequestRequired | bool | No | | |
| ChangeRequestApproverUserId | Guid? | Yes | FK→User.Id (SetNull) | |
| ChangeRequestApproverDepartmentId | Guid? | Yes | FK→Department.Id (SetNull) | |

**Relationships:**
- `ICollection<WorkflowConfig> WorkflowConfigs` — M:N via auto-junction `WorkflowConfigCustomFieldLayoutConfigs`.
- `User? ChangeRequestApproverUser` (SetNull).
- `Department? ChangeRequestApproverDepartment` (SetNull).

**Audit fields:** CreatedOn / UpdatedOn / CreatedByUserId / UpdatedByUserId.

### Entity: WorkflowConfig

**Table:** `WorkflowConfigs`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/TransactionWorkflows/Configs/WorkflowConfig.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | |
| Name | string | No | **unique** | |
| Description | string | No | | |
| SortOrder | int | No | | |
| Status | WorkflowConfigStatus | No | int (default Draft) | Enum: Draft=0, Published=1 |
| CreatedOn | DateTime | No | | |
| UpdatedOn | DateTime | No | | |
| CreatedByUserId | Guid | No | | |
| UpdatedByUserId | Guid | No | | |
| IsLocked | bool? | Yes | | |

**Relationships:**
- `ICollection<CustomFieldLayoutConfig> CustomFieldLayoutConfigs` (M:N).
- `ICollection<WorkflowStageConfig> WorkflowStageConfigs` (Cascade).

**Audit fields:** CreatedOn / UpdatedOn / CreatedByUserId / UpdatedByUserId.

### Entity: WorkflowStageConfig

**Table:** `WorkflowStageConfigs`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/TransactionWorkflows/Configs/WorkflowStageConfig.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | |
| Name | string | No | | |
| Description | string | No | | |
| SortOrder | int | No | | |
| CreatedOn | DateTime | No | | |
| UpdatedOn | DateTime | No | | |
| CreatedByUserId | Guid | No | | |
| UpdatedByUserId | Guid | No | | |
| IsLocked | bool? | Yes | | |
| WorkflowConfigId | Guid? | Yes | FK→WorkflowConfig.Id (Cascade) | |

**Relationships:**
- `WorkflowConfig? WorkflowConfig` (Cascade).
- `ICollection<WorkflowStageTaskConfig> WorkflowStageTaskConfigs` (Cascade).

**Audit fields:** CreatedOn / UpdatedOn / CreatedByUserId / UpdatedByUserId.

### Entity: WorkflowStageTaskConfig

**Table:** `WorkflowStageTaskConfigs`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/TransactionWorkflows/Configs/WorkflowStageTaskConfig.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | |
| Name | string | No | | |
| Description | string | No | | |
| SortOrder | int | No | | |
| IsRequired | bool | No | | |
| IsReviewRequired | bool | No | | |
| TaskFieldsJson | string? | Yes | | JSON |
| DueDays | int? | Yes | | |
| DueWeeks | int? | Yes | | |
| DueMonths | int? | Yes | | |
| CreatedOn | DateTime | No | | |
| UpdatedOn | DateTime | No | | |
| CreatedByUserId | Guid | No | | |
| UpdatedByUserId | Guid | No | | |
| IsLocked | bool? | Yes | | |
| IsChangeRequestRequired | bool | No | | |
| WorkflowStageConfigId | Guid? | Yes | FK→WorkflowStageConfig.Id (Cascade) | |
| AssignedToUserId | Guid? | Yes | FK→User.Id (NoAction) | |
| AssignedToDepartmentId | Guid? | Yes | FK→Department.Id (NoAction) | |
| ReviewRequiredByUserId | Guid? | Yes | FK→User.Id (NoAction) | |
| ReviewRequiredByDepartmentId | Guid? | Yes | FK→Department.Id (NoAction) | |
| ChangeRequestApproverUserId | Guid? | Yes | FK→User.Id (SetNull) | |
| ChangeRequestApproverDepartmentId | Guid? | Yes | FK→Department.Id (SetNull) | |

**Relationships:**
- `WorkflowStageConfig? WorkflowStageConfig` (Cascade).
- `User? AssignedToUser` / `Department? AssignedToDepartment` (NoAction).
- `User? ReviewRequiredByUser` / `Department? ReviewRequiredByDepartment` (NoAction).
- `User? ChangeRequestApproverUser` / `Department? ChangeRequestApproverDepartment` (SetNull).

**Audit fields:** CreatedOn / UpdatedOn / CreatedByUserId / UpdatedByUserId.

### Entity: CustomFieldLayout

**Table:** `CustomFieldLayouts`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/TransactionWorkflows/WorkingEntities/CustomFieldLayout.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | Application-assigned |
| Name | string | No | | |
| Description | string | No | | |
| CreatedOn | DateTime | No | | |
| UpdatedOn | DateTime | No | | |
| CreatedByUserId | Guid | No | | |
| UpdatedByUserId | Guid | No | | |
| ManifestJson | string? | Yes | | JSON |
| IsChangeRequestRequired | bool | No | | |
| WorkflowId | Guid | No | FK→Workflow.Id (default) | |
| ChangeRequestApproverUserId | Guid? | Yes | FK→User.Id (SetNull) | |
| ChangeRequestApproverDepartmentId | Guid? | Yes | FK→Department.Id (SetNull) | |

**Relationships:**
- `Workflow? Workflow` (FK `WorkflowId`).
- `User? ChangeRequestApproverUser` (SetNull).
- `Department? ChangeRequestApproverDepartment` (SetNull).

**Audit fields:** CreatedOn / UpdatedOn / CreatedByUserId / UpdatedByUserId.

### Entity: CustomPropertyField

**Table:** `CustomPropertyFields`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/TransactionWorkflows/WorkingEntities/CustomPropertyField.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | Application-assigned |
| Value | string | No | | |
| PropertyId | int | No | Part of unique `(PropertyId, CustomFieldConfigId)` | External Offervana ref, no FK |
| CustomFieldConfigId | Guid | No | FK→CustomFieldConfig.Id (Cascade), part of unique | |

**Relationships:**
- `CustomFieldConfig CustomFieldConfig` (Cascade).

**Audit fields:** None.

### Entity: PropertyTransaction

**Table:** `PropertyTransactions`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/TransactionWorkflows/WorkingEntities/PropertyTransaction.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | Application-assigned |
| Name | string | No | | |
| Description | string | No | | |
| IsActive | bool | No | | |
| IsCompleted | bool | No | | |
| IsEditLocked | bool | No | | |
| CreatedOn | DateTime | No | | |
| UpdatedOn | DateTime | No | | |
| CurrentWorkflowId | Guid? | Yes | | No FK configured (soft reference) |
| IsTerminated | bool? | Yes | | |
| PropertyId | int | No | indexed | External Offervana ref, no FK |

**Relationships:**
- `ICollection<Workflow> Workflows`.
- `ICollection<ChangeRequest> ChangeRequests`.

**Audit fields:** CreatedOn / UpdatedOn only (no CreatedBy/UpdatedBy at entity level).

### Entity: TransactionNote

**Table:** `TransactionNotes`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/TransactionWorkflows/WorkingEntities/TransactionNote.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | Application-assigned |
| Content | string | No | | |
| CreatedOn | DateTime | No | | |
| PropertyTransactionId | Guid | No | FK→PropertyTransaction.Id (Cascade), indexed | |
| CreatedByUserId | Guid | No | FK→User.Id (NoAction) | |

**Relationships:**
- `PropertyTransaction PropertyTransaction` (Cascade).
- `User CreatedByUser` (NoAction).

**Audit fields:** CreatedByUserId / CreatedOn only.

### Entity: Workflow

**Table:** `Workflows`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/TransactionWorkflows/WorkingEntities/Workflow.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | Application-assigned |
| Name | string | No | | |
| Description | string | No | | |
| CreatedOn | DateTime | No | | |
| UpdatedOn | DateTime | No | | |
| CreatedByUserId | Guid | No | | |
| UpdatedByUserId | Guid | No | | |
| SortOrder | int | No | | |
| WorkflowConfigId | Guid | No | FK→WorkflowConfig.Id | Template pointer |
| PropertyTransactionId | Guid | No | FK→PropertyTransaction.Id | |

**Relationships:**
- `WorkflowConfig WorkflowConfig`.
- `PropertyTransaction PropertyTransaction`.
- `ICollection<CustomFieldLayout> CustomFieldLayouts`.
- `ICollection<WorkflowStage> WorkflowStages` (Cascade).

**Audit fields:** CreatedOn / UpdatedOn / CreatedByUserId / UpdatedByUserId.

### Entity: WorkflowStage

**Table:** `WorkflowStages`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/TransactionWorkflows/WorkingEntities/WorkflowStage.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | Application-assigned |
| Name | string | No | | |
| Description | string | No | | |
| CreatedOn | DateTime | No | | |
| UpdatedOn | DateTime | No | | |
| CreatedByUserId | Guid | No | | |
| UpdatedByUserId | Guid | No | | |
| SortOrder | int | No | | |
| WorkflowId | Guid? | Yes | FK→Workflow.Id (Cascade) | |

**Relationships:**
- `Workflow? Workflow` (Cascade).
- `ICollection<WorkflowStageTask> WorkflowStageTasks` (Cascade).

**Audit fields:** CreatedOn / UpdatedOn / CreatedByUserId / UpdatedByUserId.

### Entity: WorkflowStageTask

**Table:** `WorkflowStageTasks`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/TransactionWorkflows/WorkingEntities/WorkflowStageTask.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | Application-assigned |
| Name | string | No | | |
| Description | string | No | | |
| IsRequired | bool | No | | |
| IsReviewRequired | bool | No | | |
| TaskFieldsJson | string? | Yes | | JSON |
| DueDays | int? | Yes | | |
| DueWeeks | int? | Yes | | |
| DueMonths | int? | Yes | | |
| SortOrder | int | No | | |
| IsChangeRequestRequired | bool | No | | |
| CreatedOn | DateTime | No | | |
| UpdatedOn | DateTime | No | | |
| CreatedByUserId | Guid | No | | |
| UpdatedByUserId | Guid | No | | |
| WorkflowStageId | Guid? | Yes | FK→WorkflowStage.Id (Cascade) | |
| AssignedToUserId | Guid? | Yes | FK→User.Id (NoAction) | |
| AssignedToDepartmentId | Guid? | Yes | FK→Department.Id (NoAction) | |
| ReviewRequiredByUserId | Guid? | Yes | FK→User.Id (NoAction) | |
| ReviewRequiredByDepartmentId | Guid? | Yes | FK→Department.Id (NoAction) | |
| CompletedByUserId | Guid? | Yes | FK→User.Id (NoAction) | |
| ReviewedByUserId | Guid? | Yes | FK→User.Id (NoAction) | |
| ChangeRequestApproverUserId | Guid? | Yes | FK→User.Id (SetNull) | |
| ChangeRequestApproverDepartmentId | Guid? | Yes | FK→Department.Id (SetNull) | |

**Relationships:**
- `WorkflowStage? WorkflowStage` (Cascade).
- `User? AssignedToUser` / `Department? AssignedToDepartment` (NoAction).
- `User? ReviewRequiredByUser` / `Department? ReviewRequiredByDepartment` (NoAction).
- `User? CompletedByUser` (NoAction).
- `User? ReviewedByUser` (NoAction).
- `User? ChangeRequestApproverUser` / `Department? ChangeRequestApproverDepartment` (SetNull).

**Audit fields:** CreatedOn / UpdatedOn / CreatedByUserId / UpdatedByUserId.

### Entity: ChangeRequest

**Table:** `ChangeRequests`
**Source:** `Zoodealio.Shared/TradeInHoldings/Domain/Entities/TransactionWorkflows/WorkingEntities/ChangeRequest.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | Application-assigned |
| ActionType | ChangeRequestActionType | No | int (HasConversion) | FieldLayoutSave=0, TaskComplete=1, TaskReview=2 |
| Status | ChangeRequestStatus | No | int (HasConversion), default Pending | Pending=0, Approved=1, Rejected=2 |
| Comment | string | No | | |
| PayloadJson | string? | Yes | | JSON |
| ChangeSummaryJson | string? | Yes | | JSON |
| RejectionReason | string? | Yes | | |
| CreatedOn | DateTime | No | | |
| ApprovedOn | DateTime? | Yes | | |
| RejectedOn | DateTime? | Yes | | |
| PropertyTransactionId | Guid | No | FK→PropertyTransaction.Id (Restrict) | |
| InitiatorUserId | Guid | No | FK→User.Id (Restrict) | |
| ApproverUserId | Guid? | Yes | FK→User.Id (NoAction) | |
| ApproverDepartmentId | Guid? | Yes | FK→Department.Id (NoAction) | |
| ResolvedByUserId | Guid? | Yes | FK→User.Id (NoAction) | |
| WorkflowStageTaskId | Guid? | Yes | FK→WorkflowStageTask.Id (NoAction) | polymorphic target A |
| CustomFieldLayoutId | Guid? | Yes | FK→CustomFieldLayout.Id (NoAction) | polymorphic target B |

**Check constraint:** `CK_ChangeRequests_ExactlyOneTarget` — exactly one of `WorkflowStageTaskId` or `CustomFieldLayoutId` must be non-null.

**Relationships:**
- `PropertyTransaction PropertyTransaction` (Restrict).
- `User InitiatorUser` (Restrict).
- `User? ApproverUser` / `Department? ApproverDepartment` (NoAction).
- `User? ResolvedByUser` (NoAction).
- `WorkflowStageTask? WorkflowStageTask` (NoAction).
- `CustomFieldLayout? CustomFieldLayout` (NoAction).

**Audit fields:** CreatedOn / ApprovedOn / RejectedOn (event timestamps).

## Enums

All enums live in `Zoodealio.Shared/TradeInHoldings/Domain/Enums/` unless noted.

| Enum | Values | Used by | Source |
|------|--------|---------|--------|
| ChangeRequestActionType | FieldLayoutSave=0, TaskComplete=1, TaskReview=2 | `ChangeRequest.ActionType` | `Enums/ChangeRequestActionType.cs` |
| ChangeRequestStatus | Pending=0, Approved=1, Rejected=2 | `ChangeRequest.Status` | `Enums/ChangeRequestStatus.cs` |
| ContractorType | ClassA=1, ClassB=2, ClassC=3 | `Contractor.Type` | `Enums/ContractorType.cs` |
| UsState | AL=0 through DC=50 (51 values, with `[Description]` of full state name) | Not directly persisted — used at DTO layer for dropdowns | `Enums/UsState.cs` |
| WorkflowConfigStatus | Draft=0, Published=1 | `WorkflowConfig.Status` | `Enums/WorkflowConfigStatus.cs` |
| CustomFieldControlType | TextFieldInput=0, TextAreaInput=1, NumberInput=2, CurrencyInput=3, DateInput=4, DropdownSelectInput=5, CheckboxInput=6, ToggleInput=7, FileUploadInput=8, EmailInput=9, PhoneInput=10, TitleField=11, SubtitleField=12, UrlField=13, DividerField=14 | `CustomFieldConfig.ControlType` | (declared inline in `Configs/CustomFieldConfig.cs`) |

Helper: `EnumHelper` static class in `Enums/EnumHelper.cs` (reads `[Description]` attributes).

## Cross-database: OffervanaDbContext (consumed)

TIH registers **both** `OffervanaDbContext` (read/write) and `OffervanaReadOnlyDbContext` (`NoTracking` by default) via `AddOffervanaDbContext` / `AddOffervanaReadOnlyDbContext`. Contexts share a single model definition via `OffervanaDbContextBase` + `OffervanaModelConfiguration`. `ConfigureConventions` sets all `string` properties to `MaxLength(255)` by default; default schema is `dbo`.

Full DbSet surface (from the base class): `Agents`, `AgentNotifications`, `Activities`, `BinaryObjects`, `Brokerages`, `Customers`, `Editions`, `IBuyers`, `IBuyerOffers`, `InvestorHiddenProperties`, `InvestorWatchlistProperties`, `NotificationPermissions`, `OfferNotes`, `OfferStatuses`, `OffervanaUsers`, `Properties`, `PropertyAvmValues`, `PropertyCompanyStatuses`, `PropertyOfferStatuses`, `RealValueConfigurations`, `SlackPropertyThreads`, `BlobFiles`, `Tenants`, `ListedPropertyDocuments`, `OfferDocuments`, `CashOfferType`, `CashOfferPlusType`, `SellLeasebackType`, `FixListType`, `CashBuyerType`, `ListOnMarketType`.

**TIH actually touches these Offervana entities:**

| Entity | Access mode | Where | Anti-pattern? |
|--------|------------|-------|---------------|
| Agent | Read-only | `GetAgentByIdQueryHandler`, `GetAgentByPropertyIdQueryHandler` (via Property→Customer→Agent chain) | No |
| Tenant | Read-only (via `Agent.Tenant` include) | Agent queries | No |
| Brokerage | Read-only (via `Tenant.Brokerage` include) | Agent queries | No |
| Customer | Read-only (via `Property.Customer` include) | `GetAgentByPropertyIdQuery`, `PublishOffersToOffervanaCommand.ResolveCompanyIdAsync` | No |
| Property | **Read-write** | Read: `GetAgentByPropertyIdQuery`, `PublishOffersToOffervanaCommand`. **Write: `PatchPropertyCommand`** | **YES — TIH writes to legacy Offervana Property row** |
| IBuyer | Read-only | `PublishOffersToOffervanaCommand.LoadIBuyerMapAsync` | No |
| IBuyerOffer | **Read-write** | Read: `GetIBuyerOffersByPropertyIdQuery`. **Write: `PublishOffersToOffervanaCommand`** (inserts new IBuyerOffer rows) | **YES — TIH inserts into legacy IBuyerOffers table** |
| PropertyOfferStatus | **Write** | `PublishOffersToOffervanaCommand` inserts new row and links back from `IBuyerOffer.PropertyOfferStatusId` | **YES — legacy write** |
| OfferStatus | Read-only | `PublishOffersToOffervanaCommand.GetOfferStatusIdAsync` (lookup `SystemName == "OfferFinalized"`) | No |
| PropertyCompanyStatus | **Read-write (delete + insert)** | `PublishOffersToOffervanaCommand.SetPropertyCompanyStatusAsync` — `ExecuteDelete` then `Add` | **YES — legacy write** |
| CashOfferType | **Write** | `PublishOffersToOffervanaCommand.InsertOfferSubTypeAsync` | **YES** |
| CashOfferPlusType | **Write** | same | **YES** |
| SellLeasebackType | **Write** | same | **YES** |
| FixListType | **Write** | same | **YES** |
| CashBuyerType | **Write** | same | **YES** |
| ListOnMarketType | **Write** | same | **YES** |

Remaining DbSets (`AgentNotifications`, `Activities`, `BinaryObjects`, `Editions`, `InvestorHiddenProperties`, `InvestorWatchlistProperties`, `NotificationPermissions`, `OfferNotes`, `OffervanaUsers`, `PropertyAvmValues`, `RealValueConfigurations`, `SlackPropertyThreads`, `BlobFiles`, `ListedPropertyDocuments`, `OfferDocuments`) are exposed but **not used** by TIH.

### Agent (read-only, via MediatR queries)

**Table:** `Brokerage.Agents`
**Source:** `Zoodealio.Shared/Offervana/LegacyData/Entities/Agent.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | int | No | PK | |
| FirstName | string? | Yes | default nvarchar(255) | Convention `MaxLength(255)` on strings |
| LastName | string? | Yes | | |
| CellPhone | string? | Yes | | |
| Email | string? | Yes | | |
| IsManager | bool | No | | |
| IsAdmin | bool | No | | |
| ReferralCode | string? | Yes | | |
| CustomDomain | string? | Yes | | |
| IsCustomDomain | bool | No | | |
| UserId | long | No | FK→OffervanaUsers.Id | |
| ManagerId | int? | Yes | FK→Agents.Id (self-ref) | |
| AdminId | int? | Yes | FK→Agents.Id (self-ref) | |
| TenantId | int | No | FK→AbpTenants.Id | |

**Relationships:**
- `Agent? Manager` (self-ref via `ManagerId`) + `ICollection<Agent>? Agents`.
- `Agent? Admin` (self-ref via `AdminId`) + `ICollection<Agent>? AgentsUnderAdmin`.
- `Tenant? Tenant` (FK `TenantId`).
- `NotificationPermissions? NotificationPermissions`.
- `OffervanaUser? User` (FK `UserId`).

### Tenant (read-only, via Agent.Tenant include)

**Table:** `dbo.AbpTenants`
**Source:** `Zoodealio.Shared/Offervana/LegacyData/Entities/Tenant.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | int | No | PK | |
| Name | string? | Yes | | |
| TenancyName | string? | Yes | | |
| CustomDomain | string? | Yes | | |
| IsCustomDomain | bool | No | | |
| EditionId | int? | Yes | FK→Editions | |
| LogoId | Guid? | Yes | | |
| LogoFileType | string? | Yes | | |

**Relationships:**
- `Edition? Edition`.
- `NotificationPermissions? NotificationPermissions`.
- `Brokerage? Brokerage` (1:1; Brokerage.TenantId is the FK per `OffervanaModelConfiguration`).

### Brokerage (read-only, via Tenant.Brokerage include)

**Table:** `Brokerage.Brokerages`
**Source:** `Zoodealio.Shared/Offervana/LegacyData/Entities/Brokerage.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | int | No | PK | |
| Name | string? | Yes | | |
| TenantId | int | No | FK→AbpTenants.Id (1:1 with Tenant) | Tenant has exactly one Brokerage |

**Relationships:**
- `Tenant? Tenant`.

### Customer (read-only, via Property.Customer include)

**Table:** `Customer.Customers`
**Source:** `Zoodealio.Shared/Offervana/LegacyData/Entities/Customer.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | int | No | PK | |
| FirstName | string? | Yes | | |
| LastName | string? | Yes | | |
| PhoneNumber | string? | Yes | | |
| Email | string? | Yes | | |
| TenantId | int | No | FK→AbpTenants.Id | |
| BaseScore | int | No | | LeadScore component |
| HighIntentScore | int | No | | |
| MediumIntentScore | int | No | | |
| TimeBonusScore | int | No | | |
| ExtraFlagsScore | int | No | | |
| TotalScore | int | No | | |
| IsSellerSource | bool | No | | |
| SubmitterRole | SubmitterRole? | Yes | int | |
| ReferralCode | string | No | required | |
| ReferralLink | string? | Yes | | |
| AgentId | int? | Yes | FK→Agents.Id | |

**Relationships:**
- `Tenant? Tenant`.
- `Agent? Agent`.
- `ICollection<Property> Properties`.

### Property (READ-WRITE — anti-pattern flag)

**Table:** `Customer.Properties`
**Source:** `Zoodealio.Shared/Offervana/LegacyData/Entities/Property.cs`

TIH writes to this legacy Offervana table via `PatchPropertyCommand`. Fields mutated by that command: `SurveyJson` (JSON merge of `AdditionalInfo`), `Address1`, `City`, `StateCd`, `ZipCode`, `SquareFootage`, `Floors`, `BedroomsCount`, `BathroomsCount`, `YearBuilt`, `LotSize`. All other columns are treated read-only by TIH (read in `GetAgentByPropertyIdQuery` and `PublishOffersToOffervanaCommand.ResolveCompanyIdAsync`).

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | int | No | PK | |
| GpsCoordinates | string? | Yes | | |
| Address1 | string? | Yes | | **Mutated by PatchPropertyCommand** |
| Address2 | string? | Yes | | |
| City | string? | Yes | | **Mutated** |
| StateCd | string? | Yes | | **Mutated** |
| ZipCode | string? | Yes | | **Mutated** |
| Country | string? | Yes | | |
| SurveyJson | string? | Yes | | **Mutated** (JSON merge of AdditionalInfo field) |
| AttomSurveyJson | string? | Yes | | |
| CreationTime | DateTime | No | | |
| LastModificationTime | DateTime? | Yes | | Not set by TIH on patch — legacy oversight |
| Latitude | decimal? | Yes | decimal(10,7) | |
| Longitude | decimal? | Yes | decimal(10,7) | |
| Floors | decimal? | Yes | | **Mutated** (from Stories) |
| YearBuilt | short? | Yes | | **Mutated** |
| LotSize | int? | Yes | | **Mutated** |
| SquareFootage | decimal | No | | **Mutated** |
| BedroomsCount | byte? | Yes | | **Mutated** (cast from int) |
| BathroomsCount | decimal? | Yes | | **Mutated** |
| RealValue | float? | Yes | | |
| MortgageLienAmount | decimal? | Yes | | |
| PropertyType | string? | Yes | | |
| CustomerId | int | No | FK→Customers.Id | |

**Relationships:**
- `Customer? Customer`.
- `ICollection<IBuyerOffer>? IBuyerOffers`.
- `ICollection<PropertyAvmValue>? PropertyAvmValues`.
- `ICollection<PropertyCompanyStatus>? PropertyCompanyStatuses`.
- `ICollection<InvestorHiddenProperties>? HiddenProperties`.
- `ICollection<InvestorWatchlistProperties>? WatchlistProperties`.
- `ICollection<PropertyOfferStatus>? PropertyOfferStatuses` (NoAction on the collection — see `OffervanaModelConfiguration`).
- `ICollection<PropertyDocument>? PropertyDocuments`.

### IBuyer (read-only)

**Table:** `Admin.IBuyers`
**Source:** `Zoodealio.Shared/Offervana/LegacyData/Entities/IBuyer.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | int | No | PK | |
| Name | string? | Yes | | |
| DisplayName | string? | Yes | | |
| Address | string? | Yes | | |
| Url | string? | Yes | | |
| ServiceChargePercentage | decimal | No | | |
| IsActive | bool | No | | |
| OfferType | OfferType? | Yes | int | From `Zoodealio.Shared.Dtos.Offers.OfferType` |
| IsInvestorPortalStatic | bool? | Yes | | TIH filters on `== true` |

**Relationships:** none.

### IBuyerOffer (READ-WRITE — anti-pattern flag)

**Table:** `Customer.IBuyerOffers`
**Source:** `Zoodealio.Shared/Offervana/LegacyData/Entities/IBuyerOffer.cs`

TIH reads via `GetIBuyerOffersByPropertyIdQuery` (filtered to `IsDeleted != true && IsCurrent`). TIH also writes new rows via `PublishOffersToOffervanaCommand.BuildIBuyerOffer`, populating: `PropertyId`, `IBuyerId`, `OfferAmount`, `IsCurrent`, `IsNewOffer`, `IsEditLocked`, `IsPreliminary`, `IsSharedToCustomer`, `IsDeleted`, `ExpirationDate`, `CreationTime`, `LastModificationTime`, `OfferEventType`, `OfferVersion`, `InvestorPortalCompanyId`, `InvestorPortalUserId`, `AdditionaloffersJson`, `ResaleoffersJson`, and later `PropertyOfferStatusId`.

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | int | No | PK | |
| OfferAmount | decimal | No | | **Written** |
| Notes | string? | Yes | | |
| AgentNotes | string? | Yes | | |
| InternalNotes | string? | Yes | | |
| IsSatisfied | bool? | Yes | | |
| IsAccepted | bool? | Yes | | |
| ExpirationDate | DateTime? | Yes | | **Written** (+30 days) |
| CreationTime | DateTime? | Yes | | **Written** |
| LastModificationTime | DateTime? | Yes | | **Written** |
| AcceptedDate | DateTime? | Yes | | |
| AcceptedFromPage | AcceptedFromPage? | Yes | | |
| AcceptedByUserId | long? | Yes | | |
| IsCurrent | bool | No | | **Written = true** |
| IsSharedToCustomer | bool | No | | **Written = true** |
| IsPreliminary | bool? | Yes | | **Written = false** |
| IsUserEnabled | bool? | Yes | | |
| IsRenewalRequested | bool? | Yes | | |
| IsDisabled | bool? | Yes | | |
| IsNewOffer | bool | No | | **Written = true** |
| BuyboxValidationJson | string? | Yes | | |
| IsDeleted | bool? | Yes | | **Written = false**; soft-delete flag used as read filter |
| IBuyerOfferRefID | int? | Yes | | |
| DeletedDate | DateTime? | Yes | | |
| AdditionaloffersJson | string? | Yes | | **Written** (JSON of `additional` offer items) |
| ResaleoffersJson | string? | Yes | | **Written** (JSON of `resale` offer items) |
| InvestorPortalCompanyId | Guid? | Yes | | **Written** (resolved ZIP Company) |
| InvestorPortalUserId | Guid? | Yes | | **Written** (TIH current user) |
| IsEditLocked | bool? | Yes | | **Written = true** |
| IsCounterOffer | bool? | Yes | | |
| CounterOfferDate | DateTime? | Yes | | |
| CounterOfferAmount | decimal? | Yes | | |
| CounterOfferNotes | string? | Yes | | |
| CounterOfferByUserId | int? | Yes | | |
| CounterOfferDirection | CounterOfferDirection | No | default None | |
| CounterOfferResponseStatus | int? | Yes | | |
| CounterOfferResponseDate | DateTime? | Yes | | |
| CounterOfferResponseNotes | string? | Yes | | |
| CounterOfferResponseByUserId | int? | Yes | | |
| CounterByInvestorUserId | Guid? | Yes | | |
| CounterResponseByInvestorUserId | Guid? | Yes | | |
| OfferEventType | OfferEventType | No | default Created | **Written = Created** |
| OfferVersion | int | No | default 1 | **Written = 1** |
| ModifiedByInvestorUserId | Guid? | Yes | | |
| LastModifierUserId | long? | Yes | | |
| EscrowOpenedDate | DateTime? | Yes | | |
| ClosingDate | DateTime? | Yes | | |
| PropertyId | int | No | FK→Properties.Id | **Written** |
| IBuyerId | int | No | FK→IBuyers.Id | **Written** |
| PropertyOfferStatusId | Guid? | Yes | FK→PropertyOfferStatuses.Id (1:1, NoAction, optional) | **Written** (set after PropertyOfferStatus insert) |
| *IsExpired* | bool? | — | `[NotMapped]` | Computed from ExpirationDate |
| *DeadlineDate* | DateTime? | — | `[NotMapped]` | AcceptedDate + 30d |

**Relationships:**
- `Property? Property` (FK `PropertyId`).
- `IBuyer? IBuyer` (FK `IBuyerId`).
- `PropertyOfferStatus? CurrentPropertyOfferStatus` (FK `PropertyOfferStatusId`, 1:1, NoAction).
- 1:1 optional to each offer-type subtable: `CashOfferType`, `CashOfferPlusType`, `SellLeasebackType`, `FixListType`, `CashBuyerType`, `ListOnMarketType` (FK on each sub-type's `IBuyerOfferId`).
- `ICollection<OfferDocument>? OfferDocuments`.

### PropertyOfferStatus (WRITE — anti-pattern flag)

**Table:** `Customer.PropertyOfferStatuses`
**Source:** `Zoodealio.Shared/Offervana/LegacyData/Entities/PropertyOfferStatus.cs`

TIH inserts a new status row in `PublishOffersToOffervanaCommand` when the "OfferFinalized" status exists, then back-links `IBuyerOffer.PropertyOfferStatusId`. Indexes: `(OfferId, CreatedUtc)` (desc on CreatedUtc) and `PropertyId` (per `OffervanaModelConfiguration`).

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | **Written** (Guid.NewGuid) |
| OfferId | int | No | FK→IBuyerOffers.Id, indexed | **Written** |
| PropertyId | int | No | FK→Properties.Id, indexed | **Written** |
| OfferStatusId | Guid | No | FK→OfferStatuses.Id | **Written** (= OfferFinalized) |
| CreatedUtc | DateTime | No | | **Written** |

**Relationships:**
- `IBuyerOffer? Offer`.
- `OfferStatus? OfferStatus`.
- `Property? Property`.

### OfferStatus (read-only)

**Table:** `Customer.OfferStatuses`
**Source:** `Zoodealio.Shared/Offervana/LegacyData/Entities/OfferStatus.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | |
| DisplayName | string? | Yes | | |
| SystemName | string? | Yes | | TIH looks up `"OfferFinalized"` |
| HexColorCode | string? | Yes | | |
| SortOrder | int? | Yes | | |

**Relationships:**
- `ICollection<Property>? Properties` — **ignored in EF model** (`OffervanaModelConfiguration` calls `Ignore(o => o.Properties)` because the underlying table no longer carries an `OfferStatusId` FK on Property; the nav is kept for source compat).

### PropertyCompanyStatus (READ-WRITE — anti-pattern flag)

**Table:** `Customer.PropertyCompanyStatuses`
**Source:** `Zoodealio.Shared/Offervana/LegacyData/Entities/PropertyCompanyStatus.cs`

TIH's `PublishOffersToOffervanaCommand.SetPropertyCompanyStatusAsync` `ExecuteDelete`s existing rows matching `(CompanyId, PropertyId)` then inserts a fresh row with `Status = PropertyStatus.SubmittedOffer`.

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | |
| CompanyId | Guid | No | | Refers to ZIP Company.Id (no FK) |
| PropertyId | int | No | FK→Properties.Id | **Written** |
| Status | PropertyStatus | No | int | **Written = SubmittedOffer** |

**Relationships:**
- `Property? Property`.

### CashOfferType (WRITE — anti-pattern flag)

**Table:** `dbo.CashOfferType`
**Source:** `Zoodealio.Shared/Offervana/LegacyData/Entities/CashOfferType.cs`

Inserted by `PublishOffersToOffervanaCommand.InsertOfferSubTypeAsync` when `OfferType.CashOffer`.

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | int | No | PK | |
| OfferAmount | decimal? | Yes | | |
| ServiceFeeAmount | decimal? | Yes | | |
| ServiceFeePercentage | decimal? | Yes | | |
| BrokerServiceChargeAmount | decimal? | Yes | | |
| BrokerServiceChargePercentage | decimal? | Yes | | |
| ClosingCostAmount | decimal? | Yes | | |
| ClosingCostPercentage | decimal? | Yes | | |
| ViewCommissionAmount | decimal? | Yes | | |
| ViewCommissionPercentage | decimal? | Yes | | |
| HoldbackAmount | decimal? | Yes | | |
| HoldbackPercentage | decimal? | Yes | | |
| NetOfferAmount | decimal? | Yes | | |
| ServiceFeeAmountDisplay | decimal? | Yes | | |
| ServiceFeePercentageDisplay | decimal? | Yes | | |
| ClosingCostAmountDisplay | decimal? | Yes | | |
| ClosingCostPercentageDisplay | decimal? | Yes | | |
| BrokerServiceChargePercentageDisplay | decimal? | Yes | | |
| HoldbackAmountDisplay | decimal? | Yes | | |
| HoldbackPercentageDisplay | decimal? | Yes | | |
| ComBrkServiceTotalAmountDisplay | decimal? | Yes | | |
| ComBrkServiceTotalPercentageDisplay | decimal? | Yes | | |
| IBuyerOfferId | int? | Yes | FK→IBuyerOffers.Id (1:1 via `OffervanaModelConfiguration`) | **Written** |

**Relationships:**
- `IBuyerOffer? IBuyerOffer` (1:1).

### CashOfferPlusType (WRITE — anti-pattern flag)

**Table:** `dbo.CashOfferPlusType`
**Source:** `Zoodealio.Shared/Offervana/LegacyData/Entities/CashOfferPlusType.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | int | No | PK | |
| OfferAmount | decimal? | Yes | | |
| ServiceFeeAmount1 | decimal? | Yes | | |
| ServiceFeePercentage1 | decimal? | Yes | | |
| ServiceFeeAmount2 | decimal? | Yes | | |
| ServiceFeePercentage2 | decimal? | Yes | | |
| ResaleFeeAmount1 | decimal? | Yes | | |
| ResaleFeePercentage1 | decimal? | Yes | | |
| ResaleFeeAmount2 | decimal? | Yes | | |
| ResaleFeePercentage2 | decimal? | Yes | | |
| HoldbackAmount | decimal? | Yes | | |
| HoldbackPercantage | decimal? | Yes | | (sic — legacy spelling) |
| ClosingCostAmount | decimal? | Yes | | |
| ClosingCostPercentage | decimal? | Yes | | |
| ViewCommissionAmount | decimal? | Yes | | |
| ViewCommissionPercentage | decimal? | Yes | | |
| BrokerServiceChargeAmount | decimal? | Yes | | |
| BrokerServiceChargePercentage | decimal? | Yes | | |
| NetOfferAmount | decimal? | Yes | | |
| ServiceFeePercentageTotal | decimal? | Yes | | |
| ServiceFeeAmountTotal | decimal? | Yes | | |
| AgentComResaleClosingPercentage | decimal? | Yes | | |
| ResaleFeeAmountTotal | decimal? | Yes | | |
| ResaleFeePercentageTotal | decimal? | Yes | | |
| FirstPayout | decimal? | Yes | | |
| SecondPayout | decimal? | Yes | | |
| TotalPayouts | decimal? | Yes | | |
| RangeMax | decimal? | Yes | | |
| HoldbackAmountDisplay | decimal? | Yes | | |
| HoldbackPercantageDisplay | decimal? | Yes | | |
| ClosingCostAmountDisplay | decimal? | Yes | | |
| ClosingCostPercentageDisplay | decimal? | Yes | | |
| ComBrkServiceTotalAmountDisplay | decimal? | Yes | | |
| ComBrkServiceTotalPercentageDisplay | decimal? | Yes | | |
| ProjectedDaysOnMarket | int? | Yes | | |
| HoldingCostDeduction | decimal? | Yes | | |
| InterimOwnershipCostsIncluded | bool? | Yes | | |
| InterimHoldingCostAmount | decimal? | Yes | | |
| InterimHoldingCostPercentage | decimal? | Yes | | |
| HasMonthlyHoldingCosts | bool? | Yes | | |
| MonthlyHoldingCostAmount | decimal? | Yes | | |
| MonthlyHoldingCostPercentage | decimal? | Yes | | |
| MonthlyHoldingCostLabel | string? | Yes | | |
| IBuyerOfferId | int? | Yes | FK→IBuyerOffers.Id (1:1) | |

### SellLeasebackType (WRITE — anti-pattern flag)

**Table:** `dbo.SellLeasebackType`
**Source:** `Zoodealio.Shared/Offervana/LegacyData/Entities/SellLeasebackType.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | int | No | PK | |
| OfferAmount | decimal? | Yes | | |
| ServiceFeeAmount | decimal? | Yes | | |
| ServiceFeePercentage | decimal? | Yes | | |
| ResaleFeeAmount | decimal? | Yes | | |
| ResaleFeePercentage | decimal? | Yes | | |
| IsRentFlat | bool? | Yes | | |
| RentFlatAmount | decimal? | Yes | | |
| RentFlatPercentage | decimal? | Yes | | |
| RentMinAmount | decimal? | Yes | | |
| RentMinPercentage | decimal? | Yes | | |
| RentMaxAmount | decimal? | Yes | | |
| RentMaxPercentage | decimal? | Yes | | |
| ClosingCostAmount | decimal? | Yes | | |
| ClosingCostPercentage | decimal? | Yes | | |
| HoldbackAmount | decimal? | Yes | | |
| HoldbackPercantage | decimal? | Yes | | (sic) |
| ViewCommissionAmount | decimal? | Yes | | |
| ViewCommissionPercentage | decimal? | Yes | | |
| BrokerServiceChargeAmount | decimal? | Yes | | |
| BrokerServiceChargePercentage | decimal? | Yes | | |
| NetOfferAmount | decimal? | Yes | | |
| AgentComResaleClosingPercentage | decimal? | Yes | | |
| FirstPayout | decimal? | Yes | | |
| SecondPayout | decimal? | Yes | | |
| TotalPayouts | decimal? | Yes | | |
| RangeMax | decimal? | Yes | | |
| ServiceFeeAmountDisplay | decimal? | Yes | | |
| ServiceFeePercentageDisplay | decimal? | Yes | | |
| ResaleFeeAmountDisplay | decimal? | Yes | | |
| ResaleFeePercentageDisplay | decimal? | Yes | | |
| RentFlatAmountDisplay | decimal? | Yes | | |
| RentMinAmountDisplay | decimal? | Yes | | |
| RentMaxAmountDisplay | decimal? | Yes | | |
| HoldbackAmountDisplay | decimal? | Yes | | |
| HoldbackPercantageDisplay | decimal? | Yes | | |
| MonthlyRent | decimal? | Yes | | |
| ClosingCostAmountDisplay | decimal? | Yes | | |
| ClosingCostPercentageDisplay | decimal? | Yes | | |
| ComBrkServiceTotalAmountDisplay | decimal? | Yes | | |
| ComBrkServiceTotalPercentageDisplay | decimal? | Yes | | |
| IBuyerOfferId | int? | Yes | FK→IBuyerOffers.Id (1:1) | |

### FixListType (WRITE — anti-pattern flag)

**Table:** `dbo.FixListType`
**Source:** `Zoodealio.Shared/Offervana/LegacyData/Entities/FixListType.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | int | No | PK | |
| OfferAmount | decimal? | Yes | | |
| ServiceFeeAmount1 | decimal? | Yes | | |
| ServiceFeePercentage1 | decimal? | Yes | | |
| ServiceFeeAmount2 | decimal? | Yes | | |
| ServiceFeePercentage2 | decimal? | Yes | | |
| ResaleFeeAmount1 | decimal? | Yes | | |
| ResaleFeePercentage1 | decimal? | Yes | | |
| ResaleFeeAmount2 | decimal? | Yes | | |
| ResaleFeePercentage2 | decimal? | Yes | | |
| HoldbackAmount | decimal? | Yes | | |
| HoldbackPercantage | decimal? | Yes | | (sic) |
| ClosingCostAmount | decimal? | Yes | | |
| ClosingCostPercentage | decimal? | Yes | | |
| EstimatedRepairsAmount | decimal? | Yes | | |
| EstimatedRepairsPercentage | decimal? | Yes | | |
| ViewCommissionAmount | decimal? | Yes | | |
| ViewCommissionPercentage | decimal? | Yes | | |
| BrokerServiceChargeAmount | decimal? | Yes | | |
| BrokerServiceChargePercentage | decimal? | Yes | | |
| NetOfferAmount | decimal? | Yes | | |
| ServiceFeePercentageTotal | decimal? | Yes | | |
| ServiceFeeAmountTotal | decimal? | Yes | | |
| AgentComResaleClosingPercentage | decimal? | Yes | | |
| ResaleFeeAmountTotal | decimal? | Yes | | |
| ResaleFeePercentageTotal | decimal? | Yes | | |
| FirstPayout | decimal? | Yes | | |
| SecondPayout | decimal? | Yes | | |
| TotalPayouts | decimal? | Yes | | |
| RangeMax | decimal? | Yes | | |
| HoldbackAmountDisplay | decimal? | Yes | | |
| HoldbackPercantageDisplay | decimal? | Yes | | |
| ClosingCostAmountDisplay | decimal? | Yes | | |
| ClosingCostPercentageDisplay | decimal? | Yes | | |
| ComBrkServiceTotalAmountDisplay | decimal? | Yes | | |
| ComBrkServiceTotalPercentageDisplay | decimal? | Yes | | |
| ProjectedDaysOnMarket | int? | Yes | | |
| HoldingCostDeduction | decimal? | Yes | | |
| InterimOwnershipCostsIncluded | bool? | Yes | | |
| InterimHoldingCostAmount | decimal? | Yes | | |
| InterimHoldingCostPercentage | decimal? | Yes | | |
| HasMonthlyHoldingCosts | bool? | Yes | | |
| MonthlyHoldingCostAmount | decimal? | Yes | | |
| MonthlyHoldingCostPercentage | decimal? | Yes | | |
| MonthlyHoldingCostLabel | string? | Yes | | |
| IBuyerOfferId | int? | Yes | FK→IBuyerOffers.Id (1:1) | |

### CashBuyerType (WRITE — anti-pattern flag)

**Table:** `dbo.CashBuyerType`
**Source:** `Zoodealio.Shared/Offervana/LegacyData/Entities/CashBuyerType.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | int | No | PK | |
| ServiceFeeAmount | decimal? | Yes | | |
| ServiceFeePercentage | decimal? | Yes | | |
| ClosingCostAmount | decimal? | Yes | | |
| ClosingCostPercentage | decimal? | Yes | | |
| ViewCommissionAmount | decimal? | Yes | | |
| ViewCommissionPercentage | decimal? | Yes | | |
| IBuyerOfferId | int? | Yes | FK→IBuyerOffers.Id (1:1) | |

Note: No `OfferAmount` column on CashBuyer — TIH explicitly zero-s `OfferAmount` on the parent IBuyerOffer when publishing a CashBuyer offer.

### ListOnMarketType (WRITE — anti-pattern flag)

**Table:** `dbo.ListOnMarketType`
**Source:** `Zoodealio.Shared/Offervana/LegacyData/Entities/ListOnMarketType.cs`

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | int | No | PK | |
| OfferAmount | decimal? | Yes | | |
| DaysOnMarket | int? | Yes | | |
| CommissionAmount | decimal? | Yes | | |
| CommissionPercentage | decimal? | Yes | | |
| ClosingCostAmount | decimal? | Yes | | |
| ClosingCostPercentage | decimal? | Yes | | |
| StateTaxAmount | decimal? | Yes | | |
| StateTaxPercentage | decimal? | Yes | | |
| NetOfferAmount | decimal? | Yes | | |
| TotalPayouts | decimal? | Yes | | |
| RangeMin | decimal? | Yes | | |
| RangeMax | decimal? | Yes | | |
| ClosingCostAmountDisplay | decimal? | Yes | | |
| CommissionAmountDisplay | decimal? | Yes | | |
| IBuyerOfferId | int? | Yes | FK→IBuyerOffers.Id (1:1) | |

## Cross-database: InvestorPortalDbContext (consumed)

Registered read/write (not a dedicated read-only variant). TIH consumes only a narrow slice.

**DbSets exposed (15):** `Users`, `Companies`, `Documents`, `PasswordResetTokens`, `CompanyUsers`, `UserRelations`, `CompanyInvites`, `GlobalInviteLinks`, `Buyboxes`, `BuyboxUsers`, `BuyboxLocations`, `BuyboxBuyingStrategies`, `BuyboxPropertyTypes`, `InvestorComplianceDocuments`, `InvestorComplianceDocumentAcceptances`, `UserTenancies`.

**TIH actually touches:**
- `Users` — read-only via `GetZipUsersQuery` (paginated list, filters by email/name/phone, sorts by LastLogin by default).
- `Companies` — read-only, via `PublishOffersToOffervanaCommand.ResolveCompanyIdAsync` (joined to `CompanyUsers`).
- `CompanyUsers` — read-only, same path.

All other DbSets are **registered but unused** by TIH (`Documents`, `PasswordResetTokens`, `UserRelations`, `CompanyInvites`, `GlobalInviteLinks`, `Buyboxes`, `BuyboxUsers`, `BuyboxLocations`, `BuyboxBuyingStrategies`, `BuyboxPropertyTypes`, `InvestorComplianceDocuments`, `InvestorComplianceDocumentAcceptances`, `UserTenancies`).

### User (read-only, via GetZipUsersQuery)

**Table:** `Users` (schema = default; ZIP uses default `dbo`)
**Source:** `Zoodealio.Shared/InvestorPortal/Domain/Entities/User.cs`

`CreatedDate` has `HasDefaultValueSql("GETDATE()")` set in `InvestorPortalDbContext.OnModelCreating`.

| Column | CLR Type | Nullable | Constraints | Notes |
|--------|----------|----------|-------------|-------|
| Id | Guid | No | PK | |
| FName | string | No | | |
| LName | string | No | | |
| Email | string | No | | `[EmailAddress]` |
| Phone | string | No | | |
| ReferringAgentRole | ReferringAgentRole? | Yes | int | |
| Username | string | No | | |
| PasswordHash | string | No | | |
| Role | Role | No | int | ZIP roles: Investor=1, AccountManager=2, Collaborator=3, Admin=4, Enterprise=5 |
| RefreshToken | string? | Yes | | |
| RefreshTokenExpiryTime | DateTime? | Yes | | |
| LastLogin | DateTime? | Yes | | Default sort key in `GetZipUsersQuery` |
| CreatedDate | DateTime | No | DB default `GETDATE()` | Generated on add |
| FirstLoginAfterCompanyApprovalAt | DateTime? | Yes | | |
| IsIndividualBuyerAgency | bool? | Yes | | |
| AcceptedTermsOn | DateTime? | Yes | | |
| AcceptedTermsFromIp | string? | Yes | | |
| ApiKey | Guid? | Yes | | |
| CanSeeAllProperties | bool | No | | |

**Relationships (on the entity, though TIH doesn't traverse them):**
- `ICollection<Document> Documents`.
- `ICollection<BuyboxUser> Buyboxes`.
- `ICollection<Company> Companies` (M:N via `CompanyUser` junction).
- `ICollection<InvestorComplianceDocumentAcceptance> AcceptedComplianceDocuments`.