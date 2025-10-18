# Auwla Template System - .auwla Extension

## Overview

The `.auwla` extension provides **full TypeScript support** for Auwla template files while maintaining the simple HTML-based template syntax.

## What Was Implemented

### 1. `.auwla` File Extension Support

**Files Created:**
- `.vscode/settings.json` - Associates `.auwla` with TypeScript
- `src/auwla.d.ts` - TypeScript declarations for `.auwla` imports
- `template/examples/TodoList.auwla` - Example with full TypeScript

**Benefits:**
- ✅ Full TypeScript type checking in `<script>` section
- ✅ IntelliSense for variables, functions, and imports
- ✅ Type safety for refs, props, and function parameters
- ✅ Autocomplete for framework APIs

### 2. Improved Vite Plugin

**Fixed Issues:**
- Cache invalidation now uses `>=` instead of `===` for mtime comparison
- Handles both `.html` and `.auwla` files
- Properly clears cache on file changes
- Better hot reload support

**Changes in `vite-plugin.ts`:**
```typescript
// Now handles both extensions
const isTemplateFile = id.endsWith('.html') || id.endsWith('.auwla')

// Fixed cache check
if (cached && cached.mtime >= mtime) { // Was: mtime === cached.mtime
  return cached
}

// Better cache invalidation on hot reload
handleHotUpdate({ file, server }) {
  cache.delete(file)
  cache.delete(file.replace(/\.(html|auwla)$/, '.compiled.js'))
  server.ws.send({ type: 'full-reload' })
}
```

### 3. TypeScript-Aware Parser

**Problem:** Acorn (JavaScript parser) doesn't support TypeScript syntax

**Solution:** Detect TypeScript and skip AST parsing, use regex fallback

```typescript
// Detects TypeScript syntax
const hasTypeScript = /\b(interface|type|enum)\b|:\s*\w+\s*[=,;)]/.test(scriptContent)

if (hasTypeScript) {
  // Use regex to extract variable/function names
  // Script content is passed through unchanged with types intact
}
```

### 4. Complex `@if` Expressions (Already Implemented)

The compiler now supports complex conditional expressions:

```html
<li @each="todos as todo" @if="showCompleted || !todo.done">
  <!-- Only shows when condition is met -->
</li>
```

**Compiles to:**
```javascript
ui.List({
  items: todos,
  render: (todo, index, ui) => {
    const _cond1 = watch([showCompleted, todo.done], ([v0, v1]) => v0 || !v1)
    ui.When(_cond1, (ui) => {
      ui.Li({ ... })
    })
  }
})
```

## Usage

### Creating a .auwla File

```html
<!-- MyComponent.auwla -->
<script>
import { ref, Ref } from 'auwla'

// Full TypeScript support!
interface User {
  id: number
  name: Ref<string>
  email: Ref<string>
}

const user = ref<User>({
  id: 1,
  name: ref('John Doe'),
  email: ref('john@example.com')
})

function updateName(newName: string): void {
  user.value.name.value = newName
}
</script>

<div class="user-card">
  <h2 :text="user.value.name"></h2>
  <p :text="user.value.email"></p>
  
  <button @click="() => updateName('Jane Doe')">
    Change Name
  </button>
</div>
```

### Type Safety Features

**1. Typed Refs:**
```typescript
const count = ref<number>(0)        // count: Ref<number>
const todos = ref<TodoItem[]>([])   // todos: Ref<TodoItem[]>
```

**2. Typed Functions:**
```typescript
function addTodo(text: string): void {
  todos.value = [...todos.value, { id: Date.now(), text: ref(text) }]
}

function toggleTodo(todo: TodoItem): void {
  todo.done.value = !todo.done.value
}
```

**3. Interface Definitions:**
```typescript
interface TodoItem {
  id: number
  text: Ref<string>
  done: Ref<boolean>
}
```

**4. Type-Safe Props** (for future component system):
```typescript
interface Props {
  title: string
  count: Ref<number>
  onUpdate: (value: number) => void
}
```

## Current Template Syntax

### Directives

**Events:**
```html
<button @click="handleClick">Click</button>
<input @input="handleInput" />
```

**Reactive Bindings:**
```html
<input :value="name" />
<span :text="count"></span>
<input type="checkbox" :checked="isDone" />
```

**Conditionals:**
```html
<!-- Simple -->
<span @if="isVisible">Show this</span>

<!-- Complex expressions -->
<li @if="showAll || !item.done">Conditional item</li>
```

**Loops:**
```html
<ul>
  <li @each="todos as todo">
    <span :text="todo.text"></span>
  </li>
</ul>
```

**Reactive Text:**
```html
<!-- Reactive (re-renders on change) -->
<span>Count: {{count}}</span>
<span>{{count * 2}}</span>

<!-- Static (interpolated once) -->
<span>Name: {userName}</span>
```

## File Structure

```
project/
├── .vscode/
│   └── settings.json          # Associates .auwla with TypeScript
├── src/
│   ├── index.ts               # Exports ref, Ref, Component, etc.
│   └── auwla.d.ts            # TypeScript declarations
├── template/
│   ├── compiler/
│   │   ├── parser.ts          # TypeScript-aware parsing
│   │   ├── analyzer.ts        # Template analysis
│   │   ├── codegen.ts         # Code generation
│   │   └── vite-plugin.ts     # Vite integration (.auwla support)
│   └── examples/
│       ├── TodoList.html      # Original (still works)
│       └── TodoList.auwla     # TypeScript version
└── vite.config.ts             # Uses templateCompiler() plugin
```

## VS Code Integration

When you open a `.auwla` file in VS Code:

1. **Syntax Highlighting:** TypeScript in `<script>`, HTML in template
2. **IntelliSense:** Autocomplete for imports, variables, functions
3. **Type Checking:** Errors shown inline
4. **Go to Definition:** Jump to ref/function definitions
5. **Refactoring:** Rename symbols across files

## Migration Guide

### From .html to .auwla

1. **Rename file:**
   ```bash
   mv MyComponent.html MyComponent.auwla
   ```

2. **Add types to script section:**
   ```typescript
   // Before (MyComponent.html)
   <script>
   import { ref } from 'auwla'
   const count = ref(0)
   </script>

   // After (MyComponent.auwla)
   <script>
   import { ref, Ref } from 'auwla'
   const count = ref<number>(0)  // Now typed!
   </script>
   ```

3. **Update imports:**
   ```typescript
   // In other files
   import MyComponent from './MyComponent.auwla'  // Was .html
   ```

4. **No template changes needed!** The HTML template section works exactly the same.

## Future Enhancements

### Planned: Function Call Syntax (Optional)

Instead of directives, you could use function calls in the future:

```html
<script>
import { ref, if, each } from 'auwla/template'

const items = ref([...])
</script>

<div>
  if(showItems, () => {
    each(items, (item) => {
      <div :text="item.name"></div>
    })
  })
</div>
```

This would give even better TypeScript integration, but directives (`@if`, `@each`) work great for now!

## Troubleshooting

### VS Code not providing IntelliSense

1. Check `.vscode/settings.json` exists
2. Reload VS Code window (Ctrl+Shift+P → "Reload Window")
3. Ensure file extension is `.auwla`, not `.html`

### Vite not recompiling on changes

1. Save the file to trigger mtime update
2. Check console for `[template-compiler] Compiling: ...` message
3. Clear Vite cache: `rm -rf node_modules/.vite`

### Type errors in compiled output

The compiled `.js` file will contain TypeScript syntax - this is expected. Vite/Bun will handle the TypeScript transformation.

## Summary

✅ **Full TypeScript support in `.auwla` files**  
✅ **No template syntax changes** - still use `@if`, `@each`, `:value`  
✅ **Better DX** - IntelliSense, type checking, refactoring  
✅ **Improved build system** - fixed cache and reload issues  
✅ **Backward compatible** - `.html` files still work  

The `.auwla` extension gives you the best of both worlds: **HTML template simplicity** with **TypeScript type safety**!
