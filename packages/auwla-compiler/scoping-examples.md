# Scoping Rules Examples

## Rule: 
- `export default function` = Page/UI function
- Logic outside Page scope → goes inside Page scope  
- Logic inside Page scope → goes inside Component UI scope
- Other components accessing outside variables → receive as props with types

---

## Example 1: Basic Page with Helper Function

**Input:**
```tsx
//@page
import { ref } from "auwla"

const counter = ref(0)  // Outside page scope

function increment() {  // Outside page scope
  counter.value++
}

export default function HomePage() {  // This is the page function
  const localVar = "hello"  // Inside page scope
  
  return (
    <div>
      <p>{counter.value}</p>
      <button onClick={increment}>Click</button>
    </div>
  )
}
```

**Expected Output:**
```ts
import { Component, ref, watch } from 'auwla'
import type { Ref, LayoutBuilder } from 'auwla'

export default function HomePage() {  // Page function
  // Logic that was outside page scope → now inside page scope
  const counter = ref(0)
  
  function increment() {
    counter.value++
  }

  return Component((ui: LayoutBuilder) => {
    // Logic that was inside page scope → now inside Component UI scope
    const localVar = "hello"
    
    ui.Div({}, (ui: LayoutBuilder) => {
      ui.P({ text: watch([counter], () => `${counter.value}`) as Ref<string> })
      ui.Button({ text: "Click", on: { click: () => increment() } })
    })
  })
}
```

---

## Example 2: Page with Separate Component

**Input:**
```tsx
//@page
import { ref } from "auwla"

const globalCounter = ref(0)  // Outside page scope

function Counter({ title }: { title: string }) {  // Component function
  return (
    <div>
      <h3>{title}</h3>
      <p>{globalCounter.value}</p>  // Accessing outside variable
    </div>
  )
}

export default function HomePage() {  // Page function
  return (
    <div>
      <Counter title="My Counter" />
    </div>
  )
}
```

**Expected Output:**
```ts
import { Component, ref, watch } from 'auwla'
import type { Ref, LayoutBuilder } from 'auwla'

// Component that needs props for outside variables
function Counter({ title, globalCounter }: { title: string; globalCounter: Ref<number> }) {
  return Component((ui: LayoutBuilder) => {
    ui.Div({}, (ui: LayoutBuilder) => {
      ui.H3({ text: title })
      ui.P({ text: watch([globalCounter], () => `${globalCounter.value}`) as Ref<string> })
    })
  })
}

export default function HomePage() {  // Page function
  // Logic that was outside page scope → now inside page scope
  const globalCounter = ref(0)

  return Component((ui: LayoutBuilder) => {
    ui.Div({}, (ui: LayoutBuilder) => {
      // Pass outside variables as props
      ui.append(Counter({ title: "My Counter", globalCounter }))
    })
  })
}
```

---

## Example 3: Page with Multiple Variables and Functions

**Input:**
```tsx
//@page
import { ref } from "auwla"

const count = ref(0)      // Outside page scope
const name = ref("John")  // Outside page scope

function increment() {    // Outside page scope
  count.value++
}

function updateName(newName: string) {  // Outside page scope
  name.value = newName
}

export default function ProfilePage() {  // Page function
  const isEditing = ref(false)  // Inside page scope
  
  function toggleEdit() {       // Inside page scope
    isEditing.value = !isEditing.value
  }
  
  return (
    <div>
      <h1>{name.value}</h1>
      <p>Count: {count.value}</p>
      <button onClick={increment}>+</button>
      <button onClick={toggleEdit}>Edit</button>
    </div>
  )
}
```

**Expected Output:**
```ts
import { Component, ref, watch } from 'auwla'
import type { Ref, LayoutBuilder } from 'auwla'

export default function ProfilePage() {  // Page function
  // Logic that was outside page scope → now inside page scope
  const count = ref(0)
  const name = ref("John")
  
  function increment() {
    count.value++
  }
  
  function updateName(newName: string) {
    name.value = newName
  }

  return Component((ui: LayoutBuilder) => {
    // Logic that was inside page scope → now inside Component UI scope
    const isEditing = ref(false)
    
    function toggleEdit() {
      isEditing.value = !isEditing.value
    }
    
    ui.Div({}, (ui: LayoutBuilder) => {
      ui.H1({ text: watch([name], () => `${name.value}`) as Ref<string> })
      ui.P({ text: watch([count], () => `Count: ${count.value}`) as Ref<string> })
      ui.Button({ text: "+", on: { click: () => increment() } })
      ui.Button({ text: "Edit", on: { click: () => toggleEdit() } })
    })
  })
}
```

---

## Example 4: Page with Reusable Component Using Outside Variables

**Input:**
```tsx
//@page
import { ref } from "auwla"

const theme = ref("dark")     // Outside page scope
const user = ref({ name: "Alice", age: 25 })  // Outside page scope

function UserCard({ showAge }: { showAge: boolean }) {  // Component function
  return (
    <div className={theme.value}>
      <h2>{user.value.name}</h2>
      {showAge && <p>Age: {user.value.age}</p>}
    </div>
  )
}

export default function DashboardPage() {  // Page function
  const showDetails = ref(true)  // Inside page scope
  
  return (
    <div>
      <UserCard showAge={showDetails.value} />
    </div>
  )
}
```

**Expected Output:**
```ts
import { Component, ref, watch } from 'auwla'
import type { Ref, LayoutBuilder } from 'auwla'

// Component that needs props for outside variables
function UserCard({ 
  showAge, 
  theme, 
  user 
}: { 
  showAge: boolean; 
  theme: Ref<string>; 
  user: Ref<{ name: string; age: number }> 
}) {
  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: watch([theme], () => theme.value) as Ref<string> }, (ui: LayoutBuilder) => {
      ui.H2({ text: watch([user], () => user.value.name) as Ref<string> })
      if (showAge) {
        ui.P({ text: watch([user], () => `Age: ${user.value.age}`) as Ref<string> })
      }
    })
  })
}

export default function DashboardPage() {  // Page function
  // Logic that was outside page scope → now inside page scope
  const theme = ref("dark")
  const user = ref({ name: "Alice", age: 25 })

  return Component((ui: LayoutBuilder) => {
    // Logic that was inside page scope → now inside Component UI scope
    const showDetails = ref(true)
    
    ui.Div({}, (ui: LayoutBuilder) => {
      // Pass outside variables as props
      ui.append(UserCard({ 
        showAge: showDetails.value, 
        theme, 
        user 
      }))
    })
  })
}
```

---

## Example 5: Complex Page with Multiple Components

**Input:**
```tsx
//@page
import { ref } from "auwla"

const items = ref([{ id: 1, name: "Item 1" }])  // Outside page scope

function addItem(name: string) {  // Outside page scope
  items.value.push({ id: Date.now(), name })
}

function ItemList() {  // Component function
  return (
    <ul>
      {items.value.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  )
}

function AddForm() {  // Component function
  return (
    <div>
      <button onClick={() => addItem("New Item")}>Add</button>
    </div>
  )
}

export default function TodoPage() {  // Page function
  const filter = ref("all")  // Inside page scope
  
  return (
    <div>
      <h1>Todo List</h1>
      <ItemList />
      <AddForm />
      <select value={filter.value}>
        <option value="all">All</option>
      </select>
    </div>
  )
}
```

**Expected Output:**
```ts
import { Component, ref, watch } from 'auwla'
import type { Ref, LayoutBuilder } from 'auwla'

// Components that need props for outside variables
function ItemList({ items }: { items: Ref<Array<{ id: number; name: string }>> }) {
  return Component((ui: LayoutBuilder) => {
    ui.Ul({}, (ui: LayoutBuilder) => {
      // Map logic would be handled by control flow
      items.value.map(item => {
        ui.Li({ key: item.id, text: item.name })
      })
    })
  })
}

function AddForm({ addItem }: { addItem: (name: string) => void }) {
  return Component((ui: LayoutBuilder) => {
    ui.Div({}, (ui: LayoutBuilder) => {
      ui.Button({ text: "Add", on: { click: () => addItem("New Item") } })
    })
  })
}

export default function TodoPage() {  // Page function
  // Logic that was outside page scope → now inside page scope
  const items = ref([{ id: 1, name: "Item 1" }])
  
  function addItem(name: string) {
    items.value.push({ id: Date.now(), name })
  }

  return Component((ui: LayoutBuilder) => {
    // Logic that was inside page scope → now inside Component UI scope
    const filter = ref("all")
    
    ui.Div({}, (ui: LayoutBuilder) => {
      ui.H1({ text: "Todo List" })
      // Pass outside variables as props
      ui.append(ItemList({ items }))
      ui.append(AddForm({ addItem }))
      ui.Select({ 
        value: watch([filter], () => filter.value) as Ref<string> 
      }, (ui: LayoutBuilder) => {
        ui.Option({ value: "all", text: "All" })
      })
    })
  })
}
```

---

Do these examples correctly represent the scoping rules you want me to implement?