# Watch and Derive: Creating Computed State

While `ref` provides the core of reactive state, the true power of a reactive system lies in creating new values that are computed from that state. Auwla provides two primary tools for this: `watch` and `derive`.

Both functions can create new, read-only reactive values that are computed from other `ref`s. However, they have a key difference in how they track dependencies: `watch` is explicit, while `derive` is dynamic and intelligent.

## `watch`: Explicitly Computed Values

The `watch` function is a versatile tool that can be used to create computed values. You provide it with an array of reactive sources, and a callback function that computes a new value from them. `watch` then returns a new, **read-only `ref`** containing the result.

This returned `ref` will automatically update whenever any of the sources in the dependency array change.

```TypeScriptJSX
import { h, ref, watch } from 'auwla';

const count = ref(1);

// `doubled` is a new, read-only ref computed by `watch`.
// It updates whenever `count` changes.
const doubled = watch([count], ([c]) => {
  return c * 2;
});

export function Counter() {
  return (
    <div>
      <button onClick={() => count.value++}>
        Increment
      </button>
      <p>Count: {count}</p>
      <p>Doubled (from watch): {doubled}</p>
    </div>
  );
}
```
The key characteristic of `watch` is that its dependencies are **static and explicit**. It will only ever react to the sources you provide in the initial dependency array.

## `derive`: Intelligently Computed Values

Like `watch`, the `derive` function also creates a new, read-only `ref` from a computation. However, `derive` has a special capability: **intelligent, dynamic dependency tracking**.

When you use the dynamic API, `derive(() => { ... })`, Auwla automatically detects which `ref`s you access inside the function and subscribes *only* to them. If a `ref` is no longer accessed on a subsequent run (e.g., due to an `if` statement), `derive` is smart enough to automatically unsubscribe from it.

This makes your computed state incredibly efficient, as it will only re-calculate when its *actual, current* dependencies change.

```TypeScriptJSX
import { h, ref, derive } from 'auwla';

const firstName = ref('John');
const lastName = ref('Doe');
const useFullName = ref(true);

// `displayName` dynamically tracks its dependencies.
const displayName = derive(() => {
  // If true, it depends on `firstName` AND `lastName`.
  if (useFullName.value) {
    return `${firstName.value} ${lastName.value}`;
  }
  // Otherwise, it ONLY depends on `firstName`.
  return firstName.value;
});
```
If you were to build this with `watch`, you would have to include all three `ref`s (`firstName`, `lastName`, `useFullName`) in the dependency array, and it would re-run even if `lastName` changed when it wasn't being used. `derive` avoids this extra work automatically.

### Summary: `watch` vs. `derive`

| | `watch` | `derive` |
| :--- | :--- | :--- |
| **Primary Use** | Creating computed values with explicit dependencies. | Creating computed values with dynamic, automatic dependencies. |
| **Return Value** | A new, read-only `ref`. | A new, read-only `ref`. |
| **Dependencies** | **Explicit & Static**: Defined once in an array. | **Dynamic & Automatic**: Detected from usage inside the function. |
| **Best For** | Simple computations where dependencies are fixed. | Complex computations where dependencies change based on logic. |

For creating computed state, `derive` is often the more powerful and convenient tool because it optimizes itself. However, `watch` is a robust and predictable option when you want to be explicit about your dependencies.
