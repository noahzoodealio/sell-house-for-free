---
artifact: api-catalog
service: investor-portal
commit-sha: fa73b99cc3cccda1c404ea03329df9b99c3469f1
generated-at: 2026-04-15T00:00:00Z
endpoint-count: 139
---

# Zoodealio Investor Portal (ZIP) - Complete API Catalog

**Generated:** 2026-04-15  
**Service:** ZoodealioInvestorPortal.Api  
**Framework:** ASP.NET Core 10 with JWT Bearer Authentication  
**OpenAPI/Swagger:** Scalar reference at `/scalar-open` and `/scalar`

## Global Configuration

- **Default Authentication Scheme:** JWT Bearer
- **Token Validation:**
  - Issuer: Configured via `Application:Issuer`
  - Audience: Configured via `Application:Audience`
  - Signing Key: HS256 (Symmetric) via `Application:Token`
  - Validates: Issuer, Audience, Lifetime, Signature
- **CORS Policy:** `AllowAngularApp`
  - Allowed Origins: Configurable via `Cors:AllowedOrigins` (defaults: `http://localhost:4200`, `http://localhost:4600`, and HTTPS variants)
  - Allows: Any header, any method, credentials
  - Preflight cache: 1 hour
- **Rate Limiting:**
  - `forgotPassword`: 3 requests per 15 minutes (status 429)
  - Queue processing: FIFO
- **Global Exception Filter:** `UserFriendlyExceptionFilter` applied to all controllers
- **API Versioning:** None (all endpoints under `/api/` prefix)
- **Route Prefix:** `[Route("api/[controller]")]` for most controllers
- **Special Route Prefixes:**
  - `OuterApi` controllers use `openapi/[controller]`
  - `UserTenancyController` uses `api/user-tenancy`

---

## Endpoint Count Summary

| Functional Area | Endpoint Count |
|---|---|
| Authentication & Authorization | 9 |
| Access Control & Collaboration | 11 |
| User Management | 9 |
| User Tenancy | 5 |
| Profile Management | 6 |
| Property Management | 15 |
| Offer Management | 21 |
| Buybox Management | 7 |
| Company Management | 7 |
| Compliance Management | 8 |
| Enterprise Analytics | 6 |
| File Management | 7 |
| Terms & Conditions | 2 |
| OpenAPI (External) | 19 |
| Example/Reference | 6 |
| **TOTAL** | **139** |

---

## Authentication & Authorization (9 endpoints)

### POST /api/auth/register
- **Handler:** `AuthController.RegisterAsync()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Auth/AuthController.cs`
- **Auth:** `[AllowAnonymous]`
- **Request:** Body `CreateUserDto` (email, password, role, company, etc.)
- **Response:** 200 OK → `UserDto`
- **Behavior:** Registers a new user; rejects `Role.Enterprise` (must use dedicated endpoint)
- **Side Effects:** Creates user in database, sends verification email (implied)
- **Integration:** DB write, possibly SendGrid email

### POST /api/auth/register-enterprise
- **Handler:** `AuthController.RegisterEnterpriseAsync()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Auth/AuthController.cs`
- **Auth:** `[AuthorizeRoles(Role.Admin)]` — Admin only
- **Request:** Body `CreateUserDto` (role forced to `Enterprise`)
- **Response:** 200 OK → `UserDto`
- **Behavior:** Admin-only endpoint to create Enterprise accounts
- **Side Effects:** DB write, email notification

### POST /api/auth/login
- **Handler:** `AuthController.LoginAsync()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Auth/AuthController.cs`
- **Auth:** `[AllowAnonymous]`
- **Request:** Body `LoginRequestDto` (email, password)
- **Response:** 200 OK → `TokenResponseDto` (accessToken, refreshToken, expiresIn)
- **Behavior:** Authenticates user, issues JWT + refresh token
- **Integration:** DB read, JWT generation

### POST /api/auth/refresh-token
- **Handler:** `AuthController.RefreshTokenAsync()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Auth/AuthController.cs`
- **Auth:** `[AllowAnonymous]`
- **Request:** Body `RefreshTokenRequestDto` (userId, refreshToken)
- **Response:** 200 OK → `TokenResponseDto`
- **Behavior:** Issues new access token if refresh token is valid
- **Integration:** DB read, JWT generation

### POST /api/auth/validate-user
- **Handler:** `AuthController.ValidateUserByTokenAsync()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Auth/AuthController.cs`
- **Auth:** `[AllowAnonymous]`
- **Request:** Body `RefreshTokenRequestDto` (userId, refreshToken)
- **Response:** 200 OK → `bool`
- **Behavior:** Validates if user session is still active
- **Integration:** DB read

### GET /api/auth/claims
- **Handler:** `AuthController.GetClaims()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Auth/AuthController.cs`
- **Auth:** `[Authorize]` — Any authenticated user
- **Request:** No body
- **Response:** 200 OK → `ClaimsInfoDto` (userId, email, username, role, allClaims[])
- **Behavior:** Returns current user's JWT claims extracted from token
- **Integration:** Token parsing (no DB call)

### GET /api/auth/refresh-claims
- **Handler:** `AuthController.RefreshClaims()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Auth/AuthController.cs`
- **Auth:** `[Authorize]` — Any authenticated user
- **Request:** No body
- **Response:** 200 OK → `ClaimsInfoDto`
- **Behavior:** Regenerates fresh claims from DB (fresher company status, primary company, tenancy)
- **Integration:** DB read (Users, CompanyUsers, Companies)

### POST /api/auth/forgot-password
- **Handler:** `AuthController.ForgotPasswordAsync()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Auth/AuthController.cs`
- **Auth:** `[AllowAnonymous]`
- **Rate Limit:** `[EnableRateLimiting("forgotPassword")]` — 3 per 15 min → 429
- **Request:** Body `ForgotPasswordRequestDto` (email)
- **Response:** 200 OK → `PasswordResetResponseDto` (message, success)
- **Behavior:** Initiates password reset; sends reset link via email
- **Side Effects:** Creates reset token in DB, sends SendGrid email
- **Integration:** DB write, SendGrid

### POST /api/auth/reset-password
- **Handler:** `AuthController.ResetPasswordAsync()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Auth/AuthController.cs`
- **Auth:** `[AllowAnonymous]`
- **Request:** Body `ResetPasswordRequestDto` (token, newPassword)
- **Response:** 200 OK → `PasswordResetResponseDto`
- **Behavior:** Resets password using reset token
- **Integration:** DB update (Users table)

### POST /api/auth/validate-reset-token
- **Handler:** `AuthController.ValidateResetTokenAsync()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Auth/AuthController.cs`
- **Auth:** `[AllowAnonymous]`
- **Request:** Body `ValidateResetTokenRequestDto` (token)
- **Response:** 200 OK → `PasswordResetResponseDto`
- **Behavior:** Validates password reset token without consuming it
- **Integration:** DB read

### POST /api/auth/change-password
- **Handler:** `AuthController.ChangePasswordAsync()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Auth/AuthController.cs`
- **Auth:** `[Authorize]` — Any authenticated user
- **Request:** Body `ChangePasswordRequestDto` (currentPassword, newPassword)
- **Response:** 200 OK → `PasswordResetResponseDto`
- **Behavior:** Authenticated user changes their password
- **Integration:** DB update (Users table)

---

## Access Control & Collaboration (11 endpoints)

### POST /api/access/invite
- **Handler:** `AccessController.Invite()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Access/AccessController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager, Role.Enterprise)]`
- **Request:** Body `InviteCollaboratorDto` (email, role, companyId, etc.)
- **Response:** 200 OK → invitation DTO
- **Behavior:** Invites collaborator/manager to company
- **Side Effects:** Creates invite in DB, sends email
- **Integration:** DB write, SendGrid email

### GET /api/access/global-invite-link/manager
- **Handler:** `AccessController.GetManagerInviteLink()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Access/AccessController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor)]`
- **Request:** No body
- **Response:** 200 OK → global invite link DTO (token, expiresAt, etc.)
- **Behavior:** Gets or creates a reusable invite link for manager recruitment
- **Integration:** DB read/write (GlobalInviteLinks)

### GET /api/access/global-invite-link/collaborator
- **Handler:** `AccessController.GetCollaboratorInviteLink()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Access/AccessController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager)]`
- **Request:** No body
- **Response:** 200 OK → global invite link DTO
- **Behavior:** Gets or creates reusable link for collaborator recruitment
- **Integration:** DB read/write (GlobalInviteLinks)

### GET /api/access/global-invite-link/investor
- **Handler:** `AccessController.GetInvestorInviteLink()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Access/AccessController.cs`
- **Auth:** `[AuthorizeRoles(Role.Enterprise)]`
- **Request:** No body
- **Response:** 200 OK → global invite link DTO
- **Behavior:** Enterprise creates reusable link for investor recruitment
- **Integration:** DB read/write (GlobalInviteLinks)

### GET /api/access/global-invite-info
- **Handler:** `AccessController.GetGlobalInviteInfo()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Access/AccessController.cs`
- **Auth:** `[AllowAnonymous]`
- **Query Params:** `token` (string)
- **Response:** 200 OK → invite info DTO (invitee email, inviter company, etc.)
- **Behavior:** Retrieves info about a global invite link before accepting
- **Integration:** DB read (GlobalInviteLinks)

### POST /api/access/global-invite-accept
- **Handler:** `AccessController.AcceptGlobalInvite()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Access/AccessController.cs`
- **Auth:** `[AllowAnonymous]`
- **Request:** Body `AcceptGlobalInviteDto` (token, firstName, lastName, password, email, etc.)
- **Response:** 200 OK
- **Behavior:** New user accepts global invite, creates account in one step
- **Side Effects:** Creates user and company relationship
- **Integration:** DB write, possibly email

### POST /api/access/global-invite-accept/authenticated
- **Handler:** `AccessController.AcceptGlobalInviteAuthenticated()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Access/AccessController.cs`
- **Auth:** `[Authorize]`
- **Request:** Body `AcceptGlobalInviteAuthenticatedDto` (token)
- **Response:** 200 OK
- **Behavior:** Authenticated user accepts global invite (adds company role)
- **Integration:** DB write

### GET /api/access/hierarchy
- **Handler:** `AccessController.GetHierarchy()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Access/AccessController.cs`
- **Auth:** `[Authorize]`
- **Request:** No body
- **Response:** 200 OK → hierarchy DTO (organizational tree)
- **Behavior:** Returns user's team hierarchy (managers, collaborators, etc.)
- **Integration:** DB read (CompanyUsers, Users)

### GET /api/access/collaborators
- **Handler:** `AccessController.GetCollaborators()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Access/AccessController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager, Role.Enterprise)]`
- **Query Params:** `pageNumber`, `pageSize`, `search`, filter fields
- **Response:** 200 OK → `PaginatedResult<CollaboratorDto>`
- **Behavior:** Lists invited/collaborating users with pagination
- **Pagination:** pageSize clamped to 1-100 (default 20)
- **Integration:** DB read (CompanyUsers, Users)

### GET /api/access/assignable-users
- **Handler:** `AccessController.GetAssignableUsers()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Access/AccessController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager)]`
- **Request:** No body
- **Response:** 200 OK → list of assignable user DTOs
- **Behavior:** Returns list of users who can be assigned properties/offers
- **Integration:** DB read (Users, CompanyUsers)

### GET /api/access/invite-info
- **Handler:** `AccessController.GetInviteInfo()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Access/AccessController.cs`
- **Auth:** `[AllowAnonymous]`
- **Query Params:** `token` (string)
- **Response:** 200 OK → invite info DTO
- **Behavior:** Info about company-specific invite before acceptance
- **Integration:** DB read (CompanyInvites)

### POST /api/access/accept-with-password
- **Handler:** `AccessController.AcceptWithPassword()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Access/AccessController.cs`
- **Auth:** `[AllowAnonymous]`
- **Request:** Body `AcceptInviteWithPasswordDto` (token, firstName, lastName, password)
- **Response:** 200 OK
- **Behavior:** New user creates account via company invite
- **Integration:** DB write (Users, CompanyUsers)

### POST /api/access/invite-accept/authenticated
- **Handler:** `AccessController.AcceptInviteAuthenticated()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Access/AccessController.cs`
- **Auth:** `[Authorize]`
- **Request:** Body `AcceptInviteAuthenticatedDto` (token)
- **Response:** 200 OK
- **Behavior:** Existing user accepts company-specific invite
- **Integration:** DB write (CompanyUsers)

### POST /api/access/collaborators/{id:guid}/reactivate
- **Handler:** `AccessController.ReactivateCollaborator()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Access/AccessController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager)]`
- **Route Params:** `id` (Guid)
- **Response:** 200 OK
- **Behavior:** Reactivates a deactivated collaborator
- **Integration:** DB update (CompanyUsers)

### POST /api/access/collaborators/{id:guid}/deactivate
- **Handler:** `AccessController.DeactivateCollaborator()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Access/AccessController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager)]`
- **Route Params:** `id` (Guid)
- **Response:** 200 OK
- **Behavior:** Soft-deletes collaborator (deactivates)
- **Integration:** DB update (CompanyUsers)

### DELETE /api/access/collaborators/{id:guid}
- **Handler:** `AccessController.DeleteCollaborator()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Access/AccessController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager)]`
- **Route Params:** `id` (Guid)
- **Response:** 200 OK
- **Behavior:** Hard-deletes collaborator relationship
- **Integration:** DB delete (CompanyUsers)

---

## User Management (9 endpoints)

### GET /api/user
- **Handler:** `UserController.GetUsers()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/User/UserController.cs`
- **Auth:** `[AuthorizeRoles(Role.Admin)]`
- **Query Params:** `pageNumber`, `pageSize`, `lastLoginFrom`, `lastLoginTo`, search fields
- **Response:** 200 OK → `PaginatedResult<UserDto>`
- **Pagination:** pageSize clamped to 1-100 (default 20); dates normalized to 00:00:00 and 23:59:00
- **Behavior:** Admin views all users with filtering
- **Integration:** DB read (Users)

### GET /api/user/{id}
- **Handler:** `UserController.GetUser()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/User/UserController.cs`
- **Auth:** `[Authorize]`
- **Route Params:** `id` (Guid)
- **Response:** 200 OK → `UserDto`
- **Behavior:** Get user details by ID
- **Integration:** DB read (Users)

### PUT /api/user/{id}
- **Handler:** `UserController.UpdateUser()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/User/UserController.cs`
- **Auth:** `[AuthorizeRoles(Role.Admin)]`
- **Route Params:** `id` (Guid)
- **Request:** Body `UpdateUserDto`
- **Response:** 200 OK → `UserDto`
- **Behavior:** Admin updates user profile
- **Integration:** DB update (Users)

### GET /api/user/GetRoles
- **Handler:** `UserController.GetRoleEnum()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/User/UserController.cs`
- **Auth:** `[AllowAnonymous]`
- **Request:** No body
- **Response:** 200 OK → `List<EnumAsListItem>` (id, name, label for all Role enum values)
- **Behavior:** Returns available roles for UI dropdowns
- **Integration:** No DB call (enum reflection)

### GET /api/user/{userId}/GetChildren
- **Handler:** `UserController.GetChildren()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/User/UserController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager)]`
- **Route Params:** `userId` (Guid)
- **Query Params:** `pageNumber`, `pageSize`, search/filter fields
- **Response:** 200 OK → paginated list of subordinate users
- **Behavior:** Investor/AccountManager views their direct reports
- **Integration:** DB read (Users, CompanyUsers hierarchy)

### POST /api/user/GetDisplayNames
- **Handler:** `UserController.GetDisplayNames()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/User/UserController.cs`
- **Auth:** `[AllowAnonymous]`
- **Request:** Body `GetDisplayNamesInput` (userIds: List<Guid>)
- **Response:** 200 OK → `Dictionary<string, string>` (userId → displayName)
- **Behavior:** Batch lookup of user display names (email or full name)
- **Integration:** DB read (Users)

### GET /api/user/me/context
- **Handler:** `UserController.GetMyContext()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/User/UserController.cs`
- **Auth:** `[Authorize]`
- **Request:** No body
- **Response:** 200 OK → `UserContextDto` (userId, email, role, tenantIds[], companyIds[], parentCompanyIds[], primaryCompany, enterpriseName, isImpersonating, realUserId)
- **Behavior:** Current user's full context (companies, tenancies, enterprise affiliation)
- **Integration:** DB read (Users, Companies, CompanyUsers, IUserContext service)

### PATCH /api/useapi/generateUserApiKey
- **Handler:** `UserApiController.GenerateUserApiKey()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/User/UserApiController.cs`
- **Auth:** `[Authorize]`
- **Request:** No body
- **Response:** 200 OK → `Guid` (new API key)
- **Behavior:** Generates or regenerates user's API key for machine-to-machine auth
- **Integration:** DB write (Users.ApiKey)

### GET /api/useapi/openApiKey
- **Handler:** `UserApiController.GetUserApiKey()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/User/UserApiController.cs`
- **Auth:** `[Authorize]`
- **Request:** No body
- **Response:** 200 OK → `Guid?` (API key or null)
- **Behavior:** Retrieves current user's API key
- **Integration:** DB read (Users.ApiKey)

---

## User Tenancy (5 endpoints)

### GET /api/user-tenancy/{userId:guid}
- **Handler:** `UserTenancyController.GetUserTenancies()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/UserTenancy/UserTenancyController.cs`
- **Auth:** `[AuthorizeRoles(Role.Admin)]`
- **Route Params:** `userId` (Guid)
- **Response:** 200 OK → `List<UserTenancyDto>`
- **Behavior:** Admin views all tenancies assigned to a user
- **Integration:** DB read (UserTenancies, Tenants)

### POST /api/user-tenancy
- **Handler:** `UserTenancyController.AddDirectTenancy()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/UserTenancy/UserTenancyController.cs`
- **Auth:** `[AuthorizeRoles(Role.Admin)]`
- **Request:** Body `CreateUserTenancyDto` (userId, tenancyId)
- **Response:** 200 OK → `UserTenancyDto` | 409 Conflict if already exists
- **Behavior:** Admin grants direct tenancy access to user
- **Integration:** DB write (UserTenancies)

### DELETE /api/user-tenancy/{userId:guid}/{tenancyId:int}
- **Handler:** `UserTenancyController.RemoveDirectTenancy()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/UserTenancy/UserTenancyController.cs`
- **Auth:** `[AuthorizeRoles(Role.Admin)]`
- **Route Params:** `userId` (Guid), `tenancyId` (int)
- **Response:** 204 No Content | 404 Not Found
- **Behavior:** Admin removes direct tenancy access
- **Integration:** DB delete (UserTenancies)

### GET /api/user-tenancy/{userId:guid}/see-all-properties
- **Handler:** `UserTenancyController.GetCanSeeAllProperties()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/UserTenancy/UserTenancyController.cs`
- **Auth:** `[AuthorizeRoles(Role.Admin)]`
- **Route Params:** `userId` (Guid)
- **Response:** 200 OK → `{ enabled: bool }`
- **Behavior:** Checks if user can see all properties across all tenancies
- **Integration:** DB read (UserTenancies.CanSeeAllProperties)

### PUT /api/user-tenancy/{userId:guid}/see-all-properties
- **Handler:** `UserTenancyController.SetCanSeeAllProperties()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/UserTenancy/UserTenancyController.cs`
- **Auth:** `[AuthorizeRoles(Role.Admin)]`
- **Route Params:** `userId` (Guid)
- **Request:** Body `bool` (enabled)
- **Response:** 204 No Content | 404 Not Found
- **Behavior:** Admin enables/disables "see all properties" across tenancies
- **Integration:** DB update (UserTenancies)

---

## Profile Management (6 endpoints)

### GET /api/profile/getPersonalInfo
- **Handler:** `ProfileController.GetPersonalInfo()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Profile/ProfileController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager, Role.Collaborator, Role.Enterprise)]`
- **Request:** No body
- **Response:** 200 OK → `UpdatePersonalInfoDto` (firstName, lastName, email, phone, etc.)
- **Behavior:** User retrieves own personal information
- **Integration:** DB read (Users)

### PATCH /api/profile/updatePersonalInfo
- **Handler:** `ProfileController.UpdatePersonalInfo()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Profile/ProfileController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager, Role.Enterprise)]`
- **Request:** Body `UpdatePersonalInfoDto` (firstName, lastName, phone, etc.)
- **Response:** 200 OK → updated `UpdatePersonalInfoDto`
- **Behavior:** User updates own personal profile
- **Integration:** DB update (Users)

### GET /api/profile/getBusinessDetails
- **Handler:** `ProfileController.GetBusinessDetails()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Profile/ProfileController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager, Role.Collaborator)]`
- **Request:** No body
- **Response:** 200 OK → `CompanyDto` (businessName, businessType, investorType, state, etc.)
- **Behavior:** User retrieves their primary company details
- **Integration:** DB read (Companies, CompanyUsers)

### PATCH /api/profile/updateBusinessDetails
- **Handler:** `ProfileController.UpdateBusinessDetails()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Profile/ProfileController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager)]`
- **Request:** Body `UpdateBusinessDetailsDto` (businessName, businessType, investorType, etc.)
- **Response:** 200 OK → updated `CompanyDto`
- **Behavior:** User updates their company profile
- **Integration:** DB update (Companies)

### GET /api/profile/getEnterpriseBusinessName
- **Handler:** `ProfileController.GetEnterpriseBusinessName()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Profile/ProfileController.cs`
- **Auth:** `[AuthorizeRoles(Role.Enterprise)]`
- **Request:** No body
- **Response:** 200 OK → `{ businessName: string }`
- **Behavior:** Enterprise user retrieves their company name
- **Integration:** DB read (Companies)

### PATCH /api/profile/updateEnterpriseBusinessName
- **Handler:** `ProfileController.UpdateEnterpriseBusinessName()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Profile/ProfileController.cs`
- **Auth:** `[AuthorizeRoles(Role.Enterprise)]`
- **Request:** Body `UpdateEnterpriseBusinessNameDto` (businessName)
- **Response:** 200 OK → `{ businessName: string }`
- **Behavior:** Enterprise user updates company name
- **Integration:** DB update (Companies)

### PATCH /api/profile/{userId}/updateIndividualBuyerAgencyStatus
- **Handler:** `ProfileController.UpdateIndividualBuyerAgencyStatus()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Profile/ProfileController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager)]`
- **Route Params:** `userId` (Guid as string)
- **Request:** Body `bool` (agency status)
- **Response:** 200 OK
- **Behavior:** Updates individual buyer agency status (property representation)
- **Integration:** DB update (Users or Companies)

---

## Property Management (15 endpoints)

### GET /api/property
- **Handler:** `PropertyController.GetProperties()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/PropertyController.cs`
- **Auth:** `[Authorize]`
- **Query Params:** `pageNumber`, `pageSize`, `createdAfter`, `createdBefore`, address filters, state, price range, etc.
- **Response:** 200 OK → `PaginatedResult<PropertyDto>`
- **Pagination:** pageSize clamped to 1-100 (default 20); dates normalized to day boundaries
- **Behavior:** Searches properties from **Offervana LegacyData** (via SearchService)
- **Integration:** ElasticSearch or SQL query against Offervana_SaaS OffervanaDb
- **Note:** Calls `searchService.GetPropertiesFromSearch()`

### GET /api/property/{id:int}
- **Handler:** `PropertyController.GetPropertyById()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/PropertyController.cs`
- **Auth:** `[Authorize]`
- **Route Params:** `id` (int)
- **Response:** 200 OK → `PropertyDto`
- **Behavior:** Fetches single property details (MediatR: `GetPropertyByIdQuery`)
- **Integration:** DB read (Offervana LegacyData)

### GET /api/property/coordinates
- **Handler:** `PropertyController.GetPropertyByCoordinates()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/PropertyController.cs`
- **Auth:** `[Authorize]`
- **Query Params:** `latitude` (decimal), `longitude` (decimal)
- **Response:** 200 OK → `PropertyDto`
- **Behavior:** Finds property by GPS coordinates (MediatR: `GetPropertyByCoordinatesQuery`)
- **Integration:** DB read with geo-spatial query

### GET /api/property/statemap
- **Handler:** `PropertyController.GetPropertiesStateMap()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/PropertyController.cs`
- **Auth:** `[Authorize]`
- **Query Params:** Same as `/api/property` (PropertyFilterDto)
- **Response:** 200 OK → `List<StateCountDto>` (state, count, etc.)
- **Behavior:** Property count aggregated by state (map visualization data)
- **Integration:** SearchService aggregation query

### GET /api/property/heatmap
- **Handler:** `PropertyController.GetPropertiesHeatMap()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/PropertyController.cs`
- **Auth:** `[Authorize]`
- **Query Params:** PropertyFilterDto
- **Response:** 200 OK → `List<HeatmapResultDto>` (lat, lng, value for heatmap overlay)
- **Behavior:** Returns lat/lng/value tuples for heatmap visualization
- **Integration:** SearchService

### GET /api/property/realvaluemap
- **Handler:** `PropertyController.GetPropertiesRealvalueMap()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/PropertyController.cs`
- **Auth:** `[Authorize]`
- **Query Params:** PropertyFilterDto
- **Response:** 200 OK → `List<HeatmapResultDto>`
- **Behavior:** Heatmap of property values (as-is or after-repair-value)
- **Integration:** SearchService

### GET /api/property/photos
- **Handler:** `PropertyController.GetPropertiesPhotos()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/PropertyController.cs`
- **Auth:** `[Authorize]`
- **Query Params:** `propertyIds` (List<int>)
- **Response:** 200 OK → `Dictionary<int, List<CloudinaryFileOutput>>` (propertyId → photos)
- **Behavior:** Batch fetch property photos from Cloudinary
- **Integration:** Cloudinary API call

### GET /api/property/propertyStatus
- **Handler:** `PropertyController.GetPropertyStatus()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/PropertyController.cs`
- **Auth:** `[AllowAnonymous]`
- **Request:** No body
- **Response:** 200 OK → `List<EnumAsListItem>` (property status enum: Available, Under Contract, Sold, etc.)
- **Behavior:** Returns property status enum for UI dropdowns
- **Integration:** No DB call (enum reflection)

### GET /api/property/propertyStatusById
- **Handler:** `PropertyController.GetPropertyStatusById()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/PropertyController.cs`
- **Auth:** `[Authorize]`
- **Query Params:** `propertyIds` (List<int>)
- **Response:** 200 OK → `List<PropertyStatusDto>` (propertyId, status)
- **Behavior:** Batch fetch property status for multiple properties
- **Integration:** DB read (property status via PropService)

### GET /api/property/offerStatuses
- **Handler:** `PropertyController.GetOfferStatuses()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/PropertyController.cs`
- **Auth:** `[AllowAnonymous]`
- **Request:** No body
- **Response:** 200 OK → `List<OfferStatusDto>`
- **Behavior:** Returns all offer status enum values
- **Integration:** No DB call (enum reflection via MediatR query)

### POST /api/property/detailsByAddress
- **Handler:** `PropertyController.GetDetailsByAddress()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/PropertyController.cs`
- **Auth:** `[Authorize]`
- **Request:** Body `AddressDetailsRequest` (address1, city, stateCd, zipCode)
- **Response:** 200 OK → `BlastSurveyModel` (property details: beds, baths, sqft, price, ARV, etc.) | 400 if address incomplete
- **Behavior:** Enriches address with property details from external service (ATTOM/BLAST Survey)
- **Integration:** PropService calls external property API

### PATCH /api/property/{id:int}
- **Handler:** `PropertyController.PatchProperty()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/PropertyController.cs`
- **Auth:** `[AuthorizeRoles(Role.Admin)]`
- **Route Params:** `id` (int)
- **Request:** Body `SurveyModel` (property survey data)
- **Response:** 204 No Content
- **Behavior:** Admin patches property survey data (MediatR: `PatchPropertyCommand`)
- **Integration:** DB update (Offervana LegacyData)

### POST /api/property/{id:int}/files
- **Handler:** `PropertyController.UploadPropertyFiles()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/PropertyController.cs`
- **Auth:** `[Authorize]`
- **Route Params:** `id` (int)
- **Form Params:** `files` (IFormFileCollection), `label` (optional string)
- **Response:** 200 OK → `List<CloudinaryFileOutput>` (uploaded files)
- **Behavior:** Uploads property photos/documents to Cloudinary
- **Integration:** Cloudinary API

### DELETE /api/property/{id:int}/files
- **Handler:** `PropertyController.DeletePropertyFile()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/PropertyController.cs`
- **Auth:** `[Authorize]`
- **Route Params:** `id` (int)
- **Query Params:** `publicId` (string, Cloudinary public ID)
- **Response:** 200 OK → `{ message: "File successfully deleted" }` | 404 if file not found | 400 if publicId missing
- **Behavior:** Deletes property file from Cloudinary
- **Integration:** Cloudinary API

### PUT /api/property/{id:int}/files
- **Handler:** `PropertyController.ReplacePropertyFile()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/PropertyController.cs`
- **Auth:** `[Authorize]`
- **Route Params:** `id` (int)
- **Form Params:** `file` (IFormFile), `publicId` (query param, string), `label` (optional query param)
- **Response:** 200 OK → `CloudinaryFileOutput` | 400 if file or publicId missing
- **Behavior:** Replaces/updates property file on Cloudinary
- **Integration:** Cloudinary API

### POST /api/property/{propertyId:int}/updateVisibility
- **Handler:** `PropertyController.UpdatePropertyVisibility()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/PropertyController.cs`
- **Auth:** `[Authorize]`
- **Route Params:** `propertyId` (int)
- **Request:** Body `bool` (isHidden)
- **Response:** 204 No Content
- **Behavior:** User hides/unhides property from their view (MediatR: `PropertyVisibilityCommand`)
- **Integration:** DB write (PropertyVisibility or UserPropertyVisibility)

### POST /api/property/{propertyId:int}/updateWatchlist
- **Handler:** `PropertyController.UpdatePropertyWatchlist()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/PropertyController.cs`
- **Auth:** `[Authorize]`
- **Route Params:** `propertyId` (int)
- **Request:** Body `bool` (state: true to add, false to remove)
- **Response:** 204 No Content
- **Behavior:** Add/remove property to user's watchlist (MediatR: `PropertyWatchlistCommand`)
- **Integration:** DB write (PropertyWatchlist)

---

## Offer Management (21 endpoints)

### POST /api/offer
- **Handler:** `OfferController.CreateOffer()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs`
- **Auth:** `[Authorize]`
- **Request:** Body `CreateOfferDto` (propertyId, price, downPayment, repairBudget, etc.)
- **Response:** 200 OK → `int` (offerId)
- **Behavior:** User creates new offer on property (MediatR: `CreateOfferCommand`)
- **Side Effects:** Creates offer in DB, may trigger notifications
- **Integration:** DB write, possible SendGrid/Temporal triggers

### GET /api/offer
- **Handler:** `OfferController.GetOffers()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs`
- **Auth:** `[Authorize]`
- **Query Params:** `pageNumber`, `pageSize`, filters (status, dateRange, propertyId, etc.)
- **Response:** 200 OK → `PaginatedResult<OfferDto>`
- **Pagination:** Default 20 per page
- **Behavior:** Lists user's offers with filtering (MediatR: `GetOffersQuery`)
- **Integration:** DB read (Offers, Properties, Users)

### PUT /api/offer
- **Handler:** `OfferController.UpdateOffer()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs`
- **Auth:** `[Authorize]`
- **Request:** Body `JsonElement` (dynamic offer data for flexible updates)
- **Response:** 200 OK → `OfferDto`
- **Behavior:** Updates offer details (MediatR: `EditOfferCommand`)
- **Integration:** DB update

### DELETE /api/offer
- **Handler:** `OfferController.DeleteOffer()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs`
- **Auth:** `[Authorize]`
- **Request:** Body `DeleteOfferDto` (offerId)
- **Response:** 200 OK → `bool` (success)
- **Behavior:** Deletes offer (soft or hard delete per business logic)
- **Integration:** DB delete/update

### GET /api/offer/{id}
- **Handler:** `OfferController.GetOfferById()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs`
- **Auth:** `[Authorize]`
- **Route Params:** `id` (int)
- **Response:** 200 OK → `OfferDto`
- **Behavior:** Retrieves single offer summary (MediatR: `GetOfferByIdQuery`)
- **Integration:** DB read

### GET /api/offer/{id}/details
- **Handler:** `OfferController.GetOfferDetails()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs`
- **Auth:** `[Authorize]`
- **Route Params:** `id` (int)
- **Response:** 200 OK → full offer details DTO (MediatR: `GetOfferDetailsByIdQuery`)
- **Behavior:** Detailed offer data with property, user, counter-offer info
- **Integration:** DB read (complex JOIN query)

### GET /api/offer/{id}/history
- **Handler:** `OfferController.GetOfferHistory()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs`
- **Auth:** `[Authorize]`
- **Route Params:** `id` (int)
- **Response:** 200 OK → `OfferHistoryDto` (timestamps, status changes, counter offers)
- **Behavior:** Audit trail of offer modifications and communications
- **Integration:** DB read (OfferHistory table or event sourcing)

### GET /api/offer/{id}/pdf-context
- **Handler:** `OfferController.GetOfferPdfContext()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs`
- **Auth:** `[Authorize]`
- **Route Params:** `id` (int)
- **Response:** 200 OK → `OfferPdfDto` (all data needed for PDF generation)
- **Behavior:** Returns data to render offer as PDF (to send to Offervana/buyer)
- **Integration:** DB read (comprehensive)

### POST /api/offer/NotifyInvestorOnOfferStatusChange
- **Handler:** `OfferController.NotifyInvestorOnOfferStatusChange()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs`
- **Auth:** `[AllowAnonymous]` (TODO: should require API key or message bus token)
- **Request:** Body `int` (offerId)
- **Response:** 200 OK
- **Behavior:** **Called by Offervana_SaaS** when offer status changes; sends email to investor
- **Side Effects:** SendGrid email notification
- **Integration:** SendGrid email, DB read (Offer, User email)

### POST /api/offer/NotifyInvestorOnOfferAccepted
- **Handler:** `OfferController.NotifyInvestorOnOfferAccepted()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs`
- **Auth:** `[AllowAnonymous]` (TODO: should be secured)
- **Request:** Body `int` (offerId)
- **Response:** 200 OK
- **Behavior:** **Called by Offervana_SaaS** when offer accepted by buyer; notifies investor
- **Side Effects:** SendGrid email
- **Integration:** DB read, SendGrid

### POST /api/offer/NotifyTeamOnOfferAccepted
- **Handler:** `OfferController.NotifyTeamOnOfferAccepted()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs`
- **Auth:** `[AllowAnonymous]` (TODO: should be secured)
- **Request:** Body `int` (offerId)
- **Response:** 200 OK
- **Behavior:** **Called by Offervana_SaaS**; notifies investor's team of acceptance
- **Side Effects:** SendGrid email to team members
- **Integration:** DB read, SendGrid

### POST /api/offer/NotifyUsersBuyboxMatchEmailAsync
- **Handler:** `OfferController.NotifyUsersBuyboxMatchEmailAsync()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs`
- **Auth:** `[AllowAnonymous]` (TODO: should be secured)
- **Request:** Body `int` (offerId)
- **Response:** 200 OK
- **Behavior:** **Deprecated** (superseded by batch endpoint); single buybox match notification
- **Deprecated:** Use `NotifyUsersBuyboxMatchBatch` instead
- **Integration:** DB read, SendGrid

### POST /api/offer/NotifyUsersBuyboxMatchBatch
- **Handler:** `OfferController.NotifyUsersBuyboxMatchBatch()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs`
- **Auth:** `[AllowAnonymous]` (TODO: should be secured)
- **Request:** Body `NotifyUsersBuyboxMatchBatchRequest` (propertyId, offerIds: List<int>)
- **Response:** 200 OK | 400 if propertyId ≤ 0 or offerIds empty
- **Behavior:** **Called by Offervana_SaaS** (consolidated 15-min batch); sends "New BuyBox Match" email per property
- **Behavior:** Consolidates multiple offers on same property into one email per 15 min
- **Side Effects:** SendGrid batch email
- **Integration:** DB read, SendGrid

### POST /api/offer/postQueue
- **Handler:** `OfferController.PostQueue()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs`
- **Auth:** `[AllowAnonymous]`
- **Request:** No body
- **Response:** 200 OK
- **Behavior:** **Test endpoint** — publishes test message to Service Bus queue (hardcoded "superBebra", "testQueue")
- **Integration:** Azure Service Bus
- **Note:** Likely for development/debugging only

### GET /api/offer/offerStatusMyOffers
- **Handler:** `OfferController.GetOfferStatusMyOffers()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs`
- **Auth:** `[Authorize]`
- **Request:** No body
- **Response:** 200 OK → status summary (count by status)
- **Behavior:** User's offer status breakdown (pending, accepted, rejected, etc.)
- **Integration:** DB read

### PATCH /api/offer/offerStatus/{offerId}
- **Handler:** `OfferController.UpdateOfferStatus()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs`
- **Auth:** `[Authorize]`
- **Route Params:** `offerId` (int)
- **Request:** Body `OfferStatusRequestDto` (newStatus, reason, etc.)
- **Response:** 200 OK → `bool` (success)
- **Behavior:** User updates offer status (accept, reject, etc.)
- **Integration:** DB update, may trigger notifications

### GET /api/offer/offerActivity
- **Handler:** `OfferController.GetOfferActivityList()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs`
- **Auth:** `[Authorize]`
- **Query Params:** `monthCount` (int, e.g., 3 for last 3 months)
- **Response:** 200 OK → `OfferActivityResponseDto` (timeline of offer activities)
- **Behavior:** User's offer activity dashboard (last N months)
- **Integration:** DB read

### GET /api/offer/topLocations
- **Handler:** `OfferController.GetTopLocations()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs`
- **Auth:** `[Authorize]`
- **Request:** No body
- **Response:** 200 OK → `List<TopLocationsDto>` (state/city, offer count, etc.)
- **Behavior:** Top locations by offer volume for user
- **Integration:** DB read (aggregation query)

### GET /api/offer/offerPropertyCount
- **Handler:** `OfferController.GetOfferPropertyCount()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs`
- **Auth:** `[Authorize]`
- **Request:** No body
- **Response:** 200 OK → `OfferPropertyCountDto` (totalProperties, offeredOn, etc.)
- **Behavior:** Count of properties user viewed vs. made offers on
- **Integration:** DB read (aggregation)

### POST /api/offer/respondToCounter
- **Handler:** `OfferController.RespondToCounter()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs`
- **Auth:** `[Authorize]`
- **Request:** Body `RespondToCounterInput` (offerId, newPrice, etc.)
- **Response:** 200 OK → `OfferDto` (updated offer)
- **Behavior:** User responds to seller's counter-offer with new bid
- **Integration:** DB update, notifications

### GET /api/offer/getOfferNotes
- **Handler:** `OfferController.GetOfferNotes()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs`
- **Auth:** `[Authorize]`
- **Query Params:** `offerId` (int)
- **Response:** 200 OK → `List<OfferNoteDto>` (internal notes/comments)
- **Behavior:** User's internal notes on offer
- **Integration:** DB read (OfferNotes table)

### POST /api/offer/{id:int}/comparables-analysis
- **Handler:** `OfferController.UploadComparablesAnalysis()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs`
- **Auth:** `[Authorize]`
- **Route Params:** `id` (int, offerId)
- **Form Params:** `file` (IFormFile, PDF or doc)
- **Consumes:** `multipart/form-data`
- **Request Size Limit:** 21 MB
- **Response:** 200 OK
- **Behavior:** Uploads comparables analysis document for offer
- **Integration:** Cloudinary or blob storage, DB reference

### POST /api/offer/{id:int}/offer-explainer
- **Handler:** `OfferController.UploadOfferExplainer()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs`
- **Auth:** `[Authorize]`
- **Route Params:** `id` (int, offerId)
- **Form Params:** `file` (IFormFile)
- **Consumes:** `multipart/form-data`
- **Request Size Limit:** 21 MB
- **Response:** 200 OK
- **Behavior:** Uploads offer explainer document (investor's pitch/rationale)
- **Integration:** Blob storage, DB reference

### GET /api/offer/{id:int}/document-details
- **Handler:** `OfferController.GetOfferDocumentDetails()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs`
- **Auth:** `[Authorize]`
- **Route Params:** `id` (int, offerId)
- **Response:** 200 OK → `OfferDocumentDetailsDto` (document metadata, URLs, etc.)
- **Behavior:** Lists attached documents' details (comparables, explainer, etc.)
- **Integration:** DB read

### GET /api/offer/{id:int}/files
- **Handler:** `OfferController.GetOfferFiles()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs`
- **Auth:** `[Authorize]`
- **Route Params:** `id` (int, offerId)
- **Response:** 200 OK → `OfferFilesListDto` (list of file metadata)
- **Behavior:** Lists all files attached to offer
- **Integration:** DB read

### POST /api/offer/{id:int}/files
- **Handler:** `OfferController.UploadOfferFile()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs`
- **Auth:** `[Authorize]`
- **Route Params:** `id` (int, offerId)
- **Form Params:** `file` (IFormFile), `label` (optional query param)
- **Consumes:** `multipart/form-data`
- **Request Size Limit:** 21 MB
- **Response:** 200 OK
- **Behavior:** Uploads generic file attachment to offer
- **Integration:** Blob storage, DB record

### DELETE /api/offer/{id:int}/files
- **Handler:** `OfferController.DeleteOfferFiles()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/OfferController.cs`
- **Auth:** `[Authorize]`
- **Route Params:** `id` (int, offerId)
- **Request:** Body `DeleteOfferFilesRequestDto` (fileIds: List<Guid>)
- **Response:** 200 OK
- **Behavior:** Deletes multiple files from offer
- **Integration:** Blob storage delete, DB update

---

## Buybox Management (7 endpoints)

### GET /api/buybox
- **Handler:** `BuyboxController.GetBuyboxes()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Buybox/BuyboxController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager, Role.Collaborator)]`
- **Query Params:** `pageNumber`, `pageSize`, filter fields (name, minPrice, maxPrice, property types, states)
- **Response:** 200 OK → `PaginatedResult<BuyboxDto>`
- **Pagination:** Default 20 per page
- **Behavior:** Lists user's buybox criteria (search templates)
- **Integration:** DB read (BuyboxCriteria or equivalent)

### GET /api/buybox/{id}
- **Handler:** `BuyboxController.GetBuyboxById()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Buybox/BuyboxController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager, Role.Collaborator)]`
- **Route Params:** `id` (Guid)
- **Response:** 200 OK → `BuyboxDto`
- **Behavior:** Retrieves single buybox details
- **Integration:** DB read

### POST /api/buybox
- **Handler:** `BuyboxController.CreateBuybox()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Buybox/BuyboxController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager, Role.Collaborator)]`
- **Request:** Body `CreateBuyboxDto` (name, criteria: min/max price, property types, states, etc.)
- **Response:** 204 No Content (no return body)
- **Behavior:** Creates new buybox criteria set
- **Integration:** DB write (BuyboxCriteria)

### PUT /api/buybox/{id}
- **Handler:** `BuyboxController.UpdateBuybox()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Buybox/BuyboxController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager)]`
- **Route Params:** `id` (Guid)
- **Request:** Body `UpdateBuyboxDto`
- **Response:** 200 OK → `BuyboxDto`
- **Behavior:** Updates buybox criteria
- **Integration:** DB update

### DELETE /api/buybox/{id}
- **Handler:** `BuyboxController.DeleteBuybox()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Buybox/BuyboxController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager, Role.Collaborator)]`
- **Route Params:** `id` (Guid)
- **Response:** 200 OK
- **Behavior:** Deletes buybox
- **Integration:** DB delete

### GET /api/buybox/PropertyType
- **Handler:** `BuyboxController.GetPropertyTypeEnum()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Buybox/BuyboxController.cs`
- **Auth:** `[AllowAnonymous]`
- **Request:** No body
- **Response:** 200 OK → `List<EnumAsListItem>` (Residential, Commercial, MultiFamily, etc.)
- **Behavior:** Returns property type enum for UI
- **Integration:** No DB call (enum reflection)

---

## Company Management (7 endpoints)

### GET /api/company
- **Handler:** `CompanyController.GetCompanies()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Company/CompanyController.cs`
- **Auth:** `[AuthorizeRoles(Role.Admin)]`
- **Query Params:** `pageNumber`, `pageSize`, `lastLoginFrom`, `lastLoginTo`, search/filter
- **Response:** 200 OK → `PaginatedResult<CompanyDto>`
- **Pagination:** pageSize clamped 1-100 (default 20); date normalization
- **Behavior:** Admin views all companies with pagination
- **Integration:** DB read (Companies)

### GET /api/company/{id}
- **Handler:** `CompanyController.GetCompany()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Company/CompanyController.cs`
- **Auth:** `[Authorize]`
- **Route Params:** `id` (Guid)
- **Response:** 200 OK → `CompanyDto`
- **Behavior:** Authenticated user views company details
- **Integration:** DB read (Companies)

### PUT /api/company/{id}
- **Handler:** `CompanyController.UpdateCompany()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Company/CompanyController.cs`
- **Auth:** `[AuthorizeRoles(Role.Admin)]`
- **Route Params:** `id` (Guid)
- **Request:** Body `UpdateCompanyDto`
- **Response:** 200 OK → `CompanyDto`
- **Behavior:** Admin updates company profile
- **Integration:** DB update (Companies)

### PATCH /api/company/SetAccreditatedInvestor
- **Handler:** `CompanyController.SetAccreditatedInvestor()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Company/CompanyController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.Admin)]`
- **Query Params:** `selectedOption` (bool)
- **Response:** 200 OK
- **Behavior:** User declares accredited investor status
- **Integration:** DB update (Companies.IsAccreditedInvestor)

### PATCH /api/company/UpdateActiveStatus
- **Handler:** `CompanyController.UpdateCompanyActiveStatus()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Company/CompanyController.cs`
- **Auth:** `[AuthorizeRoles(Role.Admin)]`
- **Request:** Body `UpdateCompanyActiveStatusDto` (companyId, newStatus: Pending/Approved/Rejected/Suspended)
- **Response:** 200 OK
- **Behavior:** Admin updates company approval status
- **Integration:** DB update (Companies.IsActive)

### PATCH /api/company/SetIsAgreedToTermsAndConditions
- **Handler:** `CompanyController.SetIsAgreedToTermsAndConditions()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Company/CompanyController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.Admin)]`
- **Query Params:** `isAgreed` (bool)
- **Response:** 200 OK
- **Behavior:** Company accepts T&C
- **Integration:** DB update (Companies.IsAgreedToTermsAndConditions)

### PATCH /api/company/SetTenancy
- **Handler:** `CompanyController.SetTenancy()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Company/CompanyController.cs`
- **Auth:** `[AuthorizeRoles(Role.Admin)]`
- **Query Params:** `tenantId` (int, nullable), `companyId` (Guid)
- **Response:** 200 OK
- **Behavior:** Admin associates company with Offervana tenancy
- **Integration:** DB update (Companies.TenancyId)

### GET /api/company/BusinessTypes
- **Handler:** `CompanyController.GetBusinessTypeEnum()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Company/CompanyController.cs`
- **Auth:** `[AllowAnonymous]`
- **Request:** No body
- **Response:** 200 OK → `List<EnumAsListItem>` (SoleProprietor, LLC, Corporation, Partnership, etc.)
- **Behavior:** Returns business type enum for UI
- **Integration:** No DB call (enum reflection)

### GET /api/company/InvestorTypes
- **Handler:** `CompanyController.GetInvestorTypeEnum()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Company/CompanyController.cs`
- **Auth:** `[AllowAnonymous]`
- **Request:** No body
- **Response:** 200 OK → `List<EnumAsListItem>` (Individual, Institutional, Fund, etc.)
- **Behavior:** Returns investor type enum
- **Integration:** No DB call (enum reflection)

### GET /api/company/UsStates
- **Handler:** `CompanyController.GetUsStateEnum()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Company/CompanyController.cs`
- **Auth:** `[AllowAnonymous]`
- **Request:** No body
- **Response:** 200 OK → `List<EnumAsListItem>` (all US states)
- **Behavior:** Returns US states enum
- **Integration:** No DB call (enum reflection)

### GET /api/company/ActiveStatuses
- **Handler:** `CompanyController.GetActiveStatusEnum()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Company/CompanyController.cs`
- **Auth:** `[AllowAnonymous]`
- **Request:** No body
- **Response:** 200 OK → `List<EnumAsListItem>` (Pending, Approved, Rejected, Suspended)
- **Behavior:** Returns company active status enum
- **Integration:** No DB call (enum reflection)

---

## Compliance Management (8 endpoints)

### POST /api/investorcompliance
- **Handler:** `InvestorComplianceController.UploadFile()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Company/InvestorComplianceController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor)]`
- **Form Params:** `file` (IFormFile), `document` (InvestorComplianceDocumentCreateDto from form)
- **Consumes:** `multipart/form-data`
- **Response:** 200 OK → compliance document DTO
- **Behavior:** Investor uploads compliance document (1099, ACH agreement, etc.)
- **Integration:** Blob storage, DB write (ComplianceDocuments)

### GET /api/investorcompliance/users-acceptance
- **Handler:** `InvestorComplianceController.GetCompanyUsersComplianceAcceptance()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Company/InvestorComplianceController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor)]`
- **Query Params:** `companyId`, `pageNumber`, `pageSize`
- **Response:** 200 OK → `List<UserComplianceAcceptanceDto>` (user, documentId, acceptedAt)
- **Behavior:** Lists company's users and which documents they've accepted
- **Integration:** DB read (UserComplianceAcceptances)

### GET /api/investorcompliance/{documentId}
- **Handler:** `InvestorComplianceController.GetInvestorComplianceDoc()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Company/InvestorComplianceController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor)]`
- **Route Params:** `documentId` (Guid)
- **Response:** 200 OK → compliance document DTO (metadata)
- **Behavior:** Retrieves compliance document info
- **Integration:** DB read

### GET /api/investorcompliance/{documentId}/download
- **Handler:** `InvestorComplianceController.DownloadInvestorComplianceDoc()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Company/InvestorComplianceController.cs`
- **Auth:** `[AuthorizeRolesOrInviteToken(Role.Investor, Role.AccountManager, Role.Collaborator)]` (allows token-based access for invited users)
- **Route Params:** `documentId` (Guid)
- **Response:** 200 OK → File stream (PDF/DOC)
- **Behavior:** Downloads compliance document from blob storage
- **Integration:** Blob storage read

### GET /api/investorcompliance
- **Handler:** `InvestorComplianceController.GetInvestorComplianceDocList()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Company/InvestorComplianceController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor)]`
- **Query Params:** `companyId`, `pageNumber`, `pageSize`, filters
- **Response:** 200 OK → `List<ComplianceDocumentDto>` (paginated)
- **Behavior:** Lists company's compliance documents
- **Integration:** DB read

### GET /api/investorcompliance/GetComplianceDocumentsToAccept/{userId}
- **Handler:** `InvestorComplianceController.GetComplianceDocumentsToAccept()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Company/InvestorComplianceController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager, Role.Collaborator)]`
- **Route Params:** `userId` (Guid)
- **Response:** 200 OK → `List<ComplianceDocumentDto>` (documents awaiting user acceptance)
- **Behavior:** User views documents they need to accept
- **Integration:** DB read (ComplianceDocuments + UserComplianceAcceptances join)

### GET /api/investorcompliance/GetComplianceDocumentsToAcceptByCompanyId/{companyId}
- **Handler:** `InvestorComplianceController.GetComplianceDocumentsToAcceptByCompanyId()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Company/InvestorComplianceController.cs`
- **Auth:** `[AuthorizeRolesOrInviteToken(Role.Investor, Role.AccountManager, Role.Collaborator)]` (allows token-based access)
- **Route Params:** `companyId` (Guid)
- **Response:** 200 OK → `List<ComplianceDocumentDto>`
- **Behavior:** Lists documents company users need to accept (by company scope)
- **Integration:** DB read

### POST /api/investorcompliance/accept
- **Handler:** `InvestorComplianceController.AcceptTermsAndConditions()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Company/InvestorComplianceController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager, Role.Collaborator)]`
- **Request:** Body `AcceptCompanyComplianceDocDto` (documentId, acceptedAt, ipAddress)
- **Response:** 200 OK
- **Behavior:** User accepts/acknowledges compliance document
- **Side Effects:** Records acceptance timestamp
- **Integration:** DB write (UserComplianceAcceptances)

### POST /api/investorcompliance/user-acceptance
- **Handler:** `InvestorComplianceController.UserAcceptance()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Company/InvestorComplianceController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor)]`
- **Request:** Body `AcceptCompanyComplianceDocDto`
- **Response:** 200 OK
- **Behavior:** Investor records user acceptance (admin-side acceptance tracking)
- **Integration:** DB write (UserComplianceAcceptances)

### DELETE /api/investorcompliance/{documentId}
- **Handler:** `InvestorComplianceController.DeleteInvestorComplianceDoc()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Company/InvestorComplianceController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor)]`
- **Route Params:** `documentId` (Guid)
- **Response:** 200 OK
- **Behavior:** Deletes compliance document
- **Integration:** Blob storage delete, DB delete (ComplianceDocuments)

---

## Enterprise Analytics (6 endpoints)

### GET /api/enterprise/me/enterprise-name
- **Handler:** `EnterpriseController.GetMyEnterpriseName()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Enterprise/EnterpriseController.cs`
- **Auth:** `[Authorize]`
- **Request:** No body
- **Response:** 200 OK → `string` (enterprise name)
- **Behavior:** Authenticated user gets their enterprise's name
- **Integration:** DB read (Companies where IsEnterprise=true and OwnerUserId=current)

### GET /api/enterprise
- **Handler:** `EnterpriseController.GetEnterprises()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Enterprise/EnterpriseController.cs`
- **Auth:** `[AuthorizeRoles(Role.Admin)]`
- **Query Params:** `pageNumber`, `pageSize`, filters
- **Response:** 200 OK → `PaginatedResult<EnterpriseDto>`
- **Pagination:** pageSize clamped 1-100 (default 20)
- **Behavior:** Admin lists all enterprises
- **Integration:** DB read (Companies where IsEnterprise=true)

### GET /api/enterprise/{id:guid}
- **Handler:** `EnterpriseController.GetEnterprise()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Enterprise/EnterpriseController.cs`
- **Auth:** `[AuthorizeRoles(Role.Admin)]`
- **Route Params:** `id` (Guid)
- **Response:** 200 OK → `EnterpriseDto` | 404 Not Found
- **Behavior:** Admin retrieves enterprise details
- **Integration:** DB read (Companies)

### PUT /api/enterprise/{id:guid}
- **Handler:** `EnterpriseController.UpdateEnterprise()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Enterprise/EnterpriseController.cs`
- **Auth:** `[AuthorizeRoles(Role.Admin)]`
- **Route Params:** `id` (Guid)
- **Request:** Body `UpdateEnterpriseDto`
- **Response:** 204 No Content | 404 Not Found
- **Behavior:** Admin updates enterprise profile
- **Integration:** DB update (Companies)

### GET /api/enterprise/stats/summary
- **Handler:** `EnterpriseController.GetStatsSummary()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Enterprise/EnterpriseController.cs`
- **Auth:** `[AuthorizeRoles(Role.Enterprise)]`
- **Request:** No body
- **Response:** 200 OK → `EnterpriseStatsSummaryDto` (total offers sent, accepted, investors, etc.) | 404 if no enterprise
- **Behavior:** Enterprise user views dashboard summary stats
- **Integration:** DB read (complex aggregation queries)

### GET /api/enterprise/stats/offers-sent-per-investor
- **Handler:** `EnterpriseController.GetOffersSentPerInvestor()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Enterprise/EnterpriseController.cs`
- **Auth:** `[AuthorizeRoles(Role.Enterprise)]`
- **Request:** No body
- **Response:** 200 OK → `List<InvestorChartDataDto>` (investor name, offer count for chart)
- **Behavior:** Enterprise views offers sent per investor (chart data)
- **Integration:** DB read (aggregation)

### GET /api/enterprise/stats/offers-accepted-per-investor
- **Handler:** `EnterpriseController.GetOffersAcceptedPerInvestor()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Enterprise/EnterpriseController.cs`
- **Auth:** `[AuthorizeRoles(Role.Enterprise)]`
- **Request:** No body
- **Response:** 200 OK → `List<InvestorChartDataDto>`
- **Behavior:** Enterprise views accepted offers per investor (chart data)
- **Integration:** DB read (aggregation)

### GET /api/enterprise/stats/investor-performance
- **Handler:** `EnterpriseController.GetInvestorPerformance()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Enterprise/EnterpriseController.cs`
- **Auth:** `[AuthorizeRoles(Role.Enterprise)]`
- **Query Params:** `pageNumber` (default 1), `pageSize` (default 20, clamped 1-100), `sortField`, `sortOrder` (1 for asc, -1 for desc)
- **Response:** 200 OK → `PaginatedResult<InvestorPerformanceDto>` (investor, offers sent/accepted, response rate, etc.)
- **Behavior:** Enterprise views investor performance metrics with pagination and sorting
- **Integration:** DB read (complex JOIN and aggregation)

---

## File Management (7 endpoints)

### POST /api/files/upload
- **Handler:** `FilesController.UploadFile()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Shared/FilesController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager, Role.Admin)]`
- **Form Params:** `file` (IFormFile), `companyId` (optional Guid)
- **Consumes:** `multipart/form-data`
- **Response:** 200 OK → `{ documentId, fileUrl, fileName, blobName, size, contentType, uploadedAt, companyName, uploadedByName }`
- **Behavior:** Uploads single file to blob storage; admin can upload for specific company
- **Integration:** Azure Blob Storage, DB write (FileDocuments)

### POST /api/files/bulk-upload
- **Handler:** `FilesController.UploadFiles()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Shared/FilesController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager, Role.Admin)]`
- **Form Params:** `files` (IFormFileCollection), `companyId` (optional Guid)
- **Consumes:** `multipart/form-data`
- **Response:** 200 OK → `{ totalFiles, successCount, failureCount, successfullyUploaded[], failedUploads[] }` | 400 if no files
- **Behavior:** Bulk uploads multiple files; returns success/failure breakdown
- **Integration:** Blob Storage, DB write (multiple FileDocuments)

### GET /api/files/download/{documentId}
- **Handler:** `FilesController.DownloadFile()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Shared/FilesController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager, Role.Collaborator, Role.Admin)]`
- **Route Params:** `documentId` (Guid)
- **Response:** 200 OK → File stream or 404
- **Behavior:** Downloads file from blob storage
- **Integration:** Blob Storage read

### GET /api/files/info/{documentId}
- **Handler:** `FilesController.GetFileInfo()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Shared/FilesController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager, Role.Collaborator, Role.Admin)]`
- **Route Params:** `documentId` (Guid)
- **Response:** 200 OK → file metadata DTO (documentId, fileName, blobName, contentType, size, uploadedAt, lastModified, fileUrl, companyName, uploadedById, uploadedByName)
- **Behavior:** Retrieves file metadata without downloading
- **Integration:** DB read (FileDocuments)

### DELETE /api/files/{documentId}
- **Handler:** `FilesController.DeleteFile()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Shared/FilesController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager, Role.Admin)]`
- **Route Params:** `documentId` (Guid)
- **Response:** 200 OK → `{ message: "File successfully deleted" }`
- **Behavior:** Deletes file from blob storage
- **Integration:** Blob Storage delete, DB delete (FileDocuments)

### GET /api/files/company-documents
- **Handler:** `FilesController.GetCompanyDocuments()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Shared/FilesController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager, Role.Collaborator, Role.Admin)]`
- **Query Params:** `companyId` (Guid)
- **Response:** 200 OK → `List<FileMetadataDto>` (all documents for company)
- **Behavior:** Lists all documents uploaded by/for a company
- **Integration:** DB read (FileDocuments filtered by companyId)

### GET /api/files/GetAssets
- **Handler:** `FilesController.GetAssets()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Shared/FilesController.cs`
- **Auth:** `[AllowAnonymous]`
- **Query Params:** `filename` (string), `format` (string, MIME type), `type` (string: "img" or "file")
- **Response:** 200 OK → Virtual file result
- **Behavior:** Serves static assets from `./assets/img/` or `./assets/file/` directories
- **Integration:** File system access
- **Note:** Returns `VirtualFileResult` pointing to local asset path

---

## Terms & Conditions (2 endpoints)

### PATCH /api/termsandconditions/accept
- **Handler:** `TermsAndConditionsController.AcceptTermsAndConditions()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/User/TermsAndConditionsController.cs`
- **Auth:** `[AllowAnonymous]`
- **Request:** Body `AcceptTermsAndConditionsRequest` (ipAddress)
- **Response:** 200 OK
- **Behavior:** User accepts T&C; records acceptance timestamp and IP
- **Side Effects:** Creates TermsAndConditionsAcceptance record
- **Integration:** DB write, IP logging

### GET /api/termsandconditions/CheckAcceptance/{userId:guid}
- **Handler:** `TermsAndConditionsController.CheckAcceptance()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/User/TermsAndConditionsController.cs`
- **Auth:** `[Authorize]`
- **Route Params:** `userId` (Guid)
- **Response:** 200 OK → `{ accepted: bool, acceptedAt: DateTime? }`
- **Behavior:** Checks if user has accepted T&C
- **Integration:** DB read (TermsAndConditionsAcceptances)

---

## OpenAPI / External APIs (19 endpoints)

These endpoints are prefixed with `/openapi/` instead of `/api/` and use slightly different DTO shapes for external consumption.

### GET /openapi/buybox
- **Handler:** `BuyboxOpenApiController.GetBuyboxes()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/OuterApi/BuyboxOpenApiController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager, Role.Collaborator)]`
- **Request:** No body
- **Response:** 200 OK → `List<BuyboxDto>` (items only, no pagination)
- **Behavior:** External API fetch of user's buyboxes (simplified response)
- **Integration:** DB read (BuyboxCriteria)

### POST /openapi/buybox
- **Handler:** `BuyboxOpenApiController.CreateBuybox()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/OuterApi/BuyboxOpenApiController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager, Role.Collaborator)]`
- **Request:** Body `UpsertBuyboxOpenApiDto` (mapped to `CreateBuyboxDto`)
- **Response:** 200 OK → `{ message: "Buybox created successfully" }`
- **Behavior:** External API create buybox
- **Integration:** DB write

### PUT /openapi/buybox
- **Handler:** `BuyboxOpenApiController.UpdateBuybox()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/OuterApi/BuyboxOpenApiController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager)]`
- **Route Params:** `id` (string, Guid)
- **Request:** Body `UpsertBuyboxOpenApiDto`
- **Response:** 200 OK → `BuyboxDto`
- **Behavior:** External API update buybox
- **Integration:** DB update

### PUT /openapi/buybox/assignBuybox
- **Handler:** `BuyboxOpenApiController.AssignBuybox()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/OuterApi/BuyboxOpenApiController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager, Role.Collaborator)]`
- **Route Params:** `userId` (string, Guid), `buyboxId` (string, Guid)
- **Response:** 200 OK → `{ message: "Assigned successfully." }`
- **Behavior:** Assigns buybox to another user in team
- **Integration:** DB write (BuyboxAssignment or BuyboxSharing)

### POST /openapi/offer
- **Handler:** `OfferOpenApiController.CreateOffer()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/OuterApi/OfferOpenApiController.cs`
- **Auth:** (appears to require auth from Claims extraction, but not explicitly marked)
- **Request:** Body `CreateOfferOpenApiDto`
- **Response:** 200 OK → `int` (offerId)
- **Behavior:** External API create offer (mapped from OpenAPI DTO)
- **Integration:** DB write (Offers)

### PUT /openapi/offer
- **Handler:** `OfferOpenApiController.UpdateOffer()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/OuterApi/OfferOpenApiController.cs`
- **Auth:** (requires user claims)
- **Request:** Body `UpdateOfferOpenApiDto`
- **Response:** 200 OK → `OfferDto`
- **Behavior:** External API update offer
- **Integration:** DB update

### DELETE /openapi/offer
- **Handler:** `OfferOpenApiController.DeleteOffer()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/OuterApi/OfferOpenApiController.cs`
- **Auth:** (requires user claims)
- **Request:** Body `DeleteOfferDto`
- **Response:** 200 OK → `{ message: "Deleted successfully" }`
- **Behavior:** External API delete offer
- **Integration:** DB delete

### GET /openapi/offer/Ibuyers
- **Handler:** `OfferOpenApiController.GetAvailableIbuyers()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/OuterApi/OfferOpenApiController.cs`
- **Auth:** `[AuthorizeRoles(Role.Admin, Role.Enterprise, Role.Investor, Role.AccountManager)]`
- **Request:** No body
- **Response:** 200 OK → `int` (count or list)
- **Behavior:** External API fetch available ibuyers (MediatR: `GetAvailableIbuyersQuery`)
- **Integration:** DB read (Offervana LegacyData)

### POST /openapi/property/addToWatchlist
- **Handler:** `PropertyOpenApiController.AddPropertyToWatchlist()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/OuterApi/PropertyOpenApiController.cs`
- **Auth:** (requires user claims)
- **Route Params:** `propertyId` (int)
- **Response:** 200 OK → `{ message: "Property added to watchlist." }`
- **Behavior:** External API adds property to watchlist
- **Integration:** DB write

### POST /openapi/property/removeFromWatchlist
- **Handler:** `PropertyOpenApiController.RemovePropertyFromWatchlist()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/OuterApi/PropertyOpenApiController.cs`
- **Auth:** (requires user claims)
- **Route Params:** `propertyId` (int)
- **Response:** 200 OK → `{ message: "Property remove from watchlist." }`
- **Behavior:** External API removes property from watchlist
- **Integration:** DB delete (watchlist entry)

### POST /openapi/property/hideProperty
- **Handler:** `PropertyOpenApiController.HideProperty()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/OuterApi/PropertyOpenApiController.cs`
- **Auth:** (requires user claims)
- **Route Params:** `propertyId` (int)
- **Response:** 200 OK → `{ message: "Property hidden successfully." }`
- **Behavior:** External API hides property from user
- **Integration:** DB write

### POST /openapi/property/unhideProperty
- **Handler:** `PropertyOpenApiController.UnhideProperty()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/OuterApi/PropertyOpenApiController.cs`
- **Auth:** (requires user claims)
- **Route Params:** `propertyId` (int)
- **Response:** 200 OK → `{ message: "Property unhidden successfully." }`
- **Behavior:** External API unhides property
- **Integration:** DB delete (visibility record)

### GET /openapi/property/getPropertyById
- **Handler:** `PropertyOpenApiController.GetPropertyById()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/OuterApi/PropertyOpenApiController.cs`
- **Auth:** (requires user claims)
- **Route Params:** `id` (int)
- **Response:** 200 OK → `PropertyDto`
- **Behavior:** External API fetch property details
- **Integration:** DB read

### POST /openapi/property/uploadPropertyFiles
- **Handler:** `PropertyOpenApiController.UploadPropertyFiles()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/OuterApi/PropertyOpenApiController.cs`
- **Auth:** (requires user claims)
- **Route Params:** `id` (int)
- **Form Params:** `files` (IFormFileCollection), `label` (optional query)
- **Consumes:** `multipart/form-data`
- **Response:** 200 OK → `List<CloudinaryFileOutput>` | 400 if no files
- **Behavior:** External API uploads property files
- **Integration:** Cloudinary

### POST /openapi/user/registerInvestor
- **Handler:** `UserOpenApiController.RegisterInvestor()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/OuterApi/UserOpenApiController.cs`
- **Auth:** `[AuthorizeRoles(Role.Admin)]`
- **Request:** Body `UserOpenApiDto`
- **Response:** 200 OK → `UserDto`
- **Behavior:** Admin creates investor via external API
- **Integration:** DB write (Users, Companies)

### PUT /openapi/user/updateInvestor
- **Handler:** `UserOpenApiController.UpdateCompany()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/OuterApi/UserOpenApiController.cs`
- **Auth:** `[AuthorizeRoles(Role.Admin)]`
- **Route Params:** `id` (Guid)
- **Request:** Body `UpdateCompanyDto`
- **Response:** 200 OK → `CompanyDto`
- **Behavior:** Admin updates investor's company via external API
- **Integration:** DB update

### PUT /openapi/user
- **Handler:** `UserOpenApiController.UpdateUser()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/OuterApi/UserOpenApiController.cs`
- **Auth:** `[AuthorizeRoles(Role.Admin)]`
- **Route Params:** `id` (Guid)
- **Request:** Body `UpdateUserDto`
- **Response:** 200 OK → `UserDto`
- **Behavior:** Admin updates user via external API
- **Integration:** DB update

### POST /openapi/user/createInvestorForEnterprise
- **Handler:** `UserOpenApiController.CreateInvestorForEnterprise()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/OuterApi/UserOpenApiController.cs`
- **Auth:** `[AuthorizeRoles(Role.Enterprise)]`
- **Request:** Body `AcceptGlobalInviteOpenApiDto` (mapped to `AcceptGlobalInviteDto`)
- **Response:** 200 OK → `{ message: "Investor created successfully" }`
- **Behavior:** Enterprise creates new investor from external API
- **Integration:** DB write (Users, CompanyUsers relationship)

### POST /openapi/user/createAccountManager
- **Handler:** `UserOpenApiController.CreateAccountManager()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/OuterApi/UserOpenApiController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor)]`
- **Request:** Body `AcceptGlobalInviteOpenApiDto`
- **Response:** 200 OK → `{ message: "Account Manager created successfully" }`
- **Behavior:** Investor creates account manager from external API
- **Integration:** DB write (Users, CompanyUsers relationship)

### POST /openapi/user/createCollaborator
- **Handler:** `UserOpenApiController.CreateCollaborator()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/OuterApi/UserOpenApiController.cs`
- **Auth:** `[AuthorizeRoles(Role.AccountManager)]`
- **Request:** Body `AcceptGlobalInviteOpenApiDto`
- **Response:** 200 OK → `{ message: "Collaborator created successfully" }`
- **Behavior:** AccountManager creates collaborator from external API
- **Integration:** DB write (Users, CompanyUsers)

### DELETE /openapi/user/collaboratorOrManager
- **Handler:** `UserOpenApiController.DeleteCollaboratorOrManager()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/OuterApi/UserOpenApiController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager)]`
- **Route Params:** `userId` (Guid)
- **Response:** 200 OK → `{ message: "Deleted successfully" }`
- **Behavior:** Delete collaborator or manager from external API
- **Integration:** DB delete (CompanyUsers relationship)

### GET /openapi/user/Users
- **Handler:** `UserOpenApiController.GetUsers()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/OuterApi/UserOpenApiController.cs`
- **Auth:** `[AuthorizeRoles(Role.Investor, Role.AccountManager)]`
- **Query Params:** `pageNumber`, `pageSize` (clamped 1-100, default 20), search/filter fields
- **Response:** 200 OK → paginated user list (AccountManagers and Collaborators)
- **Behavior:** External API lists user's subordinates
- **Integration:** DB read

---

## Example/Reference Endpoints (6 endpoints)

These are reference endpoints demonstrating authorization patterns and are not meant for production use.

### GET /api/example/public
- **Handler:** `ExampleController.PublicEndpoint()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Shared/ExampleController.cs`
- **Auth:** `[AllowAnonymous]`
- **Response:** 200 OK → `"This endpoint is public - no authentication required"`

### GET /api/example/authenticated
- **Handler:** `ExampleController.AuthenticatedOnly()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Shared/ExampleController.cs`
- **Auth:** `[Authorize]`
- **Response:** 200 OK → `"Hello authenticated user! Your role is: {role}"`

### GET /api/example/admin-only
- **Handler:** `ExampleController.AdminOnly()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Shared/ExampleController.cs`
- **Auth:** `[Authorize(Roles = "Admin")]`
- **Response:** 200 OK → `"This endpoint is only accessible to Admin users"`

### GET /api/example/admin-or-investor
- **Handler:** `ExampleController.AdminOrInvestor()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Shared/ExampleController.cs`
- **Auth:** `[Authorize(Roles = "Admin,Investor")]`
- **Response:** 200 OK → `"This endpoint is accessible to Admin or Investor users"`

### GET /api/example/enum-based
- **Handler:** `ExampleController.EnumBasedAuthorization()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Shared/ExampleController.cs`
- **Auth:** `[AuthorizeRoles(Role.Admin, Role.Investor)]`
- **Response:** 200 OK → `"This endpoint uses enum-based authorization"`

### GET /api/example/my-info
- **Handler:** `ExampleController.GetMyInfo()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Shared/ExampleController.cs`
- **Auth:** `[Authorize]`
- **Response:** 200 OK → `{ UserId, Email, Username, Role, AllClaims[] }`
- **Behavior:** Returns current user's JWT claims for debugging

---

## Ibuyer Endpoints (1 endpoint)

### GET /api/ibuyer
- **Handler:** `IbuyerController.GetAvailableIbuyers()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/Offer/IbuyerController.cs`
- **Auth:** `[Authorize]`
- **Request:** No body
- **Response:** 200 OK → `int` (count or list of available ibuyer entities)
- **Behavior:** Fetches available institutional buyers from Offervana LegacyData (MediatR: `GetAvailableIbuyersQuery`)
- **Integration:** DB read (Offervana LegacyData)

---

## Tenant Endpoints (3 endpoints)

### GET /api/tenant
- **Handler:** `TenantController.GetTenants()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/TenantController.cs`
- **Auth:** `[Authorize]`
- **Query Params:** `pageNumber`, `pageSize`, filters
- **Response:** 200 OK → `PaginatedResult<TenantDto>`
- **Behavior:** Lists property tenants (from Offervana LegacyData)
- **Integration:** DB read (LegacyData.Tenants)

### GET /api/tenant/{id:int}
- **Handler:** `TenantController.GetTenant()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/TenantController.cs`
- **Auth:** `[Authorize]`
- **Route Params:** `id` (int)
- **Response:** 200 OK → `TenantDto`
- **Behavior:** Retrieves single tenant details (MediatR: `GetTenantByIdQuery`)
- **Integration:** DB read (LegacyData.Tenants)

### GET /api/tenant/tenantLogoById
- **Handler:** `TenantController.GetTenantLogoById()`
- **File:** `investor-portal-services/ZoodealioInvestorPortal.Api/Controllers/Legacy/TenantController.cs`
- **Auth:** `[AllowAnonymous]`
- **Query Params:** `tenantId` (int, nullable)
- **Response:** 200 OK → File stream (image/png, image/jpeg, etc.)
- **Behavior:** Returns tenant's logo image
- **Integration:** DB read (logo blob reference or URL fetch)

---

## Summary Notes

### Authentication & Authorization
- **Default Scheme:** JWT Bearer
- **Custom Attributes:**
  - `[AuthorizeRoles(...)]` — Role-based authorization using enum (Role)
  - `[AuthorizeRolesOrInviteToken(...)]` — Allows authenticated users with role OR users with valid invite token (query param `token`)
  - `[AllowAnonymous]` — Public endpoint
  - `[Authorize]` — Any authenticated user

### Request/Response Patterns
- **Pagination:** When used, follows pattern: `pageNumber`, `pageSize` (clamped 1-100, default 20)
- **Date Filtering:** Dates are normalized to day boundaries (00:00:00 and 23:59:00) for filtering
- **Error Responses:**
  - `400 Bad Request` — Validation failure (missing required params, invalid format)
  - `401 Unauthorized` — Auth failure or invalid token
  - `404 Not Found` — Resource not found
  - `409 Conflict` — Business logic conflict (e.g., duplicate record)
- **File Uploads:** Use `IFormFile` or `IFormFileCollection` with `multipart/form-data`; size limits vary (e.g., 21 MB for offer files)
- **HTTP Status Codes Used:**
  - 200 OK (successful query/mutation with response)
  - 201 Created (rarely seen; typically returns 200)
  - 204 No Content (successful mutation without response)
  - 400 Bad Request
  - 401 Unauthorized
  - 404 Not Found
  - 409 Conflict
  - 429 Too Many Requests (rate-limited endpoints)
  - 500 Internal Server Error (wrapped in UserFriendlyExceptionFilter)

### Integration Points
- **Offervana_SaaS:** Read-only LegacyData (Properties, Offers, Tenants via OffervanaDb), called by `/api/offer/NotifyInvestor*` webhooks
- **TradeInHoldings (TIH):** Bidirectional API (inferred from comments; endpoints not exposed, likely called internally)
- **Cloudinary:** Photo/file upload and management
- **SendGrid:** Email notifications (offer status, acceptances, buybox matches, password resets)
- **Azure Service Bus:** Message queue publishing (test endpoint visible)
- **Azure Blob Storage:** File document storage (compliance docs, offer files)
- **ATTOM/BLAST Survey API:** Property enrichment (address → property details)
- **ElasticSearch or SQL:** Property search (via SearchService)
- **Temporal Workflow Engine:** Implied for workflow orchestration (not visible in API layer)

### Notable Behaviors
- **Webhook Pattern:** Several endpoints (`NotifyInvestor*`, `NotifyUsersBuyboxMatchBatch`) are called by Offervana_SaaS (AllowAnonymous, should be secured)
- **MediatR Pattern:** Heavy use of CQRS (Queries and Commands) for business logic
- **Custom Context:** `IUserContext` service extracts user ID, email, role, company/tenant associations from JWT claims
- **Impersonation Support:** Admin impersonation feature inferred from UserContextDto.IsImpersonating field
- **API Key Support:** Users can generate API keys via `/api/useapi/generateUserApiKey` for machine-to-machine auth
- **Global Invite Links:** Separate token-based system for external user recruitment
- **Compliance Document Tracking:** Per-user acceptance recording with timestamps and IP addresses
- **Enterprise Multi-Tenancy:** Separate enterprise/company/user hierarchy with role-based team management

---

## Conclusion

This catalog captures **139 unique HTTP endpoints** across 15 functional areas, organized for maintainability and cross-service integration. All endpoints use JWT Bearer authentication by default (except where explicitly marked AllowAnonymous) and follow REST conventions. The service integrates deeply with Offervana_SaaS (read), TradeInHoldings (bidirectional), and cloud services (Cloudinary, SendGrid, Azure Storage/Bus).