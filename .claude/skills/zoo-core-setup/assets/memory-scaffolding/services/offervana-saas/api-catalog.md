---
artifact: api-catalog
service: offervana-saas
commit-sha: 61581dc184777cb7293ae594294d917556a35ca4
generated-at: 2026-04-16
endpoint-count: ~340
---

# Offervana_SaaS — API Catalog

## Overview

**Base URL:** `/api/services/app/{ServiceName}/{MethodName}` (ABP convention) + `/api/TokenAuth/{action}` + `/openapi/{controller}` (OuterApi)
**Auth:** JWT Bearer (internal), API Key header (OuterApi), Anonymous (webhooks/public)
**API Style:** REST — ABP Zero auto-generated endpoints from AppServices + explicit MVC controllers

## Endpoint Summary

| Category | Count | Auth |
|----------|-------|------|
| OuterApi (external) | 24 | API Key (`OuterApiKeyFilter`) |
| Web Controllers (auth/files/UI) | 50 | Mixed (JWT, Anonymous, Cookie) |
| Core Business AppServices | ~170 | ABP `[AbpAuthorize]` with permissions |
| Integration AppServices | ~90 | Mixed |
| Azure Functions | 2 | Function Key / Anonymous |
| **Total** | **~340** | |

---

## Endpoints

### OuterApi — External REST API

All OuterApi controllers use `[AllowAnonymous]` + `[OuterApiKeyFilter]` — authentication is via `apiKey` header resolved to a tenant. All routes prefixed with `openapi/`.

#### Customers (`openapi/Customers`)

| Method | Route | Purpose | Request | Response |
|--------|-------|---------|---------|----------|
| GET | `/openapi/Customers` | List customers by filter | Query: email, phone, name, id, administratorId | `List<GetCustomersDto>` |
| POST | `/openapi/Customers` | Create customer + property (full onboarding) | Body: `CreateCustomerDto`, Query: pullPropertyData | `GetCustomersDto` |
| PUT | `/openapi/Customers` | Update customer profile | Body: `UpdateCustomerDto` | `GetCustomersDto` |
| POST | `/openapi/Customers/CreateBulkCustomers` | Bulk create customers | Body: `List<CreateCustomerDto>` | `List<GetCustomersDto>` |
| PATCH | `/openapi/Customers/{id}/assign-agent` | Assign customer to agent | Body: `AssignToAgentRequestDto` | void |

- POST creates user account, customer, property; geocodes address; triggers AVM; fires `LeadCreatedEto` for GHL sync
- Bulk endpoint skips HomeJunction property data pull for performance

#### IBuyers (`openapi/IBuyers`)

| Method | Route | Purpose | Request | Response |
|--------|-------|---------|---------|----------|
| GET | `/openapi/IBuyers` | List iBuyer configs (tenant + host) | — | `List<GetIBuyersDto>` |
| POST | `/openapi/IBuyers` | Create iBuyer config | Body: `CreateIbuyerDto` | `GetIBuyersDto` |
| PUT | `/openapi/IBuyers` | Update iBuyer config | Body: `UpdateIbuyerDto` | `GetIBuyersDto` |

#### Properties (`openapi/Properties`)

| Method | Route | Purpose | Request | Response |
|--------|-------|---------|---------|----------|
| GET | `/openapi/Properties` | Get property by address/ID | Query: address, id, includeOffers | `GetPropertyDto` |
| PUT | `/openapi/Properties` | Update property address/survey | Body: `UpdatePropertyDto` | `GetPropertyDto` |

- GET with `includeOffers=true` triggers AVM validation first

#### Offers V1 (`openapi/Offers`)

| Method | Route | Purpose | Request | Response |
|--------|-------|---------|---------|----------|
| GET | `/openapi/Offers` | List active offers for property | Query: propertyId | `List<GetPropertyOfferDto>` |
| POST | `/openapi/Offers` | Create offer from iBuyer | Body: `CreateOfferDto` | `GetPropertyOfferDto` |
| PUT | `/openapi/Offers` | Revise offer (new version) | Body: `UpdateOfferDto` | `GetPropertyOfferDto` |
| PATCH | `/openapi/Offers/Accept` | Accept offer | Query: offerId; Body: `OfferSurveyDto` | `GetPropertyOfferDto` |

- Create retires existing current offer from same iBuyer, soft-deletes matching prelims
- Update creates new version, marks old as `IsCurrent=false`

#### Offers V2 (`openapi/OffersV2`)

| Method | Route | Purpose | Request | Response |
|--------|-------|---------|---------|----------|
| GET | `/openapi/OffersV2` | List offers with status/notes/history | Query: propertyId, includeHistory | `List<GetPropertyOfferV2Dto>` |
| POST | `/openapi/OffersV2` | Create offer with V2 enhancements | Body: `CreateOfferDto` | `GetPropertyOfferV2Dto` |
| PUT | `/openapi/OffersV2` | Update offer (agent-created only) | Body: `UpdateOfferV2Dto` | `GetPropertyOfferV2Dto` |
| PATCH | `/openapi/OffersV2/Accept` | Accept offer (V2 response) | Query: offerId; Body: `OfferSurveyDto` | `GetPropertyOfferV2Dto` |
| PATCH | `/openapi/OffersV2/SubmitCounter` | Submit counter offer | Body: `SubmitCounterOfferDto` | `GetPropertyOfferV2Dto` |
| PATCH | `/openapi/OffersV2/UpdateCounter` | Update pending counter | Body: `UpdateCounterOfferDto` | `GetPropertyOfferV2Dto` |
| PATCH | `/openapi/OffersV2/UpdatePropertyValues` | Update closing cost / mortgage lien | Body: `UpdatePropertyValuesDto` | `List<GetPropertyOfferV2Dto>` |
| GET | `/openapi/OffersV2/GetHistory` | Full offer version history | Query: offerId | `List<OfferTypeHistoryV2Dto>` |

- V2 adds: offer status, agent/client notes, counter offer state, offer source, version history
- SubmitCounter: `OfferEventType=AgentCounter`, `CounterOfferDirection=AgentToHost`
- UpdatePropertyValues: recalculates net amounts for all current offers on the property

#### Administrators (`openapi/Administrators`)

| Method | Route | Purpose | Request | Response |
|--------|-------|---------|---------|----------|
| GET | `/openapi/Administrators` | List admins (agents/managers/brokers) | Query: email, phone, name, id | `List<GetAdministationUsersDto>` |
| POST | `/openapi/Administrators` | Create admin with role | Body: `CreateAdministationUsersDto` | `GetAdministationUsersDto` |
| PUT | `/openapi/Administrators` | Update admin profile | Body: `UpdateAdministratorDto` | `GetAdministationUsersDto` |
| DELETE | `/openapi/Administrators/{agentId}` | Soft-delete admin | Route: agentId | void |
| DELETE | `/openapi/Administrators` | Bulk soft-delete admins | Body: `List<int>` | void |

- Role hierarchy enforced: BrokerageAdmin→Owner, Manager→Owner/BrokerageAdmin, Agent→not another Agent

#### Subscription (`openapi/Subscription`)

| Method | Route | Purpose | Request | Response |
|--------|-------|---------|---------|----------|
| PATCH | `/openapi/Subscription/SetSeats` | Adjust subscription seats | Query: seatsCount | `SubscriptionDto` |
| GET | `/openapi/Subscription` | Get seat details | — | `GetSubscriptionDto` |

#### Test (`openapi/Test`)

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/openapi/Test` | Health check — returns `"Success"` |

---

### Authentication & Session

#### TokenAuth (`/api/TokenAuth/{action}`)

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| POST | `/api/TokenAuth/GenerateOtp` | Generate 4-digit OTP (email) | Anonymous |
| POST | `/api/TokenAuth/NoTenantAuthenticate` | Pre-auth, resolve tenants | Anonymous |
| POST | `/api/TokenAuth/Authenticate` | Full JWT authentication | Anonymous |
| POST | `/api/TokenAuth/ZapierAuthenticate` | Zapier connector auth | Anonymous |
| POST | `/api/TokenAuth/RefreshToken` | Refresh access token | Anonymous |
| GET | `/api/TokenAuth/LogOut` | Revoke token | `[AbpAuthorize]` |
| POST | `/api/TokenAuth/ImpersonatedAuthenticate` | Exchange impersonation token | Anonymous |
| POST | `/api/TokenAuth/DomainAuthenticate` | Resolve tenant by domain URL | Anonymous |
| POST | `/api/TokenAuth/CustomerDashboardAuthenticate` | Customer login via referral | Anonymous |
| POST | `/api/TokenAuth/AgentDashboardAuthenticate` | Agent login via referral | Anonymous |

- `NoTenantAuthenticate` supports password OR OTP; returns tenant list or tokens
- `Authenticate` checks subscription expiry, Recurly sync, concurrent login enforcement

#### Session (`/api/services/app/Session/`)

| Method | Purpose | Auth |
|--------|---------|------|
| GetCurrentLoginInformations | Full session context (app, tenant, user, theme) | Implicit |
| GetCurrentLoginInformationsV2 | Same + blob URLs for profile images | Implicit |
| UpdateUserSignInToken | Generate short-lived sign-in token | Authenticated |
| GetCurrentTenantSubscriptionUrls | Recurly billing portal URL | Permission-checked |

#### Account (`/api/services/app/Account/`)

| Method | Purpose | Auth |
|--------|---------|------|
| IsTenantAvailable | Check tenant status for login | Anonymous |
| Register | Register user + customer + property | Agent-initiated |
| RegisterClient | Register client (no property) | Implicit |
| RegisterBuyer | Register buyer or convert client | Implicit |
| RegisterBuyerProperty | Update buyer registration + property | Implicit |
| SendPasswordResetCode | Email password reset link | Anonymous |
| ResetPassword | Reset with code | Anonymous |
| SendEmailActivationLink | Send activation email | Anonymous |
| ActivateEmail | Activate email with code | Anonymous |
| Impersonate | Generate impersonation token | Admin permission |

---

### Property Management

#### Property (`/api/services/app/Property/`)

| Method | Purpose | Auth |
|--------|---------|------|
| CreateAsync | Create property (full workflow: duplicate check, blast, AVM) | Authenticated |
| CreateBulkAsync | Batch create properties | Authenticated |
| UpdateAsync | Update property details + trigger AVM | Authenticated |
| UpdateEstimatedValueAsync | Update estimated value + AVM | Authenticated |
| UpdateByCustomerAsync | Update from customer flow | Authenticated |
| UpdateAddress | Update address fields | Authenticated |
| GetByIdAsync | Full property profile (customer, agent, offers, docs) | Authenticated |
| GetAllPropertiesForClient | All properties for customer | `[AllowAnonymous]` |
| GetAllAsync | Paginated property list (role-scoped) | Authenticated |
| GetAllPagesAsync | Full property list for exports | `Pages_Tenant_Properties` |
| GetPropertyFilters | Available filter options by role | `Pages_Tenant_Properties` |
| GetMarketTrendsAsync | Core market trends (DOM, prices) | `Pages_Tenant_Properties_MarketTrends` |
| GetMarketTrendsDetailsAsync | Extended market analytics | `Pages_Tenant_Properties_MarketTrends` |
| GetActiveListingsAsync | Active MLS listings | `Pages_Tenant_Properties_MarketTrends` |
| GetInactiveListingsAsync | Inactive MLS listings | `Pages_Tenant_Properties_MarketTrends` |
| GetSimilarActiveListingsAsync | Similar active comps | `Pages_Tenant_Properties_MarketTrends` |
| GetSimilarInactiveListingsAsync | Similar inactive comps | `Pages_Tenant_Properties_MarketTrends` |
| DeleteAsync | Soft delete property + dependents | `Pages_Tenant_Properties_Edit` |
| RequestRefreshOffers | Queue offer refresh | `[AbpAuthorize]` |
| GetAgentPropertyLimitStatusAsync | Property limit for free agents | Authenticated |
| SelectDefaultPhoto | Set default photo | `Pages_Tenant_Properties` |
| CountBlastDashboardView | Increment blast view counter | Authenticated |
| CountOfferDashboardView | Increment offer view counter | Authenticated |
| GetCustomerIdByPropId | Customer ID from property | Authenticated |

#### PropertyPublicData (`/api/services/app/PropertyPublicData/`)

| Method | Purpose | Auth |
|--------|---------|------|
| GetPropertyDetailsByDeliveryLineAsync | HomeJunction property lookup | Authenticated |
| GetListingsAsync | MLS listing search (cached) | Authenticated |
| GetListingByIdAsync | MLS listing detail | Authenticated |
| GetPopulationAsync | Demographics by ZIP | Authenticated |
| GetMarketDataAsync | Aggregate market metrics | Authenticated |
| GetValueEstimates | HomeJunction AVM low/high | Authenticated |
| GetNeighborhoodAvgValue | Neighborhood avg by coordinates | Authenticated |

#### PropertyFile (`/api/services/app/PropertyFile/`)

| Method | Purpose | Auth |
|--------|---------|------|
| UploadAsync | Upload file to property | `Pages_Tenant_PropertyFiles_Upload` |
| UploadMultipleAsync | Multi-file upload | `[AbpAuthorize]` |
| UploadCloudinaryAsync | Upload to Cloudinary (520MB limit) | Authenticated |
| UploadCloudinaryFromUrlsAsync | Upload from URLs (max 50) | Authenticated |
| UploadCloudianryFileNoProperty | Upload without property | `Pages_Tenant_PropertyFiles_Upload` |
| GetAsync | List property files | `Pages_Tenant_PropertyFiles` |
| GetCloudianryAsync | List Cloudinary files | `[AllowAnonymous]` |
| DeleteAsync / DeleteCloudianryAsync | Delete files | Mixed |
| UpdateLabelAsync / UpdateCloudianryLabelAsync | Update labels | Mixed |
| DownloadAllCloudianryAsync | Download all as ZIP | `[AllowAnonymous]` |
| GetPropertyPhotoLabelsEnumList | Photo label options | Authenticated |

#### PropertySurveyStage (`/api/services/app/PropertySurveyStage/`)

| Method | Purpose | Auth |
|--------|---------|------|
| GetAsync | Get staged survey by address | Authenticated |
| SetAsync | Upsert staged survey progress | Authenticated |

#### GlobalProperty (`/api/services/app/GlobalProperty/`)

| Method | Purpose | Auth |
|--------|---------|------|
| GetAllPropertiesGlobal | Cross-tenant Azure Search | `Pages_Host_GlobalProperties` |
| ToggleWorkingFlag | Toggle "being worked on" | `Pages_Host_GlobalProperties` |
| RemoveWorkingFlag | Remove working flag | `Pages_Host_GlobalProperties` |

---

### Customer Management

#### CustomerApplication (`/api/services/app/CustomerApplication/`)

| Method | Purpose | Auth |
|--------|---------|------|
| GetByIdAsync | Customer by ID | `Pages_Tenant_Customers` |
| GetCustomerDetailFromUserIdAsync | Customer from user ID | Authenticated |
| GetCustomerFromUserIdAsync | Check if buyer | Authenticated |
| GetAgentForCustomer | Agent ID for customer | `[AbpAuthorize]` |
| GetAgentAndTenantForCustomer | Full agent/tenant info | `[AllowAnonymous]` |
| GetPropertyForCustomer | Property ID for customer | `[AbpAuthorize]` |
| GetAgentAsync | Agent info (fallback to default) | Authenticated |
| UpdateNotifications | Bulk email/SMS preferences | Authenticated |
| SubmitPropertyReview | Submit property review value | Authenticated |

#### CustomerAppServiceV2 (`/api/services/app/CustomerAppServiceV2/`)

Explicit `[Route]` + `[ApiController]` — not standard ABP convention. Class-level `[AbpAuthorize]`.

| Method | Purpose |
|--------|---------|
| GetCustomerList | Paginated customer list (DB) |
| GetCustomerListFromSearch | Azure Search backed list |
| GetCustomersForAgent | Customers for agent |
| GetBlastStats | Email campaign stats |
| GetBlastStatsList | Paged campaign stats |
| GetEmailPreview | Single email preview |
| GetClientNotesThreaded | Threaded notes timeline |
| SoftDeleteCustomers | Bulk soft delete |
| SoftDeleteAllCustomers | Delete by filter |
| DeleteProperties | HARD delete (irreversible) |
| MergeClients | Merge duplicate clients |
| ManageCustomerGroups | Bulk group assignment (Temporal workflow) |
| ManagePropGroups | Manage property groups |
| GetGroupsForSelectedClients | Groups for selected clients |
| GetGroupsAssignStatus | Poll group assignment progress |
| MoveProps | Reassign properties |
| UpdateClientInfo | Update client metadata |
| AddPropForCustomer | Add property to customer |
| ValidateAvmValue | Trigger AVM validation |
| UpdatePropSurvey | Update property survey |
| GetPropDocs | Property documents (`[AllowAnonymous]`) |
| GetPropertyDocsWithSource | Documents with source info |
| GetPropsForClientList / GetPropsForClientListPost | Properties for customer IDs |
| GetPropsCountForPropList | Batch property counts |
| GetLastActivityForPropList | Batch last activity |
| GetGroupsForPropList | Batch group membership |
| GetUsersForPropList / GetAgentsForPropList | Batch user/agent info |
| GetStagesPropList | Offer status stages |
| GetRecentPropertyHistoryLogs | Recent property events |
| ManagePropSourceLead / ManagePropLeadType | Lead management |
| UndoCustomersSoftDeleteForFileLog | Undo import delete |
| GetSharePhotosLink / GetShareDocumentsLink | Shareable links |

Enum endpoints: GetHowAddedToBlastEnumList, GetCustomerLeadSourcesEnumList, GetCustomerLeadTypeEnumList, GetCustomerLeadStatusEnumList, GetPropertySubmissionSourceEnumList (`[AllowAnonymous]`), GetUsStatesEnumList (`[AllowAnonymous]`), GetSubmitterRoleEnumList (`[AllowAnonymous]`), GetDateFilterTypeEnumList, GetNotificationFilterOptions, GetBlastEmailActionFilterOptionsEnumList

---

### Offer Management

#### IBuyerOffer (`/api/services/app/IBuyerOffer/`)

The largest AppService (~35 public methods). Full offer lifecycle.

| Method | Purpose | Auth |
|--------|---------|------|
| CreateAsync | Create offer | `[AbpAuthorize]` |
| RenewOfferAsync | Renew expired offer | `[AbpAuthorize]` |
| GetAsync | Get offers for property | `[AbpAuthorize]` |
| GetHistoryOffers | Offer version history | Authenticated |
| GetLeadingOfferByPropertyIdAsync | Get best offer | Authenticated |
| AcceptOrDeclineAsync | Accept/decline offer | Authenticated |
| GiveFeedbackAsync | Submit offer feedback | Authenticated |
| ShareToClientAsync | Share offers to customer | Authenticated |
| ToggleUserEnabled / ToggleRenewalRequested | Toggle flags | Authenticated |
| DeleteAsync | Delete offer | Authenticated |
| UpdateClosingCostAsync | Update closing cost | `[AbpAuthorize]` |
| UpdateLessMortgageAsync | Update mortgage + recalculate all | Authenticated |
| UpdateIsOfferTabViewedAsync | Mark tab viewed | Authenticated |
| UpdateFlagAsync | Toggle offer flag | Authenticated |
| SubmitCounterAsync | Submit counter offer | Authenticated |
| SubmitFullCounterAsync | Submit full counter | Authenticated |
| SubmitFullCounterForApiAsync | API counter submission | Authenticated |
| UpdateCounterOfferAsync / UpdateCounterOfferForApiAsync | Update pending counter | Authenticated |
| RespondToCounterAsync | Respond to counter | Authenticated |
| GetPendingCounterOfferAsync | Get pending counter | Authenticated |
| UpdateOfferStatus | Update pipeline status | Authenticated |
| GetOfferStatusesForManagement | Status options | Authenticated |
| GetOfferNotes / CreateOfferNote / DeleteOfferNote | Note CRUD | Authenticated |
| GetOfferHistoryAsync | Full history with events | Authenticated |
| GetInvestorDisplayNames | Investor display name mapping | Authenticated |
| GetPDFDetailsAsync | Offer PDF data | Authenticated |
| UpdateFeedback | Update offer feedback | Authenticated |
| GetAcceptedIBuyerOfferSurveyByPropertyIdAsync | Accepted offer survey | Authenticated |
| CreateOrUpdateAcceptedIBuyerOfferSurveyAsync | Create/update survey | Authenticated |
| CheckAndUpdateExpiredWithPrelims | Auto-refresh expired prelims | Authenticated |

#### OfferBonus (`/api/services/app/OfferBonus/`)

New since 2026-04-06 (PR 8746). Offer bonus promotions spanning offer-type windows.

| Method | Purpose | Request | Response |
|--------|---------|---------|----------|
| GetAllAsync | Paged bonus list by filter | `GetOfferBonusesInput` | `PagedResultDto<OfferBonusDto>` |
| CreateAsync | Create offer bonus | `CreateOfferBonusInput` (OfferTypes, BonusAmount, StartDate, EndDate) | `OfferBonusDto` |
| UpdateAsync | Update offer bonus | `UpdateOfferBonusInput` | `OfferBonusDto` |
| DeleteAsync | Delete by id | Route: id | void |
| GetActiveAsync | Currently-active bonuses | — | `List<OfferBonusDto>` |

#### IBuyer (`/api/services/app/IBuyer/`)

| Method | Purpose | Auth |
|--------|---------|------|
| CreateOrUpdateAsync | Create/update iBuyer | `Pages_IBuyers_Create/Edit` |
| DeleteAsync | Delete iBuyer | `Pages_IBuyers_Delete` |
| GetAsync | Paged iBuyer list | `Pages_IBuyers` |
| GetAllActiveAndInactiveIBuyersAsync | All iBuyers | `Pages_IBuyers` |
| GetAllPagesAsync | Full list | `Pages_IBuyers` |
| GetByIdAsync | Single iBuyer | `Pages_IBuyers` |

#### OfferStatus (`/api/services/app/OfferStatus`)

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET | `/api/services/app/OfferStatus` | List all offer statuses | `[Authorize]` |
| PUT | `/api/services/app/OfferStatus` | Update status label/color | `[Authorize]` |

Note: Uses `[Authorize]` (ASP.NET Core) not `[AbpAuthorize]`.

#### OfferFile (`/api/services/app/OfferFile/`)

| Method | Purpose | Auth |
|--------|---------|------|
| GetAsync | List offer files | `[AbpAuthorize]` |
| UploadAsync | Upload file to offer | `[AbpAuthorize]` |
| UploadMultipleAsync | Multi-upload | `[AbpAuthorize]` |
| DeleteAsync | Delete offer file | `[AbpAuthorize]` |

**Offer Documents (added PRs 8839/8844):** new DTOs `OfferExplainerOutput` (HasExplainer + File) and `OfferDocumentSlotsOutput` surface **Comparables Analysis** and **Offer Explainer** document uploads for offer tiles. Persisted via migration `20260409055722_AddOfferDocumentFlags` on `Customer.OfferDocuments`.

#### OfferTypeConfigurations (`/api/services/app/OfferTypeConfigurations/`)

| Method | Purpose | Auth |
|--------|---------|------|
| GetAsync | Get tenant offer type configs | Authenticated |
| GetOfferTypeConfigAsync | Config by property (state-aware) | Authenticated |
| UpdateAsync | Update configs | Authenticated |
| GetAllConfigAsync | All configs (admin) | Authenticated |
| GenerateConfigurationAsync | Generate config | Authenticated |
| CheckCashBuyerEnabledAsync | Check cash buyer flag | Authenticated |
| SetRealvalueAsync | Set RealValue by state | Authenticated |
| ClearRealvalueAsync | Clear RealValue | Authenticated |
| GetAllRealvalueAsync | All RealValue configs | Authenticated |
| GetRealvalueByStateAsync | RealValue for state | Authenticated |
| GetAllOfferConfigByStateAsync | All configs by state | Authenticated |
| GetAllOfferConfigAsync | All configs | Authenticated |
| Get/Set/Update/Delete CashBuyerConfig | Cash Buyer CRUD | Authenticated |
| Get/Set/Update/Delete CashOfferConfig | Cash Offer CRUD | Authenticated |
| Get/Set/Update/Delete CashOfferPlusConfig | Cash+ CRUD | Authenticated |
| Get/Set/Update/Delete FixListConfig | Fix List CRUD | Authenticated |
| Get/Set/Update/Delete SellLeasebackConfig | Sell Leaseback CRUD | Authenticated |
| UpdateIsDisabledConfigAsync | Toggle disable by type/state | Authenticated |
| GetUsStates / GetOfferTypes | Enum lookups | Authenticated |

---

### Agent & Organization

#### Agent (`/api/services/app/Agent/`)

| Method | Purpose | Auth |
|--------|---------|------|
| GetAsync | Agent profile | Permission-based |
| GetAllAgentsForManagerAsync | Agents under manager | Authenticated |
| GetAllManagersAsync | All managers | `Pages_Tenant_Agents` |
| AssignMultipleAgentsToManagerAsync | Bulk assign to manager | `Pages_Tenant_Agents_AssignToManager` |
| GetAgentsToAssignAsync | Assignment candidates | `Pages_Tenant_Agents_GetToAssign` |
| GetReferralLinkAsync | Agent referral link | `Pages_Tenant_Agents_GetReferralLink` |
| GetCustomDomainAsync | Custom domain info | Authenticated |
| ResolveReferralLinkAsync | Resolve referral | Authenticated |
| GetAgentNameAsync | Agent name by ID | Authenticated |
| GetAgentsByZipCodes | Agents by zip | Authenticated |
| GetAgentsManagersBrokers | All admin users | Authenticated |
| AssignLeadsByZipCodes | Auto-assign by zip | Authenticated |
| AssignLeadsToAgentAsync | Assign leads to agent | Authenticated |
| UnAssignLeadsAsync | Unassign leads | Authenticated |
| SoftDeleteAgentAsync | Soft delete agent | Authenticated |
| SoftDeleteAgentUser | Soft delete (internal) | Authenticated |
| RestoreAgentAsync | Restore deleted agent | Authenticated |
| GetArchivedUsers | Archived users list | Authenticated |
| GetArchvedUsersHistoryItems | Deletion history | Authenticated |
| GetAffectedCustomers | Customers affected by deletion | Authenticated |
| CheckAgent | Check agent exists | Authenticated |

#### Organization (`/api/services/app/Organization/`)

| Method | Purpose |
|--------|---------|
| GetAsync / GetV2Async | Org hierarchy tree |
| GetV2ChildAsync | Lazy-load children |
| SearchV2Async | Search org tree |
| GetV2AssignmentListsAsync | Assignment candidates |
| SwapClientAsync | Bulk reassign clients |
| SwapBrokerageAdminAsync | Reassign brokerage admin |

#### OrganizationV2 (`/api/services/app/OrganizationV2/`)

Optimized V2 with same interface: GetAsync, GetChildAsync, SearchAsync, GetAssignmentListsAsync.

---

### Onboarding & Registration

#### Onboarding (`/api/services/app/Onboarding/`)

| Method | Purpose | Auth |
|--------|---------|------|
| Onboard | Full seller onboarding pipeline | `[AllowAnonymous]` |
| SendUploadPhotosLink | Send photo upload SMS | Authenticated |

- Onboard: register user → create customer → create property → assign agent → trigger AVM
- Since 2026-04-06 the shared code was refactored into `Offervana.Application.Shared/Onboarding/Services/OnboardingSharedService.cs` + 2 new Temporal workflows (`RecalculateOffersWorkflow`, `ValidateAvmValueWorkflow`) for cross-project reuse.

#### TenantRegistration (`/api/services/app/TenantRegistration/`)

| Method | Purpose | Auth |
|--------|---------|------|
| RegisterTenant | Full tenant provisioning | Host context |
| CompleteTenantRegistration | Finalize checkout-code reg | Host context |
| GetEditionsForSelect | List paid editions | Anonymous |
| GetEdition / GetEditionByName | Edition details | Anonymous |
| VerifyRegistration | Check registration by email | Anonymous |
| GetSeatDetailsTenant | Seat counts/pricing | Anonymous |

---

### Integrations

#### Blast (Home Report Subscriptions) (`/api/services/app/Blast/`)

| Method | Purpose |
|--------|---------|
| GetInfo / GetBillingInfo / GetBalance | Recurly subscription details for HR |
| PauseSubscription / ResumeSubscription | Manage HR subscription state |
| CancelSubscription / ReactivateCanceledSubscription | Cancel/reactivate HR |
| ChangeSubscription | Change HR plan |
| UpdateBillingInfo | Update payment method |
| GetInvoices / GetInvoicePDF | HR billing history |
| CreateEdition / EditEdition / DeleteEdition | Manage HR editions |
| SplitBill | Split HR billing 50/50 (`[AllowAnonymous]`) |
| GetImportCsvModel | CSV import template |
| ParceCsvHeaders / ParceCsv | Parse CSV for import |
| ValidateImportRecords | Validate CSV records |
| AddCustomersToBlast | Bulk enroll in HR campaigns |

#### BlastBoard (Home Report Dashboard) (`/api/services/app/BlastBoard/`)

| Method | Purpose |
|--------|---------|
| GetRealValue | AVM for property (ATTOM) |
| GetHomeEquity | Equity analysis (value - mortgage) |
| FillHomeEquitySurvey | Submit mortgage data |
| GetHistoricalValue | Property value trends |
| GetCashOffers | Active iBuyer offers |
| GetSalesTrend | Market sales CMA |
| GetLongTermRentalAvm | Rental estimates |
| GetShortTermRentalAvm | Airbnb estimates (AirDNA) |
| GetBlastSurvey / EditAttomSurvey | Survey data CRUD |
| GetRentVsSellBreakdown | Financial analysis |
| GetLenderInformation / EditLenderInformation | Lender info CRUD |
| ContactLender / ContactAgent | Contact requests |
| ShareReport / GetShareReport | Shareable HR links |
| SendShareReportValidationCode / ValidateShareReportCode | Share report verification |
| SendEmailVerificationCode / ValidateEmailVerificationCode | Email verification |
| GetPropertyDetailsByAddress | Anonymous property preview (`[AllowAnonymous]`) |

#### SendGrid (`/api/services/app/SendGrid/`)

| Method | Purpose | Auth |
|--------|---------|------|
| BounceWebhook | Ingest SendGrid bounces | `[AllowAnonymous]` (signature validated) |
| EmailSendingWebhook | Buffer email events to blob | `[AllowAnonymous]` |
| ProcessEmailWebhook | Process buffered payloads | `[FunctionKeyFilter]` |

#### Twilio (`/api/services/app/Twilio/`)

| Method | Purpose | Auth |
|--------|---------|------|
| CreateInternalPhoneNumberAsync | Provision Twilio number (AZ area codes) | `Pages_Tenant_Texts_CreateInternalPhoneNumber` |

Webhook controllers (Web.Host):

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/Twilio/OnMessageStatusUpdated` | SMS delivery status callback |
| POST | `/Twilio/OnMessageReceived` | Inbound SMS routing (agent↔customer) |
| POST | `/Twilio/OnVoiceReceived` | Inbound voice forwarding |
| POST | `/Twilio/OnError` | Error callback |

#### Recurly (Tenant Billing) (`/api/services/app/Recurly/`)

Full subscription lifecycle: GetInfo, GetBillingInfo, UpdateBillingInfo, PauseSubscription, ResumeSubscription, CancelSubscription, ReactivateCanceledSubscription, ChangeSubscription, ChangeSeats, GetInvoices, GetBalance, SetSeatPrice, CreateEdition, EditEdition, DeleteEdition, UpgradeTenantPlan, UpgradeFreeAgentTenant, GetInvoicePDF, PreviewUpgradeInvoice, ReactivateExpired, GetRecurlyPurchaseItems (`[AllowAnonymous]`)

Webhook controller (Web.Host): `POST /Recurly` — handles PaidChargeInvoice, FailedTransaction, ReactivatedSubscription (XML, IP whitelist)

#### Zapier (`/api/services/app/Zapier/`)

| Method | Purpose | Auth |
|--------|---------|------|
| GetUpdatedUsers | Users modified in 24h | `Pages_Administration_Users` |
| GetDeletedUsers | Deleted users | `Pages_Administration_Users` |
| GetLockedUsers | Locked users | `Pages_Administration_Users` |
| GetUpdatedIBuyersAsync | Modified iBuyers | `Pages_IBuyers` |
| GetUpdatedPropertyAsync | Modified properties | `Pages_Tenant_Properties` |
| RegisterProperty | Create customer+property from Zapier | `Pages_Tenant_Properties` |
| RegisterPropertyRoundRobin | Same with round-robin assignment | `Pages_Tenant_Properties` |
| CreateCashOfferPlus | Create Cash+ offer | `Pages_IBuyers` |

#### Google (Gmail + OAuth)

Gmail (`/api/services/app/Google/Gmail/`):

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET | `Gmail/Messages/Get` | List emails for property | `Pages_Tenant_Google_Auth` |
| POST | `Gmail/Messages/Send` | Send email | `Pages_Tenant_Google_Auth` |
| PATCH | `Gmail/Messages/MarkAsRead` | Mark as read | `Pages_Tenant_Google_Auth` |

GoogleSettings: AuthAsync (exchange OAuth code), VerifyAuthAsync (check auth), LogOut (remove tokens)

#### Strapi (`/api/services/app/Strapi/`)

| Method | Purpose |
|--------|---------|
| GetLatestArticleAsync | Latest CMS article |
| CheckForArticleAsync | Check article exists |
| GetArticleBySlugAsync | Article by slug |
| GetAllArticlesAsync | All articles |

---

### Home Report & Analytics

#### HomeReport (`/api/services/app/HomeReport/`)

| Method | Purpose |
|--------|---------|
| GetAvgTimeSpent | Avg time per HR container |
| GetAiInsights | AI session insights (Langfuse) |
| GetPropertyActivity / GetPropertyActivityParam | Property event timeline |
| GetNotifications / GetNotificationsFromSearch | Activity notifications |
| GetNotificationsBadge | Unread notification count |
| GetNotificationsForZapier | Notifications for Zapier |
| ChangeActivityViewState | Mark as viewed |
| BulkAddClientsToHomeReport | Temporal workflow: bulk HR add |
| BulkDeleteClientsFromHomeReport | Temporal workflow: bulk HR remove |
| BulkAddStatus / BulkDeleteStatus | Progress polling (0-100%) |
| MigrateHistoryLogs / MigrateCustomerScores | Temporal migration workflows |
| GetClientIds | Client IDs by filter |

#### Statistics (`/api/services/app/Statistics/`)

| Method | Route | Auth |
|--------|-------|------|
| GetAgentStatisticsForBrokerageAdminAsync | `Statistics/Agents/BrokerageAdmin` | Permission |
| GetAgentStatisticsForManagerAsync | `Statistics/Agents/Manager` | Permission |
| GetPropertyProgramStatisticsForHostAdminAsync | `Statistics/PropertyPrograms/HostAdmin` | Implicit |
| GetPropertyProgramStatisticsForBrokerageAdminAsync | Role-scoped | Implicit |
| GetPropertyProgramStatisticsForManagerAsync | Role-scoped | Implicit |
| GetPropertyProgramStatisticsForAgentAsync | Role-scoped | Implicit |
| GetAlerts | Dashboard alerts | Authenticated |
| UpdateAlert | Dismiss alert | Authenticated |

---

### Administration

#### User (`/api/services/app/User/`)

| Method | Purpose | Auth |
|--------|---------|------|
| GetUsers | Paginated user list | Role-scoped |
| GetUsersFromSearch | Azure Search user list | Role-scoped |
| GetAllUserPages | User sync for Zapier automation | Implicit |
| GetUsersToExcel | Excel export | Implicit |
| GetUserForEdit | Load user for edit form | Implicit |
| GetTeamMemberForEdit | Load team member for edit | Implicit |
| CreateOrUpdateUser | Create/update user | Implicit |
| DeleteUser | Delete user (role-hierarchy) | `Pages_Administration_Users_Delete` |
| UnlockUser | Clear lockout | `Pages_Administration_Users_Unlock` |
| TriggerEmailForCustomer | Test emails (dev/UAT only) | Implicit |

#### Role (`/api/services/app/Role/`)

| Method | Purpose | Auth |
|--------|---------|------|
| GetRoles (POST) | Filter by permissions | `Pages_Administration_Roles` |
| GetRoleList (GET) | Full role list | `Pages_Administration_Roles` |
| CreateRole | Create/update role | `Pages_Administration_Roles` |
| DeleteRole | Delete role | `Pages_Administration_Roles` |
| GetRolePermissions | Permissions for role | `Pages_Administration_Roles` |
| GrantPermissionsToRole | Set permissions | `Pages_Administration_Roles` |
| GetRole | Single role for editing | `Pages_Administration_Roles` |

#### Permission (`/api/services/app/Permission/`)

| Method | Purpose | Auth |
|--------|---------|------|
| GetAllPermissions | Complete permission hierarchy | None explicit |

#### Profile (`/api/services/app/Profile/`)

| Method | Purpose | Auth |
|--------|---------|------|
| GetCurrentUserProfileForEdit | Profile for edit form | Implicit |
| UpdateCurrentUserProfile | Save own profile | Implicit |
| UpdateSelectedUserProfile | Admin edits user | `[AbpAuthorize]` |
| ChangePassword | Change password | `[AllowAnonymous]` |
| UpdateProfilePicture | Crop/save avatar | `[AllowAnonymous]` |
| GetProfilePicture / GetAvatarById | Retrieve avatar | Various |
| GetProfilePictureById / GetPublicProfilePictureById | By GUID | `[AllowAnonymous]` |
| GetFriendProfilePictureById | Other user's avatar | Implicit |
| GetUserInfoForProfileById | Lightweight profile info | Implicit |
| GetProfilePicIdByUserIdList | Bulk picture IDs | Implicit |
| DisableGoogleAuthenticator | Clear 2FA | `[AbpAuthorize]` |
| UpdateGoogleAuthenticatorKey | Generate 2FA key + QR | `[AbpAuthorize]` |
| SendVerificationSms / VerifySmsCode | Phone verification | `[AbpAuthorize]` |
| VerifySmsCodeAndActivateUser | Activate inactive user | `[AbpAuthorize]` |
| Lender Profile/Logo (Update/Delete/Get) | Lender branding | `[AllowAnonymous]` |
| GetAgentLogoAddressAsPerHierarchy | Hierarchy logo resolution | Implicit |
| ChangeLanguage | UI language preference | `[AbpAuthorize]` |
| GetPasswordComplexitySetting | Password rules | Mixed |

#### Tenant (`/api/services/app/Tenant/`)

| Method | Purpose | Auth |
|--------|---------|------|
| GetTenants | Paged tenant search | `Pages_Tenants` |
| GetAllTenants | Full tenant list | `Pages_Tenants` |
| CreateTenant | Provision tenant | `Pages_Tenants_Create` |
| GetTenantForEdit | Load tenant for edit | `Pages_Tenants_Edit` |
| UpdateTenant | Update tenant | `Pages_Tenants_Edit` |
| DeleteTenant | Delete tenant | `Pages_Tenants_Delete` |
| UnlockTenantAdmin | Clear admin lockout | `Pages_Tenants` |
| Get | Get tenant by checkout code | `[AbpAllowAnonymous]` |

#### Host Settings (`/api/services/app/HostSettings/`)

| Method | Purpose | Auth |
|--------|---------|------|
| GetAllSettings | Full host config | `Pages_Administration_Host_Settings` |
| UpdateAllSettings | Save host config | `Pages_Administration_Host_Settings` |
| SendTestEmail | Test SMTP | `Pages_Administration_Host_Settings` |
| GetGhlPipelines | GoHighLevel pipelines | `Pages_Administration_Host_Settings` |

#### Tenant Settings (`/api/services/app/TenantSettings/`)

| Method | Purpose |
|--------|---------|
| GetAllSettings / UpdateAllSettings | Full tenant settings CRUD |
| ClearLogo / ClearFavicon / ClearCustomCss / ClearUrlCustomPreviewImage | Branding cleanup |
| ClearUserLogo | Clear user logo (`[AbpAllowAnonymous]`) |
| SwitchRegistrationLink / GetRegistrationLinkEnabled | Registration link toggle |
| SendTestEmail | Test SMTP |

#### TenantSettingsAppearance (`/api/services/app/TenantSettingsAppearance/`)

| Method | Purpose |
|--------|---------|
| GetAppearanceAsync | Header/footer visibility toggles |
| SendTestEmail | Test SMTP |

#### UiCustomizationSettings (`/api/services/app/UiCustomizationSettings/`)

| Method | Purpose | Auth |
|--------|---------|------|
| GetUiManagementSettings | Available themes | `[AbpAuthorize]` |
| ChangeThemeWithDefaultValues | Switch theme | `[AbpAuthorize]` |
| UpdateUiManagementSettings | Save user UI prefs | `[AbpAuthorize]` |
| UpdateDefaultUiManagementSettings | Set tenant defaults | `Pages_Administration_UiCustomization` |
| UseSystemDefaultSettings | Revert to defaults | `[AbpAuthorize]` |

#### MarketingConfiguration (`/api/services/app/MarketingConfiguration/`)

| Method | Purpose |
|--------|---------|
| GetSettings / UpdateSettings | Marketing module config |

#### AuditLog (`/api/services/app/AuditLog/`)

GetAuditLogs, GetAuditLogsToExcel, GetEntityHistoryObjectTypes, GetEntityChanges, GetEntityTypeChanges, GetEntityChangesToExcel, GetEntityPropertyChanges — all require `Pages_Administration_AuditLogs`.

#### Notification (`/api/services/app/Notification/`)

| Method | Purpose | Auth |
|--------|---------|------|
| GetUserNotifications | List notifications (auto-marks read) | `[AbpAuthorize]` |
| checkUserExists | Validate property access | `[AbpAuthorize]` |
| SetAllNotificationsAsRead | Mark all read | `[AbpAuthorize]` |
| SetNotificationsAsRead | Bulk state update | `[AbpAuthorize]` |
| SetNotificationAsRead | Single state update | `[AbpAuthorize]` |
| GetNotificationSettings | Notification preferences | `[AbpAuthorize]` |
| UpdateNotificationSettings | Save preferences | `[AbpAuthorize]` |
| DeleteNotification | Delete single | `[AbpAuthorize]` |
| DeleteSelectedNotification | Bulk delete | `[AbpAuthorize]` |
| DeleteAllUserNotifications | Clear by filter | `[AbpAuthorize]` |

#### HostDashboard (`/api/services/app/HostDashboard/`)

GetTopStatsData, GetRecentTenantsData, GetSubscriptionExpiringTenantsData, GetEditionTenantStatistics — all `Pages_Administration_Host_Dashboard`.

#### TenantDashboard (`/api/services/app/TenantDashboard/`)

GetMemberActivity, GetDashboardData, GetTopStats, GetProfitShare, GetDailySales, GetSalesSummary, GetRegionalStats, GetGeneralStats — all `Pages_Tenant_Dashboard`. Note: all methods return placeholder/randomized data.

#### Edition (`/api/services/app/Edition/`)

| Method | Purpose | Auth |
|--------|---------|------|
| GetEditions | All editions with pricing | `Pages_Editions` |

#### HostAdmin (`/api/services/app/HostAdmin/`)

| Method | Purpose | Auth |
|--------|---------|------|
| GetCustomerList | Cross-tenant customer search | Host context |
| GetPartialLeads | Cross-tenant partial leads | Host context |

#### WebLog (`/api/services/app/WebLog/`)

| Method | Purpose | Auth |
|--------|---------|------|
| GetLatestWebLogs | Recent 100 log entries | `Pages_Administration_Host_Maintenance` |
| DownloadWebLogs | Download logs as ZIP | `Pages_Administration_Host_Maintenance` |

#### Caching (`/api/services/app/Caching/`)

| Method | Purpose | Auth |
|--------|---------|------|
| GetAllCaches | List cache entries | `Pages_Administration_Host_Maintenance` |
| ClearCache | Clear specific cache | `Pages_Administration_Host_Maintenance` |
| ClearAllCaches | Clear all caches | `Pages_Administration_Host_Maintenance` |

#### Timing (`/api/services/app/Timing/`)

| Method | Purpose | Auth |
|--------|---------|------|
| GetTimezones | All timezones | None |
| GetTimezoneComboboxItems | Timezone dropdown options | None |

#### CommonLookup (`/api/services/app/CommonLookup/`)

| Method | Purpose | Auth |
|--------|---------|------|
| GetEditionsForCombobox | Editions for dropdown | `[AbpAuthorize]` |
| FindUsers | User search for selection | `[AbpAuthorize]` |
| Unsubscribe | Email unsubscribe | Anonymous (security stamp) |

#### UserLogin (`/api/services/app/UserLogin/`)

| Method | Purpose | Auth |
|--------|---------|------|
| GetRecentUserLoginAttempts | Last 10 login attempts | `[AbpAuthorize]` |

#### UserLink (`/api/services/app/UserLink/`)

| Method | Purpose | Auth |
|--------|---------|------|
| LinkToUser | Link accounts | `[AbpAuthorize]` |
| GetLinkedUsers | Paged linked accounts | `[AbpAuthorize]` |
| GetRecentlyUsedLinkedUsers | Recent 3 linked | `[AbpAllowAnonymous]` |
| UnlinkUser | Remove link | `[AbpAuthorize]` |

---

### Forms & Leads

#### CommerceSiteForms (`/api/services/app/CommerceSiteForms/`)

All anonymous: RequestDemoAsync, RequestInformationAsync, CapitalGetStarted, PodcastsSignup, ResourceFeatured

#### LandingPageForms (`/api/services/app/LandingPageForms/`)

SubmitMainFormAsync (`[AbpAllowAnonymous]`), SubmitContactUsFormAsync, SubmitTradeInAsync, SubmitOfferAsync

#### PartialLead (`/api/services/app/PartialLead/`)

| Method | Purpose |
|--------|---------|
| CreateOrUpdateByAddressLine | Upsert partial lead |
| GetAsync | Paged partial leads |
| GetPartialLeadById | Single lead |
| GetCustomersAsync | Customer search for merge |
| MergeWithCustomerAsync | Merge lead with customer |
| AddToExisting | Convert lead to property |
| DeleteAsync / DeleteSelectedPartialLeads | Delete leads |
| GetAgentNameByLeadId | Agent name for lead |
| GetHowPartialLeadIsCreatedEnumList | Creation source enum |

#### ContactList (`/api/services/app/ContactList/`)

CRUD: CreateOrUpdateAsync, GetAsync, GetAllPagesAsync, GetByIdAsync, DeleteAsync

#### CsvImport (`/api/services/app/CsvImport/`)

| Method | Purpose |
|--------|---------|
| Import | Main bulk import (customer+property creation) |
| CreateCsvImportFileLog | Log import operation |
| GetCsvImportFileLog | Import history |
| GetCurrentImportProgress | Import progress |
| GetCurrentDeleteProgress | Delete progress |
| DeleteFromList / DeleteCsvUpload | Remove imported records |
| GetEmailValidationResults | Validation results |
| GetSurplusUsers / RemoveSurplusUsers | Overflow management |
| GetFileProperties | Properties from import |
| GetFileLogRelatedUsers | Users from import |

---

### Utility Services

#### Place (Address Autocomplete) (`/api/services/app/Place/`)

All `[AllowAnonymous]`:

| Method | Purpose |
|--------|---------|
| GSearchAddress | Google Places autocomplete |
| GAddressDetails | Google place details |
| GetPlaceCoordinates | Geocode address to lat/lng |
| SmartySearchAddress | Smarty Streets USPS autocomplete |
| SmartyEntries | Multi-unit expansion |
| VerifySmartyPropAddress | Full address verification |

#### Brokerage (`/api/services/app/Brokerage/`)

| Method | Purpose |
|--------|---------|
| GetBrokerageAsync | Get brokerage by ID |
| GetAllBrokeragesAsync | All brokerages (cached) |
| GetAdditionalFees | Additional fee config |
| UpdateEmailAndPhone | Update brokerage contact |
| UpdateCustomDomain | Configure Cloudflare custom domain |
| UpdateVerifyCustomDomain | Verify DNS records |
| VerifyCloudFlareCertificate | Check SSL status |
| GetNewRecords | Latest DNS records |
| DeleteCustomDomain | Remove custom domain |
| RunDeleteDNSLoop | Cleanup orphaned DNS |

#### RoundRobin (`/api/services/app/RoundRobin/`)

SetUpBrokerageRoundRobin, AssignAgentToRoundRobinAsync, AssignManagerToRoundRobinAsync, RemoveAgentFromRoundRobinAsync, RemoveManagerFromRoundRobinAsync, ReorderAgentsInRoundRobinAsync, ReorderManagersInRoundRobinAsync — all permission-protected.

#### Text (SMS/In-App) (`/api/services/app/Text/`)

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET | `Text/SmsMessages` | List SMS messages | `Pages_Tenant_Texts` |
| POST | `Text/SmsMessages` | Send SMS | `Pages_Tenant_Texts_SendSms` |
| GET | `Text/InAppMessages` | List in-app messages | `Pages_Tenant_Texts` |
| POST | `Text/InAppMessages` | Send in-app message | `Pages_Tenant_Texts_SendMessage` |

#### Note (`/api/services/app/Note/`)

CreateAsync, GetByPropertyIdAsync, DeleteByIdAsync, DeleteAllByPropertyIdAsync — standard CRUD.

#### CustomerNote (`/api/services/app/CustomerNote/`)

CreateAsync, UpdateAsync, DeleteAsync, GetAsync, GetListAsync, DuplicateAsync, PinedAsync (toggle pin) — standard CRUD.

#### ToDoTask (`/api/services/app/ToDoTask/`)

CreateOrUpdateAsync, GetByPropertyIdAsync, GetAllAsync, GetAllByAgentIdAsync, DeleteAsync — permission-protected CRUD.

#### ChecklistStage (`/api/services/app/ChecklistStage/`)

GetAllAsync, GetAsync, CreateOrUpdateAsync, DeleteAsync — permission-protected CRUD.

#### Banners (`/api/services/app/BannersAppService/`)

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `banner` | Create banner |
| PUT | `banner/{id}` | Update banner |
| POST | `banner/close/{id}` | Close/dismiss banner |
| GET | `banners` | All banners (optionally expired) |
| GET | `display-banners` | Banners for current user |

#### Other Utilities

| Service | Key Methods | Auth |
|---------|------------|------|
| OuterApiKeys | Generate, Get, Refresh, Delete | Tenant-scoped |
| SourceKey | Create, Delete, Get, Update, SubmitEvent (`[AbpAllowAnonymous]`), GetSourceKeyEvents | `Pages_Administration_Host_SourceKeys` |
| Pixels | CRUD + GetSingle (role-based fallback), GetSingleSEO | `Pages_IBuyers` |
| Links | GetAsync, SetAsync | Permission-protected |
| ZipCode | Get, CreateOrUpdate, CreateZipCode, DeleteZipCode, DeleteAllZipCodes | Authenticated |
| LoanType | CreateOrUpdateLoanTypeAsync, GetLoanTypesAsync | Authenticated |
| ClientType | GetAllClientTypesAsync | Authenticated |
| Tracking | LogEvent (Amplitude forwarding) | Authenticated |
| LoginAlerts | GetLoginAlertsForUser, MarkAsSeenByUser | `[AbpAuthorize]` |
| ReleaseNotes | CreateOrUpdate, Get, GetAll, Delete (soft) | Authenticated |
| Redirect | GetUrl, SetUrl (60-min TTL cache) | None |
| Attribution | CreateAttributionAsync | `[AllowAnonymous]` |
| LandingText | CreateOrUpdateAsync, GetAsync (hierarchy fallback) | Authenticated |
| Index (Search) | IndexCustomer | `[AbpAuthorize]` |
| BinaryObjectBlobMigration | MigrateSingle, StartMigration (Temporal) | `Pages_Tenants` |

---

### Web Controllers (MVC)

#### File Downloads (`/File/`)

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET | `/File/DownloadTempFile` | Download by token | Implicit |
| GET | `/File/DownloadBinaryFile` | Download by GUID | Implicit |
| GET | `/File/DownloadDocument` | Download from wwwroot | Implicit |
| POST | `/File/GetClientListCsvList` | Export client list CSV | Implicit |

#### Tenant Customization (`/TenantCustomization/`)

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| POST | `UploadLogo` | Upload tenant/user logo (5MB, JPEG/PNG/GIF) | `[AbpMvcAuthorize]` |
| POST | `UploadUrlCustomPreviewImage` | Upload OG image | `Pages_Administration_Tenant_Settings` |
| POST | `UploadCustomCss` | Upload custom CSS (1MB) | `Pages_Administration_Tenant_Settings` |
| POST | `UploadFavicon` | Upload favicon (ICO) | `[AbpMvcAuthorize]` |
| GET | `GetFavicon` | Get favicon | `[AllowAnonymous]` |
| GET | `GetUrlCustomPreviewImage` | Get OG image | `[AllowAnonymous]` |
| GET | `GetLogo` | Get tenant logo | `[AllowAnonymous]` |
| GET | `GetTenantLogo` | Get logo with default fallback | `[AllowAnonymous]` |
| GET | `GetCustomCss` | Get custom CSS | `[AllowAnonymous]` |

#### User Management (`/Users/`)

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| POST | `ImportFromExcel` | Bulk import from Excel (100MB) | `Pages_Administration_Users_Create` |
| POST | `UploadUserLogo` | Upload user logo | `[AllowAnonymous]` |
| POST | `UploadFavicon` | Upload agent favicon | `[AllowAnonymous]` |
| GET | `GetFavicon` | Get agent favicon | `[AllowAnonymous]` |
| GET | `GetAgentFaviconAsPerHierarchy` | Favicon with hierarchy fallback | `[AllowAnonymous]` |
| GET | `GetUserLogo` | User logo with hierarchy fallback | `[AllowAnonymous]` |
| * | `ClearFavicon` | Remove agent favicon | `Pages_Administration_Users` |

#### Profile Uploads (`/Profile/`)

UploadProfilePicture, UploadLenderLogoPicture — file upload for profile images.

#### UI / Auth Pages (`/Ui/`)

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET | `/Ui/Index` | Swagger home (redirect to login if unauth) | Anonymous |
| GET/POST | `/Ui/Login` | Login form | Anonymous |
| GET | `/Ui/Logout` | Sign out | Cookie auth |

#### Public Site

| Route | Purpose |
|-------|---------|
| `/Home/Index` | Redirect to `/Ui/Index` |
| `/About/Index` | About page |
| `/Account/Login` | SSO token login |
| `/Account/Logout` | Sign out + redirect |

#### Error Pages

| Route | Purpose |
|-------|---------|
| `/Error/Index` | Generic error (dispatches to 404/403) |
| `/Error/E403` | Forbidden |
| `/Error/E404` | Not Found |

#### Anti-Forgery

`GET /AntiForgery/GetToken` — CSRF token generation (set in cookie/header)

#### Recurly Webhook

`POST /Recurly` — XML webhook handler (IP whitelist enforced)

#### BlogSeo Middleware

New since 2026-04-06 (PR 8741). `BlogSeoMiddleware` in `Web.Host/Middleware/` intercepts blog URL requests and injects server-rendered SEO metadata via `BlogSeoHtmlRenderer` before returning the Angular SPA shell.

---

### Azure Functions

| Function | Project | Trigger | Route | Auth | Purpose |
|----------|---------|---------|-------|------|---------|
| SendgridWebhookFunction | Zoodealio.FunctionApp | HTTP POST | `/api/SendgridWebhook` | Function Key | Buffer SendGrid webhooks to blob |
| SendgridWebhookFunction | Zoodealio.Functions (legacy) | HTTP POST | `/api/SendgridWebhook` | Anonymous | Same — legacy version |

---

## Shared Models

### Offer Type DTOs (from Zoodealio.Shared)

| DTO | Key Fields |
|-----|-----------|
| `CashOfferTypeDto` | OfferAmount, ClosingCostPercentage, ClosingCostAmount, ServiceChargePercentage, LessMortgage |
| `CashOfferPlusTypeDto` | OfferAmount, HoldbackPercentage, HoldbackAmount, UpsidePercentage, ImmediateCashAmount |
| `FixListTypeDto` | OfferAmount, RepairEscrow, RepairBudget, HoldbackPercentage, HoldbackAmount |
| `SellLeasebackTypeDto` | OfferAmount, LeaseTermMonths, MonthlyRent, BuybackPrice |
| `ListOnMarketTypeDto` | ListPrice, Commission, EstimatedNetProceeds |
| `CashBuyerTypeDto` | OfferAmount, ClosingCostPercentage, EMDAmount |

### Key Request/Response Models

| Model | Used By | Fields |
|-------|---------|--------|
| `CreateCustomerDto` | OuterApi Customers | Name, Email, Phone, Address, ImageUrls |
| `CreateOfferDto` | OuterApi Offers | PropertyId, IbuyerId, IsPreliminary, IsSharedToCustomer, ExpirationDate, offer type sub-DTOs |
| `GetPropertyOfferV2Dto` | OuterApi OffersV2 | All offer fields + OfferStatus, AgentNotes, ClientNotes, CounterOfferState, OfferSource, History |
| `OnboardingCreationModel` | Onboarding | Address, Name, Email, Phone, AgentRef — full seller pipeline |
| `CustomerListFilter` | Multiple | Search, DateRanges, LeadSource, Pagination, Sorting — used across customer/host admin endpoints |
| `AuthenticateModel` | TokenAuth | UserNameOrEmailAddress, Password, Otp, TenantName |
| `OfferBonusDto` | OfferBonus | Id, OfferTypes (comma-separated), BonusAmount, StartDate, EndDate, IsActive |
| `OfferExplainerOutput` | OfferFile | HasExplainer, File (FileOutput) |
| `OfferDocumentSlotsOutput` | OfferFile | Per-slot flags for offer document presence (Comparables Analysis, Offer Explainer) |

---

## Auth Patterns

### 1. JWT Bearer (Internal APIs)
- ABP-managed JWT tokens via `/api/TokenAuth/Authenticate`
- Access + refresh token pair
- Tenant-scoped (TenantId in claims)
- Permission-based via `[AbpAuthorize(AppPermissions.X)]`

### 2. OuterApi Key (External APIs)
- Custom `[OuterApiKeyFilter]` attribute
- API key passed in `apiKey` header
- Resolves to TenantId — all queries scoped to that tenant
- Combined with `[AllowAnonymous]` (bypasses JWT requirement)
- Custom `[OuterApiExceptionFilter]` for error handling

### 3. Anonymous (Public Endpoints)
- Onboarding, commerce forms, address lookup, webhooks
- SendGrid webhook validates signature headers
- Recurly webhook validates IP whitelist
- Twilio webhooks are fully anonymous

### 4. Function Key (Azure Functions)
- `[FunctionKeyFilter]` for function-to-API calls
- `AuthorizationLevel.Function` for external triggers

### 5. Cookie-based (MVC UI)
- `/Ui/Login` — cookie auth for Swagger/admin pages
- `/Account/Login` — SSO token login for public site

### 6. Impersonation
- Host admin can impersonate tenant users via one-time tokens
- Customer dashboard access via referral code (no credentials)
- Agent dashboard access via referral code

### Role Hierarchy

```
Host (system admin)
  └── Owner (tenant admin)
       └── BrokerageAdmin (brokerage management)
            └── Manager (team management)
                 └── Agent (individual contributor)
                      └── Customer (dashboard-only via referral)
```

### Inactive Services

- **HistoryLogAppService** — entirely commented out
- **EquityAppService** — all public methods commented out
- **ConsentController** — obsolete/commented out
