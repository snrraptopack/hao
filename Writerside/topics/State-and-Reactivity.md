# State and Reactivity: The `ref` Primitive

In Auwla, reactivity is managed through a system of fine-grained primitives that give you precise control over how and when your UI updates. The most fundamental of these is the `ref`.

A `ref` is an object that holds a reactive value. When the value of a `ref` changes, Auwla automatically notifies any part of your application that depends on it, triggering a targeted DOM update.

## Creating and Using a `ref`

You can create a reactive variable by calling the `ref()` function with an initial value. To access or update the value, you use the `.value` property.

```TypeScriptJSX
import { h, ref } from 'auwla';

export function Counter() {
  // Create a reactive reference with an initial value of 0
  const count = ref(0);

  const increment = () => {
    // Update the value. This will trigger a reactive update.
    count.value++;
  };

  // When `count` is used in JSX, Auwla automatically subscribes
  // the text node to its changes.
  return (
    <button onClick={increment}>
      Clicked: {count}
    </button>
  );
}
```

In this example, when the button is clicked, `count.value` is incremented. Auwla's reactivity system ensures that only the text node displaying the count is updated—the button element itself is not re-created.

## Shallow by Default: A Deliberate Design Choice

A crucial concept in Auwla is that its reactivity is **shallow by default**. This is a deliberate design decision rooted in the principles of performance and predictability.

When you create a `ref`, Auwla tracks changes to the `.value` property itself. If the value is an object or an array, Auwla does **not** automatically track changes to the properties or elements *inside* that object or array.

Consider this example:

```TypeScriptJSX
const user = ref({ name: 'Alex', age: 30 });

// This will NOT trigger a reactive update
user.value.age = 31;

// This WILL trigger a reactive update, because we are assigning a new object
// to the .value property.
user.value = { name: 'Alex', age: 31 };
```

### Why Shallow?

This approach has several key advantages:

1.  **Performance:** By not deeply traversing and proxying every nested object, Auwla avoids significant overhead. You only pay for the reactivity you explicitly create.
2.  **Predictability:** You are always in control. Updates only happen when you assign a new value to a `ref`, making the data flow clear and easy to trace. There are no "magic" updates from deep within a data structure.
3.  **Encourages Better State Management:** This model encourages you to treat state as immutable. Instead of mutating objects directly, you create new ones, which leads to more predictable and maintainable code.

This concept of shallow reactivity is the foundation of **selective rendering**. It empowers you, the developer, to decide exactly which pieces of state need to be reactive and to structure your application for optimal performance by default. For managing complex, nested state, Auwla provides a `createStore` utility, which will be covered later.
