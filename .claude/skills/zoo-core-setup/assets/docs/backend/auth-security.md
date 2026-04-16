# Authentication & Security

## ASP.NET Core Identity

- Add Identity services: `services.AddIdentity<User, IdentityRole>().AddEntityFrameworkStores<DbContext>()`
- Create User entity extending `IdentityUser`
- Use migrations to generate identity tables
- Seed roles via `RoleManager<IdentityRole>`

## JWT Authentication

**Configuration:**
```csharp
services.AddAuthentication(opt => {
    opt.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    opt.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(opt => {
    opt.TokenValidationParameters = new TokenValidationParameters {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = config["Jwt:Issuer"],
        ValidAudience = config["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]))
    };
});
```

**Token generation:**
- Create claims from user (name, roles, custom claims)
- Sign with `SymmetricSecurityKey` + `HmacSha256`
- Set expiration (short-lived access token + refresh token)
- Store JWT secret in `appsettings` (dev) or Key Vault (prod)

## Authorization

- `[Authorize]` on controllers/actions to require authentication
- `[Authorize(Roles = "Manager")]` for role-based access
- `[AllowAnonymous]` to exempt specific endpoints

## Rate Limiting

```csharp
services.AddRateLimiter(opt => {
    opt.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter("global", _ => new FixedWindowRateLimiterOptions {
            PermitLimit = 100,
            Window = TimeSpan.FromMinutes(1)
        }));
});
```

## Caching

- **Response caching**: `[ResponseCache(Duration = 60)]` on actions
- **Cache-Store** (e.g., `Marvin.Cache.Headers`): adds ETag, Last-Modified
- **Expiration model**: set max-age, public/private
- **Validation model**: ETag-based conditional requests (304 Not Modified)

## Security Checklist

- Always use HTTPS in production
- Store secrets in environment variables or Key Vault, never in code
- Validate all input at API boundary
- Use parameterized queries (EF Core does this by default)
- Set appropriate CORS policies
- Enable rate limiting on public endpoints
- Return minimal error info to clients
