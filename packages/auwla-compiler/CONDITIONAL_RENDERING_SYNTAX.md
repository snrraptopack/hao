# Conditional Rendering Syntax Guide

## Overview

Auwla supports multiple conditional rendering patterns that are automatically transformed into reactive `ui.When()` calls when using `.value` syntax with refs.

## Supported Patterns

### 1. Logical AND (`&&`)

**Basic Pattern:**
```tsx
{isVisible.value && <div>Content</div>}
```

**Multiple Conditions:**
```tsx
{user.value && user.value.isAdmin && <AdminPanel />}
```

**Compiled Output:**
```typescript
ui.When(watch([isVisible], () => isVisible.value) as Ref<boolean>, (ui: LayoutBuilder) => {
  ui.Div({text: "Content"})
})
```

### 2. Ternary Operator (`? :`)

**With Else:**
```tsx
{isVisible.value ? <div>Visible</div> : <div>Hidden</div>}
```

**Without Else:**
```tsx
{count.value > 10 ? <HighCount /> : null}
```

**Compiled Output:**
```typescript
ui.When(watch([isVisible], () => isVisible.value) as Ref<boolean>, (ui: LayoutBuilder) => {
  ui.Div({text: "Visible"})
}).Else((ui: LayoutBuilder) => {
  ui.Div({text: "Hidden"})
})
```

### 3. $if Helper Function

**Basic Usage:**
```tsx
{$if(condition.value, <div>Content</div>)}
```

**With Else:**
```tsx
{$if(condition.value, <div>True</div>, <div>False</div>)}
```

**Compiled Output:**
```typescript
ui.When(watch([condition], () => condition.value) as Ref<boolean>, (ui: LayoutBuilder) => {
  ui.Div({text: "Content"})
})
```

### 4. $if with && Syntax (New)

**✅ Correct: Single Condition**
```tsx
{$if(counter.value > 5) && <div>High counter</div>}
```

**✅ Correct: Multiple Conditions Grouped**
```tsx
{$if((isEnabled.value && counter.value > 10)) && <div>Both conditions</div>}
```

**❌ Invalid: Multiple Conditions Outside $if**
```tsx
{/* This will NOT be transformed and will be treated as text */}
{$if(counter.value > 5) && isEnabled.value && <div>Invalid</div>}
```

**Compiled Output (Valid Patterns):**
```typescript
ui.When(watch([counter], () => counter.value > 5) as Ref<boolean>, (ui: LayoutBuilder) => {
  ui.Div({text: "High counter"})
})

ui.When(watch([isEnabled, counter], () => isEnabled.value && counter.value > 10) as Ref<boolean>, (ui: LayoutBuilder) => {
  ui.Div({text: "Both conditions"})
})
```

## Important Rules

### 1. Grouping Multiple Conditions

When using `$if() && jsx` syntax with multiple conditions, **all conditions must be grouped inside the `$if()` parentheses**:

```tsx
// ✅ Correct
{$if((condition1 && condition2 && condition3)) && <jsx>}

// ❌ Invalid - will not be transformed
{$if(condition1) && condition2 && condition3 && <jsx>}
```

### 2. Alternative Approaches

If you need multiple conditions, you have several options:

**Option 1: Group in $if parentheses**
```tsx
{$if((isEnabled.value && counter.value > 10)) && <div>Content</div>}
```

**Option 2: Use $if helper syntax**
```tsx
{$if(isEnabled.value && counter.value > 10, <div>Content</div>)}
```

**Option 3: Use regular logical AND**
```tsx
{isEnabled.value && counter.value > 10 && <div>Content</div>}
```

### 3. Static vs Reactive

**Static conditions** (no `.value`) are compiled as regular JavaScript:
```tsx
{config.theme === 'dark' && <DarkTheme />}
// Compiled as: if (config.theme === 'dark') { ... }
```

**Reactive conditions** (with `.value`) are compiled with `watch()`:
```tsx
{theme.value === 'dark' && <DarkTheme />}
// Compiled as: ui.When(watch([theme], () => theme.value === 'dark') ...)
```

## Error Messages

When using invalid patterns, the compiler will show helpful error messages:

```
[Auwla Compiler Error] Invalid $if pattern detected
❌ Invalid: {$if(condition1) && condition2 && <jsx>}
✅ Use instead: {$if((condition1 && condition2)) && <jsx>}
✅ Or use: {$if(condition1 && condition2, <jsx>)}
```

## Best Practices

1. **Use the most readable pattern** for your use case
2. **Group complex conditions** in parentheses for clarity
3. **Prefer `$if()` helper** for complex conditional logic
4. **Use regular `&&`** for simple boolean checks
5. **Use ternary `? :`** when you need both true and false branches

## Examples

### Simple Toggle
```tsx
const isVisible = ref(true)
return <div>{isVisible.value && <Content />}</div>
```

### Complex Conditions
```tsx
const user = ref(null)
const permissions = ref([])

return (
  <div>
    {$if((user.value && permissions.value.includes('admin'))) && 
      <AdminPanel />
    }
  </div>
)
```

### Multiple Branches
```tsx
const status = ref('loading')

return (
  <div>
    {status.value === 'loading' ? <Spinner /> : 
     status.value === 'error' ? <ErrorMessage /> : 
     <Content />}
  </div>
)
```