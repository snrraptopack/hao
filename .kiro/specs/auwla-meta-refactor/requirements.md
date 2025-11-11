# Requirements Document

## Introduction

This document outlines the requirements for refactoring the @auwla/meta framework to simplify its architecture, improve performance by leveraging core Auwla primitives, ensure full type safety, and implement plugin context inheritance for nested routes and layouts.

## Glossary

- **Meta Framework**: The @auwla/meta layer that provides page-level abstractions on top of core Auwla
- **Loader**: A function that runs before page render to prepare data (renamed from "context")
- **Plugin**: A composable extension that adds typed properties to the loader context
- **Plugin Context**: The typed object passed to loaders, extended by plugins
- **Context Inheritance**: Child routes/layouts automatically receive plugin context from parents
- **Core Primitives**: Existing Auwla tools like `createResource`, `createStore`, `ref`, `watch`
- **definePage**: The primary API for defining pages with loaders and components
- **Route Tree**: The hierarchical structure of routes with parent-child relationships

## Requirements

### Requirement 1: Simplify Data Loading Architecture

**User Story:** As a developer, I want a simple, predictable data loading pattern that leverages core Auwla primitives, so that I don't have duplicate caching/fetching logic.

#### Acceptance Criteria

1. WHEN a developer defines a page loader, THE Meta Framework SHALL NOT provide built-in caching, revalidation, TTL, or abort signal management
2. WHEN a developer needs caching, THE Meta Framework SHALL allow them to use `createResource` from core Auwla
3. WHEN a developer needs state management, THE Meta Framework SHALL allow them to use `createStore` or `ref` from core Auwla
4. THE Meta Framework SHALL remove all caching-related code from `definePage.ts`
5. THE Meta Framework SHALL remove the `refetch`, `invalidate`, `cacheTtl`, and `revalidateOn` features from the page definition API

### Requirement 2: Rename Context to Loader

**User Story:** As a developer, I want clear naming that reflects the purpose of each function, so that the API is intuitive and self-documenting.

#### Acceptance Criteria

1. THE Meta Framework SHALL rename the `context` property to `loader` in the `PageDefinition` type
2. THE Meta Framework SHALL rename `PageContext` type to `LoaderContext` throughout the codebase
3. THE Meta Framework SHALL update all documentation and examples to use "loader" terminology
4. THE Meta Framework SHALL maintain the same functionality while using the new naming
5. WHEN a developer defines a page, THE Meta Framework SHALL accept a `loader` function that receives the plugin-extended context

### Requirement 3: Type-Safe Plugin System

**User Story:** As a developer, I want full TypeScript inference for plugin-provided context properties, so that I get autocomplete and type checking in my loaders and components.

#### Acceptance Criteria

1. WHEN a developer passes plugins to `definePage`, THE Meta Framework SHALL infer the combined plugin context type
2. THE Meta Framework SHALL provide a typed `LoaderContext<Ext>` that merges base context with plugin extensions
3. WHEN a plugin adds properties to context, THE Meta Framework SHALL make those properties available with full type safety in the loader function
4. THE Meta Framework SHALL use TypeScript generics to compose multiple plugin types correctly
5. THE Meta Framework SHALL provide compile-time errors when accessing non-existent context properties

### Requirement 4: Plugin Context Inheritance

**User Story:** As a developer, I want child routes and nested layouts to automatically inherit plugin context from their parents, so that I don't have to re-declare plugins at every level.

#### Acceptance Criteria

1. WHEN a parent route defines plugins, THE Meta Framework SHALL make those plugin contexts available to all child routes
2. WHEN a child route defines additional plugins, THE Meta Framework SHALL merge child plugins with inherited parent plugins
3. THE Meta Framework SHALL maintain type safety when merging parent and child plugin contexts
4. WHEN a layout wraps a page, THE Meta Framework SHALL ensure the page receives the layout's plugin context
5. THE Meta Framework SHALL provide a mechanism to access the combined plugin context at any level of the route tree

### Requirement 5: Simplified Component API

**User Story:** As a developer, I want a clean component API that receives only the loader context, so that I can access data and plugin properties without complexity.

#### Acceptance Criteria

1. THE Meta Framework SHALL pass the loader context as the first parameter to the component function
2. THE Meta Framework SHALL remove the `data`, `loading`, `error`, `refetch`, and `invalidate` refs from component parameters
3. WHEN a developer needs reactive state, THE Meta Framework SHALL allow them to create refs/resources directly in the loader or component
4. THE Meta Framework SHALL ensure the component receives the fully typed loader context with all plugin extensions
5. THE Meta Framework SHALL maintain compatibility with core Auwla lifecycle hooks like `onMount`, `onUnmount`

### Requirement 6: Performance Optimization

**User Story:** As a developer, I want the meta framework to be lightweight and performant, so that it doesn't add unnecessary overhead to my application.

#### Acceptance Criteria

1. THE Meta Framework SHALL NOT duplicate functionality that exists in core Auwla
2. THE Meta Framework SHALL minimize the number of reactive subscriptions created per page
3. THE Meta Framework SHALL avoid unnecessary re-renders when route params or query change
4. THE Meta Framework SHALL leverage core Auwla's batching and scheduling for updates
5. THE Meta Framework SHALL have minimal runtime overhead compared to using core Auwla directly

### Requirement 7: Plugin Composition API

**User Story:** As a developer, I want a simple API for creating plugins that extend the loader context, so that I can build reusable functionality.

#### Acceptance Criteria

1. THE Meta Framework SHALL provide a `definePlugin` function for creating typed plugins
2. WHEN a plugin is created, THE Meta Framework SHALL allow it to define an `onContextCreate` hook
3. THE Meta Framework SHALL allow plugins to add properties to the context object
4. THE Meta Framework SHALL support async initialization in plugin hooks
5. THE Meta Framework SHALL provide plugin lifecycle hooks: `onContextCreate`, `onBeforeLoad`, `onAfterLoad`, `onError`

### Requirement 8: Backward Compatibility Path

**User Story:** As a developer with existing @auwla/meta code, I want a clear migration path to the new API, so that I can upgrade without breaking my application.

#### Acceptance Criteria

1. THE Meta Framework SHALL document all breaking changes in the refactor
2. THE Meta Framework SHALL provide migration examples showing old vs new patterns
3. THE Meta Framework SHALL update the `fullstackPlugin` example to work with the new API
4. THE Meta Framework SHALL update all test examples to use the new loader-based API
5. THE Meta Framework SHALL remove deprecated features cleanly without leaving dead code
