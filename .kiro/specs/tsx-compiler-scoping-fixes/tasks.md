# Implementation Plan - TSX Compiler Scoping Fixes

- [x] 1. Analyze current scoping logic in old compiler


  - Examine `packages/auwla-compiler/src/codegen/main.ts`
  - Understand how `parsed.helpers` and `parsed.pageHelpers` are currently handled
  - Identify where @page directive detection happens
  - Document current behavior vs desired behavior
  - _Requirements: 1.1, 1.2_

- [x] 2. Create test cases for scoping scenarios


  - Create test TSX file with @page directive and scoping issues
  - Create test for non-@page file to ensure no regression
  - Test variables outside export default (should go to component scope for @page)
  - Test variables inside export default (should go to UI scope for @page)
  - _Requirements: 1.3, 1.4, 2.1_

- [x] 3. Fix scoping logic in generatePageComponent function




  - Add @page directive detection in generatePageComponent
  - Implement inverted scoping for @page files:
    - Move `parsed.helpers` inside page function (component scope)
    - Keep `parsed.pageHelpers` inside Component callback (UI scope)
  - Preserve existing behavior for non-@page files
  - _Requirements: 1.1, 1.2, 2.2, 3.1_

- [ ] 4. Test the scoping fix


  - Run tests with @page files to verify correct scoping
  - Run tests with non-@page files to ensure no regression
  - Verify that JSX generation remains unchanged
  - Check that all existing functionality works
  - _Requirements: 1.4, 2.3, 2.4, 3.4_

- [x] 5. Validate with real examples




  - Test with existing TSX pages that have scoping issues
  - Ensure generated code compiles and runs correctly
  - Verify that variable references are accessible in correct scopes
  - _Requirements: 1.3, 1.4_