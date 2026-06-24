# Auwla Compiler Pitfalls & Workarounds

This document tracks edge cases and pitfalls encountered while using the **Auwla JSX Compiler** (Vite plugin version). These notes serve as reference points for future compiler optimization and compiler-runtime improvements.

---

## 1. Block-Bodied Callbacks in Keyed Maps (`.map()`)

### Pitfall
When writing `.map()` loops that return JSX, the compiler optimizes them into runtime `__keyedMap` blocks. However, if the map's callback function uses a block body (with curly braces `{ ... }`) and contains declarations before the `return` statement:

```tsx
{items.map((item) => {
  const active = slug === item.slug; // ❌ Statements discarded by compiler
  return (
    <li class={active ? 'active' : ''}>
      {item.name}
    </li>
  );
})}
```

The compiler extracts only the JSX node inside the `return` statement. The preceding statements (like `const active = ...`) are silently discarded and never generated in the compiled JS bundle. Any reference to these variables inside the JSX expressions will throw a `ReferenceError` at runtime:
```
Uncaught ReferenceError: active is not defined
```

### Workaround
Avoid declaring intermediate variables inside map block bodies. Use parenthesis-bodied arrow functions (implicit return) and inline the expressions directly in the JSX:

```tsx
{items.map((item) => (
  <li class={slug === item.slug ? 'active' : ''}>
    {item.name}
  </li>
))}
```

### Proposed Compiler Fix
The compiler's `compileKeyedMap` function should either:
- Inline the preceding statements inside the block's `update` function (if they depend on the row's item/index parameters).
- Fall back to the runtime JSX rendering path instead of failing silently when non-return statements are found in the mapping closure body.

---

## 2. `ref` Callbacks Run Only on Mount (Setup Block)

### Pitfall
The compiler transforms JSX `ref={...}` properties into side-effects that execute once during the element's mount phase (the setup block). If a `ref` callback relies on closure variables that update reactively:

```tsx
function CodeBlock(props: { code: string }) {
  return () => {
    const html = highlight(props.code);
    // ❌ The ref callback runs only once. When props.code updates,
    // this callback will NOT execute again, leaving the innerHTML stale.
    return (
      <pre>
        <code ref={(el) => { el.innerHTML = html; }} />
      </pre>
    );
  };
}
```

Since the element `<code>` is kept alive and only updated, the `ref` callback is not called again, which causes the dynamic content to become stale.

### Workaround
Force Auwla to recreate the element by supplying a unique `key` bound to the changing content. When the key changes, the reconciler destroys the old element and mounts a new one, triggering the `ref` callback again:

```tsx
function CodeBlock(props: { code: string }) {
  return () => {
    const html = highlight(props.code);
    return (
      <pre>
        <code key={props.code} ref={(el) => { el.innerHTML = html; }} />
      </pre>
    );
  };
}
```

### Proposed Compiler Fix
Add support for dynamic `ref` updates at the compiler-runtime level, or log a warning if a compiler-compiled `ref` callback closes over variables that are updated during the parent's `update` lifecycle.

---

## 3. Inline HTML Injection (`innerHTML`)

### Pitfall
Auwla's JSX type definitions do not expose `innerHTML` as a standard element attribute because the runtime prioritizes secure text nodes and direct updates.

### Workaround
Always inject raw HTML (e.g. parsed markdown or code highlighting blocks) using the `ref` element binding workaround:
```tsx
<div ref={(el) => { el.innerHTML = htmlContent; }} />
```
Make sure to key the element if the content changes dynamically (see Pitfall #2).


Error.tsx:5 {key: '%2Fdocs%2Finstallation:error', children: Array(0)}children: Array(0)length: 0[[Prototype]]: Array(0)at: ƒ at()concat: ƒ concat()constructor: ƒ Array()copyWithin: ƒ copyWithin()entries: ƒ entries()every: ƒ every()fill: ƒ fill()filter: ƒ filter()find: ƒ find()findIndex: ƒ findIndex()findLast: ƒ findLast()findLastIndex: ƒ findLastIndex()flat: ƒ flat()flatMap: ƒ flatMap()forEach: ƒ forEach()includes: ƒ includes()indexOf: ƒ indexOf()join: ƒ join()keys: ƒ keys()lastIndexOf: ƒ lastIndexOf()length: 0map: ƒ map()pop: ƒ pop()push: ƒ push()reduce: ƒ reduce()reduceRight: ƒ reduceRight()reverse: ƒ reverse()shift: ƒ shift()slice: ƒ slice()some: ƒ some()sort: ƒ sort()splice: ƒ splice()toLocaleString: ƒ toLocaleString()toReversed: ƒ toReversed()toSorted: ƒ toSorted()toSpliced: ƒ toSpliced()toString: ƒ toString()unshift: ƒ unshift()values: ƒ values()with: ƒ with()Symbol(Symbol.iterator): ƒ values()Symbol(Symbol.unscopables): {at: true, copyWithin: true, entries: true, fill: true, find: true, …}[[Prototype]]: Objectkey: "%2Fdocs%2Finstallation:error"[[Prototype]]: Objectconstructor: ƒ Object()hasOwnProperty: ƒ hasOwnProperty()isPrototypeOf: ƒ isPrototypeOf()propertyIsEnumerable: ƒ propertyIsEnumerable()toLocaleString: ƒ toLocaleString()toString: ƒ toString()valueOf: ƒ valueOf()__defineGetter__: ƒ __defineGetter__()__defineSetter__: ƒ __defineSetter__()__lookupGetter__: ƒ __lookupGetter__()__lookupSetter__: ƒ __lookupSetter__()__proto__: (...)get __proto__: ƒ __proto__()set __proto__: ƒ __proto__()
 the error doesnt contain anything like message in the reason
