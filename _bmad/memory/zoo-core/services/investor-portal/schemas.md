---
artifact: schemas
service: investor-portal
commit-sha: fa73b99cc3cccda1c404ea03329df9b99c3469f1
generated-at: 2026-04-15T00:00:00Z
entity-count: 16
---

# Zoodealio Investor Portal (ZIP) — Complete Schema Catalog

## Overview

**16 entities across 1 DbContext (`InvestorPortalDbContext`); no LegacyData / OffervanaDbContext read-only projection; 9 enums; 78 application DTOs; .NET 10 with EF Core 10.0.5**

## ⚠️ Architectural Note — Entities Live in `Zoodealio.Shared`

Unlike the CLAUDE.md-documented standard Zoodealio pattern, the investor-portal service does **NOT** host its own Domain/Infrastructure entity definitions. All 16 entity classes and the `InvestorPortalDbContext` itself are defined inside the sibling `Zoodealio.Shared` repo at `Zoodealio.Shared/InvestorPortal/`.

- **Entity source:** `Zoodealio.Shared/InvestorPortal/Domain/Entities/*.cs`
- **DbContext source:** `Zoodealio.Shared/InvestorPortal/Infrastructure/InvestorPortalDbContext.cs`
- **Migrations** are the only entity-adjacent code that lives in the investor-portal repo itself, at `investor-portal/investor-portal-services/ZoodealioInvestorPortal.Infrastructure/Migrations/`

All source-file paths below are relative to the **Zoo-Core workspace root**, since entities and DbContext cross a repo boundary.

## Two-Database Pattern — NOT APPLIED

This service does **not** use the two-database pattern described in CLAUDE.md. There is no `OffervanaDbContext` and no `LegacyData` project. The only cross-service coupling is `UserTenancy.TenancyId` (int), a loose foreign key to Offervana_SaaS's tenancy table with no navigation property.

Any property/offer/tenant data that needs to be read from Offervana is handled outside the EF layer (likely via HTTP integration rather than direct DB access).

---

## DbContext Definition

**File:** `Zoodealio.Shared/InvestorPortal/Infrastructure/InvestorPortalDbContext.cs`

### DbSets

- `Users`
- `Companies`
- `Documents`
- `PasswordResetTokens`
- `CompanyUsers`
- `UserRelations`
- `CompanyInvites`
- `GlobalInviteLinks`
- `Buyboxes`
- `BuyboxUsers`
- `BuyboxLocations`
- `BuyboxBuyingStrategies`
- `BuyboxPropertyTypes`
- `InvestorComplianceDocuments`
- `InvestorComplianceDocumentAcceptances`
- `UserTenancies`

### Key OnModelCreating Configurations

- `CompanyUser`: unique composite index on `(CompanyId, UserId)`
- User ↔ Company many-to-many through `CompanyUser` join entity with cascading deletes
- `UserRelation`: restricted deletes on both parent and child FKs (prevents orphan cycles)
- `CompanyInvite`: unique index on `Token`; inviter FK restricted-delete; accepted-user nullable with set-null delete
- `Document`: uploader FK restricted-delete; Company FK cascade
- `GlobalInviteLink`: unique index on `Token`
- `Company`: self-referencing parent/child with restricted parent delete; owner FK with set-null delete
- `UserTenancy`: unique composite index on `(UserId, TenancyId, SourceCompanyId)` filtered where `SourceCompanyId IS NOT NULL`; user cascade; source-company set-null
- `User.CreatedDate`: default value `GETDATE()` via `ValueGeneratedOnAdd`

**Database provider:** SQL Server (identity columns enabled)
**EF Core:** 10.0.5

---

## Own DbContext Entities (16)

### 1. User

- **Entity:** `ZoodealioInvestorPortal.Domain.Entities.User`
- **Table:** `Users`
- **Source:** `Zoodealio.Shared/InvestorPortal/Domain/Entities/User.cs`

| Column | CLR Type | Nullable | Default | Constraints / Annotations |
|---|---|---|---|---|
| Id | `Guid` | No | | `[Key]` `[Required]` PK, `uniqueidentifier`, ValueGeneratedOnAdd |
| FName | `string` | Yes | `string.Empty` | |
| LName | `string` | Yes | `string.Empty` | |
| Email | `string` | No | `string.Empty` | `[Required]` `[EmailAddress]`, `nvarchar(max)` |
| Phone | `string` | Yes | `string.Empty` | |
| ReferringAgentRole | `ReferringAgentRole?` | Yes | null | Enum (Agent=1, Manager=2, BrokerageAdmin=3, AccountAdmin=4, Owner=5) |
| Username | `string` | No | `string.Empty` | `[Required]`, `nvarchar(max)` |
| PasswordHash | `string` | No | `string.Empty` | `[Required]`, `nvarchar(max)` |
| Role | `Role` | No | | `[Required]`, Enum (Investor=1, AccountManager=2, Collaborator=3, Admin=4, Enterprise=5), `int` |
| RefreshToken | `string?` | Yes | null | `nvarchar(max)` |
| RefreshTokenExpiryTime | `DateTime?` | Yes | null | `datetime2` |
| LastLogin | `DateTime?` | Yes | null | `datetime2` |
| CreatedDate | `DateTime` | No | `GETDATE()` | `[Required]`, `datetime2`, DefaultValueSql + ValueGeneratedOnAdd |
| FirstLoginAfterCompanyApprovalAt | `DateTime?` | Yes | null | `datetime2` |
| IsIndividualBuyerAgency | `bool?` | Yes | null | `bit` |
| AcceptedTermsOn | `DateTime?` | Yes | null | `datetime2` |
| AcceptedTermsFromIp | `string?` | Yes | null | `nvarchar(max)` |
| ApiKey | `Guid?` | Yes | null | `uniqueidentifier` |
| CanSeeAllProperties | `bool` | No | false | `bit` (added in migration `20260407232852`) |

**Navigation properties:**
- `ICollection<Document> Documents` — 1:N Document (uploader)
- `ICollection<BuyboxUser> Buyboxes` — N:M Buybox via BuyboxUser
- `ICollection<Company> Companies` — N:M Company via CompanyUser
- `ICollection<InvestorComplianceDocumentAcceptance> AcceptedComplianceDocuments` — 1:N

**Relationships:**
- Reverse: `Buybox.CreatedByUserId` → User.Id (1:N)
- Reverse: `Document.UploadedById` → User.Id (1:N, restricted delete)
- Reverse: `InvestorComplianceDocumentAcceptance.UserId` → User.Id (1:N, cascade)
- Reverse: `UserRelation.ParentUserId` → User.Id (1:N, restricted delete)
- Reverse: `UserRelation.ChildUserId` → User.Id (1:N, restricted delete)
- Reverse: `CompanyInvite.InvitedByUserId` → User.Id (1:N, restricted delete; `ParentUser` nav)
- Reverse: `CompanyInvite.AcceptedUserId` → User.Id (0..1, set-null delete; `AcceptedUser` nav)
- Reverse: `CompanyUser.UserId` → User.Id (1:N, cascade)
- Reverse: `UserTenancy.UserId` → User.Id (1:N, cascade)
- N:M: User ↔ Company via CompanyUser

---

### 2. Company

- **Entity:** `ZoodealioInvestorPortal.Domain.Entities.Company`
- **Table:** `Companies`
- **Source:** `Zoodealio.Shared/InvestorPortal/Domain/Entities/Company.cs`

| Column | CLR Type | Nullable | Default | Constraints / Annotations |
|---|---|---|---|---|
| Id | `Guid` | No | | `[Key]` `[Required]` PK, `uniqueidentifier`, ValueGeneratedOnAdd |
| ParentCompanyId | `Guid?` | Yes | null | `uniqueidentifier`, self-ref FK |
| OwnerUserId | `Guid?` | Yes | null | `uniqueidentifier`, FK User (set-null delete) |
| IsEnterprise | `bool` | No | false | `bit` |
| IsBuyerAgencyDefault | `bool?` | Yes | null | `bit` |
| PrimaryName | `string?` | Yes | `string.Empty` | `nvarchar(max)` |
| PrimaryLName | `string?` | Yes | `string.Empty` | `nvarchar(max)` |
| PrimaryEmail | `string?` | Yes | `string.Empty` | `[EmailAddress]`, `nvarchar(max)` |
| PrimaryPhone | `string?` | Yes | `string.Empty` | `nvarchar(max)` |
| BusinessName | `string?` | Yes | `string.Empty` | `nvarchar(max)` |
| State_Of_Incorporation_Or_Registration | `UsState?` | Yes | null | Enum (all 50 states + DC), `int` |
| Business_EIN_Or_Tax_Id | `string?` | Yes | `string.Empty` | `nvarchar(max)` |
| BusinessAddressLine | `string?` | Yes | `string.Empty` | `nvarchar(max)` |
| BusinessCity | `string?` | Yes | `string.Empty` | `nvarchar(max)` |
| BusinessState | `UsState?` | Yes | null | Enum, `int` |
| BusinessZip | `string?` | Yes | `string.Empty` | `nvarchar(max)` |
| How_Heard_About_Us | `string?` | Yes | `string.Empty` | `nvarchar(max)` |
| IsActive | `ActiveStatus` | No | `Pending` | `[Required]`, Enum (Approved=0, Denied=1, Pending=2, Closed=3), `int` |
| TenancyId | `int?` | Yes | null | `int` |
| TenancyGuid | `Guid?` | Yes | null | `uniqueidentifier` |
| BusinessType | `BusinessType?` | Yes | null | Enum (Llc=0, Inc=1, Sole=2, Partnership=3), `int` |
| InvestorType | `InvestorType?` | Yes | null | Enum (Buyer=1, Funder=2, BothBuyerFunder=3), `int` |
| IsAccreditedInvestor | `bool?` | Yes | null | `bit` |
| IsAgreedToTermsAndConditions | `bool?` | Yes | null | `bit` |
| IsBuyerAgency | `bool?` | Yes | null | `bit` (added in migration `20251022113123`) |

**Navigation properties:**
- `Company? ParentCompany` — 0..1 (self-ref)
- `ICollection<Company> ChildCompanies` — 1:N (self-ref children)
- `User? OwnerUser` — 0..1
- `ICollection<User> Users` — N:M via CompanyUser
- `ICollection<Document> Documents` — 1:N
- `ICollection<GlobalInviteLink> GlobalInviteLinks` — 1:N

**Relationships:**
- FK: `ParentCompanyId` → Company.Id (0..1, restricted delete)
- FK: `OwnerUserId` → User.Id (0..1, set-null delete)
- N:M: Company ↔ User via CompanyUser
- 1:N: Company → Documents (cascade)
- 1:N: Company → GlobalInviteLinks

---

### 3. Buybox

- **Entity:** `ZoodealioInvestorPortal.Domain.Entities.Buybox`
- **Table:** `Buyboxes`
- **Source:** `Zoodealio.Shared/InvestorPortal/Domain/Entities/Buybox.cs`

| Column | CLR Type | Nullable | Default | Constraints / Annotations |
|---|---|---|---|---|
| Id | `Guid` | No | | `[Key]` `[Required]` PK, `uniqueidentifier`, ValueGeneratedOnAdd |
| Title | `string` | No | | `[Required]`, `nvarchar(max)` |
| PriceMin | `decimal?` | Yes | null | `decimal(18,2)` |
| PriceMax | `decimal?` | Yes | null | `decimal(18,2)` |
| SqftMin | `decimal?` | Yes | null | `decimal(18,2)` |
| SqftMax | `decimal?` | Yes | null | `decimal(18,2)` |
| StoriesMin | `decimal?` | Yes | null | `decimal(18,2)` |
| StoriesMax | `decimal?` | Yes | null | `decimal(18,2)` |
| BedroomsMin | `decimal?` | Yes | null | `decimal(18,2)` |
| BedroomsMax | `decimal?` | Yes | null | `decimal(18,2)` |
| BathroomsMin | `decimal?` | Yes | null | `decimal(18,2)` |
| BathroomsMax | `decimal?` | Yes | null | `decimal(18,2)` |
| YearBuiltMin | `decimal?` | Yes | null | `decimal(18,2)` |
| YearBuiltMax | `decimal?` | Yes | null | `decimal(18,2)` |
| LotSizeMin | `decimal?` | Yes | null | `decimal(18,2)` |
| LotSizeMax | `decimal?` | Yes | null | `decimal(18,2)` |
| CreatedByUserId | `Guid?` | Yes | null | `uniqueidentifier`, FK User |

**Navigation properties:**
- `User? CreatedByUser` — 0..1
- `ICollection<BuyboxPropertyType> PropertyTypes` — 1:N
- `ICollection<BuyboxBuyingStrategy> BuyingStrategies` — 1:N
- `ICollection<BuyboxLocation> Locations` — 1:N
- `ICollection<BuyboxUser> Users` — 1:N (join for N:M with User)

---

### 4. BuyboxBuyingStrategy

- **Source:** `Zoodealio.Shared/InvestorPortal/Domain/Entities/BuyboxBuyingStrategy.cs`
- **Table:** `BuyboxBuyingStrategies`

| Column | CLR Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| Id | `Guid` | No | | `[Key]` PK, `uniqueidentifier` |
| BuyingStrategy | `BuyingStrategy` | No | | `[Required]`, Enum (FixAndFlip=0, BuyAndHold=1, ShortTermRental=2, Brrrr=3), `int` |
| BuyboxId | `Guid?` | Yes | null | FK Buybox (optional) |

---

### 5. BuyboxLocation

- **Source:** `Zoodealio.Shared/InvestorPortal/Domain/Entities/BuyboxLocation.cs`
- **Table:** `BuyboxLocations`

| Column | CLR Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| Id | `Guid` | No | | `[Key]` PK, `uniqueidentifier` |
| City | `string?` | Yes | `string.Empty` | `nvarchar(max)` (made nullable in migration `20250918094946`) |
| UsState | `UsState` | No | | `[Required]`, Enum (51 US states + DC), `int` |
| BuyboxId | `Guid?` | Yes | null | FK Buybox (optional) |

---

### 6. BuyboxPropertyType

- **Source:** `Zoodealio.Shared/InvestorPortal/Domain/Entities/BuyboxPropertyType.cs`
- **Table:** `BuyboxPropertyTypes`

| Column | CLR Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| Id | `Guid` | No | | `[Key]` PK, `uniqueidentifier` |
| PropertyType | `PropertyType` | No | | `[Required]`, Enum (SingleFamilyHome=0, Townhome=1, Condominium=2, Duplex=3), `int` |
| BuyboxId | `Guid?` | Yes | null | FK Buybox (optional) |

---

### 7. BuyboxUser (N:M join)

- **Source:** `Zoodealio.Shared/InvestorPortal/Domain/Entities/BuyboxUser.cs`
- **Table:** `BuyboxUsers`

| Column | CLR Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| Id | `Guid` | No | | `[Key]` PK, `uniqueidentifier` |
| UserId | `Guid?` | Yes | null | FK User (optional) |
| BuyboxId | `Guid?` | Yes | null | FK Buybox (optional) |

Join entity implementing N:M between User and Buybox.

---

### 8. CompanyInvite

- **Source:** `Zoodealio.Shared/InvestorPortal/Domain/Entities/CompanyInvite.cs`
- **Table:** `CompanyInvites`

| Column | CLR Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| Id | `Guid` | No | | `[Key]` PK, `uniqueidentifier` |
| Email | `string` | No | `string.Empty` | `[Required]` `[EmailAddress]`, `nvarchar(max)` |
| InvitedRole | `Role` | No | | `[Required]`, Enum, `int`, `[Column("InvitedRole")]` |
| InvitedByUserId | `Guid` | No | | `[Required]`, FK User (restricted delete) |
| Token | `string` | No | `string.Empty` | `[Required]`, `nvarchar(450)`, unique index |
| IsActive | `bool` | No | true | `bit` |
| IsAccepted | `bool` | No | false | `bit` |
| AcceptedUserId | `Guid?` | Yes | null | FK User (set-null delete) |
| UpdatedAt | `DateTime` | No | `DateTime.UtcNow` | `datetime2` |
| RespondedAt | `DateTime?` | Yes | null | `datetime2` |
| ExpiresAt | `DateTime` | No | | `[Required]`, `datetime2` |
| CreatedAt | `DateTime` | No | `DateTime.UtcNow` | `datetime2` |

**Navigation properties:**
- `User? ParentUser` — FK `InvitedByUserId`
- `User? AcceptedUser` — FK `AcceptedUserId`

---

### 9. CompanyUser (N:M join)

- **Source:** `Zoodealio.Shared/InvestorPortal/Domain/Entities/CompanyUser.cs`
- **Table:** `CompanyUsers`

| Column | CLR Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| Id | `Guid` | No | | `[Key]` PK, `uniqueidentifier` |
| CompanyId | `Guid` | No | | `[Required]`, FK Company (cascade delete) |
| UserId | `Guid` | No | | `[Required]`, FK User (cascade delete) |
| InviteId | `Guid?` | Yes | null | FK CompanyInvite (optional) |
| IsActive | `bool` | No | true | `bit` |
| DateAdded | `DateTime` | No | `DateTime.UtcNow` | `datetime2` |

Unique composite index on `(CompanyId, UserId)`. Join entity for User ↔ Company N:M.

---

### 10. Document

- **Source:** `Zoodealio.Shared/InvestorPortal/Domain/Entities/Document.cs`
- **Table:** `Documents`

| Column | CLR Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| Id | `Guid` | No | | `[Key]` PK, `uniqueidentifier` |
| FileName | `string` | No | `string.Empty` | `[Required]`, `nvarchar(max)` |
| BlobName | `string` | No | `string.Empty` | `[Required]`, `nvarchar(max)` |
| ContentType | `string` | No | `string.Empty` | `[Required]`, `nvarchar(max)` |
| Size | `long` | No | | `[Required]`, `bigint` |
| FileUrl | `string` | No | `string.Empty` | `[Required]`, `nvarchar(max)` |
| UploadedAt | `DateTime` | No | `DateTime.UtcNow` | `datetime2` |
| LastModified | `DateTime?` | Yes | null | `datetime2` |
| UploadedById | `Guid` | No | | `[Required]`, FK User (restricted delete) |
| CompanyId | `Guid` | No | | `[Required]`, FK Company (cascade delete) |

---

### 11. GlobalInviteLink

- **Source:** `Zoodealio.Shared/InvestorPortal/Domain/Entities/GlobalInviteLink.cs`
- **Table:** `GlobalInviteLinks`

| Column | CLR Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| Id | `Guid` | No | | `[Key]` PK, `uniqueidentifier` |
| IssuedByUserId | `Guid` | No | | `[Required]`, implicit FK User |
| CompanyId | `Guid?` | Yes | null | FK Company (optional) |
| TargetRole | `Role` | No | | `[Required]`, Enum, `int` |
| Token | `string` | No | `string.Empty` | `[Required]`, `nvarchar(450)`, unique index |
| IsRevoked | `bool` | No | false | `bit` |
| CreatedAt | `DateTime` | No | `DateTime.UtcNow` | `datetime2` |
| ExpiresAt | `DateTime?` | Yes | null | `datetime2` |

No navigation properties; FKs are ID-only.

---

### 12. InvestorComplianceDocument

- **Source:** `Zoodealio.Shared/InvestorPortal/Domain/Entities/InvestorComplianceDocument.cs`
- **Table:** `InvestorComplianceDocuments`

| Column | CLR Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| Id | `Guid` | No | | `[Key]` PK, `uniqueidentifier` |
| FileName | `string` | No | `string.Empty` | `nvarchar(max)` |
| BlobName | `string` | No | `string.Empty` | `nvarchar(max)` |
| ContentType | `string` | No | `string.Empty` | `nvarchar(max)` |
| Size | `long` | No | | `bigint` |
| FileUrl | `string` | No | `string.Empty` | `nvarchar(max)` |
| UploadedAt | `DateTime` | No | `DateTime.UtcNow` | `datetime2` |
| RichTextContent | `string?` | Yes | `string.Empty` | `nvarchar(max)` |
| MustComplyOnLogin | `bool` | No | false | `bit` |
| IsArchived | `bool?` | Yes | false | `bit` (added in migration `20251128143826`) |
| CompanyId | `Guid` | No | | `[Required]`, FK Company (cascade delete) |

**Navigation:** `ICollection<InvestorComplianceDocumentAcceptance> AcceptedBy` (1:N).

---

### 13. InvestorComplianceDocumentAcceptance

- **Source:** `Zoodealio.Shared/InvestorPortal/Domain/Entities/InvestorComplianceDocumentAcceptance.cs`
- **Table:** `InvestorComplianceDocumentAcceptances`

| Column | CLR Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| Id | `Guid` | No | | `[Key]` PK, `uniqueidentifier` |
| AcceptedAt | `DateTime` | No | `DateTime.UtcNow` | `datetime2` |
| AcceptedFromIp | `string?` | Yes | `string.Empty` | `nvarchar(max)` |
| InvestorComplianceDocumentId | `Guid` | No | | `[Required]`, FK InvestorComplianceDocument (cascade delete) |
| UserId | `Guid` | No | | `[Required]`, FK User (cascade delete) |

---

### 14. PasswordResetToken

- **Source:** `Zoodealio.Shared/InvestorPortal/Domain/Entities/PasswordResetToken.cs`
- **Table:** `PasswordResetTokens`

| Column | CLR Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| Id | `Guid` | No | | `[Key]` PK, `uniqueidentifier` |
| Email | `string` | No | `string.Empty` | `[Required]`, `nvarchar(max)` |
| Token | `string` | No | `string.Empty` | `[Required]`, `nvarchar(max)` |
| CreatedAt | `DateTime` | No | | `datetime2` |
| ExpiresAt | `DateTime` | No | | `datetime2` |
| IsUsed | `bool` | No | false | `bit` |
| UsedAt | `DateTime?` | Yes | null | `datetime2` |

Standalone (no FK to User — email-based).

---

### 15. UserRelation

- **Source:** `Zoodealio.Shared/InvestorPortal/Domain/Entities/UserRelation.cs`
- **Table:** `UserRelations`

| Column | CLR Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| Id | `Guid` | No | | `[Key]` PK, `uniqueidentifier` |
| ParentUserId | `Guid` | No | | `[Required]`, FK User (restricted delete), `[ForeignKey]` |
| ChildUserId | `Guid` | No | | `[Required]`, FK User (restricted delete), `[ForeignKey]` |
| InviteId | `Guid?` | Yes | null | FK CompanyInvite (optional) |
| IsActive | `bool` | No | true | `bit` |
| CreatedAt | `DateTime` | No | `DateTime.UtcNow` | `datetime2` |

Parent/child user hierarchy table.

---

### 16. UserTenancy

- **Source:** `Zoodealio.Shared/InvestorPortal/Domain/Entities/UserTenancy.cs`
- **Table:** `UserTenancies`

| Column | CLR Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| Id | `Guid` | No | | `[Key]` PK, `uniqueidentifier` |
| UserId | `Guid` | No | | `[Required]`, FK User (cascade delete) |
| TenancyId | `int` | No | | `[Required]`, `int` — **cross-service FK to Offervana_SaaS tenancy (loose, no navigation)** |
| Source | `TenancySource` | No | | `[Required]`, Enum (Direct=0, Company=1), `int` |
| SourceCompanyId | `Guid?` | Yes | null | FK Company (set-null delete) |
| IsActive | `bool` | No | true | `bit` |
| CreatedAt | `DateTime` | No | `DateTime.UtcNow` | `datetime2` |

Unique composite index on `(UserId, TenancyId, SourceCompanyId)` filtered `[SourceCompanyId] IS NOT NULL`.
**Cross-service coupling:** `TenancyId` is a foreign key into Offervana's tenancy model but is enforced only at the application layer.

---

## Enums (9)

All enums live under `ZoodealioInvestorPortal.Domain.Enum` in `Zoodealio.Shared/InvestorPortal/Domain/Enum/`. Stored as `int`.

### Role

```csharp
public enum Role {
    Investor = 1,
    AccountManager = 2,
    Collaborator = 3,
    Admin = 4,
    Enterprise = 5
}
```

### ActiveStatus

```csharp
public enum ActiveStatus {
    Approved = 0,
    Denied = 1,
    Pending = 2,
    Closed = 3
}
```

### BuyingStrategy

```csharp
public enum BuyingStrategy {
    FixAndFlip = 0,
    BuyAndHold = 1,
    ShortTermRental = 2,
    Brrrr = 3
}
```

### PropertyType

```csharp
public enum PropertyType {
    SingleFamilyHome = 0,
    Townhome = 1,
    Condominium = 2,
    Duplex = 3
}
```

### BusinessType

```csharp
public enum BusinessType {
    Llc = 0,
    Inc = 1,
    Sole = 2,
    Partnership = 3
}
```

### InvestorType

```csharp
public enum InvestorType {
    Buyer = 1,
    Funder = 2,
    BothBuyerFunder = 3
}
```

### UsState

All 50 US states plus DC. Values:
AL(0), AK(1), AZ(2), AR(3), CA(4), CO(5), CT(6), DE(7), FL(8), GA(9), HI(10), ID(11), IL(12), IN(13), IA(14), KS(15), KY(16), LA(17), ME(18), MD(19), MA(20), MI(21), MN(22), MS(23), MO(24), MT(25), NE(26), NV(27), NH(28), NJ(29), NM(30), NY(31), NC(32), ND(33), OH(34), OK(35), OR(36), PA(37), RI(38), SC(39), SD(40), TN(41), TX(42), UT(43), VT(44), VA(45), WA(46), WV(47), WI(48), WY(49), DC(50)

### TenancySource

```csharp
public enum TenancySource {
    Direct = 0,
    Company = 1
}
```

### ReferringAgentRole

```csharp
public enum ReferringAgentRole {
    Agent = 1,
    Manager = 2,
    BrokerageAdmin = 3,
    AccountAdmin = 4,
    Owner = 5
}
```

---

## Key DTOs (Cross-Boundary / Stable Contracts)

### NotificationInputModel (webhook payload)

**Source:** `investor-portal/investor-portal-services/ZoodealioInvestorPortal.Application/DTOs/Notifications/NotificationInputModel.cs`

```csharp
public class NotificationInputModel
{
    public int CustomerId { get; set; }
    public int? PropertyId { get; set; }
    public NotificationType Type { get; set; }
    public string Message { get; set; }
    public string Source { get; set; }
    public long? ActorUserId { get; set; }
    public ActorType? ActorType { get; set; }
}
```

### UserDto

**Source:** `investor-portal/investor-portal-services/ZoodealioInvestorPortal.Application/DTOs/User/UserDto.cs`

```csharp
public class UserDto
{
    public Guid Id { get; set; }
    public string FName { get; set; } = string.Empty;
    public string LName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public ReferringAgentRole? ReferringAgentRole { get; set; }
    public string Username { get; set; } = string.Empty;
    public Role Role { get; set; }
    public string RoleText { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiryTime { get; set; }
    public List<CompanyDto>? Companies { get; set; }
    public int? TenancyId { get; set; }
    public Guid? TenancyGuid { get; set; }
    public DateTime? LastLogin { get; set; }
    public DateTime CreatedDate { get; set; }
    public bool? IsIndividualBuyerAgency { get; set; }
    public DateTime? AcceptedTermsOn { get; set; }
    public string? AcceptedTermsFromIp { get; set; }
}
```

### CompanyDto

**Source:** `investor-portal/investor-portal-services/ZoodealioInvestorPortal.Application/DTOs/Company/CompanyDto.cs`

```csharp
public class CompanyDto
{
    public Guid Id { get; set; }
    public Guid? ParentCompanyId { get; set; }
    public bool IsEnterprise { get; set; }
    public bool? IsBuyerAgencyDefault { get; set; }
    public string? PrimaryName { get; set; } = string.Empty;
    public string? PrimaryLName { get; set; } = string.Empty;
    public string? PrimaryEmail { get; set; } = string.Empty;
    public string? PrimaryPhone { get; set; } = string.Empty;
    public string? BusinessName { get; set; } = string.Empty;
    public UsState? State_Of_Incorporation_Or_Registration { get; set; }
    public string? Business_EIN_Or_Tax_Id { get; set; } = string.Empty;
    public string? BusinessAddressLine { get; set; } = string.Empty;
    public string? BusinessCity { get; set; } = string.Empty;
    public UsState? BusinessState { get; set; }
    public string? BusinessZip { get; set; } = string.Empty;
    public string? How_Heard_About_Us { get; set; } = string.Empty;
    public ActiveStatus IsActive { get; set; }
    public int? TenancyId { get; set; }
    public string? TenancyName { get; set; }
    public Guid? TenancyGuid { get; set; }
    public BusinessType? BusinessType { get; set; }
    public InvestorType? InvestorType { get; set; }
    public int? DocCount { get; set; }
    public bool? IsAccreditedInvestor { get; set; }
    public bool? IsAgreedToTermsAndConditions { get; set; }
    public DateTime? LastLogin { get; set; }
    public DateTime CreatedDate { get; set; }
    public bool? BuyerAgency { get; set; }
    public int ChildCompaniesCount { get; set; }
    public string? OwnerEmail { get; set; }
    public string? EnterpriseName { get; set; }
}
```

**Total DTOs:** 78 application-layer DTOs across 16 folders (Auth, Buybox, Company, Enterprise, File, Notifications, Offer, Profile, Property, Search, Tenant, User, UserTenancy, etc.). Only the webhook/cross-boundary DTOs are captured in full above; the rest are transient and deemed not stable contracts.

---

## Migrations

**Location:** `investor-portal/investor-portal-services/ZoodealioInvestorPortal.Infrastructure/Migrations/`

**Most recent:** `20260407232852_AddCanSeeAllProperties.cs` (April 8, 2026)

**Schema milestone timeline:**

- `20250811114039_InitialSetup` — foundation (User, Company, Document, PasswordResetToken)
- `20250811131048_User_CompanyId_Nullable`
- `20250827090541_User_CreatedDate_NotNullable`
- `20250909092434_Companies_PrimaryLName_Nullable`
- `20250911144031_Add_Buybox` — Buybox + BuyboxPropertyType + BuyboxBuyingStrategy + BuyboxLocation + BuyboxUser
- `20250918094946` — BuyboxLocation.City made nullable
- `20251022113123` — Company.IsBuyerAgency added
- `20251029194417_Add_CompanyInvites`
- `20251104085224_Add_User_TopUserId` — later subsumed into UserRelation
- `20251106133627_Add_GlobalInvite` — GlobalInviteLink
- `20251121091221_InvestorCompliaceDoc` — InvestorComplianceDocument + Acceptance
- `20251125140715_Add_CompanyUser_UserRelation` — CompanyUser join + UserRelation hierarchy
- `20251127144552_adjust_multicompany`
- `20251128143826` — InvestorComplianceDocument.IsArchived added
- `20251229141919_add_enterprise_accounts` — IsEnterprise column
- `20260122132544_company_ownerUserId` — Company.OwnerUserId
- `20260323084906_Add_User_ReferringAgentRole`
- `20260402085247_MergeEnterpriseIntoCompanyAndAddUserTenancy` — UserTenancy table added
- `20260407083027_Pending`
- `20260407232852_AddCanSeeAllProperties` — User.CanSeeAllProperties

---

## Non-EF Data Stores

- **Azure Blob Storage** — `Document` and `InvestorComplianceDocument` store blob references (`BlobName`, `FileUrl`) but no EF-side blob content
- **Cloudinary** — referenced by API catalog for image/photo storage; not modeled in EF
- **No Cosmos, no Azure AI Search, no Redis schemas** — service is pure SQL Server via EF Core

---

## Summary Statistics

- **Entities:** 16
- **DbContexts:** 1 (`InvestorPortalDbContext`) — defined in `Zoodealio.Shared`
- **Enums:** 9 (Role, ActiveStatus, BuyingStrategy, PropertyType, BusinessType, InvestorType, UsState, TenancySource, ReferringAgentRole)
- **Relationships:** 2 N:M joins (User↔Company via CompanyUser; User↔Buybox via BuyboxUser), 2 self/hierarchical refs (Company self-ref, UserRelation parent/child), many 1:N
- **Migrations:** 23 (Aug 2025 → Apr 2026)
- **DTOs captured:** 3 stable cross-boundary (NotificationInputModel, UserDto, CompanyDto); ~78 total application DTOs
- **LegacyData / OffervanaDbContext:** ✗ not present
- **Cross-service FK:** `UserTenancy.TenancyId` → Offervana_SaaS (loose, app-layer only)
- **Concurrency tokens / soft-delete:** none
