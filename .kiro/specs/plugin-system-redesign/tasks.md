# Implementation Plan

- [x] 1. Create plugin system in core Auwla


  - Create `src/plugin.ts` file
  - Implement `Plugin<T>` type
  - Implement `definePlugin<T>` function
  - Implement `InferPlugins<P>` type helper for recursive type merging
  - Implement `pushPluginContext`, `popPluginContext`, `getPluginContext` functions
  - Implement `createPluginContext<P>` function
  - Export all plugin functions from `src/index.ts`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4, 4.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2. Create simplified meta layer


  - Create `src/meta.ts` file in core Auwla
  - Define `PageContext<P>` type with route info and plugin inference
  - Implement simplified `definePage<P>` function (no loader)
  - Implement simplified `defineLayout<P>` function
  - Handle context updates on route navigation
  - Integrate with existing router hooks (`onRouted`, `useParams`, `useQuery`)
  - Export meta functions from `src/index.ts`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 3. Implement context inheritance for layouts

  - Update `defineLayout` to push plugin context on mount
  - Update `defineLayout` to pop plugin context on unmount
  - Ensure `definePage` merges parent context with page plugins
  - Test nested layout context stacking
  - Verify context cleanup on navigation
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 4. Create example plugins



  - Create `fullstackPlugin` that injects `$api`
  - Create `authPlugin` with user state and login/logout methods
  - Create `i18nPlugin` with locale and translation function
  - Create `analyticsPlugin` with track method
  - Add TypeScript type definitions for each plugin
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 5. Update existing examples to use new API



  - Update `auw/src/routes.tsx` to show both pure core and plugin approaches
  - Update `meta-test/src/pages/UserPage.tsx` to use new `definePage` API
  - Remove loader logic and use `createResource` in component
  - Demonstrate plugin usage with `fullstackPlugin`
  - Show lifecycle hooks imported from core
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.1, 8.2, 8.3, 8.4, 8.5, 10.1, 10.2, 10.3, 10.4, 10.5_


- [x] 6. Remove old @auwla/meta package


  - Delete `packages/auwla-meta` directory
  - Remove package from workspace configuration
  - Update any imports that referenced the old package
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 7. Write comprehensive documentation
  - Document `definePlugin` API with examples
  - Document `definePage` API with examples
  - Document `defineLayout` API with examples
  - Document plugin context inheritance
  - Provide migration guide from old API
  - Add plugin creation tutorial for beginners
  - Document type inference and TypeScript usage
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 8. Add type safety tests
  - Test single plugin type inference
  - Test multiple plugin type composition
  - Test layout plugin inheritance types
  - Test `InferPlugins` type helper with various plugin combinations
  - Test context type includes route info and plugin extensions
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 9. Add integration tests
  - Test `definePage` without plugins
  - Test `definePage` with single plugin
  - Test `definePage` with multiple plugins
  - Test `defineLayout` with plugin inheritance
  - Test nested layouts with plugin stacking
  - Test context cleanup on unmount
  - Test context updates on route navigation
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 10. Performance testing and optimization
  - Benchmark plugin execution overhead
  - Measure context creation performance
  - Test memory usage with nested layouts
  - Optimize context merging if needed
  - Verify no memory leaks from context stack
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
