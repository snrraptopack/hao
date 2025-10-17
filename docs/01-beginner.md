# 🎓 Beginner's Guide to Reactive UI Framework

## What is Reactivity?

Imagine you have a spreadsheet. When you change a number in cell A1, and cell B1 has a formula `=A1*2`, cell B1 automatically updates. **That's reactivity!**

In our framework, when you change a value, the UI automatically updates to reflect that change.

## Your First Reactive Value

### Step 1: Create a Reactive Reference (ref)

```typescript
import { ref } from "./state"

// Create a reactive counter
const count = ref(0)

console.log(count.value) // 0
```

**What's happening?**
- `ref()` wraps your value in a special object
- You access/modify the value through `.value`
- When `.value` changes, anyone "watching" gets notified

### Step 2: Read and Update Values

```typescript
const name = ref("John")

// Read value
console.log(name.value) // "John"

// Update value
name.value = "Jane"
console.log(name.value) // "Jane"
```

### Step 3: Subscribe to Changes

```typescript
const count = ref(0)

// Listen for changes
count.subscribe((newValue) => {
  console.log("Count changed to:", newValue)
})

count.value++ // Console: "Count changed to: 1"
count.value++ // Console: "Count changed to: 2"
```

**The Subscribe Pattern:**
1. You give a callback function to `.subscribe()`
2. Whenever `.value` changes, your callback runs
3. The callback receives the new value as a parameter

## Building Your First UI

### Example: A Simple Counter

```typescript
import { Component } from "./dsl"
import { ref } from "./state"

// 1. Create reactive state
const count = ref(0)

// 2. Create UI
const App = Component((ui) => {
  // Display the count
  ui.Text({ 
    value: count,
    formatter: (v) => `Count: ${v}`,
    className: "text-2xl font-bold"
  })
  
  // Button to increment
  ui.Button({
    text: "Increment",
    on: { 
      click: () => count.value++ 
    },
    className: "px-4 py-2 bg-blue-500 text-white rounded"
  })
})

// 3. Mount to page
document.getElementById("app")?.appendChild(App)
```

**What happens when you click the button?**
1. `count.value++` increases the count
2. All subscribers (including the Text component) get notified
3. The Text component updates to show the new value
4. The UI re-renders automatically!

## Understanding the Component Function

```typescript
Component((ui) => {
  // ui is a "builder" - you chain methods to create UI
  
  ui.Div({ className: "container" }, (ui) => {
    // Nested UI inside the div
    ui.Text({ value: "Hello" })
    ui.Button({ text: "Click me" })
  })
})
```

**Think of it like LEGO blocks:**
- `Component()` is your building plate
- `ui.Div()`, `ui.Text()`, `ui.Button()` are LEGO blocks
- You stack them to build your UI

## Common UI Elements

### Text
```typescript
ui.Text({ 
  value: "Hello World",
  className: "text-xl"
})

// With reactive value
const message = ref("Hello")
ui.Text({ 
  value: message,  // Updates when message.value changes
  className: "text-xl"
})
```

### Button
```typescript
ui.Button({
  text: "Click me",
  on: { 
    click: () => alert("Clicked!") 
  },
  className: "px-4 py-2 bg-blue-500 text-white"
})
```

### Input
```typescript
const userInput = ref("")

ui.Input({
  type: "text",
  value: userInput,
  placeholder: "Enter text...",
  on: {
    input: (e) => userInput.value = (e.target as HTMLInputElement).value
  }
})
```

### Div (Container)
```typescript
ui.Div({ className: "flex gap-4" }, (ui) => {
  ui.Text({ value: "Left" })
  ui.Text({ value: "Right" })
})
```

## Making Things Interactive

### Example: Todo Input

```typescript
import { Component } from "./dsl"
import { ref } from "./state"

const todoText = ref("")
const todos = ref<string[]>([])

const App = Component((ui) => {
  ui.Div({ className: "p-8" }, (ui) => {
    // Input for new todo
    ui.Input({
      type: "text",
      value: todoText,
      placeholder: "What needs to be done?",
      on: {
        input: (e) => todoText.value = (e.target as HTMLInputElement).value,
        keydown: (e) => {
          if (e.key === "Enter" && todoText.value.trim()) {
            // Add to list
            todos.value = [...todos.value, todoText.value]
            // Clear input
            todoText.value = ""
          }
        }
      },
      className: "border-2 p-2 rounded"
    })
    
    // Display count
    ui.Text({
      value: todos,
      formatter: (list) => `${list.length} todos`,
      className: "mt-4 text-gray-600"
    })
  })
})
```

## Key Concepts to Remember

### 1. **ref() Creates Reactivity**
```typescript
const count = ref(0)        // ✅ Reactive
const count = 0             // ❌ Not reactive
```

### 2. **Always Use .value**
```typescript
count.value++               // ✅ Correct
count++                     // ❌ Wrong - won't update UI
```

### 3. **Subscribe Notifies on Change**
```typescript
count.subscribe((newValue) => {
  console.log(newValue)     // Runs every time count.value changes
})
```

### 4. **Component() Wraps Your UI**
```typescript
const App = Component((ui) => {
  // Build UI here
})

document.getElementById("app")?.appendChild(App)
```

## Exercise: Build a Name Greeter

Try building this yourself:

**Requirements:**
1. Input field for user's name
2. Display "Hello, [name]!" below it
3. Update as user types

<details>
<summary>Click to see solution</summary>

```typescript
import { Component } from "./dsl"
import { ref } from "./state"

const name = ref("")

const App = Component((ui) => {
  ui.Div({ className: "p-8" }, (ui) => {
    ui.Text({ 
      value: "Enter your name:", 
      className: "text-lg mb-2" 
    })
    
    ui.Input({
      type: "text",
      value: name,
      on: {
        input: (e) => name.value = (e.target as HTMLInputElement).value
      },
      className: "border-2 p-2 rounded mb-4"
    })
    
    ui.Text({
      value: name,
      formatter: (n) => n ? `Hello, ${n}!` : "",
      className: "text-2xl font-bold text-blue-600"
    })
  })
})

document.getElementById("app")?.appendChild(App)
```
</details>

## Next Steps

You now understand:
- ✅ Creating reactive values with `ref()`
- ✅ Reading/updating with `.value`
- ✅ Subscribing to changes
- ✅ Building UI with `Component()`
- ✅ Handling user input

**Ready for more?** 

👉 Move on to [Intermediate Guide](./02-intermediate.md) to learn:
- Computed values
- Lists and conditional rendering
- Component composition
- Lifecycle hooks
