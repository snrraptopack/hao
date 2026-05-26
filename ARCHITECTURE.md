# Auwla Codebase Guide

This repo has two layers: the handwritten JSX runtime that keeps Auwla correct without a compiler, and the compiler-target runtime that generated code calls for performance.

## Directory Layout

```
src/
├── runtime/           # DOM runtime (was memo-dom.ts)
│   ├── app.ts         # createMemoApp, commit, memo
│   ├── component.ts   # component(), cleanup(), createComponentClosure
│   ├── dom.ts         # h(), Fragment, createMemoElement, setProp, setProps
│   ├── patch.ts       # patchNode, patchChildren, patchRoot
│   ├── reconcile.ts   # placePatchedNodes with LIS
│   ├── template.ts    # TemplateNode, templateEqual, createTemplateElement
│   ├── state.ts       # runtimeState, __wrapCompilerEvent
│   └── types.ts       # Runtime type definitions
├── compiler-runtime/  # Helpers for compiled output (was compiler-runtime.ts)
│   ├── block.ts       # __createBlock, __componentBlock
│   ├── dom-setters.ts # __setText, __setClass, __setProperty, __setAttribute, __setStyle
│   ├── events.ts      # __event
│   ├── keyed-map.ts   # __keyedMap
│   └── template.ts    # __cloneTemplate
├── compiler/          # TSX source transform (was compiler.ts)
│   ├── index.ts       # compileAuwla, compileJsxNode, compileRenderClosure
│   └── utils.ts       # AST helpers, string escaping, expression classification
├── shared/            # Utilities shared by runtime and compiler-runtime
│   ├── constants.ts   # NO_INDEX
│   ├── deps.ts        # sameDeps, sameArrayDeps
│   ├── lis.ts         # longestIncreasingSubsequence
│   └── normalize.ts   # normalizeChildren
├── jsx/               # JSX runtime entries (was jsx.ts, jsx-runtime.ts, jsx-dev-runtime.ts)
│   ├── index.ts       # h, Fragment, type exports
│   ├── runtime.ts     # jsx, jsxs, JSX namespace
│   └── dev-runtime.ts # jsxDEV
├── index.ts           # Package entry: re-exports public runtime + compiler-runtime APIs
├── jsx-runtime.ts     # Build entry: re-exports from jsx/runtime.ts
├── jsx-dev-runtime.ts # Build entry: re-exports from jsx/dev-runtime.ts
└── compiler.ts        # Build entry: re-exports compileAuwla
```

## Runtime Flow

Application code calls `createMemoApp(root, <App />)`.

During a render, JSX calls `h()`. For DOM tags, `h()` creates lightweight `TemplateNode` descriptors while an app render is active. For component functions, `h()` creates a render closure and uses stable component IDs so setup runs once and closure state survives parent rerenders.

After render, `patchRoot()` patches the real DOM in place. Elements are reused when the tag and `key` match. Props, events, text, styles, and children are updated without replacing stable nodes. Keyed children are reordered with a longest-increasing-subsequence pass.

Event handlers are wrapped by the active app. After a handler mutates plain JavaScript state, the wrapper schedules one microtask render. External async work can call `commit()` to invalidate every mounted app.

## Compiler Helper Flow

The compiler lowers safe JSX into calls from `src/compiler-runtime/`.

A compiled component returns `__componentBlock(() => block)`. The block creates DOM once, stores references to dynamic mutation sites, and runs `update()` on every render. Generated code uses helpers like `__setText`, `__setClass`, `__setProperty`, `__setAttribute`, and `__setStyle` instead of creating new template trees.

Compiled event handlers call `__event(handler)`. Internally this delegates to the runtime so compiled handlers use the same invalidation behavior as normal JSX handlers.

Compiled keyed lists call `__keyedMap(items, keyOf, createRow, updateRow, depsOf)`. It reuses row blocks by key, skips row updates when dependency arrays are unchanged, removes deleted rows, and moves existing row nodes before its anchor comment.

`compileAuwla(source)` is exported from `auwla/compiler`. It parses TSX with TypeScript and lowers component render closures into imperative DOM blocks.

### Supported compile targets

- Intrinsic elements with static tag names
- Dynamic text, class, style objects, boolean/property fields, attributes
- Event handlers
- `ref` callbacks
- Fragments (`<>...</>`)
- Keyed map children shaped like `{items.map((item) => <li key={item.id}>...</li>)}`

### Compiler optimizations

- **Root block template cloning**: When a root render closure contains only static intrinsic markup, the compiler builds an HTML string and clones it via `__cloneTemplate` instead of calling `document.createElement` per node.
- **Row block template cloning**: Keyed map rows are cloned from cached `<template>` elements when possible.
- **Static hoisting**: Static attributes and boolean props are baked into the cloned HTML or moved to setup-time code so they never run in `update()`.

### Fallback behavior

Unkeyed maps, spread attributes, dynamic tag names, component JSX, and unsupported row shapes are left untouched for the runtime fallback. The runtime is always correct; the compiler is an optimization layer.

## Ownership Rules

- Keep source-level DX in `src/runtime/` and `src/jsx/`.
- Keep generated-code helpers in `src/compiler-runtime/`.
- Do not add compiler transform logic to `src/runtime/`.
- Keep compiler transform logic out of the main runtime bundle. Use the separate `auwla/compiler` entry.
- Do not make compiler helpers part of the recommended README API, even though they are exported for generated code and tests.
- Fallback correctness belongs to the runtime; compiler output is an optimization layer.
