# Watch and watchEffect: Running Side Effects

In Auwla, a "side effect" is any code that needs to run in response to a state change but doesn't directly produce UI. This includes things like fetching data, logging to the console, or manually manipulating the DOM.

Auwla provides two functions for this purpose: `watchEffect` and `watch`. While they have some overlap, `watchEffect` is the primary tool for side effects, while `watch` offers more fine-grained control.

## `watchEffect`: The Simple Way to Run Effects

The `watchEffect` function is the most straightforward way to run a side effect in response to state changes. You give it a function, and Auwla will:
1.  Run it immediately.
2.  Automatically track any reactive `ref`s you access inside it.
3.  Re-run the function whenever any of those tracked `ref`s change.

This makes it perfect for simple effects where the dependencies are clear from the code itself.

```TypeScriptJSX
import { h, ref, watchEffect } from 'auwla';

const userId = ref(1);

// This effect will re-run whenever `userId.value` changes.
watchEffect(() => {
  console.log(`Fetching data for user: ${userId.value}`);
  // fetch(`/api/users/${userId.value}`);
});

export function UserSwitcher() {
  return (
    <div>
      <p>Current User ID: {userId}</p>
      <button onClick={() => userId.value++}>
        Load Next User
      </button>
    </div>
  );
}
```
With `watchEffect`, you don't need to specify any dependencies; it figures them out for you.

## The Overlap with `watch`

As we saw previously, `watch` can be used to create computed values. However, it can also be used to run side effects. When you provide `watch` with a callback function but do not use its return value, you are effectively creating a side effect.

The key difference is that with `watch`, you must **explicitly** list the dependencies you want to track.

```TypeScriptJSX
import { ref, watch } from 'auwla';

const userId = ref(1);

// Using `watch` for a side effect.
// Note that we must specify `[userId]` as a dependency.
watch([userId], ([newId]) => {
  console.log(`User ID changed. New ID is: ${newId}`);
});
```

## `watchEffect` is a specialized `watch`

You can think of `watchEffect` as a convenient, specialized version of `watch` that is tailor-made for side effects. In fact, `watchEffect` is built internally using the same primitives as `watch`. It simplifies the process by automatically tracking dependencies, making your code more concise.

### When to Use Which?

*   **Use `watchEffect`** for most side effects. Its automatic dependency tracking is convenient and reduces boilerplate.
*   **Use `watch` for side effects** only when you need more control, such as:
    *   Watching a source without running the effect immediately.
    *   Accessing both the new and old value of a `ref`.
    *   Explicitly controlling when the effect runs to prevent it from triggering too often.

For most common scenarios, `watchEffect` is the recommended and more idiomatic choice for handling side effects in Auwla.

