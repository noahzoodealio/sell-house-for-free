# Stage 05 — Crawl Patterns

**Goal:** Produce `patterns.md` in the sidecar — the conventions, framework versions, library choices, and code-level patterns this service actually uses (not what it should use). The Dev agent reads this when implementing in this service to stay pattern-compliant.

## What to capture

### Framework versions + stack baseline

- **.NET version** (8, 10, etc.) — check `.csproj` `<TargetFramework>`
- **Angular version** — check `package.json`
- **PrimeNG version** — per-service (TIH: 21, ZIP: 20, Offervana: N) — this matters because component APIs differ between PrimeNG versions
- **Python version** (Zoodealio.Chat) — from `pyproject.toml`
- **Node version constraint** (if present)
- **Key packages + versions** — MediatR, AutoMapper, EF Core, Temporal SDK, ABP version (Offervana), Azure Functions worker, Chainlit, OpenAI Agents SDK, etc.

### Backend conventions (what's actually used in this service)

- **Data access** — EF Core + Repository? Dapper? ABP repositories? Two-DbContext pattern?
- **Query pattern** — MediatR CQRS (commands + queries as records)? Direct repository? ABP AppServices?
- **Mapping** — AutoMapper profiles? Manual mapping? Mapster?
- **Validation** — FluentValidation? Data annotations? ABP validators?
- **Auth** — JWT Bearer, ABP auth, custom middleware — concrete configuration
- **Error handling** — global exception middleware? Per-controller filters? ProblemDetails shape?
- **Logging** — Serilog? ILogger defaults? Langfuse? Structured log fields expected?
- **Testing frameworks** — xUnit vs NUnit vs MSTest; Moq vs NSubstitute; test project naming convention

### Frontend conventions (if applicable)

- **Component style** — standalone components? Classic modules? (Standalone is the Zoodealio baseline from Angular 16+)
- **Change detection** — OnPush default? Zoneless?
- **DI pattern** — `inject()` function? Constructor injection? (`inject()` is the Zoodealio baseline)
- **Naming** — private member prefix (`_`), signal conventions
- **State management** — NgRx? Signals + services? Akita?
- **Routing** — standalone route configs? Lazy-loaded feature modules?
- **Forms** — reactive forms? Signal forms? Validators library?
- **HTTP** — HttpClient wrappers? Interceptors (auth, error, loading)?

### Build, test, deploy patterns

- Build scripts, test scripts, lint configuration (`.eslintrc`, `.editorconfig`, `tsconfig` strictness)
- Docker multi-stage presence + base images
- CI/CD clues (`.github/` or `azure-pipelines.yml` if present)

### Deviations + special cases

Most important section. Patterns in this service that deviate from the Zoodealio baseline (as established by `curated/patterns.md` in shared memory). Examples:

- "Uses Mapster instead of AutoMapper"
- "Does NOT use MediatR — direct repository calls"
- "Angular 17 with standalone but DI uses constructor injection (legacy holdover)"

These deviations are what Dev agents most need to know to stay compliant with what THIS service does.

## Organization

Group by: Stack → Backend → Frontend → Build/Test → Deviations. Each with enough specificity that an agent doesn't have to open the source to know what to do.

## Frontmatter

```yaml
---
artifact: patterns
service: {service-name}
commit-sha: {from sidecar index}
generated-at: {ISO timestamp}
---
```

## Review gate

Summarize: stack snapshot, notable conventions, deviations from baseline. Ask user whether any captured "deviation" is actually intentional-and-should-propagate-back vs. a legacy artifact. Get approval, update sidecar, advance.

## Next

`references/stage-06-crawl-workflows.md`
