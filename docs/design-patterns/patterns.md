# Design Patterns Reference

*Condensed from refactoring.guru. Use pattern names in code (classes, comments) for clarity.*

## Creational Patterns

### Factory Method
- **Intent**: Define interface for creating objects; let subclasses decide which class
- **Use when**: You don't know exact types ahead of time, or want to let users extend your library
- **In .NET**: `IServiceCollection.AddScoped<IService, ConcreteService>()`

### Abstract Factory
- **Intent**: Produce families of related objects without specifying concrete classes
- **Use when**: System must work with multiple product families (e.g., UI themes, DB providers)

### Builder
- **Intent**: Construct complex objects step-by-step; same process can produce different representations
- **Use when**: Object has many optional parameters or complex construction logic
- **In .NET**: `Host.CreateDefaultBuilder().ConfigureWebHostDefaults()`

### Prototype
- **Intent**: Create objects by cloning existing instances
- **Use when**: Object creation is expensive; need independent copies

### Singleton
- **Intent**: Ensure one instance with global access
- **Use when**: Single shared resource (logger, config, cache)
- **In .NET**: `services.AddSingleton<T>()` -- prefer DI over manual implementation

## Structural Patterns

### Adapter
- **Intent**: Convert interface of a class to one clients expect
- **Use when**: Integrating legacy code or third-party libraries with incompatible interfaces
- **In .NET**: Wrapping external APIs behind your own interface

### Bridge
- **Intent**: Separate abstraction from implementation so both vary independently
- **Use when**: You want to switch implementations at runtime or avoid class explosion

### Composite
- **Intent**: Compose objects into tree structures for part-whole hierarchies
- **Use when**: Clients should treat individual objects and groups uniformly (menus, file systems)

### Decorator
- **Intent**: Attach new behavior to objects dynamically by wrapping them
- **Use when**: Adding responsibilities without subclassing
- **In .NET**: Middleware pipeline, `Stream` wrappers

### Facade
- **Intent**: Provide simplified interface to complex subsystem
- **Use when**: Need to reduce coupling to complex library or subsystem
- **In .NET**: `RepositoryManager` wrapping multiple repositories

### Flyweight
- **Intent**: Share common state between many objects to reduce memory
- **Use when**: Large number of similar objects consuming significant memory

### Proxy
- **Intent**: Provide surrogate to control access to another object
- **Use when**: Lazy loading, access control, logging, caching
- **In .NET**: Lazy<T>, EF Core lazy-loading proxies

## Behavioral Patterns

### Chain of Responsibility
- **Intent**: Pass request along chain of handlers until one handles it
- **Use when**: Multiple handlers, handler determined at runtime
- **In .NET**: ASP.NET Core middleware pipeline, `DelegatingHandler`

### Command
- **Intent**: Encapsulate request as object for parameterization, queuing, undo
- **Use when**: Need to queue operations, support undo, or decouple sender/receiver
- **In .NET**: MediatR commands, `ICommand` in CQRS

### Iterator
- **Intent**: Traverse collection without exposing internal structure
- **In .NET**: `IEnumerable<T>`, `IAsyncEnumerable<T>`, LINQ

### Mediator
- **Intent**: Centralize complex communications between objects
- **Use when**: Many-to-many object interactions create tight coupling
- **In .NET**: MediatR library, event aggregators

### Memento
- **Intent**: Capture and restore object state without violating encapsulation
- **Use when**: Undo/redo, state snapshots

### Observer
- **Intent**: Define subscription mechanism for state change notifications
- **Use when**: One-to-many dependency where changes propagate
- **In .NET**: Events/delegates, `IObservable<T>`, SignalR

### State
- **Intent**: Alter object behavior when internal state changes
- **Use when**: Object behavior depends on state, state transitions are complex

### Strategy
- **Intent**: Define family of interchangeable algorithms
- **Use when**: Multiple approaches to same task, selected at runtime
- **In .NET**: DI-injected services, `IComparer<T>`, sorting strategies

### Template Method
- **Intent**: Define algorithm skeleton in base class, let subclasses override steps
- **Use when**: Several classes share similar algorithm with minor variations

### Visitor
- **Intent**: Add operations to object structures without modifying them
- **Use when**: Many distinct operations on complex object structures

## When to Apply

- **Don't force patterns**: use when the problem naturally fits
- **Name classes after patterns**: `OrderBuilder`, `PaymentStrategy`, `LoggingDecorator`
- **Prefer composition over inheritance**: most patterns use composition
- **Start simple**: refactor toward patterns when complexity demands it
