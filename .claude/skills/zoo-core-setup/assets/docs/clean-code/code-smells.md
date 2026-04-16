# Code Smells & Heuristics

*Quick reference from Clean Code, Chapter 17*

## Comments
| ID | Smell | Fix |
|----|-------|-----|
| C1 | Inappropriate information (changelogs, authors) | Use source control |
| C2 | Obsolete comment | Delete it |
| C3 | Redundant comment (restates code) | Delete it |
| C4 | Poorly written comment | Rewrite or extract a method |
| C5 | Commented-out code | Delete it -- git has history |

## Environment
| ID | Smell | Fix |
|----|-------|-----|
| E1 | Build requires multiple steps | One command to build |
| E2 | Tests require multiple steps | One command to run all tests |

## Functions
| ID | Smell | Fix |
|----|-------|-----|
| F1 | Too many arguments (>3) | Wrap in parameter object |
| F2 | Output arguments | Return from function instead |
| F3 | Flag arguments | Split into two functions |
| F4 | Dead function (never called) | Delete it |

## General
| ID | Smell | Fix |
|----|-------|-----|
| G1 | Multiple languages in one file | Separate concerns |
| G2 | Obvious behavior not implemented | Implement what the name promises |
| G3 | Incorrect behavior at boundaries | Test boundary conditions |
| G5 | Duplication | Extract (DRY) |
| G6 | Code at wrong abstraction level | Move to correct layer |
| G7 | Base class depends on derivative | Invert dependency |
| G8 | Too much information (wide interfaces) | Narrow interfaces, hide internals |
| G9 | Dead code (unreachable) | Delete it |
| G10 | Vertical separation (usage far from declaration) | Move closer |
| G11 | Inconsistency | Same pattern everywhere |
| G13 | Artificial coupling (unrelated things together) | Separate |
| G14 | Feature envy (method uses another class more) | Move method |
| G17 | Misplaced responsibility | Move to the class that owns the data |
| G18 | Inappropriate static method | Use instance method if polymorphism needed |
| G20 | Names at wrong abstraction level | Rename to match abstraction |
| G23 | Prefer polymorphism to if/else or switch/case | ONE SWITCH rule |
| G24 | Follow standard conventions | Team standards, enforced by code |
| G25 | Replace magic numbers with named constants | Self-documenting values |
| G26 | Be precise | Know why you made each decision |
| G27 | Structure over convention | Enforce with types, not naming rules |
| G28 | Encapsulate conditionals | `shouldBeDeleted(timer)` not `timer.hasExpired() && !timer.isRecurrent()` |
| G29 | Avoid negative conditionals | `buffer.shouldCompact()` not `!buffer.shouldNotCompact()` |
| G30 | Functions should do one thing | Extract sub-functions |
| G31 | Hidden temporal couplings | Make order explicit via return values as next input |
| G33 | Encapsulate boundary conditions | `nextLevel = level + 1` then use variable |
| G34 | One level of abstraction per function | Don't mix high/low |
| G35 | Configurable data at high levels | Constants at top, pass down |
| G36 | Avoid transitive navigation (Law of Demeter) | `a.doSomething()` not `a.getB().getC().doSomething()` |

## Names
| ID | Smell | Fix |
|----|-------|-----|
| N1 | Choose descriptive names | Names = 90% of readability |
| N2 | Names at appropriate abstraction level | `connect(locator)` not `dial(phoneNumber)` |
| N3 | Use standard nomenclature | Pattern names, domain terms |
| N4 | Unambiguous names | Be specific about what the function does |
| N5 | Long names for long scopes | `i` for 3-line loop, `employeeCount` for class field |
| N7 | Names describe side-effects | `createOrReturnOos()` not `getOos()` |

## Tests
| ID | Smell | Fix |
|----|-------|-----|
| T1 | Insufficient tests | Test everything that could break |
| T2 | Don't skip coverage tools | Use them to find gaps |
| T3 | Don't skip trivial tests | Documentary value > cost |
| T5 | Test boundary conditions | Edges are where bugs hide |
| T6 | Exhaustively test near bugs | Bugs cluster |
| T9 | Tests should be fast | Slow tests don't get run |
