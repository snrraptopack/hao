# Compiler

Auwla's optional Vite plugin compiles your TSX render closures into imperative DOM operations. The runtime is always correct without it — the compiler is a pure optimization that removes virtual-DOM overhead where it can prove it is safe.

---

## How It Works

A component like this:

```tsx
function Counter() {
  let count = 0;
  return () => <button onClick={() => count++}>{count}</button>;
}
```

is transformed into something like this:

```ts
function Counter() {
  let count = 0;

  return __componentBlock(() => {
    const button = document.createElement('button');
    const text = document.createTextNode('');
    button.append(text);

    button.addEventListener('click', __event(() => {
      count++;
    }));

    return {
      node: button,
      update() {
        __setText(text, count);
      },
    };
  });
}
```

The DOM node is created once. On every re-render, only `update()` runs, patching exactly the pieces that can change.

---

## Setup

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { auwla } from 'auwla/vite';

export default defineConfig({
  plugins: [auwla()],
});
```

For fullstack apps, pass a server entry:

```ts
export default defineConfig({
  plugins: [
    auwla({ serverEntry: './src/server.ts' }),
    auwlaRouter(),
  ],
});
```

---

## What Gets Compiled

### ✅ Compiled

| Pattern | Output |
| :--- | :--- |
| `return () => <div class="x">{text}</div>` | `__componentBlock` + `__createBlock` + `__setText` |
| `return () => { count++; return <div>{count}</div>; }` | Leading statements preserved, JSX compiled |
| `{items.map(item => <li key={item.id}>{item.text}</li>)}` | `__keyedMap` with dependency inference |
| `{show ? <A/> : <B/>}`, `{show && <A/>}` | `activeBranch` direct DOM swapping |
| `onClick={() => count++}` | `addEventListener('click', __event(...))` |
| `style={{ color: 'red', padding: 8 }}` (all static) | Inline CSS in template HTML |
| `<svg>`, `<circle>`, `<path>` | `createElementNS` |
| Simple child components with no setup state | Inlined into parent block |

### ❌ Falls Back to Runtime JSX

| Pattern | Why |
| :--- | :--- |
| `return () => { if (x) return <A/>; return <B/>; }` | Only single JSX returns are compiled |
| `<props.tag>Hello</props.tag>` | Dynamic tag not known at compile time |
| Mixed JSX and non-nullish text branches | Needs runtime text/JSX interleaving |
| `style={{ color: dynamic }}` (mixed static/dynamic) | Falls back to `__setStyle` patches |
| Components with setup code (`component()`, `cleanup()`) | Runtime `__setChild` fallback |

A compiled parent can contain runtime children safely — the child is anchored with a comment marker and patched by the runtime.

---

## Compilation Paths

### Template path

When the root is a static-looking element, the compiler emits an HTML template and clones it:

```ts
const el0 = __cloneTemplate('<div class="card"><span>ID: </span><strong></strong></div>');
const text0 = el0.childNodes[1] as Text;

return {
  node: el0,
  update() {
    __setText(text0, item.id);
  },
};
```

This is faster because `innerHTML` runs once and only text/property patches run on updates.

### Non-template path

For dynamic shapes, the compiler emits `document.createElement` calls:

```ts
const div = document.createElement('div');
div.className = 'card';
const text0 = document.createTextNode('');
div.append(text0);

return {
  node: div,
  update() {
    __setText(text0, item.id);
  },
};
```

---

## Keyed Lists

`.map()` calls with a `key` attribute are compiled to `__keyedMap()`:

```tsx
{todos.map((todo) => (
  <li key={todo.id} class={todo.done ? 'done' : ''}>
    {todo.text}
  </li>
))}
```

The compiler infers row dependencies from expressions that reference the item. If only `todo.text` and `todo.done` are used, the dependency array is narrowed to exactly those properties.

---

## Debugging

Enable `debugFlag` to see whether a file was compiled:

```ts
auwla({ debugFlag: true });
```

```js
globalThis.__AUWLA_COMPILED__; // true if compiled, false if runtime-only
```

You can also inspect compiled output in the browser's Sources panel.

---

## Bundle Size

| File | Raw | Gzipped | Ships to Browser? |
| :--- | :--- | :--- | :--- |
| `auwla.js` | 16 KB | ~5 KB | ✅ Main runtime |
| `compiler.js` | 23 KB | 6 KB | ❌ Build-time only |

The compiler adds imports like `import { __componentBlock, __setText } from 'auwla'`. Your bundler tree-shakes unused helpers, so if no components are compiled, the compiler-runtime helpers are excluded entirely.

---

## Safety Model

1. The compiler only transforms when it can prove behavior is preserved.
2. If any sub-pattern is unrecognized, the entire render closure falls back to runtime JSX.
3. A file with no compilable closures passes through unchanged.
4. The runtime remains correct even if the compiler is disabled.

This means compiled and runtime components can be mixed freely in the same app.

---

In the next section, we will explore the **Guides** starting with [Two-Way Binding](/docs/two-way-binding) for forms.
