# Implementation Plan

- [x] 1. Refactor type definitions and remove built-in caching






  - Rename `PageContext` to `LoaderContext` throughout the codebase
  - Remove caching-related types (`cacheTtl`, `revalidateOn`, etc.)
  - Update `PageDefinition` to use `loader` instead of `context`
  - Add `LayoutDefinition` type for layout components
  - Remove reactive refs (`data`, `loading`, `error`, `refetch`, `invalidate`) from component signature

  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 5.5_


- [x] 2. Implement plugin context provider system

  - Create plugin context stack management functions (`pushPluginContext`, `popPluginContext`, `getCurrentPlugins`)

  - Implement stack-based plugin inheritance mechanism
  - Add cleanup logic for plugin context on unmount

  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3. Refactor runtime.ts to use LoaderContext

  - Update `MetaRuntime` class to work with `LoaderContext` instead of `PageContext`
  - Update `createContext` method to use new context structure
  - Ensure plugin hooks receive `LoaderContext`

  - Remove any caching-related logic from runtime
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_



- [ ] 4. Implement defineLayout function
  - Create `defineLayout` function that accepts `LayoutDefinition` and plugins
  - Implement plugin context pushing on layout mount
  - Implement plugin context popping on layout unmount

  - Run layout loader with inherited plugin context
  - Pass child element to layout component
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_



- [ ] 5. Refactor definePage to remove caching and use plugin inheritance
  - Remove all caching logic (cache key computation, TTL, revalidation)
  - Remove reactive refs for `data`, `loading`, `error`
  - Remove `refetch` and `invalidate` functions
  - Inherit plugins from current plugin context stack

  - Simplify component signature to receive only `ctx` and `loaderData`


  - Remove `revalidateOn` watch logic
  - Update loader execution to be simple async call without caching
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5_



- [ ] 6. Update exports in index.ts
  - Export `defineLayout` function




  - Export `LoaderContext` type
  - Export `LayoutDefinition` type
  - Remove deprecated exports if any
  - Update JSDoc comments to reflect new API
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_





- [ ] 7. Update fullstackPlugin example
  - Remove router-state caching logic from fullstackPlugin





  - Simplify plugin to only inject `$api` into context
  - Update plugin to work with new `LoaderContext` type
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.3_



- [ ] 8. Update context-extensions.d.ts
  - Remove `signal` property from `AuwlaMetaContext` (no longer needed)

  - Update comments to reflect new loader-based approach
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 9. Update meta-test example to use new API
  - Update `UserPage.tsx` to use `loader` instead of `context`




  - Use `createResource` in loader for data fetching
  - Update component signature to receive `ctx` and `loaderData`
  - Remove usage of `data`, `loading`, `error` refs from component params
  - Demonstrate proper usage of core Auwla primitives
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_


- [ ] 10. Update auw example to use new API
  - Update any pages using `definePage` to new API
  - Demonstrate `createResource` usage for caching
  - Show proper loader and component patterns
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_



- [x] 11. Update package README.md

  - Document the new `loader` API
  - Provide examples of using `createResource` for caching
  - Document `defineLayout` for plugin inheritance
  - Add migration guide from old API
  - Document plugin system and context inheritance
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_



- [ ] 12. Add type safety tests
  - Test plugin type inference with single plugin
  - Test plugin type composition with multiple plugins
  - Test `LoaderContext` type merging
  - Test layout plugin inheritance types



  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 13. Add integration tests
  - Test `definePage` without loader
  - Test `definePage` with sync loader
  - Test `definePage` with async loader
  - Test `defineLayout` with plugin inheritance
  - Test nested layouts with plugin stacking
  - Test plugin lifecycle hooks execution order
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.1, 7.2, 7.3, 7.4, 7.5_
