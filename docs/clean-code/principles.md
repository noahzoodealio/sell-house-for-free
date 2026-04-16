# Clean Code Principles

*Condensed from Robert C. Martin's "Clean Code"*

## Naming

- **Reveal intent**: name should answer why it exists, what it does, how it's used
- **Avoid disinformation**: don't use `accountList` unless it's actually a `List`
- **Make distinctions meaningful**: `getActiveAccount()` vs `getActiveAccountInfo()` is noise
- **Use pronounceable names**: `genymdhms` -> `generationTimestamp`
- **Use searchable names**: single-letter names only in tiny scopes (loop counters)
- **No encodings**: no Hungarian notation, no `m_` prefixes, no `I` prefix on interfaces (C# convention exception: `IRepository` is fine)
- **Class names**: nouns (`Customer`, `WikiPage`, `Account`)
- **Method names**: verbs (`postPayment`, `deletePage`, `save`)
- **One word per concept**: don't mix `fetch`/`retrieve`/`get` for same idea
- **Use domain names**: `AccountVisitor`, `JobQueue` -- solution domain terms are fine
- **Long scope = long name**: `i` is fine in a 3-line loop, not in a 50-line method

## Functions

- **Small**: 20 lines max preferred. Extract relentlessly
- **Do one thing**: if you can extract a function with a name that isn't a restatement, it does more than one thing
- **One level of abstraction per function**: don't mix high-level logic with low-level details
- **Stepdown rule**: read code top-to-bottom, each function calls the next level down
- **Arguments**: 0 (niladic) best, 1 (monadic) good, 2 (dyadic) acceptable, 3+ avoid. Use objects to group params
- **No flag arguments**: `render(true)` is awful. Split into `renderForSuite()` and `renderForSingleTest()`
- **No side effects**: if named `checkPassword`, don't also initialize a session
- **Command-Query Separation**: functions either DO something or ANSWER something, never both
- **Prefer exceptions over error codes**: error codes force nested `if` chains
- **Extract try/catch blocks**: wrap bodies in named methods. Error handling IS one thing
- **DRY**: duplication is the root of all evil in software

## Classes

- **Small**: measured by responsibilities, not lines
- **Single Responsibility Principle**: one reason to change
- **Cohesion**: methods should use many instance variables. High cohesion = tight, focused class
- **Open/Closed Principle**: open for extension, closed for modification
- **Organize for change**: isolate what changes from what doesn't using interfaces/abstractions
- **Depend on abstractions**: depend on interfaces, not concrete implementations

## Comments

- **Good**: legal notices, intent explanation, clarification, TODO, warning of consequences
- **Bad**: redundant, misleading, mandated (forced javadoc), journal (use git), commented-out code, noise
- **Best comment is a well-named function**: if you need a comment, try extracting a method first

## Formatting

- **Vertical**: related code close together, separate concepts with blank lines
- **Newspaper metaphor**: high-level summary at top, details increase as you read down
- **Horizontal**: keep lines under 120 characters
- **Team rules**: consistency within team trumps individual preference

## Error Handling

- **Use exceptions, not return codes**
- **Write try-catch-finally first**: establishes scope and expectations
- **Use unchecked exceptions**: checked exceptions violate Open/Closed Principle
- **Provide context**: include operation attempted and failure type in exception message
- **Don't return null**: return empty collection, Optional, or throw. Null checks proliferate
- **Don't pass null**: same reasoning -- eliminates entire classes of bugs

## Testing (FIRST)

- **Fast**: tests run in seconds, not minutes
- **Independent**: no test depends on another
- **Repeatable**: works in any environment (dev, CI, offline)
- **Self-Validating**: boolean output -- pass or fail, no manual checking
- **Timely**: write tests before or alongside production code

**Additional rules:**
- Test code is as important as production code -- keep it clean
- One concept per test function
- Test boundary conditions exhaustively
- Bugs cluster: when you find one, test that area thoroughly
- Use domain-specific testing language: `makePages()`, `assertResponseContains()`
