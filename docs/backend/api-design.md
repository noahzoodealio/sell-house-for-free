# API Design

## REST Conventions

| Operation | HTTP Method | Route Example              | Idempotent | Safe |
|-----------|-------------|----------------------------|------------|------|
| List      | GET         | /api/companies             | Yes        | Yes  |
| Get one   | GET         | /api/companies/{id}        | Yes        | Yes  |
| Create    | POST        | /api/companies             | No         | No   |
| Full update | PUT       | /api/companies/{id}        | Yes        | No   |
| Partial   | PATCH       | /api/companies/{id}        | No         | No   |
| Delete    | DELETE      | /api/companies/{id}        | Yes        | No   |

## Controllers

- Inherit from `ControllerBase`, use `[ApiController]` attribute
- Use `[Route("api/[controller]")]` or explicit routes
- Return `IActionResult` or `ActionResult<T>`
- Keep controllers thin -- delegate to services/repositories
- Use parent/child routing: `api/companies/{companyId}/employees`

## Validation

- Use Data Annotations on DTOs: `[Required]`, `[MaxLength]`, `[Range]`
- `[ApiController]` auto-validates and returns 400 with `ModelState` errors
- For custom validation, use `IValidatableObject` or FluentValidation
- Validate PATCH requests by applying patch doc then validating the result

## Paging

```csharp
// Request params
public class PagingParameters {
    const int maxPageSize = 50;
    public int PageNumber { get; set; } = 1;
    private int _pageSize = 10;
    public int PageSize { get => _pageSize; set => _pageSize = (value > maxPageSize) ? maxPageSize : value; }
}
```

- Return pagination metadata in **custom response header** (`X-Pagination`), not in body
- Include: currentPage, totalPages, pageSize, totalCount, hasPrevious, hasNext

## Filtering, Searching, Sorting

- **Filtering**: exact match on fields via query params (`?country=USA`)
- **Searching**: partial match across fields (`?searchTerm=admin`)
- **Sorting**: `?orderBy=name desc,age asc` -- parse and apply dynamically
- Apply in order: Filter > Search > Sort > Page

## Content Negotiation

- Default: JSON (`application/json`)
- Support XML via `services.AddControllers().AddXmlDataContractSerializerFormatters()`
- Return 406 Not Acceptable for unsupported media types: `opt.RespectBrowserAcceptHeader = true; opt.ReturnHttpNotAcceptable = true;`

## API Versioning

- Install `Microsoft.AspNetCore.Mvc.Versioning`
- Strategies: query string (`?api-version=2.0`), URL segment (`/api/v2/`), header
- Mark deprecated versions: `[ApiVersion("1.0", Deprecated = true)]`

## HATEOAS (optional)

- Include `links` array in responses with `href`, `rel`, `method`
- Enables API discoverability for clients
- Use custom media types: `application/vnd.myapp.hateoas+json`

## Global Error Handling

```csharp
app.UseExceptionHandler(appError => {
    appError.Run(async context => {
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";
        var error = context.Features.Get<IExceptionHandlerFeature>();
        if (error != null) {
            await context.Response.WriteAsync(new ErrorDetails {
                StatusCode = context.Response.StatusCode,
                Message = "Internal Server Error"
            }.ToString());
        }
    });
});
```

- Never leak exception details to clients in production
- Log full exception internally, return generic message externally
