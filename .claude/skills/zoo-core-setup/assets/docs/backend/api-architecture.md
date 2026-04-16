# ASP.NET Core Web API - Architecture

## Project Structure

The solution uses a **modular monolith** — each bounded context is its own project with internal layers:

```
Solution/
├── Host/                           # ASP.NET Core host, middleware, startup
├── Common/                         # Shared utilities, behaviors, models
├── Storage/                        # Azure Storage abstractions
├── <BoundedContext>/               # One project per bounded context
│   ├── Api/                        # Controllers
│   │   └── RequestModels/          # Request DTOs
│   ├── Configuration/              # Options classes (if needed)
│   ├── Domain/                     # Entities, enums, domain services
│   │   ├── Entities/               # Domain entities and value objects
│   │   └── <Concept>/              # Domain subfolders by concept
│   ├── Infrastructure/             # External service integrations
│   │   ├── <Provider>/             # Grouped by provider (Sql/, AzureSearch/, etc.)
│   │   │   ├── Entities/
│   │   │   ├── Mappers/
│   │   │   └── Repositories/
│   │   └── I<Contract>.cs          # Shared infra interfaces at root
│   ├── Security/                   # Auth services (Auth project only)
│   │   └── <Concept>/              # Jwt/, Hashing/, Tokens/, UserContext/
│   ├── UseCases/                   # CQRS via MediatR
│   │   ├── Commands/
│   │   ├── Queries/
│   │   ├── Models/                 # Response DTOs
│   │   ├── Validators/
│   │   └── Mappings/
│   └── Hosted/                     # Background / hosted services (if needed)
├── FunctionApp/                    # Azure Functions (feature-folder layout)
├── Temporal/                       # Workflow orchestration
└── UnitTests/                      # Mirrors source structure
```

**Key conventions:**
- Interfaces live next to their implementations (no separate Abstractions/ folder)
- Infrastructure interfaces with multiple implementations sit at Infrastructure/ root
- Files are grouped by domain concept, not by type

## Startup & Configuration

- Use `Program.cs` (minimal hosting) or `Startup.cs` for service registration
- Group service registrations into **extension methods** on `IServiceCollection` for readability
- Use environment-specific `appsettings.{Environment}.json` files
- Set `ASPNETCORE_ENVIRONMENT` variable per deployment target

## Dependency Injection

- Register services in DI container: `AddScoped`, `AddTransient`, `AddSingleton`
- Prefer **scoped** for request-level services (repositories, DbContext)
- Inject via constructor parameters -- never use `new` for services
- Create a **ServiceManager/RepositoryManager** to bundle related registrations

## Middleware Pipeline Order

Order matters. Follow this sequence:

```csharp
app.UseExceptionHandler();     // 1. Global error handling
app.UseHttpsRedirection();     // 2. HTTPS enforcement
app.UseStaticFiles();          // 3. Static files
app.UseCors("Policy");         // 4. CORS
app.UseForwardedHeaders();     // 5. Proxy headers
app.UseRouting();              // 6. Routing
app.UseAuthentication();       // 7. Auth
app.UseAuthorization();        // 8. Authorization
app.MapControllers();          // 9. Endpoints
```

## CORS

```csharp
services.AddCors(opt => opt.AddPolicy("CorsPolicy", builder =>
    builder.WithOrigins("https://yourdomain.com")
           .AllowAnyMethod()
           .AllowAnyHeader()));
```

- In development: `AllowAnyOrigin()` is acceptable
- In production: restrict to specific origins, methods, headers

## Action Filters

Use filters to extract cross-cutting concerns from controllers:

- **Validation filter**: check `ModelState.IsValid` before action executes
- **Null-check filter**: return 404 if entity parameter is null
- Register as services for DI support: `ServiceFilter(typeof(MyFilter))`
- Invocation order: Global > Controller > Action

## Logging

- Configure a logging service early (e.g., NLog, Serilog)
- Define `ILoggerManager` interface, implement in Infrastructure
- Register as singleton in DI
- Log at appropriate levels: Error for exceptions, Info for operations, Debug for diagnostics
