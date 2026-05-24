# Auwla Runtime And Compiler Plan

## Goal

Auwla should keep this developer experience:

```tsx
function Counter() {
  let count = 0;

  return () => (
    <button onClick={() => count++}>Count: {count}</button>
  );
}

createMemoApp(document.getElementById('app')!, <Counter />);
```

State is plain JavaScript. Components run setup once, return a render closure, and event handlers mutate local variables directly.

## Current Runtime

The runtime now does real DOM patching:

- JSX inside an app render creates lightweight template nodes.
- The patcher updates real DOM in place.
- Same tag + same `key` reuses DOM nodes.
- Props, text, style objects, event listeners, and children are patched.
- Nested component setup is cached, so child closure state survives parent rerenders.

This is enough for correctness and a clean DX.

## Current Performance Ceiling

For large keyed lists, the runtime still reruns the parent render closure and executes `.map()` for every row. Even when only one row changes, Auwla has to build and compare lightweight templates for all rows.

That is much cheaper than recreating DOM, but it still costs time for 1,000+ rows.

## Runtime Optimization First

Before adding a compiler, the runtime should have a tiny memo primitive that can be used by tests, benchmarks, and future compiler output:

```tsx
memo(todo.id, [todo.text, todo.done], () => (
  <li class={todo.done ? 'done' : ''}>{todo.text}</li>
))
```

If deps are unchanged, the render function is not called and the previous template is reused. This gives us a direct way to test the optimization strategy without committing to a compiler yet.

This should not become the normal developer experience. Developers should write ordinary JSX and ordinary JavaScript lists. The memo primitive is a proof of the runtime contract and a target for generated code.

## Compiler Later

Once the runtime primitive is proven, an optional compiler can preserve the ideal DX by transforming:

```tsx
{todos.map(todo => (
  <li key={todo.id} class={todo.done ? 'done' : ''}>{todo.text}</li>
))}
```

Into an internal memoized keyed map:

```tsx
__keyedMap(
  todos,
  todo => todo.id,
  todo => [todo.text, todo.done],
  todo => <li class={todo.done ? 'done' : ''}>{todo.text}</li>
)
```

The compiler should be optional. The runtime must stay correct without it.

## Priority

1. Keep runtime small and correct.
2. Use internal memoization to prove the hot keyed-list path.
3. Benchmark real browser behavior.
4. Add a compiler transform for keyed `.map()` so application code stays clean.
