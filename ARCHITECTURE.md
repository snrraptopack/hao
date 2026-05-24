# Auwla Codebase Guide

This repo has two layers: the handwritten JSX runtime that keeps Auwla correct without a compiler, and the compiler-target runtime that generated code will call later.

## Files

- `src/index.ts` is the package entry. It re-exports the public runtime API and the internal compiler helper API.
- `src/jsx-runtime.ts` and `src/jsx-dev-runtime.ts` are the automatic JSX runtime entries used by TypeScript and Vite.
- `src/jsx.ts` is the small JSX facade that exposes `h`, `Fragment`, and DOM helper types.
- `src/memo-dom.ts` is the runtime-only implementation. It owns component setup caching, template nodes, DOM patching, event-driven invalidation, keyed child movement, and the public `memo()` primitive.
- `src/compiler-runtime.ts` is the compiler target helper layer. It owns imperative blocks, direct field setters, compiled event wrapping, and compiled keyed map reconciliation.
- `src/compiler.ts` is the first source transform entry. It parses TSX with TypeScript and lowers only safe intrinsic render closures into compiler-runtime blocks.
- `tests/*.test.tsx` and `tests/*.test.ts` cover the runtime contract, JSX DX, perf-sensitive behavior, and compiler helper behavior.
- `examples/` contains browser examples for manual checks through Vite.

## Runtime Flow

Application code calls `createMemoApp(root, <App />)`.

During a render, JSX calls `h()`. For DOM tags, `h()` creates lightweight template nodes while an app render is active. For component functions, `h()` creates a render closure and uses stable component IDs so setup runs once and closure state survives parent rerenders.

After render, `patchRoot()` patches the real DOM in place. Elements are reused when the tag and `key` match. Props, events, text, styles, and children are updated without replacing stable nodes. Keyed children are reordered with a longest-increasing-subsequence pass.

Event handlers are wrapped by the active app. After a handler mutates plain JavaScript state, the wrapper schedules one microtask render. External async work can call `commit()` to invalidate every mounted app.

## Compiler Helper Flow

The compiler will eventually lower safe JSX into calls from `src/compiler-runtime.ts`.

A compiled component returns `__componentBlock(() => block)`. The block creates DOM once, stores references to dynamic mutation sites, and runs `update()` on every render. Generated code should use helpers like `__setText`, `__setClass`, `__setProperty`, `__setAttribute`, and `__setStyle` instead of creating new template trees.

Compiled event handlers call `__event(handler)`. Internally this delegates to `memo-dom.ts` so compiled handlers use the same invalidation behavior as normal JSX handlers.

Compiled keyed lists call `__keyedMap(items, keyOf, createRow, updateRow, depsOf)`. It reuses row blocks by key, skips row updates when dependency arrays are unchanged, removes deleted rows, and moves existing row nodes before its anchor comment.

`compileAuwla(source)` is exported from `auwla/compiler`. It currently handles a narrow first slice: a component `return () => <tag ...>...</tag>` where the JSX tree uses static intrinsic tag names, static prop names, no spreads, and no fragments. Dynamic text, class, boolean/property fields, attributes, and event handlers are lowered to direct update sites.

The compiler also lowers keyed map children shaped like `{items.map((item) => <li key={item.id}>...</li>)}` into `__keyedMap()`. Row blocks reuse DOM by key, patch direct dynamic fields, move existing nodes on reorder, and skip updates when inferred row dependencies are unchanged. Unkeyed maps and unsupported row shapes are left unchanged for runtime fallback.

## Ownership Rules

- Keep source-level DX in `memo-dom.ts` and JSX files.
- Keep generated-code helpers in `compiler-runtime.ts`.
- Do not add compiler transform logic to `memo-dom.ts`.
- Keep compiler transform logic out of the main runtime bundle. Use the separate `auwla/compiler` entry.
- Do not make compiler helpers part of the recommended README API, even though they are exported for generated code and tests.
- Fallback correctness belongs to the runtime; compiler output is an optimization layer.

## Next Compiler Work

The next implementation slice should add a benchmark fixture that runs the same 1,000-row scenario through compiled output. That gives the compiler work a direct performance gate instead of only a behavior test.
