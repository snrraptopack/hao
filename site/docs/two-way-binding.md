# Two-Way Data Binding

Auwla features a compile-time `bind={variable}` syntax that simplifies working with form inputs. 

Because Auwla compiles JSX templates directly, it can automatically lower your two-way bindings into optimized event listeners and property setters at build time.

---

## Basic Usage

To bind an input element to a local setup variable, use the `bind` attribute:

```tsx
function BasicForm() {
  let name = "Guest";
  let subscribed = false;

  return () => (
    <form onSubmit={(e) => e.preventDefault()}>
      {/* Updates name automatically on input */}
      <input type="text" bind={name} />
      
      {/* Updates subscribed automatically on change */}
      <input type="checkbox" bind={subscribed} />

      <p>Hello {name}, newsletter status: {subscribed ? "Active" : "Inactive"}</p>
    </form>
  );
}
```

---

## Supported Inputs and Behaviors

The compiler handles different input types by targeting the appropriate property, listening to the correct event, and performing type casting when necessary:

| Element & Type | Target Property | Intercepted Event | Binding Behavior & Cast |
| :--- | :--- | :--- | :--- |
| `<input type="text" />` | `value` | `input` | Binds to a `string` |
| `<input type="number" />` | `value` | `input` | Automatically casts value to a `number` |
| `<input type="range" />` | `value` | `input` | Automatically casts value to a `number` |
| `<input type="checkbox" />` | `checked` | `change` | Binds to a `boolean` |
| `<input type="checkbox" />` (Grouped) | `checked` | `change` | Pushes/pulls value from an `Array` or `Set` |
| `<input type="radio" />` | `checked` | `change` | Binds the selected value to a `string` |
| `<select>` (Single) | `value` | `change` | Binds the selected option value to a variable |
| `<select multiple>` | `value` | `change` | Binds multiple selected option values to an `Array` or `Set` |
| `<textarea>` | `value` | `input` | Binds to a `string` |

---

## Advanced Binding Scenarios

### 1. Grouped Checkboxes (Lists & Collections)
You can bind multiple checkboxes to a shared Array or Set. Checking an option automatically adds it to the collection, and unchecking removes it:

```tsx
function FoodSelector() {
  let selectedFoods: string[] = ["Pizza"];

  return () => (
    <div>
      <h3>Select your favorite foods:</h3>
      <label>
        <input type="checkbox" value="Pizza" bind={selectedFoods} /> Pizza
      </label>
      <label>
        <input type="checkbox" value="Burger" bind={selectedFoods} /> Burger
      </label>
      <label>
        <input type="checkbox" value="Pasta" bind={selectedFoods} /> Pasta
      </label>
      
      <p>Selected: {selectedFoods.join(", ")}</p>
    </div>
  );
}
```

### 2. Radio Groups
Radio buttons bound to the same variable will update that variable with the selected radio's `value` attribute:

```tsx
function ThemeSelector() {
  let theme = "dark";

  return () => (
    <div>
      <h3>Theme: {theme}</h3>
      <label>
        <input type="radio" name="theme" value="dark" bind={theme} /> Dark Mode
      </label>
      <label>
        <input type="radio" name="theme" value="light" bind={theme} /> Light Mode
      </label>
    </div>
  );
}
```

---

In the next section, we will see how to handle complex events using **Event Modifiers**.
