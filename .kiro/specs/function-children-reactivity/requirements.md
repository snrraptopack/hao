# Requirements Document

## Introduction

This feature enhances the JSX rendering system to support function children with automatic dependency tracking. Currently, developers must use component-based conditionals (`<If>`, `<When>`) and list rendering (`<For>`) for reactive content. This feature will allow developers to use standard JavaScript control flow (if/else, for loops, ternaries) inside function children, with automatic reactivity powered by the existing `derive()` mechanism.

The goal is to improve developer experience by making reactive rendering feel more natural and reducing the need to learn framework-specific components for common patterns.

## Glossary

- **JSX System**: The h() function and appendChildren() logic that transforms JSX into DOM nodes
- **Function Child**: A function passed as a child in JSX that returns renderable content (Node, string, array)
- **derive()**: Existing reactive primitive that automatically tracks ref dependencies accessed during function execution
- **Ref**: Reactive reference object with .value property and subscribe() method
- **Marker-based Rendering**: Using comment nodes to mark insertion points for dynamic content
- **Keyed Reconciliation**: Diffing algorithm that uses key properties to efficiently update lists

## Requirements

### Requirement 1: Basic Function Children Support

**User Story:** As a developer, I want to use function children for reactive conditionals, so that I can write familiar JavaScript control flow instead of learning framework-specific components.

#### Acceptance Criteria

1. WHEN a function is encountered in the children array during appendChildren(), THE JSX System SHALL create comment markers and use derive() to track dependencies
2. WHEN the function returns a string or number, THE JSX System SHALL render it as a text node
3. WHEN the function returns a Node, THE JSX System SHALL insert it into the DOM
4. WHEN the function returns an array, THE JSX System SHALL recursively insert all items
5. WHEN any tracked ref dependency changes, THE JSX System SHALL re-execute the function and update the DOM

### Requirement 2: Conditional Rendering

**User Story:** As a developer, I want to write if/else statements inside function children, so that I can use standard JavaScript conditionals for reactive UI.

#### Acceptance Criteria

1. WHEN a function child contains an if/else statement that reads ref.value, THE JSX System SHALL automatically track the ref as a dependency
2. WHEN the tracked ref changes, THE JSX System SHALL re-execute the function and render the appropriate branch
3. WHEN switching between branches, THE JSX System SHALL remove old DOM nodes and insert new ones at the correct position
4. THE JSX System SHALL support ternary operators with the same automatic tracking behavior
5. THE JSX System SHALL support logical && operators for conditional rendering

### Requirement 3: List Rendering with Keys

**User Story:** As a developer, I want to use .map() or for loops inside function children with key props, so that I can render lists with efficient reconciliation.

#### Acceptance Criteria

1. WHEN a function child returns an array of JSX elements with key props, THE JSX System SHALL extract the key values for reconciliation
2. WHEN the array changes, THE JSX System SHALL use keyed reconciliation to minimize DOM operations
3. WHEN an item is added, THE JSX System SHALL insert only the new DOM node
4. WHEN an item is removed, THE JSX System SHALL remove only the corresponding DOM node
5. WHEN items are reordered, THE JSX System SHALL move existing DOM nodes instead of recreating them

### Requirement 4: Key Extraction from JSX

**User Story:** As a developer, I want to use the standard key prop on JSX elements, so that keyed reconciliation works automatically without additional configuration.

#### Acceptance Criteria

1. WHEN the h() function receives a key prop, THE JSX System SHALL store it on the element as __key property
2. WHEN the h() function receives a key prop, THE JSX System SHALL not set it as a DOM attribute
3. WHEN renderKeyedArray() processes elements, THE JSX System SHALL read the __key property for reconciliation
4. WHERE no key prop is provided, THE JSX System SHALL fall back to index-based reconciliation
5. THE JSX System SHALL warn developers when duplicate keys are detected in the same array

### Requirement 5: Performance Optimization

**User Story:** As a developer, I want function children to have minimal performance overhead, so that my application remains fast even with many reactive elements.

#### Acceptance Criteria

1. WHEN a function child's dependencies have not changed, THE JSX System SHALL not re-execute the function
2. WHEN reconciling keyed arrays, THE JSX System SHALL reuse existing DOM nodes for unchanged items
3. WHEN updating arrays, THE JSX System SHALL batch DOM operations to minimize reflows
4. THE JSX System SHALL use the existing scheduler for batched updates
5. WHERE possible, THE JSX System SHALL use reference equality checks to detect unchanged items

### Requirement 6: Nested Function Children

**User Story:** As a developer, I want to nest function children inside other function children, so that I can compose complex reactive UIs.

#### Acceptance Criteria

1. WHEN a function child returns another function child, THE JSX System SHALL process it recursively
2. WHEN nested function children have independent dependencies, THE JSX System SHALL track them separately
3. WHEN a parent function child re-renders, THE JSX System SHALL preserve child function children that have not changed
4. THE JSX System SHALL maintain correct DOM structure with nested marker comments
5. THE JSX System SHALL clean up all nested watchers when the parent component unmounts

### Requirement 7: Backward Compatibility

**User Story:** As a developer, I want existing code using If, When, and For components to continue working, so that I can adopt function children incrementally.

#### Acceptance Criteria

1. THE JSX System SHALL continue to support existing If, When, and For components without changes
2. THE JSX System SHALL allow mixing function children with component-based conditionals in the same tree
3. THE JSX System SHALL maintain the same cleanup behavior for both approaches
4. THE JSX System SHALL not introduce breaking changes to the existing appendChildren() logic
5. WHERE developers use function children, THE JSX System SHALL provide equivalent functionality to component-based approaches

### Requirement 8: Error Handling

**User Story:** As a developer, I want clear error messages when function children fail, so that I can quickly debug issues.

#### Acceptance Criteria

1. WHEN a function child throws an error during execution, THE JSX System SHALL log the error and render nothing
2. WHEN a function child returns an invalid type, THE JSX System SHALL log a warning and stringify the value
3. WHEN duplicate keys are detected in keyed arrays, THE JSX System SHALL log a warning with the duplicate key
4. WHERE a function child accesses undefined refs, THE JSX System SHALL handle it gracefully without crashing
5. THE JSX System SHALL provide stack traces that include the component context where errors occur
