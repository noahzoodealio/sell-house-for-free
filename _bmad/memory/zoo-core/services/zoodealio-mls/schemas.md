---
artifact: schemas
service: zoodealio-mls
commit-sha: d42572f923c06d9445403b4a9716adeaeab8c6db
generated-at: 2026-04-15T20:55:13Z
entity-count: 5
---

# Zoodealio.MLS — Schemas

**No SQL DbContext exists in this service.** Zoodealio.MLS is storage-only: Azure AI Search (read + write), Azure Table Storage (job log), Azure Blob Storage (source files + images), and Azure Service Bus (photo-processing queue). Temporal Cloud carries durable workflow state.

Data stores:

| Store | Role | Primary shape |
|---|---|---|
| Azure AI Search | Property documents (read/write) | `PropertySearchDocument` (~248 fields in `mlsdata` index) |
| Azure Table Storage | Per-file pipeline log | `MlsProcessingLogEntity` |
| Azure Blob Storage | Source ZIPs + processed images | untyped blobs (`mlsimages` container, others per request) |
| Azure Service Bus | Photo download fan-out | `PhotoProcessingEvent` on `mls-photo-processing-queue` |
| Temporal Cloud | Durable photo-processing workflow | `PhotoProcessingWorkflowInput/Result`, `ProcessBatchInput/Result` |

All configuration values (index name, queue name, container name, Temporal schedule, namespace) come from `appsettings.json` / env vars — nothing is hard-coded in class defaults except a few sensible fallbacks.

---

## 1. Azure AI Search — `mlsdata` index

### `PropertySearchDocument`

**Source:** `Zoodealio.MLS.Storage/AzureSearch/Entities/PropertySearchDocument.cs` (1148 lines)
**Index name:** `mlsdata` (config `AzureSearch:IndexName`; code default in `AzureSearchConfiguration.cs` is `properties-index` but overridden by appsettings)
**Key field:** `AttomId` (`[SearchableField(IsKey = true)]`)
**Endpoint:** `https://zoodealio-mls-search.search.windows.net`

**Attribute conventions used throughout the class:**
- `[SearchableField]` — full-text searchable; most carry `IsFilterable = true`, `IsSortable = true`, occasionally `IsFacetable = true`, and `AnalyzerName = LexicalAnalyzerName.Values.StandardLucene` on free-text fields
- `[SimpleField]` — exact-match only; typical options `IsFilterable = true, IsSortable = true`, `IsFacetable = true` on classification-like fields
- `[JsonPropertyName(...)]` is used on select fields for camelCase Azure persistence; notably `ListingAgentMlsId` is serialized as `listingAgentMlsid` (lowercase `id`)

**Field roster (full — grouped logically for readability):**

**Identity & keys**
- `AttomId` string — `[SearchableField(IsKey = true)]`, `[JsonPropertyName("attomId")]`
- `MlsRecordId` string — `[SimpleField(IsFilterable, IsSortable)]`, `[JsonPropertyName("mlsRecordId")]`
- `MlsListingId` int? — `[SimpleField(IsFilterable, IsSortable)]`, `[JsonPropertyName("mlsListingId")]`
- `StatusChangeDate` DateTimeOffset? — `[SimpleField(IsFilterable, IsSortable, IsFacetable)]`

**Property address (resolved from ATTOM)**
- `PropertyAddressFull`, `PropertyAddressHouseNumber`, `PropertyAddressStreetDirection`, `PropertyAddressStreetName`, `PropertyAddressStreetSuffix`, `PropertyAddressStreetPostDirection`, `PropertyAddressUnitPrefix`, `PropertyAddressUnitValue`, `PropertyAddressCity`, `PropertyAddressState`, `PropertyAddressZip`, `PropertyAddressZip4` — all string?, `[SearchableField]` with `IsFilterable/IsSortable`. `City` and `State` also `IsFacetable`.
- `SitusCounty`, `Township` — string?, `[SimpleField(IsFilterable, IsSortable)]`. County `IsFacetable`.

**MLS listing address (may differ from property)**
- `MlsListingAddress`, `MlsListingCity`, `MlsListingState`, `MlsListingZip`, `MlsListingCountyFips`, `MlsNumber`, `MlsSource` — string?, searchable/filterable; `MlsListingCity/State`, `MlsListingCountyFips`, `MlsSource` `IsFacetable`.

**Status & pricing (note: many monetary/date fields are STRING — see inconsistencies below)**
- `ListingStatus`, `CurrentStatus` — string?, `IsFacetable`
- `MlsSoldDate`, `MlsSoldPrice` — string? (not DateTimeOffset/decimal)
- `AssessorLastSaleDate` DateTimeOffset?, `AssessorLastSaleAmount` double?
- `MarketValue` double?, `MarketValueDate` DateTimeOffset?, `AvgMarketPricePerSqFt` double?
- `ListingDate` DateTimeOffset?, `LatestListingPrice` double?
- `PreviousListingPrice` string?, `LatestPriceChangeDate` string?
- `PendingDate` DateTimeOffset?
- `SpecialListingConditions` string?
- `OriginalListingDate` string?, `OriginalListingPrice` string?

**Lease & concessions (all string?)**
- `LeaseOption`, `LeaseTerm`, `LeaseIncludes`, `Concessions`, `ConcessionsAmount`, `ConcessionsComments`, `ContingencyDate`, `ContingencyDescription`

**Property type & taxonomy**
- `MlsPropertyType` string? (`IsFacetable`), `MlsPropertySubType` string? (`IsFacetable`)
- `AttomPropertyType` int? (`IsFacetable`), `AttomPropertySubType` string? (`IsFacetable`)
- `OwnershipDescription` string?

**Geo & parcel**
- `Latitude` double?, `Longitude` double?
- `ApnFormatted`, `LegalDescription`, `LegalSubdivision` — string?

**Days on market (both STRING despite being numeric conceptually)**
- `DaysOnMarket` string?, `CumulativeDaysOnMarket` string?

**Listing agent / office / co-agent** (string? unless noted, `IsFilterable, IsSortable`)
- `ListingAgentFullName`, `ListingAgentMlsId` (JSON: `listingAgentMlsid`), `ListingAgentStateLicense` (`IsFacetable`), `ListingAgentAor`, `ListingAgentPreferredPhone`, `ListingAgentEmail`
- `ListingOfficeName`, `ListingOfficeMlsId`, `ListingOfficeAor`, `ListingOfficePhone`, `ListingOfficeEmail`
- `ListingCoAgentFullName`, `ListingCoAgentMlsId`, `ListingCoAgentStateLicense` (`IsFacetable`), `ListingCoAgentAor`, `ListingCoAgentPreferredPhone`, `ListingCoAgentEmail`
- `ListingCoAgentOfficeName`, `ListingCoAgentOfficeMlsId`, `ListingCoAgentOfficeAor`, `ListingCoAgentOfficePhone`, `ListingCoAgentOfficeEmail`

**Buyer agent / office / co-agent**
- `BuyerAgentFullName`, `BuyerAgentMlsId`, `BuyerAgentStateLicense` (`IsFacetable`), `BuyerAgentAor`, `BuyerAgentPreferredPhone`, `BuyerAgentEmail`
- `BuyerOfficeName`, `BuyerOfficeMlsId`, `BuyerOfficeAor`, `BuyerOfficePhone`, `BuyerOfficeEmail`
- `BuyerCoAgentFullName`, `BuyerCoAgentMlsId`, `BuyerCoAgentStateLicense` (`IsFacetable`), `BuyerCoAgentAor`, `BuyerCoAgentPreferredPhone`, `BuyerCoAgentEmail`
- `BuyerCoAgentOfficeName`, `BuyerCoAgentOfficeMlsId`, `BuyerCoAgentOfficeAor`, `BuyerCoAgentOfficePhone`, `BuyerCoAgentOfficeEmail`

**Remarks / warranty / tax**
- `PublicListingRemarks` string? (plain `[SimpleField]` — no filter/sort/facet)
- `HomeWarrantyYn` string? (`IsFacetable`)
- `TaxYearAssessed`, `TaxAssessedValueTotal` string?; `TaxAmount` double?; `TaxAnnualOther` string?
- `OwnerName`, `OwnerVesting` string?

**Year / construction**
- `YearBuilt` int?, `YearBuiltEffective` int?, `YearBuiltSource` string? (`IsFacetable`)
- `NewConstructionYn` string? (`IsFacetable`), `BuilderName` string?

**Lot / parcel**
- `AdditionalParcelsYn` string? (`IsFacetable`), `NumberOfLots` string?
- `LotSizeSquareFeet` double?, `LotSizeAcres` double?, `LotSizeSource` string? (`IsFacetable`), `LotDimensions` string?, `LotFeatureList` string?
- `FrontageLength` string?, `FrontageType` string? (`IsFacetable`), `FrontageRoadType` string? (`IsFacetable`)

**Building**
- `LivingAreaSquareFeet` double?, `LivingAreaSource` string? (`IsFacetable`)
- `Levels` string?, `Stories` double?, `BuildingStoriesTotal` string?, `BuildingKeywords` string?, `BuildingAreaTotal` double?
- `NumberOfUnitsTotal`, `NumberOfBuildings` string?
- `PropertyAttachedYn` string? (`IsFacetable`), `OtherStructures` string?

**Rooms — double? across the board (`RoomsTotal`, `BedroomsTotal`, `BathroomsFull`, `BathroomsHalf`, `BathroomsQuarter`, `BathroomsThreeQuarters`)**

**Basement**
- `BasementFeatures`, `BelowGradeSquareFeet` string?, `BasementTotalSqFt` string?, `BasementFinishedSqFt` double?, `BasementUnfinishedSqFt` string?

**Condition / disclosures**
- `PropertyCondition` string?
- `RepairsYn` string? (`IsFacetable`), `RepairsDescription` string?
- `Disclosures` string?, `ConstructionMaterials` string?

**Garage / parking**
- `GarageYn`, `AttachedGarageYn` string? (both `IsFacetable`)
- `GarageSpaces` double?; `CarportYn` string? (`IsFacetable`); `CarportSpaces` string?
- `ParkingFeatures`, `ParkingOther`, `OpenParkingSpaces`, `ParkingTotal` — all string?

**Pool & view**
- `PoolPrivateYn` string? (`IsFacetable`), `PoolFeatures` string?
- `Occupancy` string?
- `ViewYn` string? (`IsFacetable`), `View`, `Topography` string?

**HVAC / fireplace**
- `HeatingYn` string? (`IsFacetable`), `HeatingFeatures` string?
- `CoolingYn` string? (`IsFacetable`), `Cooling` string?
- `FireplaceYn` string? (`IsFacetable`), `Fireplace` string?, `FireplaceNumber` string?

**Structure / style**
- `FoundationFeatures`, `Roof`, `ArchitecturalStyleFeatures`, `PatioAndPorchFeatures` — string?

**Utilities**
- `Utilities`, `ElectricIncluded`, `ElectricDescription`, `WaterIncluded` — string?
- `WaterSource` string? (`IsFacetable`), `Sewer` string?
- `GasDescription`, `OtherEquipmentIncluded` — string?

**Interior / exterior**
- `LaundryFeatures`, `Appliances`, `InteriorFeatures`, `ExteriorFeatures`, `FencingFeatures`, `PetsAllowed` — string?

**Zoning & lifestyle**
- `HorseZoningYn`, `SeniorCommunityYn` — string? (`IsFacetable`)
- `WaterbodyName` string? (`IsFacetable`), `WaterfrontYn` string? (`IsFacetable`), `WaterfrontFeatures` string?
- `ZoningCode`, `ZoningDescription`, `CurrentUse`, `PossibleUse` — string?

**HOA / associations**
- `AssociationYn` string? (`IsFacetable`)
- `Association1Name`, `Association1Phone`, `Association1Fee` (string!), `Association1FeeFrequency` — string?
- `Association2Name`, `Association2Phone`, `Association2Fee`, `Association2FeeFrequency` — string?
- `AssociationFeeIncludes`, `AssociationAmenities` — string?

**Schools**
- `SchoolElementary`, `SchoolElementaryDistrict`, `SchoolMiddle`, `SchoolMiddleDistrict`, `SchoolHigh`, `SchoolHighDistrict` — all string?

**Green / sustainability**
- `GreenVerificationYn` (`IsFacetable`), `GreenBuildingVerificationType` (`IsFacetable`), `GreenEnergyEfficient`, `GreenEnergyGeneration`, `GreenIndoorAirQuality`, `GreenLocation`, `GreenSustainability`, `GreenWaterConservation` — all string?

**Land lease**
- `LandLeaseYn` string? (`IsFacetable`), `LandLeaseAmount`, `LandLeaseAmountFrequency`, `LandLeaseExpirationDate` — string?

**Investment / income-producing**
- `CapRate`, `GrossIncome`, `IncomeIncludes`, `GrossScheduledIncome`, `NetOperatingIncome`, `TotalActualRent` — string?
- `ExistingLeaseType` string? (`IsFacetable`), `FinancialDataSource` string? (`IsFacetable`), `RentControlYn` string? (`IsFacetable`)
- `UnitTypeDescription`, `UnitTypeFurnished` — string? (both `IsFacetable`)
- `NumberOfUnitsLeased`, `NumberOfUnitsMoMo`, `NumberOfUnitsVacant`, `VacancyAllowance`, `VacancyAllowanceRate` — string?

**Operating expenses (all string?)**
- `OperatingExpense`, `CableTvExpense`, `ElectricExpense`, `FuelExpense`, `FurnitureReplacementExpense`, `GardenerExpense`, `InsuranceExpense`, `OperatingExpenseIncludes`, `LicensesExpense`, `MaintenanceExpense`, `ManagerExpense`, `NewTaxesExpense`, `OtherExpense`, `PestControlExpense`, `PoolExpense`, `ProfessionalManagementExpense`, `SuppliesExpense`, `TrashExpense`, `WaterSewerExpense`, `WorkmansCompensationExpense`, `OwnerPays`, `TenantPays`

**Marketing & photos**
- `ListingMarketingUrl` string?
- `PhotosCount` int?
- `PhotoKey` string? — partition-like key identifying the property's photo folder
- `PhotoUrlPrefix` string? — base URL; full photo URL is `{PhotoUrlPrefix}{PhotoKey}/photo_{N}.jpg` (see `MlsImageRecord.GetPhotoUrl`)

**Relationships (implicit — no FK constraints):**
- `AttomId` — external reference to ATTOM Data
- `MlsRecordId` — external reference to source MLS board
- `PhotoKey` + `PhotoUrlPrefix` — reference to blob paths in the image container
- All agent/office IDs are external MLS identifiers, not FKs to another local entity

---

## 2. Azure Table Storage

### `MlsProcessingLogEntity`

**Source:** `Zoodealio.MLS.Storage/BlobStorage/Tables/Entities/MlsProcessingLogEntity.cs`
**Table name:** resolved at runtime via `ITableStorageService<TEntity>` (table naming comes from DI registration; check `Program.cs` and `appsettings.json` for the concrete table name)
**Partition strategy:** `PartitionKey = "mls"` (constant — all rows)
**Row-key strategy:** caller-supplied file name

| Field | Type | Source | Notes |
|---|---|---|---|
| `PartitionKey` | string | `ITableEntity` | constant `"mls"` |
| `RowKey` | string | `ITableEntity` | file name |
| `Timestamp` | DateTimeOffset? | `ITableEntity` | Azure-managed |
| `ETag` | `ETag` | `ITableEntity` | Azure-managed concurrency token (not used for OCC in the upsert path — see api-catalog §NotifyStatus) |
| `Unzipped` | bool | custom | true after `UnZipBlob` pipeline completes |
| `Indexed` | bool | custom | true after Azure Search indexing completes |
| `ImagesProcessed` | bool | custom | true after `PhotoProcessingWorkflow` finishes the record's photos |

**Used by:** `NotifyStatus` (upsert) and `GetFilesByAction` (filter by flag) — both Azure Functions.

---

## 3. Azure Blob Storage

No typed blob entity. Containers and path conventions:

- **Image container** — default `mlsimages` (config `BlobStorage:ImageContainerName`; code default in `BlobStorageConfiguration.cs`). Reachable via `BuildImageUrl(photoUrlPrefix, photoKey, photoNumber)` which composes `{prefix}{key}/photo_{N}.jpg` against the container's public SAS URL.
- **Source/target containers** for `UnZipBlob` and `ProcessFileImages` are request-supplied (`SourceContainer`, `TargetContainer`, `BlobPath`). No central registry — each invocation names them.
- **Service endpoint:** `https://zoodealiomls.blob.core.windows.net`

Blob metadata is not set by the service; blobs are opaque.

---

## 4. Azure Service Bus — `mls-photo-processing-queue`

### `PhotoProcessingEvent`

**Source:** `Zoodealio.MLS.Storage/ServiceBus/Events/PhotoProcessingEvent.cs`
**Queue:** `mls-photo-processing-queue` (config `ServiceBus:QueueName`)
**Endpoint:** `sb://zoodealio-service-bus-mls.servicebus.windows.net/`
**Receive mode:** `PeekLock`. Deserialization failures are dead-lettered with reason `"DeserializationError"` (`ServiceBusService.cs`).

| Field | Type | Notes |
|---|---|---|
| `MlsRecordId` | string | required-init; ties event to `PropertySearchDocument.MlsRecordId` |
| `PhotoCount` | int | required-init; expected number of photos |
| `Url` | string | required-init; source URL/path for download |

**Publisher:** `SendToServiceBusHandler` in the `ProcessFileImages` Function pipeline (batches of up to 1000 per send).
**Consumer:** `PhotoProcessingBatchActivity` inside `PhotoProcessingWorkflow` (Temporal) — see §5.

---

## 5. Temporal workflow contracts

**Temporal server:** `zoodealio-mls.ig4su.tmprl.cloud:7233` (TLS, namespace `zoodealio-mls.ig4su`)
**Task queue:** `default-task-queue` (`TemporalConstants.cs`)
**Schedule ID:** `photo-processing-schedule`
**Cron:** `0 6,18 * * *` (UTC 6am & 6pm; configured with `Europe/Kyiv` timezone in appsettings — worth verifying intent)

### `PhotoProcessingWorkflow`

**Source:** `Zoodealio.MLS.Temporal/Workflows/PhotoProcessingWorkflow.cs`

**Input — `PhotoProcessingWorkflowInput`** (`Zoodealio.MLS.Temporal/Models/PhotoProcessingWorkflowInput.cs`)

| Field | Type | Default |
|---|---|---|
| `TargetContainer` | string | `"mlsimages"` |
| `BatchSize` | int | 100 (Service Bus fetch batch) |
| `ImageBatchSize` | int | 10 (photos processed concurrently per record) |

**Output — `PhotoProcessingWorkflowResult`** (`Zoodealio.MLS.Temporal/Models/PhotoProcessingWorkflowResult.cs`)

| Field | Type |
|---|---|
| `TotalMessagesProcessed` | int |
| `TotalImagesDownloaded` | int |
| `FailedMessages` | int |
| `SkippedRecords` | int |
| `TotalDuration` | TimeSpan |
| `Errors` | List<string> |

### `PhotoProcessingBatchActivity`

**Method:** `ProcessBatchAsync(ProcessBatchInput input) → ProcessBatchResult`

**`ProcessBatchInput`** — `BatchSize` int (default 10), `TargetContainer` string (default `"mlsimages"`), `ImageBatchSize` int (default 10).

**`ProcessBatchResult`** — `MessagesReceived`, `ImagesDownloaded`, `SkippedRecords`, `SuccessfulMessages`, `FailedMessages` (all int), `Errors` List<string>.

---

## 6. API contract DTOs (response shapes)

Response shapes referenced by api-catalog endpoints. These are the cross-boundary contracts consumers see.

### `PaginatedResult<T>` — generic wrapper

`Zoodealio.MLS.Application/Properties/Models/PaginatedResult.cs`

- `Items` IReadOnlyList<T> (default `Array.Empty<T>()`)
- `TotalCount` long
- `PageNumber` int, `PageSize` int
- `TotalPages` int (computed: `Math.Ceiling(TotalCount / PageSize)`)
- `HasPreviousPage` bool (computed: `PageNumber > 1`)
- `HasNextPage` bool (computed: `PageNumber < TotalPages`)

### `PropertySearchResultDto` — lightweight summary

`Zoodealio.MLS.Application/Properties/Models/PropertySearchResultDto.cs`

Fields (in declaration order): `AttomId` string (non-null default), `MlsRecordId` string (non-null default), `MlsListingId` int?, `StatusChangeDate` DateTimeOffset?, `PropertyAddressFull/City/State/Zip` string?, `MlsPropertyType/SubType` string?, `AttomPropertyType` int?, `AttomPropertySubType` string?, `ListingStatus/CurrentStatus` string?, `LatestListingPrice` double?, `MarketValue` double?, `MlsSoldPrice/Date` string?, `Latitude/Longitude` double?, `YearBuilt` int?, `LivingAreaSquareFeet` double?, `LotSizeAcres` double?, `BedroomsTotal/BathroomsFull/BathroomsHalf` double?, `DaysOnMarket` string?, `ListingDate` DateTimeOffset?, `PublicListingRemarks` string?, `PhotosCount` int?, `PhotoUrlPrefix/PhotoKey` string?.

### `PropertyDetailsDto` — full record (superset of `PropertySearchResultDto`)

`Zoodealio.MLS.Application/Properties/Models/PropertyDetailsDto.cs`

Superset adds the full address breakdown, `SitusCounty`, `Township`, `MlsNumber`, `MlsSource`, assessor data (`AssessorLastSaleDate/Amount`), `MarketValueDate`, `AvgMarketPricePerSqFt`, price-history fields (`PreviousListingPrice`, `LatestPriceChangeDate`, `PendingDate`, `OriginalListingDate/Price`), parcel (`ApnFormatted`, `LegalDescription`, `LegalSubdivision`), `CumulativeDaysOnMarket`, full agent/office roster (listing agent + office; no buyer agent fields here), tax (`TaxYearAssessed`, `TaxAssessedValueTotal`, `TaxAmount`, owner (`OwnerName`, `OwnerVesting`), construction (`YearBuiltEffective/Source`, `NewConstructionYn`), lot (`LotSizeSquareFeet`, `LotSizeSource`), building attributes (`Levels`, `Stories`, `BuildingAreaTotal`, `RoomsTotal`, `BathroomsQuarter/ThreeQuarters`), basement, garage (`GarageYn`, `GarageSpaces`, `AttachedGarageYn`, `ParkingTotal`), pool, HVAC, fireplace, structure (`Roof`, `FoundationFeatures`, `ArchitecturalStyleFeatures`, `PatioAndPorchFeatures`), utilities (`WaterSource`, `Sewer`), appliances + laundry, HOA (`Association1Name/Fee/FeeFrequency`, `AssociationAmenities`), schools, `SeniorCommunityYn`, waterfront, zoning, `ListingMarketingUrl`.

Note: no buyer-agent fields are in `PropertyDetailsDto` despite being present on `PropertySearchDocument` — intentionally elided from the public contract.

### `PropertyHistoricalChangeDto`

`Zoodealio.MLS.Application/Properties/Models/PropertyHistoricalChangeDto.cs`

Focused on change tracking: `AttomId`, `MlsRecordId`, `MlsListingId`, `StatusChangeDate`, address (`PropertyAddressFull/City/State`), `ListingStatus`, `CurrentStatus`, `LatestListingPrice`, `PreviousListingPrice`, `LatestPriceChangeDate`, `MlsSoldPrice/Date`, `ListingDate`, `PendingDate`, `OriginalListingDate/Price`, `DaysOnMarket`, `CumulativeDaysOnMarket`, `ListingAgentFullName`, `ListingOfficeName`.

### `PropertyImagesDto`

`Zoodealio.MLS.Application/Properties/Models/PropertyImagesDto.cs`

- `MlsRecordId` string (non-null default)
- `ImageUrls` IReadOnlyList<string> (default `[]`)
- `TotalCount` int

Not exposed on any HTTP endpoint per api-catalog; may be internal (flagged as ambiguity).

### Azure Function request/response DTOs

Source paths: `Zoodealio.MLS.FunctionApp/{Function}/Models/`.

- **`GetFilesByActionRequest`** — `Action: ActionEnum`
- **`GetFilesByActionResponse`** — `Files: List<FileItem>`; `FileItem { Name: string }`
- **`NotifyStatusRequest`** — `FileName: string`, `Action: ActionEnum`
- **`NotifyStatusResponse`** — `Success: bool`, `Message: string` (default "")
- **`UnZipBlobRequest`** — `SourceContainer`, `TargetContainer`, `BlobPath` (all string, required-init)
- **`UnZipBlobResponse`** — `Success: bool`, `Message: string`, `UploadedFiles: List<string>`, `Errors: List<string>`, `TotalFilesProcessed: int`
- **`ProcessFileImagesRequest`** — same shape as `UnZipBlobRequest`
- **`ProcessFileImagesResponse`** — `Success`, `Message`, `ProcessedRecords: List<string>`, `SkippedRecords: List<string>`, `TotalRecordsProcessed: int`, `Errors: List<string>`

### Internal pipeline context objects (not cross-boundary)

Flagged for completeness; not user-consumable contracts. Both implement `IAsyncDisposable`.

- **`UnZipContext`** — `SourceContainer/TargetContainer/BlobPath`, `ZipStream: Stream?`, `ExtractedTxtFiles: Dictionary<string, Stream>`, `UploadedFiles: List<string>`, `Errors: List<string>`, `HasErrors` (computed)
- **`ProcessFileImagesContext`** — `SourceContainer/TargetContainer/BlobPath`, `FileContent: string?`, `ParsedRecords: List<MlsImageRecord>`, `ProcessedRecords: List<string>`, `SkippedRecords: List<string>`, `TotalImagesDownloaded: int` (thread-safe via `Interlocked.Add` in `IncrementImagesDownloaded`), `Errors: List<string>`, `HasErrors` (computed)
- **`MlsImageRecord`** — `AttomId`, `MlsRecordId`, `PhotoKey`, `PhotoUrlPrefix` (all string, required-init), `PhotosCount: int`. `GetPhotoUrl(photoNumber)` returns `{PhotoUrlPrefix}{PhotoKey}/photo_{photoNumber}.jpg`.

---

## 7. Enums

### `ActionEnum`

`Zoodealio.MLS.FunctionApp/GetFilesByAction/Enums/ActionEnum.cs`

| Value | Int | Meaning |
|---|---|---|
| `Created` | 0 | initial state (file uploaded, nothing processed yet) |
| `Unzipped` | 1 | ZIP extraction complete |
| `Indexed` | 2 | indexed in Azure Search |
| `ImagesProcessed` | 3 | photos downloaded and persisted |

Used both as the Service Bus-log flag lookup key in `GetFilesByActionHandler` and as the status action in `NotifyStatus`. `Created` produces a null filter in `GetFilesByActionHandler.BuildFilterForAction()` — agent should confirm intent (see api-catalog ambiguities).

---

## 8. Inconsistencies & observations

1. **Type coercion on Azure Search fields.** Many naturally-numeric/date fields are stored as `string?` in the Azure index (`MlsSoldPrice`, `MlsSoldDate`, `PreviousListingPrice`, `LatestPriceChangeDate`, `OriginalListingPrice`, `OriginalListingDate`, `DaysOnMarket`, `CumulativeDaysOnMarket`, `Association1Fee/Association2Fee`, `ParkingTotal`, plus the entire operating-expense block). DTOs faithfully mirror these. Agents writing filters against these fields must use string semantics.

2. **JSON casing drift.** `ListingAgentMlsId` is declared with `[JsonPropertyName("listingAgentMlsid")]` (lowercase `id`). Other `*MlsId` fields may or may not carry the same alias — auditor should confirm for any consumer outside this codebase. The CLR name and the Azure JSON name don't match naming case.

3. **DTO ↔ index divergence for buyer-agent fields.** `PropertySearchDocument` has full buyer-agent/office rosters, but `PropertyDetailsDto` does not expose them. If a consumer needs them, the shape has to extend.

4. **`PropertyImagesDto` has no HTTP entry point.** The query `GetPropertyImagesQuery` exists (`Application/Properties/Queries/GetPropertyImagesQuery.cs`) but no controller action invokes it in the current `PropertiesController`. Flag as dead-path or incomplete endpoint.

5. **No optimistic concurrency on Table Storage upsert.** `NotifyStatus` ignores `ETag` when upserting `MlsProcessingLogEntity`, so two concurrent writes to the same row race — acceptable here because each flag is write-once-true.

6. **Temporal timezone.** Cron `0 6,18 * * *` combined with `Europe/Kyiv` implies the schedule was authored for that wall-clock. Confirm this is the operational intent vs. UTC.

7. **No SQL persistence.** Unlike every other Zoodealio .NET service, Zoo.MLS has no `DbContext`, no `LegacyData` project, and no reference to `OffervanaDbContext`. Pattern reviewers should not expect the two-database pattern here.

8. **No Zoodealio.Shared DTO references observed.** The MLS service does not consume the shared offer-type contracts; it's strictly a property/MLS catalog.
