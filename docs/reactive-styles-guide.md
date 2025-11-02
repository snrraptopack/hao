# Reactive Styles Guide

This guide explains how to use reactive styles in Auwla JSX components and common patterns to avoid.

## Overview

Auwla supports reactive styles through the `watch()` function and `Ref` objects. The JSX runtime automatically detects reactive values and sets up proper subscriptions for DOM updates.

## Correct Patterns

### 1. Reactive Style Object (Recommended)

Use `watch()` to create a reactive style object:

```tsx
// ✅ CORRECT: Entire style object is reactive
const todoStyle = watch(todo.completed, (completed) => ({
  textDecoration: completed ? 'line-through' : 'none',
  opacity: completed ? 0.6 : 1,
  cursor: 'pointer'
}));

return <li style={todoStyle}>...</li>;
```

### 2. Individual Reactive Properties

Use `Ref` objects for individual style properties:

```tsx
// ✅ CORRECT: Individual properties are reactive
const textDecoration = watch(todo.completed, (completed) => 
  completed ? 'line-through' : 'none'
);

return <li style={{ textDecoration, cursor: 'pointer' }}>...</li>;
```

### 3. Mixed Static and Reactive Properties

Combine static styles with reactive ones:

```tsx
// ✅ CORRECT: Mix static and reactive properties
const color = watch(theme, (t) => t.primaryColor);

return <div style={{ 
  padding: '10px',        // static
  margin: '5px',          // static
  color,                  // reactive
  fontSize: '14px'        // static
}}>...</div>;
```

## Common Mistakes

### ❌ Watch Result as Property Value

```tsx
// ❌ WRONG: watch() result used as property value
return <li style={{
  textDecoration: watch(todo.completed, (value) => 
    value ? 'line-through' : 'none'
  )
}}>...</li>;
```

**Problem**: The `watch()` result is treated as a plain object property, losing reactivity after initial render.

**Solution**: Use pattern #1 or #2 above.

### ❌ Nested Watch Calls

```tsx
// ❌ WRONG: Nested watch calls
return <div style={{
  color: watch(theme, (t) => t.color),
  backgroundColor: watch(theme, (t) => t.bgColor)
}}>...</div>;
```

**Problem**: Multiple watch calls for the same source create unnecessary subscriptions.

**Solution**: Create a single reactive style object:

```tsx
// ✅ CORRECT: Single watch for multiple properties
const themeStyle = watch(theme, (t) => ({
  color: t.color,
  backgroundColor: t.bgColor
}));

return <div style={themeStyle}>...</div>;
```

## Advanced Patterns

### Conditional Styles

```tsx
// Conditional style application
const buttonStyle = watch([isActive, isDisabled], ([active, disabled]) => ({
  backgroundColor: disabled ? '#ccc' : active ? '#007bff' : '#6c757d',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.6 : 1
}));
```

### Computed Styles with Multiple Sources

```tsx
// Multiple reactive sources
const cardStyle = watch([theme, size, isHovered], ([t, s, hovered]) => ({
  backgroundColor: t.cardBackground,
  padding: s === 'large' ? '20px' : '10px',
  transform: hovered ? 'scale(1.02)' : 'scale(1)',
  transition: 'all 0.2s ease'
}));
```

### Performance Optimization

For frequently changing values, consider using `derive()` for better performance:

```tsx
// For high-frequency updates
const animationStyle = derive(() => ({
  transform: `translateX(${position.value}px)`,
  opacity: visible.value ? 1 : 0
}));
```

## Debugging Tips

1. **Development Warnings**: In development mode, the JSX runtime will warn about common mistakes like using `watch()` results as property values.

2. **DevTools Integration**: Use the Auwla DevTools to inspect reactive subscriptions and their current values.

3. **Console Logging**: Add logging to your watch callbacks to debug reactivity:

```tsx
const debugStyle = watch(state, (s) => {
  console.log('Style updating:', s);
  return { color: s.color };
});
```

## Type Safety

Use proper TypeScript types for better development experience:

```tsx
import type { Ref } from './state';

// Typed reactive style
const typedStyle: Ref<React.CSSProperties> = watch(theme, (t) => ({
  color: t.textColor,
  fontSize: `${t.fontSize}px`
}));
```

## Best Practices

1. **Prefer single reactive objects** over multiple individual reactive properties
2. **Use meaningful variable names** for reactive styles
3. **Group related styles** in the same watch callback
4. **Avoid deep nesting** in style objects
5. **Consider performance** for high-frequency updates
6. **Use TypeScript** for better type safety and IDE support

## Migration from Non-Reactive Styles

If you have existing non-reactive styles that need to become reactive:

```tsx
// Before: Static styles
<div style={{ color: 'red', fontSize: '14px' }}>

// After: Make specific properties reactive
<div style={{ 
  color: watch(theme, t => t.errorColor), 
  fontSize: '14px' 
}}>

// Or: Make entire object reactive
const errorStyle = watch(theme, t => ({
  color: t.errorColor,
  fontSize: '14px'
}));
<div style={errorStyle}>
```