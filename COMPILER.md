# Auwla Compiler Strategy

## Purpose

The compiler should preserve Auwla's developer experience while removing runtime work that can be known ahead of time.

Developers should keep writing ordinary TSX:

```tsx
function TodoApp() {
  const todos = [{ id: 1, text: 'Learn Auwla', done: false }];

  return () => (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id} class={todo.done ? 'done' : ''}>
          <input
            type="checkbox"
            checked={todo.done}
            onChange={() => { todo.done = !todo.done; }}
          />
          <span>{todo.text}</span>
        </li>
      ))}
    </ul>
  );
}
```

The compiler can lower this into more direct runtime instructions. Application authors should not need `memo()`, signals, refs, setters, or custom list components.

## What The Runtime Does Today

The current runtime is a correctness layer:

- JSX creates lightweight template nodes during render.
- The DOM patcher compares those templates against real DOM.
- Keyed elements reuse existing DOM nodes.
- Event handlers invalidate the app after mutation.
- Nested component setup closures are cached.
- Internal memo blocks can skip unchanged keyed subtrees.

This is good enough for the clean DX and for localized updates. It is still too much work for large create/update-all paths because the runtime discovers everything dynamically.

## Compiler Goal

The compiler should turn declarative JSX into small imperative DOM programs:

- Create static DOM once from known element shapes.
- Store direct references to dynamic text nodes, attributes, classes, booleans, and event handlers.
- Patch only the dynamic fields that can change.
- Lower keyed `.map()` into an internal keyed block.
- Keep the source-level DX as normal JavaScript and TSX.

The compiled output can be less pretty. The source code must stay simple.

## Transform 1: Static Shape Hoisting

Input:

```tsx
<div class="card">
  <span>ID: {item.id}</span>
  <strong>{item.value}</strong>
</div>
```

Compiler insight:

- `div`, `span`, and `strong` are static element shapes.
- `"card"` and `"ID: "` are static.
- `item.id` and `item.value` are dynamic text parts.

Runtime target:

```ts
const block = __createBlock(() => {
  const div = document.createElement('div');
  div.className = 'card';

  const span = document.createElement('span');
  const idPrefix = document.createTextNode('ID: ');
  const idText = document.createTextNode('');
  span.append(idPrefix, idText);

  const strong = document.createElement('strong');
  const valueText = document.createTextNode('');
  strong.append(valueText);

  div.append(span, strong);

  return {
    node: div,
    update(item) {
      __setText(idText, item.id);
      __setText(valueText, item.value);
    },
  };
});
```

The runtime no longer needs to allocate a full template tree and then compare it.

## Transform 2: Direct Dynamic Patches

Input:

```tsx
<li class={todo.done ? 'done' : ''}>
  <input type="checkbox" checked={todo.done} />
  <span>{todo.text}</span>
</li>
```

Compiler output should know the exact mutation sites:

- `li.className`
- `input.checked`
- text node content inside `span`

Runtime target:

```ts
update(todo) {
  __setClass(li, todo.done ? 'done' : '');
  __setProperty(input, 'checked', todo.done);
  __setText(text, todo.text);
}
```

This is the path that makes update-all faster. Instead of patching an entire row template, Auwla patches only known fields.

## Transform 3: Keyed Map Lowering

Input:

```tsx
{todos.map((todo) => (
  <li key={todo.id}>{todo.text}</li>
))}
```

Compiler target:

```ts
__keyedMap(
  todos,
  (todo) => todo.id,
  createTodoRow,
  updateTodoRow,
)
```

The keyed map runtime should:

- Reuse row blocks by key.
- Create blocks only for new keys.
- Move existing DOM nodes with the LIS reorder strategy.
- Remove blocks for deleted keys.
- Run row updates only when row dependencies changed.

The compiler can initially infer row dependencies conservatively from expressions inside the row.

Example inferred deps:

```tsx
todo => [todo.text, todo.done]
```

Later, compiled row updates can avoid dependency arrays and directly run cheap field setters.

## Transform 4: Component Instance Lowering

Current components already have setup and render phases:

```tsx
function Counter() {
  let count = 0;
  return () => <button onClick={() => count++}>{count}</button>;
}
```

The compiler should keep that mental model. It can lower the returned render closure into a compiled block:

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

## Transform 5: Event Handler Wrapping

The compiler can wrap event handlers at build time:

```tsx
<button onClick={() => count++}>Increment</button>
```

Target:

```ts
button.addEventListener('click', __event(() => {
  count++;
}));
```

The runtime `__event` wrapper invalidates after the handler completes. If the handler returns a promise, invalidate after it settles.

## Transform 6: Static Style And Class Optimization

Inline style objects are expensive in hot lists because each render creates and diffs objects.

The compiler should:

- Hoist static style objects.
- Prefer direct style setters for dynamic style fields.
- Leave class strings as direct `className` assignments.
- Optionally warn in development when a hot keyed row creates large inline style objects.

Input:

```tsx
<div style={{ color: done ? 'green' : 'gray', padding: 8 }} />
```

Target:

```ts
div.style.padding = '8px';
update(done) {
  __setStyle(div, 'color', done ? 'green' : 'gray');
}
```

## Runtime Helpers Needed

The compiler should target a small internal helper layer:

```ts
__createBlock(factory)
__componentBlock(factory)
__keyedMap(items, keyOf, createRow, updateRow)
__event(handler)
__setText(node, value)
__setClass(element, value)
__setProperty(element, name, value)
__setAttribute(element, name, value)
__setStyle(element, name, value)
```

These helpers should be internal exports or compiler-only imports. They should not be the main public DX.

## Safety Rules

The compiler should only optimize when it can preserve behavior.

Safe:

- Static JSX element names.
- Static prop names.
- Keyed `.map()` with a stable `key`.
- Text interpolation.
- Boolean/property bindings like `checked`, `value`, `disabled`.
- Event handlers.

Fallback to runtime template patching:

- Dynamic element type.
- Spreads with unknown keys.
- Complex children that cannot be statically shaped.
- Unkeyed list reorder.
- Code patterns the compiler cannot safely analyze.

The fallback matters. Auwla should remain correct even without compilation or when a file cannot be optimized.

## Build Order

1. Add internal block helpers.
2. Compile simple static JSX into create/update blocks.
3. Compile dynamic text and class/property patches.
4. Compile keyed `.map()` into `__keyedMap`.
5. Add dependency inference for keyed rows.
6. Add component block lowering.
7. Add development warnings for slow patterns.
8. Add benchmark suite against runtime-only Auwla, React, Preact, and Solid.

## Performance Targets

The compiler should improve the current weak points:

- Create 1,000 rows: reduce runtime render/patch overhead by creating DOM from precompiled shapes.
- Update all 1,000 rows: patch direct text/class/property fields instead of rebuilding row templates.
- Update one row: keep current memo-level performance or improve it.
- Swap rows: keep the current keyed LIS movement behavior.
- Clear list: keep the current fast clear path.

## Non-Goals

- Do not introduce hooks.
- Do not require signals or `.value`.
- Do not require `<For>` or `<Show>`.
- Do not make the compiler mandatory for correctness.
- Do not expose generated helper APIs as the normal way to write apps.

## Final Direction

Auwla should have two layers:

1. Runtime-only mode: simple, correct, good enough, useful for development and unsupported patterns.
2. Compiled mode: same source DX, but lowered into direct DOM operations for serious performance.

The product promise is not "developers write memoized code." The promise is "developers write plain JavaScript and TSX, and Auwla makes the obvious parts fast."
