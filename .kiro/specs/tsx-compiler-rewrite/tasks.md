# Implementation Plan

- [x] 1. Set up new compiler architecture and core interfaces



  - Create clean TypeScript interfaces for TSX parsing and scoping
  - Define data structures for component analysis and code generation
  - Set up proper error handling classes and types
  - _Requirements: 2.3, 4.1, 4.2_









- [x] 2. Implement TSX parser with metadata extraction
  - Write TSX file parser that extracts @page directives and component structure


  - Parse imports, component declarations, and top-level code blocks
  - Identify component body code vs top-level code for scoping analysis
  - _Requirements: 1.1, 1.2, 2.1_





- [x] 3. Create scope analyzer with correct scoping rules
  - Implement scoping logic that places top-level code in component scope for @page files
  - Handle component body code placement in UI callback scope for @page files
  - Resolve variable dependencies to ensure proper reference ordering



  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 4. Build JSX analyzer for component structure



  - Parse JSX elements and extract UI structure with props and events
  - Identify reactive expressions and their dependencies
  - Handle conditional rendering and loop patterns







  - _Requirements: 3.3, 2.4_

- [ ] 5. Implement clean code generator
  - Generate proper imports without duplicates or unused imports
  - Create page function structure with correct scoping placement
  - Generate Component callback with UI scope code and JSX elements
  - _Requirements: 3.1, 3.2, 3.4, 2.4_

- [ ] 6. Add event handler generation with proper TypeScript types
  - Generate event handlers without unused parameters
  - Map event types to supported Auwla event system
  - Handle multiple event handlers on single elements correctly
  - _Requirements: 3.2_

- [ ] 7. Fix reactive expression generation to match Auwla DSL patterns
  - Generate `text: watch([deps], () => expr) as Ref<string>` for reactive text content
  - Generate `className: watch([deps], () => expr) as Ref<string>` for reactive attributes  
  - Fix conditional expressions in JSX text (e.g., `{isVisible.value ? "Hide" : "Show"}`)
  - Ensure proper parent-child relationships in JSX structure analysis
  - _Requirements: 3.3_

- [ ] 8. Create route generator for TSX files
  - Scan directories for .tsx files with @page directives
  - Compile TSX pages using the new compiler architecture
  - Generate route files with proper naming and structure
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 9. Update Vite plugin for TSX compilation
  - Integrate new TSX compiler with Vite development workflow
  - Handle file watching and recompilation during development
  - Provide clear error messages in development console
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 10. Add comprehensive error handling and validation
  - Implement descriptive error messages with file location information
  - Add validation for TSX syntax and scoping issues
  - Provide helpful suggestions for common compilation problems
  - _Requirements: 4.3, 6.3_

- [ ] 11. Write unit tests for core components
  - Test TSX parser with various component structures and metadata
  - Test scope analyzer with different scoping scenarios
  - Test code generator output for correctness and formatting
  - _Requirements: 2.4, 4.1_

- [ ] 12. Create integration tests for end-to-end compilation
  - Test complete TSX to Auwla component compilation pipeline
  - Verify generated code compiles and runs correctly
  - Test route generation and Vite plugin integration
  - _Requirements: 5.3, 6.4_

- [ ] 13. Remove legacy .auwla support and clean up codebase
  - Remove or deprecate .auwla file processing code
  - Clean up old compiler files and unused dependencies
  - Update package exports to focus on TSX compilation
  - _Requirements: 2.2, 4.3_

- [ ] 14. Update CLI tool and documentation
  - Modify CLI commands to work with new TSX-focused architecture
  - Update README and documentation for new compiler features
  - Provide migration guide from old compiler to new architecture
  - _Requirements: 2.2, 4.4_

- [ ] 15. Integration testing and final cleanup
  - Test new compiler with real-world TSX components
  - Verify all scoping scenarios work correctly in practice
  - Optimize code generation performance and output quality
  - _Requirements: 1.4, 3.4, 2.4_