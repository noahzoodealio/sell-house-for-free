---
artifact: api-catalog
service: zoodealio-trade-in-holdings
commit-sha: 29a8d56facd353a71227ec0107ba88b321a7bc3a
generated-at: 2026-04-15T00:00:00Z
endpoint-count: 163
---

# TIH API Catalog

## Summary

- Total endpoints: 163 across 17 functional areas.
- Auth scheme: JWT Bearer (`Microsoft.AspNetCore.Authentication.JwtBearer`, scheme = `Bearer`, symmetric key from `Jwt:Key`, issuer/audience validated). Role-based authorization is implemented as a custom claim-free permission system: `[Authorize]` gates auth, and permission enforcement is a `TypeFilter` attribute `[RequirePermission("<dot.path.key>")]` (e.g. `contacts.contractors.read`, `transactions.update`, `underwrites.approve`). A separate `[RequireHostAdmin]` attribute exists but is currently unused on live endpoints. Login endpoint intended for `[EnableRateLimiting("login")]` (policy registered, not currently applied).
- Route convention: `api/[controller]` kebab/lowercased by convention, with explicit overrides for nested resources (`api/contractor/{id}/notes`, `api/custom-property-fields`, `api/legacy/[controller]`, `api/team-members`, etc.). Route tokens are inconsistently cased (see observations).
- Cross-service callers: No outbound HTTP to sibling Zoodealio services (no ZIP/MLS/SaaS `HttpClient` usage). External integrations are Azure Cognitive Search (properties index), Cloudinary (property photos), Azure Blob Storage (documents), and SendGrid (email). Cross-database reads: `OffervanaDbContext` (legacy Offervana/`zoodealio-dev` SQL — used by `Legacy/*` controllers + two MediatR write commands) and `InvestorPortalDbContext` (ZIP SaaS database — read by `GetZipUsersQuery`).
- Minimal APIs / non-controller endpoints: none (beyond `app.MapOpenApi()` and `app.MapScalarApiReference()` for docs). All business endpoints are attribute-routed controllers.
- CORS: named policy `AllowAngularApp`, origins from `Cors:AllowedOrigins` CSV or localhost 4200/4600/4800 fallback, `AllowCredentials`.
- Notable observations:
  - `[AllowAnonymous]` is correctly applied on `/api/auth/*` anonymous endpoints, but `logout` and `validate-user` are also anonymous even though both accept a refresh token — likely intentional to support token-revocation-before-expiry, but worth verifying.
  - `PropertyController`, `PropertyListingController`, `CustomPropertyFieldController`, `FilesController`, `SharedUtilsController`, `TransactionNotesController`, `ZipUserController`, and `AgentController`/`IBuyerOfferController` (Legacy) require `[Authorize]` but have **no `[RequirePermission]`** on any action. This is a potential gap versus the rest of the codebase, which uniformly gates reads/writes by permission — flag for review (particularly file upload/download, property search, property listing mutation, and transaction-note mutation).
  - `TeamMembersController.DELETE /api/team-members/{id}` — no prior idempotency / "cannot delete self" guard visible in the controller (delegated to service); permission is gated by `settings.team.delete`.
  - `PermissionsController.POST sync` endpoint is commented out; sync instead runs at startup via `IPermissionService.SyncPermissionsFromCodebaseAsync()` in `Program.cs`.
  - Inconsistent route casing/pluralization: `api/userroles` (lowercased joined), `api/team-members` (kebab), `api/custom-field-configs` / `api/custom-field-layout-configs` / `api/custom-property-fields` / `api/property-listings` (kebab), but `api/[controller]` elsewhere yields PascalCase-as-controller-name resolution (e.g. `api/ChangeRequest`, `api/Department`, `api/Transaction`, `api/Underwrites`, `api/Investor`, `api/Contractor`, `api/FundingRequest`, `api/WorkflowConfig`, `api/Permissions`, `api/Roles`, `api/Auth`, `api/ZipUser`, `api/SharedUtils`, `api/Property`). Case-insensitive routing makes this work but hits are non-uniform.
  - MediatR is used selectively — only for Legacy Offervana reads (`AgentController`, `IBuyerOfferController`) and `ZipUserController`. All other controllers bypass MediatR and call application services directly (`IContractorService`, `ITransactionService`, `IUnderwriteService`, etc.).
  - Direct DbContext usage in controllers: none observed. `SharedUtilsController` imports `ZoodealioInvestorPortal.Infrastructure` only to use an enum description helper — not a DbContext handle.
  - Legacy Offervana read-only context (`OffervanaDbContext`): consumed by `Legacy/Agent/AgentController` (both endpoints, via MediatR queries), `Legacy/IBuyerOffer/IBuyerOfferController` (via MediatR query), and indirectly through `TradeInHoldings.Application` MediatR handlers `PatchPropertyCommand` (write!) and `PublishOffersToOffervanaCommand` (write). Flag: despite being labelled "read-only", the Offervana context is written to from within the Underwrite offer-publish and property-patch flows.
  - `UnderwritesController.SearchAsync` returns an anonymous object (not a declared DTO) — consumers must duck-type `UnderwriteMap`.
  - `ContractorController.DELETE` and `InvestorController.DELETE` take `[FromQuery] List<Guid> ids` at the collection root (`DELETE /api/Contractor?ids=…&ids=…`) — unusual pattern for a bulk delete. `ChangeRequestController` has no delete at all.
  - File upload actions on `FilesController` have a 10 MB `[RequestSizeLimit]`; `FundingRequestController.POST` has 50 MB for multipart funding packets.

## Functional Areas

### Auth

| Method | Route | Handler | Auth | Request | Response | Notes |
|--------|-------|---------|------|---------|----------|-------|
| POST | /api/auth/login | `AuthController.LoginAsync` (`TradeInHoldings.Api/Controllers/Auth/AuthController.cs`) | [AllowAnonymous] | body: `LoginRequestDto` | `TokenResponseDto` 200 | Calls `IAuthService.LoginAsync`. Rate-limit policy `login` registered (3/15min) but not attached to action. |
| POST | /api/auth/refresh-token | `AuthController.RefreshTokenAsync` | [AllowAnonymous] | body: `RefreshTokenRequestDto` | `TokenResponseDto` 200 | Rotates tokens. |
| POST | /api/auth/validate-user | `AuthController.ValidateUserByTokenAsync` | [AllowAnonymous] | body: `RefreshTokenRequestDto` | `bool` 200 | Used for session re-hydrate. |
| POST | /api/auth/logout | `AuthController.LogoutAsync` | [AllowAnonymous] | body: `RefreshTokenRequestDto` | `{ message }` 200 | Revokes refresh token. |
| POST | /api/auth/forgot-password | `AuthController.ForgotPasswordAsync` | [AllowAnonymous] | body: `ForgotPasswordRequestDto` | `PasswordResetResponseDto` 200 | Emits reset email via SendGrid. |
| POST | /api/auth/reset-password | `AuthController.ResetPasswordAsync` | [AllowAnonymous] | body: `ResetPasswordRequestDto` | `PasswordResetResponseDto` 200 | |
| POST | /api/auth/validate-reset-token | `AuthController.ValidateResetTokenAsync` | [AllowAnonymous] | body: `ValidateResetTokenRequestDto` | `PasswordResetResponseDto` 200 | |
| GET  | /api/auth/claims | `AuthController.GetClaims` | [Authorize] | — | `ClaimsInfoDto` 200 | Returns current user id/email/name/firstname/lastname + raw claims list. |
| GET  | /api/auth/refresh-claims | `AuthController.RefreshClaims` | [Authorize] | — | `ClaimsInfoDto` 200 | Alias to `GetClaims` (no token re-issue). |

### Roles & Permissions

| Method | Route | Handler | Auth | Request | Response | Notes |
|--------|-------|---------|------|---------|----------|-------|
| GET  | /api/Permissions | `PermissionsController.GetAllPermissionsGrouped` (`TradeInHoldings.Api/Controllers/Roles/PermissionsController.cs`) | [Authorize] + settings.roles.read | — | `PermissionsGroupedDto` 200 | Grouped by controller. |
| GET  | /api/Permissions/flat | `PermissionsController.GetAllPermissions` | [Authorize] + settings.roles.read | — | `List<PermissionDto>` 200 | |
| GET  | /api/Permissions/controllers | `PermissionsController.GetControllerNames` | [Authorize] + settings.roles.read | — | `List<string>` 200 | |
| GET  | /api/Permissions/controllers/{controllerName} | `PermissionsController.GetPermissionsByController` | [Authorize] + settings.roles.read | route: controllerName | `List<PermissionDto>` 200 | |
| GET  | /api/Roles | `RolesController.GetAllRoles` (`TradeInHoldings.Api/Controllers/Roles/RolesController.cs`) | [Authorize] + settings.roles.read | query: `RoleFilterDto` (page/size clamped 1–100, default 20) | `PaginatedResult<RoleDto>` 200 | |
| GET  | /api/Roles/{id:guid} | `RolesController.GetRole` | [Authorize] + settings.roles.read | route: id | `RoleWithPermissionsDto` 200 / 404 (ROLE_NOT_FOUND) | |
| POST | /api/Roles | `RolesController.CreateRole` | [Authorize] + settings.roles.create | body: `CreateRoleDto` | `Guid` 201 CreatedAtAction(GetRole) | |
| PUT  | /api/Roles/{id:guid} | `RolesController.UpdateRole` | [Authorize] + settings.roles.update | route: id, body: `UpdateRoleDto` | 204 | |
| DELETE | /api/Roles/{id:guid} | `RolesController.DeleteRole` | [Authorize] + settings.roles.delete | route: id | 204 | |
| POST | /api/Roles/{id:guid}/permissions | `RolesController.AssignPermissions` | [Authorize] + settings.roles.update | route: id, body: `AssignPermissionsDto` | 204 | Replaces role's permission set. |
| DELETE | /api/Roles/{roleId:guid}/permissions/{permissionId:guid} | `RolesController.RemovePermission` | [Authorize] + settings.roles.update | route: roleId, permissionId | 204 | |
| POST | /api/userroles/{userId:guid}/role | `UserRolesController.AssignRoleToUser` (`TradeInHoldings.Api/Controllers/Roles/UserRolesController.cs`) | [Authorize] + settings.roles.create | route: userId, body: `AssignRoleToUserDto` | 204 | |
| DELETE | /api/userroles/{userId:guid}/role | `UserRolesController.RemoveRoleFromUser` | [Authorize] + settings.roles.delete | route: userId | 204 | |
| GET  | /api/userroles/{userId:guid}/role | `UserRolesController.GetUserRole` | [Authorize] + settings.roles.read | route: userId | `RoleWithPermissionsDto` 200 / 404 (NO_ROLE_ASSIGNED) | |
| GET  | /api/userroles/{userId:guid}/permissions | `UserRolesController.GetUserPermissions` | [Authorize] + settings.roles.read | route: userId | `UserPermissionsDto` 200 | |
| GET  | /api/userroles/me/permissions | `UserRolesController.GetCurrentUserPermissions` | [Authorize] (no permission) | — | `UserPermissionsDto` 200 | Intentionally open to any authenticated user. |

### Team Members

| Method | Route | Handler | Auth | Request | Response | Notes |
|--------|-------|---------|------|---------|----------|-------|
| GET  | /api/team-members | `TeamMembersController.GetTeamMembers` (`TradeInHoldings.Api/Controllers/TeamMember/TeamMembersController.cs`) | [Authorize] + settings.team.read | query: `TeamMemberFilterDto` | `PaginatedResult<UserDto>` 200 | |
| GET  | /api/team-members/by-ids | `TeamMembersController.GetByIds` | [Authorize] + settings.team.read | query: `ids` (List<Guid>) | `List<UserDto>` 200 | Short-circuits to empty on no ids. |
| GET  | /api/team-members/{id:guid} | `TeamMembersController.GetTeamMember` | [Authorize] + settings.team.read | route: id | `UserDto` 200 / 404 (MEMBER_NOT_FOUND) | |
| POST | /api/team-members | `TeamMembersController.InviteTeamMember` | [Authorize] + settings.team.create | body: `InviteTeamMemberDto` | `UserDto` 201 CreatedAtAction | Sends invite email (SendGrid). |
| PUT  | /api/team-members/{id:guid} | `TeamMembersController.UpdateTeamMember` | [Authorize] + settings.team.update | route: id, body: `UpdateTeamMemberDto` | `UserDto` 200 | |
| DELETE | /api/team-members/{id:guid} | `TeamMembersController.DeleteTeamMember` | [Authorize] + settings.team.delete | route: id | 204 | Role mutation goes through `userroles`, not here. |

### Departments

| Method | Route | Handler | Auth | Request | Response | Notes |
|--------|-------|---------|------|---------|----------|-------|
| GET  | /api/Department | `DepartmentController.GetAllAsync` (`TradeInHoldings.Api/Controllers/Department/DepartmentController.cs`) | [Authorize] + settings.departments.read | query: `SearchDepartmentDto` | `PaginatedResult<DepartmentDto>` 200 | |
| GET  | /api/Department/my-ids | `DepartmentController.GetMyDepartmentIds` | [Authorize] (no permission) | — | `List<Guid>` 200 | Any authenticated user — returns own memberships. |
| GET  | /api/Department/by-ids | `DepartmentController.GetByIdsAsync` | [Authorize] + settings.departments.read | query: ids | `List<DepartmentInfoDto>` 200 | |
| GET  | /api/Department/{id:guid} | `DepartmentController.GetByIdAsync` | [Authorize] + settings.departments.read | route: id | `DepartmentInfoDto` 200 / 404 (DEPARTMENT_NOT_FOUND) | |
| POST | /api/Department | `DepartmentController.CreateAsync` | [Authorize] + settings.departments.create | body: `CreateDepartmentDto` | `DepartmentDetailDto` 200 | |
| PUT  | /api/Department/{id:guid} | `DepartmentController.UpdateAsync` | [Authorize] + settings.departments.update | route: id, body: `UpdateDepartmentDto` | `DepartmentInfoDto` 200 | |
| DELETE | /api/Department/{id:guid} | `DepartmentController.DeleteAsync` | [Authorize] + settings.departments.delete | route: id | 204 | |
| GET  | /api/department/{departmentId:guid}/members | `DepartmentMembersController.GetDepartmentMembersAsync` (`TradeInHoldings.Api/Controllers/Department/DepartmentMembersController.cs`) | [Authorize] + settings.departments.read | route: departmentId, query: `SearchDepartmentMembersDto` | `PaginatedResult<DepartmentTeamMemberDto>` 200 | |
| POST | /api/department/{departmentId:guid}/members | `DepartmentMembersController.AddDepartmentMembersAsync` | [Authorize] + settings.departments.create | route: departmentId, body: `AddDepartmentMembersDto` | `List<DepartmentTeamMemberDto>` 200 | |
| DELETE | /api/department/{departmentId:guid}/members/{memberId:guid} | `DepartmentMembersController.RemoveDepartmentMemberAsync` | [Authorize] + settings.departments.delete | route: departmentId, memberId | 204 | |
| DELETE | /api/department/{departmentId:guid}/members | `DepartmentMembersController.RemoveDepartmentMembersAsync` | [Authorize] + settings.departments.delete | route: departmentId, body: `RemoveDepartmentMembersDto` | 204 | Bulk remove (body on DELETE). |

### Contractors

| Method | Route | Handler | Auth | Request | Response | Notes |
|--------|-------|---------|------|---------|----------|-------|
| GET  | /api/Contractor | `ContractorController.GetAllAsync` (`TradeInHoldings.Api/Controllers/Contractor/ContractorController.cs`) | [Authorize] + contacts.contractors.read | query: `SearchContractorDto` | `PaginatedResult<ContractorDto>` 200 | |
| GET  | /api/Contractor/{id:guid} | `ContractorController.GetByIdAsync` | [Authorize] + contacts.contractors.read | route: id | `ContractorDto` 200 / 404 | |
| POST | /api/Contractor | `ContractorController.CreateAsync` | [Authorize] + contacts.contractors.create | body: `CreateContractorDto` | `ContractorDto` 200 | Uses `User.GetUserId()` for audit. |
| PUT  | /api/Contractor/{id:guid} | `ContractorController.UpdateAsync` | [Authorize] + contacts.contractors.update | route: id, body: `UpdateContractorDto` | `ContractorDto` 200 | |
| DELETE | /api/Contractor | `ContractorController.DeleteAsync` | [Authorize] + contacts.contractors.delete | query: ids (List<Guid>) | 204 / 400 | Bulk delete via query array. |
| GET  | /api/contractor/{contractorId:guid}/notes | `ContractorNoteController.GetByContractorIdAsync` (`TradeInHoldings.Api/Controllers/Contractor/ContractorNoteController.cs`) | [Authorize] + contacts.contractors.read | route: contractorId | `List<ContractorNoteDto>` 200 | |
| GET  | /api/contractor/{contractorId:guid}/notes/{id:guid} | `ContractorNoteController.GetByIdAsync` | [Authorize] + contacts.contractors.read | route: contractorId, id | `ContractorNoteDto` 200 / 404 | |
| POST | /api/contractor/{contractorId:guid}/notes | `ContractorNoteController.CreateAsync` | [Authorize] + contacts.contractors.create | route: contractorId, body: `CreateContractorNoteDto` | `ContractorNoteDto` 200 | |
| PUT  | /api/contractor/{contractorId:guid}/notes/{id:guid} | `ContractorNoteController.UpdateAsync` | [Authorize] + contacts.contractors.update | route: id, body: `UpdateContractorNoteDto` | `ContractorNoteDto` 200 | `contractorId` route token bound but unused in action body. |
| DELETE | /api/contractor/{contractorId:guid}/notes/{id:guid} | `ContractorNoteController.DeleteAsync` | [Authorize] + contacts.contractors.delete | route: id | 204 | |

### Investors (Capital Providers)

| Method | Route | Handler | Auth | Request | Response | Notes |
|--------|-------|---------|------|---------|----------|-------|
| GET  | /api/Investor | `InvestorController.GetAllAsync` (`TradeInHoldings.Api/Controllers/Investor/InvestorController.cs`) | [Authorize] + contacts.capitalproviders.read | query: `SearchInvestorDto` | `PaginatedResult<InvestorDto>` 200 | |
| GET  | /api/Investor/{id:guid} | `InvestorController.GetByIdAsync` | [Authorize] + contacts.capitalproviders.read | route: id | `InvestorDto` 200 | No 404 short-circuit — service throws. |
| POST | /api/Investor | `InvestorController.CreateAsync` | [Authorize] + contacts.capitalproviders.create | body: `CreateInvestorDto` | `InvestorDto` 200 | |
| PUT  | /api/Investor/{id:guid} | `InvestorController.UpdateAsync` | [Authorize] + contacts.capitalproviders.update | route: id, body: `UpdateInvestorDto` | `InvestorDto` 200 | |
| DELETE | /api/Investor | `InvestorController.DeleteAsync` | [Authorize] + contacts.capitalproviders.delete | query: ids (List<Guid>) | 204 / 400 | |
| GET  | /api/investor/{investorId:guid}/notes | `InvestorNotesController.GetByInvestorIdAsync` (`TradeInHoldings.Api/Controllers/Investor/InvestorNotesController.cs`) | [Authorize] + contacts.capitalproviders.read | route: investorId | `List<InvestorNoteDto>` 200 | |
| GET  | /api/investor/{investorId:guid}/notes/{id:guid} | `InvestorNotesController.GetByIdAsync` | [Authorize] + contacts.capitalproviders.read | route: investorId, id | `InvestorNoteDto` 200 | |
| POST | /api/investor/{investorId:guid}/notes | `InvestorNotesController.CreateAsync` | [Authorize] + contacts.capitalproviders.create | route: investorId, body: `CreateInvestorNoteDto` | `InvestorNoteDto` 200 | |
| PUT  | /api/investor/{investorId:guid}/notes/{id:guid} | `InvestorNotesController.UpdateAsync` | [Authorize] + contacts.capitalproviders.update | route: id, body: `UpdateInvestorNoteDto` | `InvestorNoteDto` 200 | `investorId` route bound but unused. |
| DELETE | /api/investor/{investorId:guid}/notes/{id:guid} | `InvestorNotesController.DeleteAsync` | [Authorize] + contacts.capitalproviders.delete | route: id | 204 | |

### Properties

| Method | Route | Handler | Auth | Request | Response | Notes |
|--------|-------|---------|------|---------|----------|-------|
| POST | /api/Property/search | `PropertyController.SearchAsync` (`TradeInHoldings.Api/Controllers/Property/PropertyController.cs`) | [Authorize] (no permission) | body: `PropertyFilterDto` | `PaginatedResult<PropertyDto>` 200 | Azure Cognitive Search via `ISearchService`. |
| GET  | /api/Property/{id:int} | `PropertyController.GetById` | [Authorize] (no permission) | route: id (int) | `PropertyDto` 200 / 404 | Searches the index by id. |
| GET  | /api/Property/photos | `PropertyController.GetPropertiesPhotos` | [Authorize] (no permission) | query: propertyIds (List<int>) | `Dictionary<int,List<CloudinaryFileOutput>>` 200 | Fans out to Cloudinary (`ICloudinaryClient.GetCloudinaryBatchAsync`). |
| GET  | /api/property-listings/{propertyId:int} | `PropertyListingController.GetByPropertyIdAsync` (`TradeInHoldings.Api/Controllers/PropertyListing/PropertyListingController.cs`) | [Authorize] (no permission) | route: propertyId (int) | `List<PropertyListingDto>` 200 | |
| POST | /api/property-listings/{propertyId:int} | `PropertyListingController.CreateAsync` | [Authorize] (no permission) | route: propertyId, body: `CreatePropertyListingDto` | `PropertyListingDto` 200 | |
| PUT  | /api/property-listings/{id:guid} | `PropertyListingController.UpdateAsync` | [Authorize] (no permission) | route: id, body: `UpdatePropertyListingDto` | `PropertyListingDto` 200 | |
| DELETE | /api/property-listings/{id:guid} | `PropertyListingController.DeleteAsync` | [Authorize] (no permission) | route: id | 204 | |
| GET  | /api/custom-property-fields/{propertyId:int} | `CustomPropertyFieldController.GetByPropertyIdAsync` (`TradeInHoldings.Api/Controllers/CustomPropertyField/CustomPropertyFieldController.cs`) | [Authorize] (no permission) | route: propertyId (int) | `List<CustomPropertyFieldDto>` 200 | |
| PUT  | /api/custom-property-fields/{propertyId:int} | `CustomPropertyFieldController.SaveAsync` | [Authorize] (no permission) | route: propertyId, body: `SaveCustomPropertyFieldsDto` | `List<CustomPropertyFieldDto>` 200 | |

### Transactions

| Method | Route | Handler | Auth | Request | Response | Notes |
|--------|-------|---------|------|---------|----------|-------|
| POST | /api/Transaction/initiate/{propertyId} | `TransactionController.InitiateTransaction` (`TradeInHoldings.Api/Controllers/Transaction/TransactionController.cs`) | [Authorize] + transactions.create | route: propertyId (int) | `PropertyTransactionDto` 200 | |
| PUT  | /api/Transaction/{propertyTransactionId}/advance | `TransactionController.AdvanceToNextStage` | [Authorize] + transactions.update | route: propertyTransactionId | `PropertyTransactionDto` 200 | |
| GET  | /api/Transaction/{propertyTransactionId} | `TransactionController.GetTransactionById` | [Authorize] + transactions.read | route: propertyTransactionId | `PropertyTransactionDto` 200 | |
| GET  | /api/Transaction/property/{propertyId} | `TransactionController.GetFullTransaction` | [Authorize] + transactions.read | route: propertyId (int) | `PropertyTransactionDto` 200 | |
| GET  | /api/Transaction/property/{propertyId}/overview | `TransactionController.GetTransactionOverview` | [Authorize] + transactions.read | route: propertyId (int) | `PropertyTransactionDto` 200 | Overview projection. |
| GET  | /api/Transaction/{propertyTransactionId}/current-workflow | `TransactionController.GetCurrentWorkflow` | [Authorize] + transactions.read | route: propertyTransactionId | `WorkflowDto` 200 | |
| GET  | /api/Transaction/{propertyTransactionId}/current-stage | `TransactionController.GetCurrentStage` | [Authorize] + transactions.read | route: propertyTransactionId | `WorkflowStageDto` 200 | |
| GET  | /api/Transaction/workflows/{workflowConfigId}/properties | `TransactionController.GetPropertiesByWorkflow` | [Authorize] + transactions.read | route: workflowConfigId, query: `PropertyFilterDto` | `WorkflowPropertiesResultDto` 200 | |
| GET  | /api/Transaction/workflows | `TransactionController.GetDistinctWorkflows` | [Authorize] + transactions.read | — | `List<WorkflowDto>` 200 | |
| PUT  | /api/Transaction/tasks/{taskId}/complete | `TransactionController.CompleteTask` | [Authorize] + transactions.update | route: taskId | `WorkflowStageTaskDto` 200 / **409** CHANGE_REQUEST_REQUIRED | Throws `ChangeRequestRequiredException` → 409. |
| PUT  | /api/Transaction/{propertyTransactionId}/complete | `TransactionController.CompleteTransaction` | [Authorize] + transactions.update | route: propertyTransactionId | `PropertyTransactionDto` 200 | |
| GET  | /api/Transaction/{propertyTransactionId}/upcoming-workflows | `TransactionController.GetUpcomingWorkflowPreviews` | [Authorize] + transactions.read | route: propertyTransactionId | `List<WorkflowDto>` 200 | |
| PUT  | /api/Transaction/{propertyTransactionId} | `TransactionController.UpdateTransaction` | [Authorize] + transactions.update | route: propertyTransactionId, body: `UpdatePropertyTransactionDto` | `PropertyTransactionDto` 200 / 400 | Catches `InvalidOperationException`. |
| PUT  | /api/Transaction/{propertyTransactionId}/terminate | `TransactionController.TerminateTransaction` | [Authorize] + transactions.update | route: propertyTransactionId | `PropertyTransactionDto` 200 / 400 | |
| PUT  | /api/Transaction/tasks/{taskId}/review | `TransactionController.ReviewTask` | [Authorize] + transactions.update | route: taskId | `WorkflowStageTaskDto` 200 | |
| GET  | /api/Transaction/closed/properties | `TransactionController.GetClosedTransactionProperties` | [Authorize] + transactions.read | query: `ClosedTransactionFilterDto` | `ClosedTransactionPropertiesResultDto` 200 | |
| GET  | /api/Transaction/properties/search | `TransactionController.SearchProperties` | [Authorize] + transactions.read | query: `PropertyFilterDto` | `PaginatedResult<PropertyDto>` 200 | |
| GET  | /api/Transaction/properties/active-status | `TransactionController.GetActiveTransactionMap` | [Authorize] + transactions.read | query: propertyIds (List<int>) | `Dictionary<int,Guid>` 200 | |
| GET  | /api/transaction/{propertyTransactionId:guid}/notes/count | `TransactionNotesController.GetCountAsync` (`TradeInHoldings.Api/Controllers/Transaction/TransactionNotesController.cs`) | [Authorize] (no permission) | route: propertyTransactionId | `int` 200 | |
| GET  | /api/transaction/{propertyTransactionId:guid}/notes | `TransactionNotesController.GetByTransactionIdAsync` | [Authorize] (no permission) | route: propertyTransactionId, query: pageNumber=1, pageSize=20 | `PaginatedResult<TransactionNoteDto>` 200 | |
| POST | /api/transaction/{propertyTransactionId:guid}/notes | `TransactionNotesController.CreateAsync` | [Authorize] (no permission) | route: propertyTransactionId, body: `CreateTransactionNoteDto` | `TransactionNoteDto` 200 | |
| DELETE | /api/transaction/{propertyTransactionId:guid}/notes/{noteId:guid} | `TransactionNotesController.DeleteAsync` | [Authorize] (no permission) | route: propertyTransactionId, noteId | 204 | |

### Change Requests

| Method | Route | Handler | Auth | Request | Response | Notes |
|--------|-------|---------|------|---------|----------|-------|
| GET  | /api/ChangeRequest | `ChangeRequestController.GetAll` (`TradeInHoldings.Api/Controllers/ChangeRequest/ChangeRequestController.cs`) | [Authorize] + changerequests.read | query: `SearchChangeRequestDto` | `PaginatedResult<ChangeRequestDto>` 200 | Scoped to current user. |
| GET  | /api/ChangeRequest/{id:guid} | `ChangeRequestController.GetById` | [Authorize] + changerequests.read | route: id | `ChangeRequestDto` 200 / 404 | |
| POST | /api/ChangeRequest | `ChangeRequestController.Create` | [Authorize] + changerequests.create | body: `CreateChangeRequestDto` | `ChangeRequestDto` 200 | |
| POST | /api/ChangeRequest/{id:guid}/approve | `ChangeRequestController.Approve` | [Authorize] + changerequests.update | route: id, body: `ResolveChangeRequestDto` | `ChangeRequestDto` 200 | |
| POST | /api/ChangeRequest/{id:guid}/reject | `ChangeRequestController.Reject` | [Authorize] + changerequests.update | route: id, body: `ResolveChangeRequestDto` | `ChangeRequestDto` 200 | |
| GET  | /api/ChangeRequest/pending-count | `ChangeRequestController.GetPendingCount` | [Authorize] + changerequests.read | — | `int` 200 | Current-user inbox count. |
| GET  | /api/ChangeRequest/count | `ChangeRequestController.GetCount` | [Authorize] + changerequests.read | query: propertyTransactionId (Guid) | `int` 200 | |

### Funding Requests

| Method | Route | Handler | Auth | Request | Response | Notes |
|--------|-------|---------|------|---------|----------|-------|
| POST | /api/FundingRequest | `FundingRequestController.Create` (`TradeInHoldings.Api/Controllers/FundingRequest/FundingRequestController.cs`) | [Authorize] + transactions.create | multipart form: `CreateFundingRequestDto` ([FromForm]) | `FundingRequestResultDto` 200 | 50 MB request size limit. Uploads files to Azure Blob + sends email. |
| GET  | /api/FundingRequest/count | `FundingRequestController.GetCountForTransaction` | [Authorize] + transactions.read | query: transactionId (Guid) | `int` 200 | |
| GET  | /api/FundingRequest | `FundingRequestController.GetByTransaction` | [Authorize] + transactions.read | query: `SearchFundingRequestDto` | `PaginatedResult<FundingRequestListDto>` 200 | |
| GET  | /api/FundingRequest/{id:guid} | `FundingRequestController.GetById` | [Authorize] + transactions.read | route: id | `FundingRequestDetailDto` 200 / 404 | |
| DELETE | /api/FundingRequest/{id:guid} | `FundingRequestController.Delete` | [Authorize] + transactions.delete | route: id | 204 | |

### Documents / Files

| Method | Route | Handler | Auth | Request | Response | Notes |
|--------|-------|---------|------|---------|----------|-------|
| POST | /api/Files/upload | `FilesController.UploadFile` (`TradeInHoldings.Api/Controllers/Document/FilesController.cs`) | [Authorize] (no permission) | form: `IFormFile file` | upload result 200 | 10 MB limit, writes to Blob via `IFileService`. |
| POST | /api/Files/bulk-upload | `FilesController.UploadFiles` | [Authorize] (no permission) | form: `IFormFileCollection files` | upload result 200 / 400 | 10 MB limit per request. |
| GET  | /api/Files/download/{documentId:guid} | `FilesController.DownloadFile` | [Authorize] (no permission) | route: documentId | `FileStreamResult` 200 | Streams file + content type. |
| GET  | /api/Files/info/{documentId:guid} | `FilesController.GetFileInfo` | [Authorize] (no permission) | route: documentId | metadata dto 200 | |
| DELETE | /api/Files/{documentId:guid} | `FilesController.DeleteFile` | [Authorize] (no permission) | route: documentId | 204 | |
| GET  | /api/Files | `FilesController.GetDocuments` | [Authorize] (no permission) | query: `GetDocumentsRequest` | paginated document list 200 | `request.NormalizePagination()` clamps. |

### Workflow Config

| Method | Route | Handler | Auth | Request | Response | Notes |
|--------|-------|---------|------|---------|----------|-------|
| GET  | /api/WorkflowConfig | `WorkflowConfigController.GetAllAsync` (`TradeInHoldings.Api/Controllers/WorkflowConfig/WorkflowConfigController.cs`) | [Authorize] + workflows.workflows.read | query: `SearchWorkflowConfigDto` | `PaginatedResult<WorkflowConfigDto>` 200 | |
| GET  | /api/WorkflowConfig/{id:guid} | `WorkflowConfigController.GetByIdAsync` | [Authorize] + workflows.workflows.read | route: id | `WorkflowConfigDetailDto` 200 / 404 (WORKFLOW_CONFIG_NOT_FOUND) | |
| POST | /api/WorkflowConfig | `WorkflowConfigController.CreateAsync` | [Authorize] + workflows.workflows.create | body: `CreateWorkflowConfigDto` | `WorkflowConfigDetailDto` 200 | |
| PUT  | /api/WorkflowConfig/{id:guid} | `WorkflowConfigController.UpdateAsync` | [Authorize] + workflows.workflows.update | route: id, body: `UpdateWorkflowConfigDto` | `WorkflowConfigDetailDto` 200 | |
| DELETE | /api/WorkflowConfig/{id:guid} | `WorkflowConfigController.DeleteAsync` | [Authorize] + workflows.workflows.delete | route: id | 204 | |
| PUT  | /api/WorkflowConfig/reorder | `WorkflowConfigController.ReorderWorkflowsAsync` | [Authorize] + workflows.workflows.update | body: `List<ReorderItemDto>` | 200 | |
| POST | /api/WorkflowConfig/{id:guid}/publish | `WorkflowConfigController.PublishAsync` | [Authorize] + workflows.workflows.update | route: id | `WorkflowConfigDetailDto` 200 | |
| POST | /api/WorkflowConfig/{id:guid}/unpublish | `WorkflowConfigController.UnpublishAsync` | [Authorize] + workflows.workflows.update | route: id | `WorkflowConfigDetailDto` 200 | |
| POST | /api/WorkflowConfig/{workflowConfigId:guid}/stages | `WorkflowConfigController.AddStageAsync` | [Authorize] + workflows.workflows.create | route: workflowConfigId, body: `CreateWorkflowStageConfigDto` | `WorkflowStageConfigDto` 200 | |
| PUT  | /api/WorkflowConfig/stages/{stageId:guid} | `WorkflowConfigController.UpdateStageAsync` | [Authorize] + workflows.workflows.update | route: stageId, body: `UpdateWorkflowStageConfigDto` | `WorkflowStageConfigDto` 200 | |
| DELETE | /api/WorkflowConfig/stages/{stageId:guid} | `WorkflowConfigController.DeleteStageAsync` | [Authorize] + workflows.workflows.delete | route: stageId | 204 | |
| PUT  | /api/WorkflowConfig/{workflowConfigId:guid}/stages/reorder | `WorkflowConfigController.ReorderStagesAsync` | [Authorize] + workflows.workflows.update | route: workflowConfigId, body: `List<ReorderItemDto>` | 200 | |
| POST | /api/WorkflowConfig/stages/{stageId:guid}/tasks | `WorkflowConfigController.AddTaskAsync` | [Authorize] + workflows.workflows.create | route: stageId, body: `CreateWorkflowStageTaskConfigDto` | `WorkflowStageTaskConfigDto` 200 | |
| PUT  | /api/WorkflowConfig/tasks/{taskId:guid} | `WorkflowConfigController.UpdateTaskAsync` | [Authorize] + workflows.workflows.update | route: taskId, body: `UpdateWorkflowStageTaskConfigDto` | `WorkflowStageTaskConfigDto` 200 | |
| DELETE | /api/WorkflowConfig/tasks/{taskId:guid} | `WorkflowConfigController.DeleteTaskAsync` | [Authorize] + workflows.workflows.delete | route: taskId | 204 | |
| PUT  | /api/WorkflowConfig/stages/{stageId:guid}/tasks/reorder | `WorkflowConfigController.ReorderTasksAsync` | [Authorize] + workflows.workflows.update | route: stageId, body: `List<ReorderItemDto>` | 200 | |
| PUT  | /api/WorkflowConfig/{id:guid}/field-layouts | `WorkflowConfigController.UpdateFieldLayoutAssociationsAsync` | [Authorize] + workflows.workflows.update | route: id, body: `List<Guid>` fieldLayoutConfigIds | 200 | |

### Custom Fields

| Method | Route | Handler | Auth | Request | Response | Notes |
|--------|-------|---------|------|---------|----------|-------|
| GET  | /api/custom-field-configs/control-types | `CustomFieldConfigController.GetControlTypes` (`TradeInHoldings.Api/Controllers/CustomField/CustomFieldConfigController.cs`) | [Authorize] + workflows.customfields.read | — | `List<EnumHelper.EnumAsListItem>` 200 | Static enum projection. |
| GET  | /api/custom-field-configs | `CustomFieldConfigController.GetAllAsync` | [Authorize] + workflows.customfields.read | query: `SearchCustomFieldConfigDto` | `PaginatedResult<CustomFieldConfigDto>` 200 | |
| GET  | /api/custom-field-configs/by-ids | `CustomFieldConfigController.GetByIdsAsync` | [Authorize] + workflows.customfields.read | query: ids | `List<CustomFieldConfigDetailDto>` 200 | |
| GET  | /api/custom-field-configs/{id:guid} | `CustomFieldConfigController.GetByIdAsync` | [Authorize] + workflows.customfields.read | route: id | `CustomFieldConfigDetailDto` 200 / 404 (CUSTOM_FIELD_CONFIG_NOT_FOUND) | |
| POST | /api/custom-field-configs | `CustomFieldConfigController.CreateAsync` | [Authorize] + workflows.customfields.create | body: `CreateCustomFieldConfigDto` | `CustomFieldConfigDetailDto` 200 | |
| PUT  | /api/custom-field-configs/{id:guid} | `CustomFieldConfigController.UpdateAsync` | [Authorize] + workflows.customfields.update | route: id, body: `UpdateCustomFieldConfigDto` | `CustomFieldConfigDetailDto` 200 | |
| DELETE | /api/custom-field-configs/{id:guid} | `CustomFieldConfigController.DeleteAsync` | [Authorize] + workflows.customfields.delete | route: id | 204 | |
| GET  | /api/custom-field-layout-configs | `CustomFieldLayoutConfigController.GetAllAsync` (`TradeInHoldings.Api/Controllers/CustomFieldLayout/CustomFieldLayoutConfigController.cs`) | [Authorize] + workflows.layouts.read | query: `SearchCustomFieldLayoutConfigDto` | `PaginatedResult<CustomFieldLayoutConfigDto>` 200 | |
| GET  | /api/custom-field-layout-configs/{id:guid} | `CustomFieldLayoutConfigController.GetByIdAsync` | [Authorize] + workflows.layouts.read | route: id | `CustomFieldLayoutConfigDetailDto` 200 / 404 | |
| GET  | /api/custom-field-layout-configs/batch | `CustomFieldLayoutConfigController.GetByIdsAsync` | [Authorize] + workflows.layouts.read | query: ids | `List<CustomFieldLayoutConfigDetailDto>` 200 | |
| POST | /api/custom-field-layout-configs | `CustomFieldLayoutConfigController.CreateAsync` | [Authorize] + workflows.layouts.create | body: `CreateCustomFieldLayoutConfigDto` | `CustomFieldLayoutConfigDetailDto` 200 | |
| PUT  | /api/custom-field-layout-configs/{id:guid} | `CustomFieldLayoutConfigController.UpdateAsync` | [Authorize] + workflows.layouts.update | route: id, body: `UpdateCustomFieldLayoutConfigDto` | `CustomFieldLayoutConfigDetailDto` 200 | |
| DELETE | /api/custom-field-layout-configs/{id:guid} | `CustomFieldLayoutConfigController.DeleteAsync` | [Authorize] + workflows.layouts.delete | route: id | 204 | |

### Underwrites

| Method | Route | Handler | Auth | Request | Response | Notes |
|--------|-------|---------|------|---------|----------|-------|
| POST | /api/Underwrites/search | `UnderwritesController.SearchAsync` (`TradeInHoldings.Api/Controllers/Underwrites/UnderwritesController.cs`) | [Authorize] + underwrites.read | body: `PropertyFilterDto` | anonymous `{ Items, TotalCount, PageNumber, PageSize, HasNextPage, HasPreviousPage, TotalPages, UnderwriteMap }` 200 | Combines Azure Search property hits + per-user underwrites, overlays UW fields (address, bedrooms, etc.) onto the property list. |
| GET  | /api/Underwrites/my-offers-pipeline | `UnderwritesController.GetMyOffersInPipelineAsync` | [Authorize] + underwrites.read | — | offers pipeline list 200 | |
| GET  | /api/Underwrites/pending-review | `UnderwritesController.GetPendingReviewAsync` | [Authorize] + underwrites.approve | — | pending review list 200 | Reviewer inbox. |
| GET  | /api/Underwrites/{id:guid}/review | `UnderwritesController.GetByIdForReviewAsync` | [Authorize] + underwrites.approve | route: id | `UnderwriteDto` 200 | |
| GET  | /api/Underwrites/{underwriteId:guid}/offers/review | `UnderwritesController.GetOffersForReviewAsync` | [Authorize] + underwrites.approve | route: underwriteId | offers-for-review list 200 | |
| GET  | /api/Underwrites/property/{propertyId:int}/open | `UnderwritesController.GetOrCreateByPropertyIdAsync` | [Authorize] + underwrites.read | route: propertyId | `UnderwriteDto` 200 | Side effect: creates on first call. |
| GET  | /api/Underwrites/{id:guid} | `UnderwritesController.GetByIdAsync` | [Authorize] + underwrites.read | route: id | `UnderwriteDto` 200 | |
| GET  | /api/Underwrites/property/{propertyId:int} | `UnderwritesController.GetByPropertyIdAsync` | [Authorize] + underwrites.read | route: propertyId | `UnderwriteDto` 200 / 404 | |
| POST | /api/Underwrites | `UnderwritesController.CreateAsync` | [Authorize] + underwrites.create | body: `CreateUnderwriteDto` | `UnderwriteDto` 200 | |
| PUT  | /api/Underwrites/{id:guid} | `UnderwritesController.UpdateAsync` | [Authorize] + underwrites.update | route: id, body: `UpdateUnderwriteDto` | `UnderwriteDto` 200 | |
| DELETE | /api/Underwrites/{id:guid} | `UnderwritesController.DeleteAsync` | [Authorize] + underwrites.delete | route: id | 204 | |
| GET  | /api/Underwrites/{underwriteId:guid}/adjustments | `UnderwritesController.GetAdjustmentsAsync` | [Authorize] + underwrites.read | route: underwriteId | comparable adjustments 200 | |
| PUT  | /api/Underwrites/{underwriteId:guid}/adjustments | `UnderwritesController.SaveAdjustmentsAsync` | [Authorize] + underwrites.update | route: underwriteId, body: `SaveComparableAdjustmentsDto` | adjustments 200 | |
| DELETE | /api/Underwrites/{underwriteId:guid}/adjustments/{adjustmentId:guid} | `UnderwritesController.DeleteAdjustmentAsync` | [Authorize] + underwrites.update | route: underwriteId, adjustmentId | 204 | |
| DELETE | /api/Underwrites/{underwriteId:guid}/adjustments | `UnderwritesController.ClearAdjustmentsAsync` | [Authorize] + underwrites.update | route: underwriteId | 204 | |
| GET  | /api/Underwrites/{underwriteId:guid}/notes | `UnderwritesController.GetNotesAsync` | [Authorize] + underwrites.read | route: underwriteId | notes list 200 | |
| POST | /api/Underwrites/{underwriteId:guid}/notes | `UnderwritesController.AddNoteAsync` | [Authorize] + underwrites.update | route: underwriteId, body: `CreateComparableNoteDto` | note 200 | Derives authorName/authorInitials from `name` claim. |
| DELETE | /api/Underwrites/{underwriteId:guid}/notes/{noteId:guid} | `UnderwritesController.DeleteNoteAsync` | [Authorize] + underwrites.update | route: underwriteId, noteId | 204 | |
| GET  | /api/Underwrites/{underwriteId:guid}/selected-comparables | `UnderwritesController.GetSelectedComparablesAsync` | [Authorize] + underwrites.read | route: underwriteId | selected comparables 200 | |
| PUT  | /api/Underwrites/{underwriteId:guid}/selected-comparables | `UnderwritesController.SaveSelectedComparablesAsync` | [Authorize] + underwrites.update | route: underwriteId, body: `List<SelectedComparableDto>` | 204 | |
| GET  | /api/Underwrites/{underwriteId:guid}/offers | `UnderwritesController.GetOffersAsync` | [Authorize] + underwrites.read | route: underwriteId | offers list 200 | |
| GET  | /api/Underwrites/{underwriteId:guid}/offers/{offerId:guid} | `UnderwritesController.GetOfferByIdAsync` | [Authorize] + underwrites.read | route: underwriteId, offerId | offer 200 | |
| POST | /api/Underwrites/{underwriteId:guid}/offers/generate | `UnderwritesController.GenerateOffersAsync` | [Authorize] + underwrites.update | route: underwriteId | generated offers 200 | |
| POST | /api/Underwrites/{underwriteId:guid}/offers | `UnderwritesController.CreateOfferAsync` | [Authorize] + underwrites.update | route: underwriteId, body: `SaveUnderwriteOfferDto` | offer 200 | |
| PUT  | /api/Underwrites/{underwriteId:guid}/offers/{offerId:guid} | `UnderwritesController.UpdateOfferAsync` | [Authorize] + underwrites.update | route: underwriteId, offerId, body: `SaveUnderwriteOfferDto` | offer 200 | |
| DELETE | /api/Underwrites/{underwriteId:guid}/offers/{offerId:guid} | `UnderwritesController.DeleteOfferAsync` | [Authorize] + underwrites.update | route: underwriteId, offerId | 204 | |
| POST | /api/Underwrites/{underwriteId:guid}/offers/submit | `UnderwritesController.SubmitOffersForApprovalAsync` | [Authorize] + underwrites.update | route: underwriteId, body: `SubmitOffersForApprovalDto` | submit result 200 | |
| POST | /api/Underwrites/{underwriteId:guid}/offers/{offerId:guid}/approve | `UnderwritesController.ApproveOfferAsync` | [Authorize] + underwrites.approve | route: underwriteId, offerId | offer 200 | |
| POST | /api/Underwrites/{underwriteId:guid}/offers/{offerId:guid}/reject | `UnderwritesController.RejectOfferAsync` | [Authorize] + underwrites.approve | route: underwriteId, offerId | offer 200 | |
| GET  | /api/Underwrites/{underwriteId:guid}/offers/{offerId:guid}/history | `UnderwritesController.GetOfferHistoryAsync` | [Authorize] + underwrites.read | route: underwriteId, offerId | history list 200 | |
| GET  | /api/Underwrites/{underwriteId:guid}/offers/validate-publish | `UnderwritesController.ValidatePublishAsync` | [Authorize] + underwrites.read | route: underwriteId | validation result 200 | |
| POST | /api/Underwrites/{underwriteId:guid}/offers/publish | `UnderwritesController.PublishOffersAsync` | [Authorize] + underwrites.update | route: underwriteId | publish result 200 | **Writes to `OffervanaDbContext`** via `PublishOffersToOffervanaCommand` (MediatR) in the service. |
| GET  | /api/Underwrites/{underwriteId:guid}/offer-notes | `UnderwritesController.GetOfferNotesAsync` | [Authorize] + underwrites.read | route: underwriteId | notes list 200 | |
| POST | /api/Underwrites/{underwriteId:guid}/offer-notes | `UnderwritesController.AddOfferNoteAsync` | [Authorize] + underwrites.update | route: underwriteId, body: `CreateOfferNoteDto` | note 200 | |
| DELETE | /api/Underwrites/{underwriteId:guid}/offer-notes/{noteId:guid} | `UnderwritesController.DeleteOfferNoteAsync` | [Authorize] + underwrites.update | route: underwriteId, noteId | 204 | |

### Legacy / Offers / IBuyerOffer (Offervana read-through)

| Method | Route | Handler | Auth | Request | Response | Notes |
|--------|-------|---------|------|---------|----------|-------|
| GET  | /api/legacy/Agent/{id:int} | `AgentController.GetById` (`TradeInHoldings.Api/Controllers/Legacy/Agent/AgentController.cs`) | [Authorize] (no permission) | route: id (int) | agent dto 200 / 404 (AGENT_NOT_FOUND) | MediatR: `GetAgentByIdQuery`. Reads `OffervanaDbContext`. |
| GET  | /api/legacy/Agent/by-property/{propertyId:int} | `AgentController.GetByPropertyId` | [Authorize] (no permission) | route: propertyId (int) | agent dto 200 / 404 | MediatR: `GetAgentByPropertyIdQuery`. Traverses Property→Customer→Agent chain in Offervana. |
| GET  | /api/legacy/IBuyerOffer/by-property/{propertyId:int} | `IBuyerOfferController.GetByPropertyId` (`TradeInHoldings.Api/Controllers/Legacy/IBuyerOffer/IBuyerOfferController.cs`) | [Authorize] (no permission) | route: propertyId (int) | offers list 200 | MediatR: `GetIBuyerOffersByPropertyIdQuery`. Reads `OffervanaDbContext` (non-deleted iBuyer offers only). |

### ZIP Integration (read-through to Investor Portal DB)

| Method | Route | Handler | Auth | Request | Response | Notes |
|--------|-------|---------|------|---------|----------|-------|
| GET  | /api/ZipUser | `ZipUserController.GetZipUsers` (`TradeInHoldings.Api/Controllers/Zip/ZipUserController.cs`) | [Authorize] (no permission) | query: `ZipUsersFilterDto` | `PaginatedResult<ZipUserDto>` 200 | MediatR: `GetZipUsersQuery`. Reads `InvestorPortalDbContext.Users` directly (cross-database, not an HTTP call). |

### Shared Utilities

| Method | Route | Handler | Auth | Request | Response | Notes |
|--------|-------|---------|------|---------|----------|-------|
| GET  | /api/SharedUtils/States | `SharedUtilsController.GetUsStates` (`TradeInHoldings.Api/Controllers/Shared/SharedUtilsController.cs`) | [Authorize] (no permission) | — | `List<dynamic>` 200 `{ index, name, desc }` | Static enum projection of `UsState` (Domain). No DbContext touched. |
