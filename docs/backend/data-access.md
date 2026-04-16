# Data Access Patterns

## Repository Pattern

Abstract data access behind interfaces for testability and separation of concerns.

**Structure:**
```
IRepositoryBase<T>          # Generic CRUD interface
RepositoryBase<T>           # Generic implementation using DbContext
ICompanyRepository          # Entity-specific interface (extends IRepositoryBase)
CompanyRepository           # Entity-specific implementation
IRepositoryManager          # Bundles all repositories (lazy-loaded)
RepositoryManager           # Implements manager, creates repos on demand
```

**Rules:**
- Repositories return domain entities, never expose `DbContext` or `IQueryable` outside
- Use `IRepositoryManager` in controllers -- single injection point
- Keep repository methods focused: one query per method

## Entity Framework Core

- Define entities in Domain layer, DbContext in Infrastructure
- Use **Fluent API** for configuration over data annotations when complex
- Seed initial data via `OnModelCreating` or dedicated seed classes
- Use **migrations** for schema changes: `dotnet ef migrations add <Name>`

## DTOs & AutoMapper

- **Never expose entities directly** in API responses
- Create DTOs per operation: `CompanyDto`, `CompanyForCreationDto`, `CompanyForUpdateDto`
- Map with AutoMapper profiles:
  ```csharp
  CreateMap<Company, CompanyDto>();
  CreateMap<CompanyForCreationDto, Company>();
  ```
- Register AutoMapper in DI: `services.AddAutoMapper(typeof(MappingProfile))`

## Async/Await

- **All** I/O-bound operations must be async (DB queries, HTTP calls, file access)
- Use `async Task<T>` return types in repositories and controllers
- Use `await` with EF Core: `ToListAsync()`, `FirstOrDefaultAsync()`, `SaveChangesAsync()`
- Never use `.Result` or `.Wait()` -- causes deadlocks
- Name async methods with `Async` suffix in repository interfaces
