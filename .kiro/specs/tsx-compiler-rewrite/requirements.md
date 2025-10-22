# Requirements Document

## Introduction

The current Auwla compiler has incorrect scoping logic for TSX files and mixed support for both .auwla and TSX formats. We need to rewrite the compiler to focus exclusively on TSX with correct scoping rules, clean code generation, and proper organization.

## Requirements

### Requirement 1: Correct TSX Scoping Implementation

**User Story:** As a developer using TSX with @page directive, I want variables and functions to be scoped correctly so that my code compiles without reference errors and follows the intended architecture.

#### Acceptance Criteria

1. WHEN a TSX file has @page directive AND contains variables/functions outside the export default function THEN the compiler SHALL place them inside the page function scope (not as component helpers)
2. WHEN a TSX file has @page directive AND contains variables/functions inside the export default function THEN the compiler SHALL place them inside the Component callback scope
3. WHEN variables reference each other THEN they SHALL be placed in the same scope to avoid reference errors
4. WHEN the compiler generates scoped code THEN all variable references SHALL be valid and accessible

### Requirement 2: TSX-Only Architecture

**User Story:** As a developer, I want the compiler to focus exclusively on TSX files so that the codebase is simpler and more maintainable.

#### Acceptance Criteria

1. WHEN the compiler processes files THEN it SHALL only handle .tsx and .jsx files
2. WHEN the compiler encounters .auwla files THEN it SHALL either ignore them or provide a clear migration path
3. WHEN the compiler is organized THEN it SHALL have a clear separation between TSX parsing, analysis, and code generation
4. WHEN the compiler generates output THEN it SHALL produce clean, properly formatted TypeScript code

### Requirement 3: Clean Code Generation

**User Story:** As a developer, I want the generated code to be clean and error-free so that it works without manual fixes.

#### Acceptance Criteria

1. WHEN the compiler generates imports THEN it SHALL only include necessary imports and avoid duplicates
2. WHEN the compiler generates event handlers THEN it SHALL use proper TypeScript types and avoid unused parameters
3. WHEN the compiler generates reactive expressions THEN it SHALL properly handle template literals and watch dependencies
4. WHEN the compiler generates UI method calls THEN it SHALL use consistent formatting and proper indentation

### Requirement 4: Organized Codebase Structure

**User Story:** As a developer maintaining the compiler, I want the codebase to be well-organized so that it's easy to understand and modify.

#### Acceptance Criteria

1. WHEN the codebase is structured THEN it SHALL have clear separation of concerns (parsing, analysis, generation)
2. WHEN files are organized THEN they SHALL follow a logical hierarchy with clear naming
3. WHEN legacy code exists THEN it SHALL be removed or clearly marked as deprecated
4. WHEN new features are added THEN they SHALL fit into the established architecture

### Requirement 5: Route Generation for TSX

**User Story:** As a developer, I want route generation to work seamlessly with TSX files so that my pages are automatically compiled and available.

#### Acceptance Criteria

1. WHEN the route generator runs THEN it SHALL scan for .tsx files with @page directives
2. WHEN TSX pages are found THEN they SHALL be compiled to the correct output format
3. WHEN routes are generated THEN they SHALL maintain proper file structure and naming
4. WHEN the Vite plugin runs THEN it SHALL handle TSX compilation during development

### Requirement 6: Vite Integration

**User Story:** As a developer, I want seamless Vite integration so that TSX compilation works during development with hot reload.

#### Acceptance Criteria

1. WHEN the Vite plugin processes TSX files THEN it SHALL compile them using the TSX compiler
2. WHEN files change during development THEN they SHALL be recompiled automatically
3. WHEN compilation errors occur THEN they SHALL be displayed clearly in the development console
4. WHEN the build process runs THEN it SHALL generate optimized output files