# Requirements Document

## Introduction

The Auwla framework's TSX compiler currently does not handle conditional rendering expressions properly. When developers write JSX conditional expressions like `{condition.value && <element>}` or `{condition ? <element> : null}`, these are compiled as static code rather than reactive `ui.When()` calls. This creates inconsistent behavior where conditional rendering doesn't update when the condition changes.

## Requirements

### Requirement 1

**User Story:** As a developer using Auwla TSX, I want all conditional rendering expressions to be automatically compiled to reactive `ui.When(watch(...))` calls, so that my conditional content updates automatically when conditions change.

#### Acceptance Criteria

1. WHEN a developer writes `{condition.value && <element>}` in JSX THEN the compiler SHALL generate `ui.When(watch(condition, () => condition.value), (ui) => { ui.Element(...) })`
2. WHEN a developer writes `{condition ? <element> : <otherElement>}` in JSX THEN the compiler SHALL generate `ui.When(watch(condition, () => condition.value), (ui) => { ui.Element(...) }).Else((ui) => { ui.OtherElement(...) })`
3. WHEN a developer writes `{condition ? <element> : null}` in JSX THEN the compiler SHALL generate `ui.When(watch(condition, () => condition.value), (ui) => { ui.Element(...) })`
4. WHEN the reactive condition changes THEN the conditional content SHALL mount/unmount automatically

### Requirement 2

**User Story:** As a developer, I want the compiler to automatically detect reactive dependencies and create proper watch expressions with correct argument patterns, so that I follow Auwla's reactivity conventions.

#### Acceptance Criteria

1. WHEN a conditional expression uses single ref (e.g., `counter.value > 10`) THEN the compiler SHALL generate `watch(counter, () => counter.value > 10)`
2. WHEN a conditional expression uses multiple refs (e.g., `a.value && b.value`) THEN the compiler SHALL generate `watch([a, b], () => a.value && b.value)`
3. WHEN a conditional expression uses a single ref directly (e.g., `isVisible.value`) THEN the compiler SHALL generate `watch(isVisible, () => isVisible.value)`
4. WHEN a conditional expression contains `.value` syntax THEN it SHALL always be treated as reactive and wrapped in watch
5. WHEN a conditional expression has no `.value` syntax THEN the compiler SHALL use the expression as-is without watch

### Requirement 3

**User Story:** As a developer, I want the `$if` helper function to work seamlessly in JSX with proper watch expressions, so that I have an explicit way to write conditional rendering when needed.

#### Acceptance Criteria

1. WHEN a developer writes `{$if(condition.value, <element>)}` THEN the compiler SHALL generate `ui.When(watch(condition, () => condition.value), (ui) => { ui.Element(...) })`
2. WHEN a developer writes `{$if(condition.value, <element>, <elseElement>)}` THEN the compiler SHALL generate `ui.When(watch(condition, () => condition.value), (ui) => { ui.Element(...) }).Else((ui) => { ui.ElseElement(...) })`
3. WHEN using `$if` with multiple reactive dependencies THEN the compiler SHALL generate `watch([dep1, dep2], () => expression)`
4. WHEN using `$if` with static conditions THEN the compiler SHALL use the condition directly without watch

### Requirement 4

**User Story:** As a developer, I want nested conditional rendering to work correctly, so that I can create complex conditional UI structures.

#### Acceptance Criteria

1. WHEN conditional expressions are nested inside other elements THEN each SHALL be compiled to separate `ui.When()` calls
2. WHEN conditional expressions contain other conditional expressions THEN the compiler SHALL handle the nesting correctly
3. WHEN conditional expressions are used in lists or loops THEN each instance SHALL be reactive independently
4. WHEN conditional expressions are mixed with regular content THEN the compilation SHALL preserve the correct order and structure