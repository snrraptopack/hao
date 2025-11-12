# Requirements Document

## Introduction

This document outlines the requirements for redesigning the Auwla plugin system to be simpler, more type-safe, and integrated into core Auwla. The goal is to provide a minimal, composable way to share context across pages and layouts without mimicking React patterns.

## Glossary

- **Plugin**: A function that returns an object with properties/methods to be injected into page context
- **Page Context**: The object passed to page components containing route info and plugin extensions
- **Plugin Composition**: Merging multiple plugin contexts with full type safety
- **Context Inheritance**: Child pages automatically receiving parent layout plugin context
- **Core Integration**: Plugin system as part of core Auwla, not a separate package

## Requirements

### Requirement 1: Simple Plugin Definition

**User Story:** As a developer, I want to create plugins by simply returning an object, so that I don't need to learn complex APIs.

#### Acceptance Criteria

1. THE Plugin System SHALL allow developers to define plugins using a simple function that returns an object
2. WHEN a developer calls `definePlugin`, THE Plugin System SHALL accept a function that returns any object shape
3. THE Plugin System SHALL NOT require developers to implement lifecycle hooks unless needed
4. THE Plugin System SHALL support reactive primitives (ref, createStore) in plugin return values
5. THE Plugin System SHALL allow plugins to be pure functions with no side effects

### Requirement 2: Automatic Type Inference

**User Story:** As a developer, I want TypeScript to automatically infer my plugin context types, so that I get autocomplete and type checking without manual type annotations.

#### Acceptance Criteria

1. WHEN a developer passes plugins to `definePage`, THE Plugin System SHALL automatically infer the combined context type
2. THE Plugin System SHALL provide full TypeScript autocomplete for all plugin properties in the page component
3. WHEN multiple plugins are composed, THE Plugin System SHALL merge their types correctly
4. THE Plugin System SHALL show TypeScript errors when accessing non-existent plugin properties
5. THE Plugin System SHALL NOT require developers to manually specify generic type parameters

### Requirement 3: Context Inheritance from Layouts

**User Story:** As a developer, I want child pages to automatically inherit plugin context from parent layouts, so that I don't have to re-declare plugins at every level.

#### Acceptance Criteria

1. WHEN a layout defines plugins, THE Plugin System SHALL make those plugins available to all child pages
2. WHEN a child page defines additional plugins, THE Plugin System SHALL merge child plugins with inherited parent plugins
3. THE Plugin System SHALL maintain type safety when merging parent and child plugin contexts
4. THE Plugin System SHALL use a context stack to track plugin inheritance hierarchy
5. THE Plugin System SHALL clean up plugin context when layouts unmount

### Requirement 4: Core Auwla Integration

**User Story:** As a developer, I want the plugin system to be part of core Auwla, so that it feels native and doesn't require additional packages.

#### Acceptance Criteria

1. THE Plugin System SHALL be implemented in core Auwla (src/plugin.ts)
2. THE Plugin System SHALL export `definePlugin` from the main Auwla package
3. THE Plugin System SHALL use existing Auwla primitives (ref, createStore, etc.)
4. THE Plugin System SHALL NOT duplicate functionality that exists in core Auwla
5. THE Plugin System SHALL follow Auwla's design philosophy of simplicity and explicitness

### Requirement 5: Minimal Page Context

**User Story:** As a developer, I want page context to only contain route information and plugin extensions, so that the API is clear and predictable.

#### Acceptance Criteria

1. THE Page Context SHALL include route parameters (params, query, path, router, prev)
2. THE Page Context SHALL include all plugin-provided properties
3. THE Page Context SHALL NOT include lifecycle hooks (developers import from core)
4. THE Page Context SHALL NOT include reactive primitives (developers import from core)
5. THE Page Context SHALL be a plain object with no hidden behavior

### Requirement 6: Simplified definePage API

**User Story:** As a developer, I want `definePage` to accept a single component function and optional plugins, so that the API is minimal and easy to understand.

#### Acceptance Criteria

1. THE definePage Function SHALL accept a component function as the first parameter
2. THE definePage Function SHALL accept an optional array of plugins as the second parameter
3. THE definePage Function SHALL NOT require a loader function (data fetching happens in component)
4. THE definePage Function SHALL pass the full context (route + plugins) to the component
5. THE definePage Function SHALL return a function compatible with Auwla router

### Requirement 7: Plugin Context Provider

**User Story:** As a developer, I want plugin context to be managed automatically, so that I don't have to manually track context state.

#### Acceptance Criteria

1. THE Plugin System SHALL provide functions to manage plugin context stack (push, pop, get)
2. WHEN a layout mounts, THE Plugin System SHALL push its plugin context onto the stack
3. WHEN a layout unmounts, THE Plugin System SHALL pop its plugin context from the stack
4. WHEN a page renders, THE Plugin System SHALL merge current stack context with page plugins
5. THE Plugin System SHALL ensure context cleanup happens automatically

### Requirement 8: No Lifecycle in Context

**User Story:** As a developer, I want to use lifecycle hooks from core Auwla imports, so that the API is consistent with the rest of the framework.

#### Acceptance Criteria

1. THE Page Context SHALL NOT include lifecycle hooks (onMount, onUnmount, onRouted)
2. THE Plugin System SHALL allow developers to import lifecycle hooks from core Auwla
3. THE Plugin System SHALL work seamlessly with core Auwla lifecycle hooks
4. THE Plugin System SHALL NOT wrap or modify lifecycle hook behavior
5. THE Plugin System SHALL document that lifecycle hooks should be imported from core

### Requirement 9: Performance Optimization

**User Story:** As a developer, I want the plugin system to have minimal runtime overhead, so that my application stays fast.

#### Acceptance Criteria

1. THE Plugin System SHALL execute plugins only once per page render
2. THE Plugin System SHALL NOT create unnecessary reactive subscriptions
3. THE Plugin System SHALL reuse plugin instances when possible
4. THE Plugin System SHALL have minimal memory footprint
5. THE Plugin System SHALL NOT impact core Auwla performance

### Requirement 10: Clear Migration Path

**User Story:** As a developer with existing code, I want a clear migration path to the new plugin system, so that I can upgrade without breaking my application.

#### Acceptance Criteria

1. THE Plugin System SHALL document all breaking changes from the old API
2. THE Plugin System SHALL provide before/after examples for common patterns
3. THE Plugin System SHALL explain how to migrate from loader-based to component-based data fetching
4. THE Plugin System SHALL show how to convert old plugins to the new simple format
5. THE Plugin System SHALL provide a migration checklist
