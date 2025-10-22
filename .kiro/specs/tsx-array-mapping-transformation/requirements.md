# Requirements Document

## Introduction

The Auwla TSX compiler currently has issues with array mapping transformations where expressions using `.map()` and `$each()` are incorrectly placed in `ui.Text` components instead of being transformed into proper UI structures like `ui.List`. This results in malformed output where complex JSX content appears as text or placeholder comments rather than functional UI components.

## Requirements

### Requirement 1: Static Array Mapping Transformation

**User Story:** As a developer, I want static array expressions like `['all', 'active', 'completed'].map()` to be transformed into proper UI structures so that they render correctly as interactive elements.

#### Acceptance Criteria

1. WHEN the compiler encounters a static array literal with `.map()` containing JSX THEN it SHALL transform it into a `ui.List` with proper render callback
2. WHEN the static array mapping contains simple elements like buttons THEN each element SHALL be rendered as individual UI components
3. WHEN the static array mapping has event handlers THEN they SHALL be preserved and properly bound in the generated code
4. WHEN the static array mapping has conditional styling THEN the styling logic SHALL be maintained in the UI components

### Requirement 2: Dynamic Array Mapping with $each

**User Story:** As a developer, I want `$each()` expressions to be transformed into `ui.List` components so that dynamic arrays render properly with reactive updates.

#### Acceptance Criteria

1. WHEN the compiler encounters `$each(array, callback)` expressions THEN it SHALL transform them into `ui.List({ items: array, render: callback })`
2. WHEN the `$each` callback contains complex JSX THEN the JSX SHALL be properly transformed into UI builder calls
3. WHEN the `$each` expression uses destructured parameters THEN the parameter mapping SHALL be preserved in the render callback
4. WHEN the `$each` expression is nested within other UI components THEN the transformation SHALL maintain proper nesting structure

### Requirement 3: Complex JSX Content Transformation

**User Story:** As a developer, I want complex JSX content within array mappings to be fully transformed so that there are no placeholder comments or incomplete transformations.

#### Acceptance Criteria

1. WHEN array mapping contains nested JSX elements THEN all elements SHALL be transformed into proper UI builder calls
2. WHEN array mapping contains conditional rendering THEN conditions SHALL be transformed into `ui.When` components
3. WHEN array mapping contains event handlers THEN they SHALL be properly transformed and bound
4. WHEN array mapping contains reactive expressions THEN they SHALL be wrapped in appropriate `watch()` calls

### Requirement 4: Proper UI Structure Generation

**User Story:** As a developer, I want array mappings to generate clean, properly structured UI code so that the output is maintainable and functional.

#### Acceptance Criteria

1. WHEN generating `ui.List` components THEN the render callback SHALL have proper parameter signatures (item, index, ui)
2. WHEN transforming JSX within render callbacks THEN the UI builder pattern SHALL be used consistently
3. WHEN generating nested UI structures THEN proper indentation and formatting SHALL be maintained
4. WHEN handling array items THEN proper TypeScript types SHALL be inferred and used

### Requirement 5: Error Prevention and Validation

**User Story:** As a developer, I want the compiler to prevent common errors in array mapping transformations so that the generated code works correctly.

#### Acceptance Criteria

1. WHEN detecting array mapping expressions THEN the compiler SHALL validate that they contain valid JSX content
2. WHEN transforming array mappings THEN the compiler SHALL ensure all variables are properly scoped
3. WHEN generating UI.List components THEN the compiler SHALL validate that the items expression is valid
4. WHEN array mapping transformation fails THEN the compiler SHALL provide clear error messages indicating the issue