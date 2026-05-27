# Auwla Compiler

> Build-time TSX transform that lowers component render closures into imperative DOM blocks.

## Overview

The compiler is an **optional** build-time transform. The runtime is always correct without it. When the compiler can analyze a pattern safely, it replaces JSX with direct DOM operations. When it cannot, the code falls back to runtime JSX patching.

Developers write ordinary TSX:

```tsx
function Counter() {
  let count = 0;
  return () => <button onClick={() => count++}>{count}</button>;
}
```

The compiler transforms the render closure into:

```ts
function Counter() {
  let count = 0;
  return __componentBlock(() => {
    const button = document.createElement('button');
    const text = document.createTextNode('');
    button.append(text);
    button.addEventListener('click', __event(() => { count++; }));

    return {
      node: button,
      update() {
        __setText(text, count);
      },
    };
  });
}
```

Setup still runs once. Events still mutate plain closure variables.

---

## Architecture

The compiler is organized into focused modules under `src/compiler/`:

| Module | Lines | Responsibility |
|--------|-------|----------------|
| `types.ts` | 76 | Shared type definitions (`CompileContext`, `TemplateContext`) and constants (`SVG_TAGS`, `PROPERTY_PROPS`, `COMPILER_IMPORT`) |
| `utils.ts` | 311 | Pure AST helpers — dependency inference, component inlining analysis, JSX unwrapping |
| `attributes.ts` | 297 | Attribute compilation for **both** template and non-template paths. Includes React camelCase normalization and static style-to-CSS conversion |
| `template.ts` | 206 | Template cloning path — generates `__cloneTemplate(...)` + `el.childNodes[N]` path patches |
| `jsx-node.ts` | 305 | Non-template JSX lowering — `compileJsxNode`, `compileJsxChild`, `compileKeyedMap`, `tryInlineComponent` |
| `index.ts` | 133 | Public API (`compileAuwla`) + transform orchestration (`findReplacements`, `transformReturn`) |

The compiled output calls into `src/compiler-runtime/` helpers:

| Module | Responsibility |
|--------|----------------|
| `block.ts` | `__createBlock`, `__componentBlock` — block factory wrappers |
| `dom-setters.ts` | Direct DOM mutation helpers (`__setText`, `__setClass`, `__setProperty`, `__setAttribute`, `__setStyle`, `__spreadProps`) |
| `events.ts` | `__event` — bridges compiled handlers to runtime invalidation |
| `template.ts` | `__cloneTemplate` — inflates HTML strings into DOM trees |
| `keyed-map.ts` | `__keyedMap` — keyed list reconciliation with LIS reordering |

---

## Compilation Pipeline

### 1. Find Render Closures

`findReplacements()` walks the AST looking for `return` statements whose expression is an arrow function returning JSX:

```tsx
return () => <div>...</div>;
return () => {           // ← also supported
  count++;
  return <div>...</div>; // ← leading statements are preserved
};
```

### 2. Try Template Path First

`compileRenderClosure()` first attempts `compileTemplateRootBlock()`. This works when:

- The root element is an intrinsic HTML tag (lowercase)
- All attributes are static strings or simple dynamic values
- No `style` object is present (unless **entirely static** — then converted to inline CSS)
- No JSX children inside expressions (e.g., no `{condition && <span/>}`)

Template path output:

```ts
__componentBlock(() => {
  const el0 = __cloneTemplate("<div class=\"card\"><span>ID: </span><strong></strong></div>");
  const el1 = el0.childNodes[0] as HTMLElement;
  const text0 = el0.childNodes[1] as Text;

  return __createBlock(() => ({
    node: el0,
    update() {
      __setText(text0, item.id);
    },
  }));
});
```

**Why templates are faster:** `__cloneTemplate` uses `innerHTML` once, then grabs child references. No per-element `document.createElement` calls.

### 3. Fall Back to Non-Template Path

If the template path fails (dynamic tags, spread attributes with unknown keys, JSX inside expressions, etc.), the compiler uses `compileJsxNode()` which generates `document.createElement` calls.

Non-template output for the same shape:

```ts
__componentBlock(() => {
  const div = document.createElement('div');
  div.className = 'card';
  const span = document.createElement('span');
  span.textContent = 'ID: ';
  const strong = document.createElement('strong');
  const text0 = document.createTextNode('');
  strong.append(text0);
  div.append(span, strong);

  return __createBlock(() => ({
    node: div,
    update() {
      __setText(text0, item.id);
    },
  }));
});
```

### 4. Attribute Compilation

Both paths share `normalizeAttributeName()` which maps React camelCase to HTML:

| JSX Attribute | Compiled To |
|---------------|-------------|
| `className` | `"class"` |
| `htmlFor` | `"for"` |
| `srcSet` | `"srcset"` |
| `spellCheck` | `"spellcheck"` |
| `readOnly` | `"readonly"` |
| `tabIndex` | `"tabindex"` |
| `colSpan` / `rowSpan` | `"colspan"` / `"rowspan"` |
| `charSet` | `"charset"` |
| `referrerPolicy` | `"referrerpolicy"` |
| `formAction` / `formMethod` / etc. | `"formaction"` / `"formmethod"` / etc. |

**Static style objects in templates:**

```tsx
<div style={{ padding: '16px', borderRadius: 8, opacity: 0.5 }} />
```

→ Template HTML: `<div style="padding: 16px; border-radius: 8px; opacity: 0.5"></div>`

Numeric values automatically get `px` appended (except unitless properties like `opacity`, `zIndex`, `lineHeight`).

**Dynamic style objects** fall back to the non-template path and generate per-property `__setStyle(el, name, value)` patches.

### 5. Keyed List Lowering

`.map()` calls with a `key` attribute are transformed into `__keyedMap()`:

```tsx
{todos.map((todo) => (
  <li key={todo.id} class={todo.done ? 'done' : ''}>
    {todo.text}
  </li>
))}
```

→

```ts
__keyedMap(
  todos,
  (todo) => todo.id,
  (todo) => __createBlock(() => {
    const li = document.createElement('li');
    const text0 = document.createTextNode('');
    li.append(text0);

    return {
      node: li,
      update(todo) {
        __setClass(li, todo.done ? 'done' : '');
        __setText(text0, todo.text);
      },
    };
  }),
  (block, todo) => block.update(todo),
  (todo) => [todo.text, todo.done],
  false,
);
```

The compiler infers row dependencies from expressions referencing the item parameter. If every free identifier is a property access on the item (e.g., `todo.text`), the dependency array is narrowed to just those properties. Otherwise it falls back to the full expression.

### 6. Component Inlining

Simple components that just return JSX and have no setup state can be inlined into their parent:

```tsx
function Label(props) {
  return () => <span>{props.text}</span>;
}

function App() {
  return () => <Label text="Hello" />;
}
```

→ `App` compiles as if it contained `<span>Hello</span>` directly. No component instance is created at runtime.

Inlining is **blocked** when:
- The component has more than 1 parameter
- The component body has conditional returns or loops
- The call site passes children and the component references `props.children`

---

## What Compiles vs. What Falls Back

### ✅ Compiled

| Pattern | Output |
|---------|--------|
| `return () => <div class="x">{text}</div>` | `__componentBlock` with `__createBlock` + `__setText` |
| `return () => { count++; return <div>{count}</div>; }` | Leading statements preserved, JSX compiled to block |
| `{items.map(item => <li key={item.id}>{item.text}</li>)}` | `__keyedMap` with dependency inference |
| `onClick={() => count++}` | `addEventListener('click', __event(...))` |
| `style={{ color: 'red', padding: 8 }}` (all static) | Inline CSS in template HTML |
| `<svg>`, `<circle>`, `<path>`, etc. | `createElementNS("http://www.w3.org/2000/svg", ...)` |
| Spread on known objects `{...props}` | `__spreadProps(element, props)` |
| Simple child components (no setup, no children refs) | Inlined into parent block |
| Parent with non-inlinable children | Parent compiles; children use `__setChild` fallback |

### ❌ Falls Back to Runtime JSX

| Pattern | Why |
|---------|-----|
| Components referencing `props.children` when call site passes children | Would break children insertion |
| `return () => { if (x) return <A/>; return <B/>; }` | Compiler only handles single JSX return |
| `<props.tag>Hello</props.tag>` | Dynamic tag — not known at compile time |
| `{condition ? <JSX/> : <JSX/>}` inside children | Conditional JSX uses `__setChild` |
| `{show && <JSX/>}` inside children | Logical expression with JSX uses `__setChild` |
| `{items.map(x => x)}` without `key` | Keyed map requires stable keys for reconciliation |
| `style={{ color: dynamic }}` (mixed static/dynamic) | Falls to non-template `__setStyle` patches |

### ✅ Compiled Parent + Runtime Child

A parent component with non-inlinable children is **now compiled**. The child components fall back to runtime `__setChild` at their specific positions:

```tsx
function Parent() {
  return () => (
    <div>
      <p>Static text</p>
      <Child />  {/* ← runtime fallback via __setChild */}
    </div>
  );
}
```

→ Parent compiles to direct DOM creation. `<Child />` is preserved as original JSX and rendered via `__setChild(commentMarker, <Child />)`.

---

## Bundle Size Analysis

Current build outputs:

| File | Raw | Gzipped | Ships to Browser? |
|------|-----|---------|-------------------|
| `auwla.js` | 16 KB | **5 KB** | ✅ Yes — main runtime |
| `compiler.js` | 23 KB | 6 KB | ❌ No — build-time only |
| `dom.js` | 8 KB | 2.5 KB | ✅ Yes — if imported directly |
| `jsx-runtime.js` | 324 B | 239 B | ✅ Yes — JSX transform entry |
| `jsx-dev-runtime.js` | 195 B | 176 B | ✅ Yes — dev JSX entry |

**`compiler.js` does NOT ship to browsers.** It depends on TypeScript and runs inside the Vite plugin at build time.

**`auwla.js` (~5 KB gzip)** is the browser bundle. It includes:
- Runtime: app lifecycle, DOM patching, component instances, event wrapping
- Compiler-runtime: `__setText`, `__setClass`, `__keyedMap`, `__event`, etc.

### Tree-Shaking

The compiler adds imports like `import { __componentBlock, __setText } from 'auwla'` to compiled files. Your bundler (Vite/Rollup/Webpack) tree-shakes unused helpers. If your app uses no compiled components, the compiler-runtime helpers are excluded entirely.

### Potential Reductions

There is intentional duplication between `runtime/dom.ts` (`setProp`, `setProps`, `createMemoElement`) and `compiler-runtime/dom-setters.ts` (`__setProperty`, `__setClass`, `__setStyle`). The compiler-runtime versions are smaller and faster because they skip:
- Old-value comparison (the compiler knows what changed)
- Event wrapping at patch time (events are wired once in setup)
- Full template equality checks

**Unifying them** would save ~1-2 KB but would make the compiler-runtime slower and more complex. The current tradeoff favors performance over bytes.

**Estimated minimum runtime size:** If every component in an app is compiled and only uses text + class patching, the shipped runtime could be as small as **~2.5 KB gzip** (just `__componentBlock`, `__createBlock`, `__setText`, `__setClass`, and the app loop).

---

## Safety Model

The compiler has a **strict opt-in, safe fallback** model:

1. It only transforms when it can prove behavior is preserved.
2. If any sub-pattern is unrecognized, the entire render closure falls back to runtime JSX.
3. A file with no compilable closures passes through unchanged.
4. The runtime must remain correct even if the compiler is disabled entirely.

This means you can mix compiled and runtime components freely in the same app. A compiled parent with a runtime child works correctly — the child uses `__setChild` (comment marker + runtime patching) inside the compiled parent's DOM tree.

---

## Known Limitations

1. **Block-bodied closures with multiple returns** — Only the first `return <jsx>` is compiled. Others are ignored.
2. **Conditional JSX in children** — `{show && <span/>}` and `{a ? <A/> : <B/>}` always use `__setChild` fallback. Each branch's JSX is not individually compiled.
3. **Spread attributes on unknown objects** — `__spreadProps` handles them at runtime, but the template path bails because it can't know which keys will exist.
4. **SVG standalone roots** — A root-level `<circle>` or `<path>` (not inside `<svg>`) bails from template path because `innerHTML` can't create SVG elements without an SVG parent context.

---

## Debugging

The Vite plugin sets a global flag so you can check if a file was compiled:

```js
window.__AUWLA_COMPILED__ // true if compiled, false if runtime-only
```

You can also inspect the compiled output in the browser's Sources panel. The compiler adds an `import { ... } from 'auwla'` line only when transforms apply.
