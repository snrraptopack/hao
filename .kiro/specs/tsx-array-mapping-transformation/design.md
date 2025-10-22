# Design Document

## Overview

The TSX Array Mapping Transformation feature will enhance the Auwla compiler to properly transform array mapping expressions (`.map()` and `$each()`) from JSX into functional UI structures. Currently, these expressions are either placed incorrectly in `ui.Text` components or generate placeholder comments, resulting in non-functional output.

The solution involves improving the existing array mapping detection and generation system to:
1. Accurately detect all forms of array mapping expressions
2. Parse and transform the JSX content within mappings into proper UI builder calls
3. Generate clean, functional `ui.List` components with proper render callbacks
4. Handle complex nested JSX structures within array mappings

## Architecture

### Current System Analysis

The existing system has these components:
- `detectArrayMapping()` - Detects array mapping patterns using regex
- `generateArrayMappingUICode()` - Generates basic UI.List structure with placeholders
- JSX-to-UI conversion in `convertJSXToUIBuilder()` - Handles general JSX transformation

### Problems with Current Implementation

1. **Incomplete JSX Transformation**: Array mapping content shows "TODO: Transform complex JSX content" instead of actual UI calls
2. **Static Array Handling**: Static arrays like `['all', 'active', 'completed'].map()` are incorrectly placed in `ui.Text`
3. **Complex JSX Support**: Multi-line JSX with nested elements, conditionals, and event handlers aren't properly transformed
4. **Parameter Handling**: Inconsistent handling of different parameter formats in callbacks

### Proposed Architecture

```
Input JSX with Array Mapping
           ↓
    detectArrayMapping() - Enhanced detection
           ↓
    parseArrayMappingExpression() - New parser
           ↓
    transformJSXContent() - New JSX transformer
           ↓
    generateArrayMappingUICode() - Enhanced generator
           ↓
    Output: Functional ui.List with proper render callbacks
```

## Components and Interfaces

### Enhanced Array Mapping Detection

```typescript
interface ArrayMappingExpression {
  type: 'reactive-map' | 'static-map' | 'each'
  arrayExpression: string
  itemParameter: string
  indexParameter?: string
  jsxContent: string
  isMultiLine: boolean
}

function detectArrayMapping(exprCode: string): {
  isArrayMapping: boolean
  expression?: ArrayMappingExpression
}
```

### JSX Content Parser

```typescript
interface JSXTransformationContext {
  itemParameter: string
  indexParameter?: string
  indentLevel: number
}

function parseJSXContent(
  jsxContent: string, 
  context: JSXTransformationContext
): string[]
```

### Enhanced UI Code Generator

```typescript
function generateArrayMappingUICode(
  expression: ArrayMappingExpression
): string
```

## Data Models

### ArrayMappingExpression Interface

- `type`: Distinguishes between reactive arrays (`.value.map`), static arrays (`[].map`), and `$each` expressions
- `arrayExpression`: The array being mapped (e.g., `todos`, `['all', 'active', 'completed']`)
- `itemParameter`: The callback parameter name for individual items
- `indexParameter`: Optional index parameter name
- `jsxContent`: The JSX content to be transformed
- `isMultiLine`: Whether the JSX spans multiple lines (affects parsing strategy)

### Transformation Patterns

1. **Reactive Array Mapping**: `todos.value.map(todo => <jsx>)`
   - Transform to: `ui.List({ items: todos, render: (todo, index, ui) => { /* transformed jsx */ } })`

2. **Static Array Mapping**: `['all', 'active', 'completed'].map(filter => <jsx>)`
   - Transform to: `['all', 'active', 'completed'].forEach((filter, index) => { /* transformed jsx */ })`

3. **$each Expression**: `$each(items, (item, index) => <jsx>)`
   - Transform to: `ui.List({ items: items, render: (item, index, ui) => { /* transformed jsx */ } })`

## Error Handling

### Detection Errors
- **Invalid JSX Content**: When JSX content cannot be parsed, generate a warning and fallback to placeholder
- **Missing Parameters**: When callback parameters are malformed, use default names (`item`, `index`)
- **Nested Array Mappings**: Detect and handle nested mappings with proper scoping

### Transformation Errors
- **Complex JSX Patterns**: For unsupported JSX patterns, generate comments with the original code for manual review
- **Variable Scoping**: Ensure variables from outer scopes are properly accessible in render callbacks
- **Event Handler Binding**: Preserve event handler context and parameter passing

### Fallback Strategies
1. **Partial Transformation**: If some parts of JSX can be transformed, generate mixed UI calls and comments
2. **Placeholder Generation**: For completely unsupported patterns, generate structured placeholders with original code
3. **Error Comments**: Include descriptive comments in generated code to help developers identify issues

## Testing Strategy

### Unit Tests
1. **Detection Tests**: Verify all array mapping patterns are correctly identified
2. **Parsing Tests**: Test JSX content parsing with various complexity levels
3. **Generation Tests**: Validate generated UI code syntax and structure
4. **Edge Case Tests**: Handle malformed expressions, nested mappings, and complex JSX

### Integration Tests
1. **End-to-End Transformation**: Test complete transformation from input TSX to output UI code
2. **Real-World Examples**: Use actual complex components like the todo app example
3. **Regression Tests**: Ensure existing functionality remains intact

### Test Cases by Complexity

**Simple Cases**:
- Single-line JSX with text content
- Basic element with className
- Simple event handlers

**Medium Cases**:
- Multi-line JSX with nested elements
- Conditional rendering within mappings
- Multiple event handlers and attributes

**Complex Cases**:
- Nested array mappings
- Complex conditional logic
- Mixed reactive and static content
- Dynamic styling and classes

### Performance Considerations

1. **Regex Optimization**: Use efficient regex patterns for detection
2. **Parsing Strategy**: Minimize AST parsing overhead for simple cases
3. **Caching**: Cache parsed expressions for repeated transformations
4. **Memory Usage**: Avoid creating large intermediate strings during transformation

The design prioritizes correctness and maintainability over performance, as compilation is typically done once during build time. However, the modular architecture allows for future optimizations without major refactoring.