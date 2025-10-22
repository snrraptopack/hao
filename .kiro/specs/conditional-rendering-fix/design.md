# Design Document

## Overview

This design outlines the enhancement of Auwla's TSX compiler to automatically transform conditional rendering expressions into reactive `ui.When(watch(...))` calls. The compiler will detect `.value` usage in conditional expressions and generate proper reactive subscriptions using the established `watch()` pattern.

## Architecture

### Current State
- TSX compiler converts JSX to static UI builder calls
- Conditional expressions like `{condition.value && <element>}` are compiled as static code
- No automatic reactive subscription creation for conditional rendering

### Target State
- TSX compiler detects conditional expressions with `.value` syntax
- Automatically generates `ui.When(watch(...))` calls for reactive conditions
- Maintains existing static compilation for non-reactive conditions
- Supports both logical AND (`&&`) and ternary (`? :`) conditional patterns

## Components and Interfaces

### 1. Conditional Expression Detector

**Purpose**: Identify conditional rendering patterns in JSX expressions

**Interface**:
```typescript
interface ConditionalExpression {
  type: 'logical' | 'ternary'
  condition: string
  thenElement: JSXElement
  elseElement?: JSXElement
  isReactive: boolean
  dependencies: string[]
}

function detectConditionalExpression(expr: JSXExpressionContainer): ConditionalExpression | null
```

**Patterns to Detect**:
- `{condition.value && <element>}` → Logical AND
- `{condition.value ? <element> : <otherElement>}` → Ternary with else
- `{condition.value ? <element> : null}` → Ternary without else
- `{$if(condition.value, <element>)}` → Explicit $if helper
- `{$if(condition.value) && <element>}` → $if with && syntax

## Supported Conditional Patterns

### 1. Logical AND (`&&`)
```tsx
{isVisible.value && <div>Content</div>}
{user.value && user.value.isAdmin && <AdminPanel />}
```

### 2. Ternary Operator (`? :`)
```tsx
{isVisible.value ? <div>Visible</div> : <div>Hidden</div>}
{count.value > 10 ? <HighCount /> : null}
```

### 3. $if Helper Function
```tsx
{$if(condition.value, <div>Content</div>)}
{$if(condition.value, <div>True</div>, <div>False</div>)}
```

### 4. $if with && Syntax
```tsx
{/* ✅ Correct: Single condition */}
{$if(counter.value > 5) && <div>High counter</div>}

{/* ✅ Correct: Multiple conditions grouped in parentheses */}
{$if((isEnabled.value && counter.value > 10)) && <div>Both conditions</div>}

{/* ❌ Invalid: Multiple conditions outside $if parentheses */}
{$if(counter.value > 5) && isEnabled.value && <div>Invalid</div>}
```

**Important:** When using `$if() && jsx` syntax with multiple conditions, all conditions must be grouped inside the `$if()` parentheses. The pattern `$if(condition1) && condition2 && jsx` is invalid and will not be transformed.

### 2. Reactive Dependency Analyzer

**Purpose**: Extract ref dependencies from conditional expressions

**Interface**:
```typescript
interface DependencyAnalysis {
  dependencies: string[]
  expression: string
  watchPattern: 'single' | 'multiple'
}

function analyzeDependencies(conditionCode: string): DependencyAnalysis
```

**Logic**:
- Scan for `.value` patterns using regex: `/(\w+)\.value/g`
- Extract unique ref names
- Determine watch pattern:
  - Single dependency: `watch(ref, () => expression)`
  - Multiple dependencies: `watch([ref1, ref2], () => expression)`

### 3. UI.When Code Generator

**Purpose**: Generate reactive UI builder calls

**Interface**:
```typescript
interface WhenCallConfig {
  condition: string
  thenBuilder: string
  elseBuilder?: string
}

function generateWhenCall(config: WhenCallConfig): string
```

**Output Patterns**:
```typescript
// Single condition
ui.When(watch(counter, () => counter.value > 10) as Ref<boolean>, (ui) => {
  ui.P({ text: "Counter is high" })
})

// With else clause
ui.When(watch(isLoggedIn, () => isLoggedIn.value) as Ref<boolean>, (ui) => {
  ui.Div({ text: "Welcome!" })
}).Else((ui) => {
  ui.Div({ text: "Please login" })
})
```

### 4. Enhanced TSX Compiler Integration

**Purpose**: Integrate conditional detection into existing compilation flow

**Modification Points**:
- `convertChildrenToUICode()` function
- `JSXExpressionContainer` handling
- Add conditional expression processing before existing logic

## Data Models

### ConditionalPattern
```typescript
type ConditionalPattern = {
  pattern: 'logical-and' | 'ternary-with-else' | 'ternary-without-else' | 'if-helper'
  condition: {
    code: string
    dependencies: string[]
    isReactive: boolean
  }
  thenElement: JSXElement
  elseElement?: JSXElement
}
```

### WatchExpression
```typescript
type WatchExpression = {
  dependencies: string[]
  callback: string
  pattern: 'single' | 'multiple'
  returnType: 'boolean' | 'string' | 'number' // For proper casting
}
```

## Error Handling

### Compilation Errors
- **Invalid conditional syntax**: Provide clear error messages for malformed expressions
- **Missing dependencies**: Warn when `.value` is used but ref is not in scope
- **Nested conditional complexity**: Handle deeply nested conditional expressions gracefully

### Runtime Considerations
- **Ref validation**: Ensure referenced variables are actually Ref objects
- **Watch cleanup**: Leverage existing cleanup system for conditional subscriptions
- **Performance**: Avoid creating unnecessary watch expressions for static conditions

## Testing Strategy

### Unit Tests
1. **Dependency Detection**:
   - Single ref: `counter.value > 10` → `['counter']`
   - Multiple refs: `a.value && b.value` → `['a', 'b']`
   - No refs: `true && false` → `[]`

2. **Pattern Recognition**:
   - Logical AND: `{condition.value && <div>}`
   - Ternary: `{condition.value ? <div> : <span>}`
   - $if helper: `{$if(condition.value, <div>)}`

3. **Code Generation**:
   - Verify correct `ui.When(watch(...) as Ref<boolean>)` output
   - Check proper argument patterns (single vs array)
   - Validate TypeScript casting for watch return values
   - Validate nested builder functions

### Integration Tests
1. **End-to-End Compilation**:
   - TSX input with conditional expressions
   - Generated UI builder code
   - Runtime reactivity verification

2. **Complex Scenarios**:
   - Nested conditionals
   - Mixed static and reactive conditions
   - Multiple conditional expressions in same component

### Performance Tests
1. **Compilation Speed**: Measure impact on build times
2. **Runtime Performance**: Compare reactive vs static rendering
3. **Memory Usage**: Verify proper cleanup of conditional subscriptions

## Implementation Plan

### Phase 1: Core Detection
- Implement `detectConditionalExpression()`
- Add dependency analysis for `.value` patterns
- Create basic test suite

### Phase 2: Code Generation
- Implement `generateWhenCall()`
- Integrate with existing TSX compiler
- Handle single and multiple dependency patterns

### Phase 3: Advanced Features
- Support for `$if` helper function
- Nested conditional handling
- Error handling and validation

### Phase 4: Optimization
- Performance improvements
- Better error messages
- Edge case handling

## Migration Strategy

### Backward Compatibility
- Existing `ui.When()` calls remain unchanged
- Static conditional expressions continue to work
- No breaking changes to current API

### Developer Experience
- Automatic transformation is transparent
- Developers can still use explicit `ui.When()` if preferred
- Clear documentation on reactive vs static patterns

## Security Considerations

- **Code Injection**: Validate generated expressions to prevent injection
- **Dependency Validation**: Ensure only valid identifiers are extracted as dependencies
- **Scope Safety**: Verify referenced variables exist in component scope