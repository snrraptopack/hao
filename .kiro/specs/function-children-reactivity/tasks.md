# Implementation Plan

- [-] 1. Add key extraction to h() function

  - Modify h() function in src/jsx.ts to extract key prop before processing other props
  - Store key as __key property on the element
  - Delete key from props object to prevent it being set as DOM attribute
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 2. Implement helper functions for function children
  - [ ] 2.1 Create hasKeys() helper function
    - Write function to check if array contains elements with __key property
    - Return boolean indicating if keyed reconciliation should be used
    - _Requirements: 4.4_

  - [ ] 2.2 Create renderKeyedArray() function
    - Implement keyed reconciliation algorithm using key-based diffing
    - Build map of old nodes by key for O(1) lookups
    - Remove nodes no longer in new array
    - Insert new nodes and move existing nodes to match new order
    - Add duplicate key detection and warnings
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.5_

  - [ ] 2.3 Extract insertValue() as reusable helper
    - Move existing insertValue logic from appendChildren into standalone function
    - Handle all value types: string, number, Node, array, null/undefined/boolean
    - Add fallback for unknown types with warning
    - _Requirements: 1.2, 1.3, 1.4, 8.2_

- [ ] 3. Add function child detection to appendChildren()
  - [ ] 3.1 Add typeof child === 'function' check before isRef check
    - Insert check at the beginning of the child processing loop
    - Ensure it runs before existing isRef check to maintain priority
    - _Requirements: 1.1_

  - [ ] 3.2 Create marker comments for function children
    - Create fn-start and fn-end comment nodes
    - Append both markers to parent node
    - _Requirements: 1.1_

  - [ ] 3.3 Wrap function with derive() for dependency tracking
    - Call derive(child) to create reactive ref with automatic tracking
    - Handle errors during derive() execution
    - _Requirements: 1.1, 1.5, 2.1, 8.1_

  - [ ] 3.4 Implement render() function for function children
    - Remove old nodes between markers
    - Check if result is keyed array using hasKeys()
    - Call renderKeyedArray() for keyed arrays
    - Call insertValue() for non-keyed content
    - _Requirements: 1.2, 1.3, 1.4, 3.1, 3.2, 3.3_

  - [ ] 3.5 Set up initial render and watch
    - Call render() with initial derivedRef.value
    - Set up watch(derivedRef, render) for reactive updates
    - Ensure watch cleanup happens automatically via component context
    - _Requirements: 1.5, 2.2, 6.5_

- [ ] 4. Add error handling
  - Wrap derive() call in try-catch block
  - Log errors and continue processing other children
  - Add warning for invalid return types in insertValue()
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 5. Integration and manual testing
  - Test basic function children with conditionals (if/else, ternary, &&)
  - Test list rendering with .map() and keys
  - Test nested function children
  - Test mixing with existing If/When/For components
  - Test error cases (undefined refs, invalid returns, duplicate keys)
  - Verify cleanup happens on component unmount
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4_

- [ ] 6. Write unit tests
  - [ ] 6.1 Test basic function children
    - Test function returning string
    - Test function returning number
    - Test function returning Node
    - Test function returning array
    - Test function returning null/undefined/boolean
    - _Requirements: 1.2, 1.3, 1.4_

  - [ ] 6.2 Test dependency tracking
    - Test single ref dependency updates
    - Test multiple ref dependencies
    - Test conditional ref access (only tracks accessed refs)
    - Test that unchanged dependencies don't trigger re-renders
    - _Requirements: 1.5, 2.1, 5.1_

  - [ ] 6.3 Test conditional rendering
    - Test if/else statements
    - Test ternary operators
    - Test logical && operators
    - Test switch statements
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 6.4 Test list rendering
    - Test .map() with keys
    - Test for loops with keys
    - Test array add operations
    - Test array remove operations
    - Test array reorder operations
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 6.5 Test key extraction
    - Test key prop extracted in h()
    - Test key not set as DOM attribute
    - Test __key property storage
    - Test elements without keys use fallback
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 6.6 Test keyed reconciliation
    - Test node reuse for unchanged keys
    - Test node removal for deleted keys
    - Test node insertion for new keys
    - Test node reordering
    - Test duplicate key warnings
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.5_

  - [ ] 6.7 Test error handling
    - Test function throwing error
    - Test invalid return types
    - Test duplicate keys
    - Test undefined ref access
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ] 6.8 Test nested function children
    - Test function returning function
    - Test independent dependency tracking
    - Test cleanup of nested watchers
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 6.9 Test backward compatibility
    - Test existing If/When/For components still work
    - Test mixing function children with components
    - Test existing Ref<T> children still work
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 7. Performance testing
  - [ ] 7.1 Benchmark large list rendering
    - Test rendering 1000+ items with keys
    - Measure initial render time
    - Measure update time for single item change
    - _Requirements: 5.2, 5.3_

  - [ ] 7.2 Benchmark rapid updates
    - Test 100 updates per second
    - Verify batching works correctly
    - Measure memory usage
    - _Requirements: 5.3, 5.4_

  - [ ] 7.3 Benchmark deep nesting
    - Test 10+ levels of nested function children
    - Verify independent dependency tracking
    - Measure cleanup time
    - _Requirements: 6.2, 6.5_
