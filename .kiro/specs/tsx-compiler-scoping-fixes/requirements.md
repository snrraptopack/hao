# TSX Compiler Scoping Fixes

## Introduction

The existing Auwla compiler works well but has incorrect scoping logic for @page files. Instead of rewriting the entire compiler, we need to fix just the scoping logic to place variables in the correct scopes according to the @page directive rules.

## Requirements

### Requirement 1: Fix @page Scoping Logic

**User Story:** As a developer using TSX with @page directive, I want variables and functions to be scoped correctly so that my code compiles without reference errors.

#### Acceptance Criteria

1. WHEN a TSX file has @page directive AND contains variables/functions outside the export default function THEN the compiler SHALL place them inside the page function scope (component scope)
2. WHEN a TSX file has @page directive AND contains variables/functions inside the export default function THEN the compiler SHALL place them inside the Component callback scope (UI scope)
3. WHEN variables reference each other THEN they SHALL be placed in the same scope to avoid reference errors
4. WHEN the compiler generates scoped code THEN all variable references SHALL be valid and accessible

### Requirement 2: Preserve Existing Functionality

**User Story:** As a developer, I want the existing compiler functionality to remain unchanged except for the scoping fix.

#### Acceptance Criteria

1. WHEN the compiler processes non-@page files THEN it SHALL work exactly as before
2. WHEN the compiler generates JSX elements THEN it SHALL use the same patterns as before
3. WHEN the compiler handles reactive expressions THEN it SHALL generate the same watch patterns as before
4. WHEN the compiler processes events THEN it SHALL generate the same event handler patterns as before

### Requirement 3: Minimal Changes

**User Story:** As a maintainer, I want minimal changes to the existing codebase to reduce risk of introducing bugs.

#### Acceptance Criteria

1. WHEN making changes THEN only the scoping logic SHALL be modified
2. WHEN updating code THEN existing JSX generation SHALL remain unchanged
3. WHEN fixing scoping THEN existing imports and exports SHALL remain unchanged
4. WHEN testing THEN all existing functionality SHALL continue to work