# The Philosophy of `watch`: A Deep Dive

In Auwla, you have several tools for reacting to state changes, but the most fundamental of these is `watch`. While we recommend using the higher-level `derive` and `watchEffect` APIs for most application logic, understanding the history and power of `watch` can unlock more advanced patterns and provide a deeper appreciation for the framework's design.

This guide explores the original philosophy behind `watch` and its place in the modern Auwla ecosystem.

## The Original "Do-It-All" Primitive

Initially, Auwla was designed with a minimalist core: just `ref` for state and `watch` for reacting to it. `watch` was intentionally created as a powerful, "do-it-all" primitive with a dual nature:

1.  **If it returns a value, it's a computed `ref`.**
2.  **If it does not return a value, it's a side effect.**

This design was elegant but required the developer to remember this rule.

### `watch` as a Computed Value

When you provide a callback to `watch` that returns a value, `watch` itself returns a new, read-only `ref`.

```TypeScriptJSX
const count = ref(1);

// Here, `watch` acts like `derive`.
const doubled = watch([count], ([c]) => c * 2);

// `doubled` is a read-only ref.
console.log(doubled.value); // 2
```

### `watch` as a Side Effect

When the callback does *not* return a value, `watch` returns a `cleanup` function instead of a `ref`. This is for running side effects.

```TypeScriptJSX
const count = ref(1);

// Here, `watch` acts like `watchEffect`.
const cleanup = watch([count], ([c]) => {
  console.log(`The count is now: ${c}`);
});

// You could call `cleanup()` later to stop the effect.
```

## Automatic Cleanup and Component Scope

A key feature of `watch` is its awareness of the component lifecycle.

-   **Inside a Component:** If you create a `watch` inside a component's setup scope, Auwla automatically subscribes it to the component's lifecycle. When the component unmounts, the `watch` is automatically cleaned up for you. You don't need to do anything.
-   **Outside a Component:** If you create a `watch` in a global scope or anywhere outside a component, it cannot clean itself up automatically. This is when the returned `cleanup` function is useful, allowing you to manually stop the effect and prevent memory leaks.

## Why `derive` and `watchEffect` Were Introduced

While the dual nature of `watch` is powerful, it has a cognitive overhead. Developers can easily forget the rules, leading to confusion. To create a more explicit and intention-revealing API, `derive` and `watchEffect` were introduced.

-   **`derive`**: Unambiguously for creating computed state. It is also more performant for complex cases due to its dynamic dependency tracking.
-   **`watchEffect`**: Unambiguously for running side effects.

These higher-level APIs are built using `watch` internally, but they provide a clearer, safer, and more idiomatic way to write reactive logic in most situations.

## The Modern Place for `watch`

`watch` is not being deprecated. It remains a core part of the framework and is preferred for certain elegant patterns, especially those related to conditional attributes in JSX.

For example, using `watch` inline to toggle a class is concise and highly readable:

```TypeScriptJSX
import { h, ref, watch } from 'auwla';

const isActive = ref(false);

export function ToggleButton() {
  return (
    <button
      class={watch(isActive, (active) => {
        return active ? 'bg-blue-500 text-white' : 'bg-gray-200';
      })}
      onClick={() => isActive.value = !isActive.value}
    >
      Toggle
    </button>
  );
}
```

### Our Recommendation

-   **For application logic, prefer `derive` and `watchEffect`**. Their explicitness leads to more maintainable code.
-   **Feel free to use `watch`** for simple, elegant patterns like conditional classes or styles, or if you are a power user who fully understands its rules and dual nature.

`watch` is not a performance threat. It is a sharp, powerful tool. By providing `derive` and `watchEffect`, we simply offer safer tools for everyday use.
