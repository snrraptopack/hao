# Two-Way Data Binding

Auwla features a compile-time `bind={variable}` syntax that simplifies working with form inputs. 

Instead of writing verbose event listeners and property setters manually, you can bind an element's value directly to a local variable. The compiler will automatically wire up the event listeners and handle type casting.

---

## Basic Usage

To bind an input element to a local setup variable, use the `bind` attribute:

```tsx
function BasicForm() {
  let name = "Guest";
  let subscribed = false;

  return (
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

## Interactive Examples

### 1. Text & Textareas
Text-based inputs listen to the `input` event and update the variable synchronously.

```tsx
function FeedbackForm() {
  let message = "";

  return (
    <div>
      <textarea bind={message} placeholder="Write something..." />
      <p>Character count: {message.length}</p>
    </div>
  );
}
```

### 2. Numeric & Range Inputs (Auto-Casting)
When binding to inputs of type `number` or `range`, Auwla automatically casts the value to a JavaScript `number` type. If the input is empty or invalid (`NaN`), it falls back to an empty string `""`.

```tsx
function AgeForm() {
  let age = 18; // Initialized as a number

  return (
    <div>
      <input type="number" bind={age} min="0" max="120" />
      <p>Age next year: {typeof age === 'number' ? age + 1 : 'Invalid age'}</p>
    </div>
  );
}
```

### 3. Checkbox Group (Arrays & Sets)
You can bind multiple checkboxes to a single collection (such as an Array or a Set). Checking a box appends its `value` to the collection; unchecking it removes it.

#### Binding to an Array:
```tsx
function HobbySelector() {
  let hobbies: string[] = ["Reading"];

  return (
    <div>
      <label>
        <input type="checkbox" value="Reading" bind={hobbies} /> Reading
      </label>
      <label>
        <input type="checkbox" value="Gaming" bind={hobbies} /> Gaming
      </label>
      <label>
        <input type="checkbox" value="Cooking" bind={hobbies} /> Cooking
      </label>
      
      <p>Selected hobbies: {hobbies.join(", ")}</p>
    </div>
  );
}
```

#### Binding to a Set:
```tsx
function TagSelector() {
  let tags = new Set<string>(["tech"]);

  return (
    <div>
      <label>
        <input type="checkbox" value="tech" bind={tags} /> Technology
      </label>
      <label>
        <input type="checkbox" value="design" bind={tags} /> Design
      </label>
      
      <p>Selected: {[...tags].join(", ")}</p>
    </div>
  );
}
```

### 4. Radio Groups
Radio buttons sharing a name and a bound variable will update that variable with the `value` of the selected option.

```tsx
function ColorTheme() {
  let theme = "dark";

  return (
    <div>
      <label>
        <input type="radio" name="theme" value="dark" bind={theme} /> Dark Mode
      </label>
      <label>
        <input type="radio" name="theme" value="light" bind={theme} /> Light Mode
      </label>
      
      <p>Active theme: {theme}</p>
    </div>
  );
}
```

### 5. Select Dropdowns (Single & Multiple)
Select dropdowns bind the selection list to your variable.

#### Single Select:
```tsx
function FruitPicker() {
  let fruit = "apple";

  return (
    <div>
      <select bind={fruit}>
        <option value="apple">Apple</option>
        <option value="banana">Banana</option>
        <option value="orange">Orange</option>
      </select>
      <p>You chose: {fruit}</p>
    </div>
  );
}
```

#### Multiple Select (Dropdown list):
```tsx
function MultiUserSelector() {
  let selectedUsers: string[] = [];

  return (
    <div>
      <select multiple bind={selectedUsers}>
        <option value="alice">Alice</option>
        <option value="bob">Bob</option>
        <option value="charlie">Charlie</option>
      </select>
      <p>Selected: {selectedUsers.join(", ")}</p>
    </div>
  );
}
```
