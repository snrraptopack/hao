#!/usr/bin/env node

/**
 * Real-world validation tests for TSX compiler scoping fixes
 * Tests various scenarios developers would encounter
 */

import { compileTSX } from './src/tsx-only-compiler.js'
import { writeFileSync } from 'fs'

console.log('🧪 Testing Real-World Examples for Scoping Fix')
console.log('=' .repeat(60))

// Test Case 1: Counter App with @page
const counterPageInput = `
//@page /counter
import { ref } from "auwla"

// Global state (outside page scope → should go inside page function)
const count = ref(0)
const step = ref(1)

// Global functions (outside page scope → should go inside page function)  
function increment() {
  count.value += step.value
}

function decrement() {
  count.value -= step.value
}

function reset() {
  count.value = 0
}

export default function CounterPage() {
  // Local state (inside page scope → should go inside Component UI scope)
  const message = ref("Counter App")
  const isVisible = ref(true)
  
  // Local functions (inside page scope → should go inside Component UI scope)
  function toggleVisibility() {
    isVisible.value = !isVisible.value
  }
  
  function updateMessage() {
    message.value = \`Count is \${count.value}\`
  }
  
  return (
    <div>
      <h1>{message.value}</h1>
      {isVisible.value && (
        <div>
          <p>Current count: {count.value}</p>
          <p>Step: {step.value}</p>
          <button onClick={increment}>+</button>
          <button onClick={decrement}>-</button>
          <button onClick={reset}>Reset</button>
          <button onClick={toggleVisibility}>Hide</button>
          <button onClick={updateMessage}>Update Message</button>
        </div>
      )}
    </div>
  )
}
`

// Test Case 2: Todo App with @page
const todoPageInput = `
//@page /todos
import { ref } from "auwla"

// Global state and API functions (outside page scope → should go inside page function)
const todos = ref([])
const API_URL = "https://api.example.com/todos"

async function fetchTodos() {
  const response = await fetch(API_URL)
  todos.value = await response.json()
}

function addTodo(text) {
  todos.value.push({
    id: Date.now(),
    text,
    completed: false
  })
}

function toggleTodo(id) {
  const todo = todos.value.find(t => t.id === id)
  if (todo) {
    todo.completed = !todo.completed
  }
}

export default function TodoPage() {
  // Local UI state (inside page scope → should go inside Component UI scope)
  const newTodoText = ref("")
  const filter = ref("all") // all, active, completed
  
  // Local UI functions (inside page scope → should go inside Component UI scope)
  function handleSubmit() {
    if (newTodoText.value.trim()) {
      addTodo(newTodoText.value.trim())
      newTodoText.value = ""
    }
  }
  
  function getFilteredTodos() {
    switch (filter.value) {
      case "active": return todos.value.filter(t => !t.completed)
      case "completed": return todos.value.filter(t => t.completed)
      default: return todos.value
    }
  }
  
  return (
    <div>
      <h1>Todo App</h1>
      <form onSubmit={handleSubmit}>
        <input 
          value={newTodoText.value}
          placeholder="Add new todo..."
        />
        <button type="submit">Add</button>
      </form>
      
      <div>
        <button onClick={() => filter.value = "all"}>All</button>
        <button onClick={() => filter.value = "active"}>Active</button>
        <button onClick={() => filter.value = "completed"}>Completed</button>
      </div>
      
      <ul>
        {getFilteredTodos().map(todo => (
          <li key={todo.id}>
            <span className={todo.completed ? "completed" : ""}>
              {todo.text}
            </span>
            <button onClick={() => toggleTodo(todo.id)}>
              {todo.completed ? "Undo" : "Done"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
`

// Test Case 3: Regular Component (no @page) - should preserve existing behavior
const regularComponentInput = `
import { ref } from "auwla"

// Global utilities (outside component → should stay global)
const theme = ref("light")
const API_BASE = "https://api.example.com"

function formatDate(date) {
  return new Intl.DateTimeFormat().format(date)
}

function toggleTheme() {
  theme.value = theme.value === "light" ? "dark" : "light"
}

export default function UserCard() {
  // Component state (inside component → should go inside Component UI scope)
  const user = ref(null)
  const loading = ref(false)
  
  // Component methods (inside component → should go inside Component UI scope)
  async function loadUser(id) {
    loading.value = true
    try {
      const response = await fetch(\`\${API_BASE}/users/\${id}\`)
      user.value = await response.json()
    } finally {
      loading.value = false
    }
  }
  
  return (
    <div className={theme.value}>
      <button onClick={toggleTheme}>Toggle Theme</button>
      {loading.value ? (
        <p>Loading...</p>
      ) : user.value ? (
        <div>
          <h2>{user.value.name}</h2>
          <p>Joined: {formatDate(new Date(user.value.createdAt))}</p>
        </div>
      ) : (
        <button onClick={() => loadUser(1)}>Load User</button>
      )}
    </div>
  )
}
`

const testCases = [
  {
    name: "Counter Page (@page)",
    input: counterPageInput,
    expectedScoping: {
      componentScope: ["count", "step", "increment", "decrement", "reset"],
      uiScope: ["message", "isVisible", "toggleVisibility", "updateMessage"]
    }
  },
  {
    name: "Todo Page (@page)", 
    input: todoPageInput,
    expectedScoping: {
      componentScope: ["todos", "API_URL", "fetchTodos", "addTodo", "toggleTodo"],
      uiScope: ["newTodoText", "filter", "handleSubmit", "getFilteredTodos"]
    }
  },
  {
    name: "Regular Component (no @page)",
    input: regularComponentInput,
    expectedScoping: {
      globalScope: ["theme", "API_BASE", "formatDate", "toggleTheme"],
      uiScope: ["user", "loading", "loadUser"]
    }
  }
]

for (let i = 0; i < testCases.length; i++) {
  const testCase = testCases[i]
  
  console.log(\`\n📋 Test Case \${i + 1}: \${testCase.name}\`)
  console.log('=' .repeat(40))
  
  try {
    // Compile the TSX
    const output = compileTSX(testCase.input)
    
    // Save input and output files for inspection
    const inputFile = \`test-case-\${i + 1}-input.tsx\`
    const outputFile = \`test-case-\${i + 1}-output.js\`
    
    writeFileSync(inputFile, testCase.input)
    writeFileSync(outputFile, output)
    
    console.log(\`📄 Input saved to: \${inputFile}\`)
    console.log(\`📄 Output saved to: \${outputFile}\`)
    
    // Analyze scoping
    console.log(\`\n🔍 Scoping Analysis:\`)
    
    if (testCase.expectedScoping.componentScope) {
      // @page file - check component scope
      const hasComponentScope = testCase.expectedScoping.componentScope.every(item => 
        output.includes(\`// Logic that was outside page scope → now inside page scope\`) &&
        output.includes(item)
      )
      console.log(\`✅ Component scope (\${testCase.expectedScoping.componentScope.join(', ')}): \${hasComponentScope ? 'CORRECT' : 'INCORRECT'}\`)
      
      const hasUIScope = testCase.expectedScoping.uiScope.every(item => 
        output.includes(\`// Logic that was inside page scope → now inside Component UI scope\`) &&
        output.includes(item)
      )
      console.log(\`✅ UI scope (\${testCase.expectedScoping.uiScope.join(', ')}): \${hasUIScope ? 'CORRECT' : 'INCORRECT'}\`)
    } else {
      // Regular component - check global scope
      const hasGlobalScope = testCase.expectedScoping.globalScope.every(item => 
        output.includes(\`// Component helpers (shared across all components)\`) &&
        output.includes(item)
      )
      console.log(\`✅ Global scope (\${testCase.expectedScoping.globalScope.join(', ')}): \${hasGlobalScope ? 'CORRECT' : 'INCORRECT'}\`)
      
      const hasUIScope = testCase.expectedScoping.uiScope.every(item => 
        output.includes(item) && !output.includes(\`// Logic that was inside page scope\`)
      )
      console.log(\`✅ UI scope (\${testCase.expectedScoping.uiScope.join(', ')}): \${hasUIScope ? 'CORRECT' : 'INCORRECT'}\`)
    }
    
    // Check for compilation errors
    if (output.includes('import {') && output.includes('export default')) {
      console.log('✅ Compilation: SUCCESS')
    } else {
      console.log('❌ Compilation: FAILED')
    }
    
  } catch (error) {
    console.error(\`❌ Error compiling \${testCase.name}:\`, error.message)
  }
}

console.log(\`\n🎉 Real-world validation complete!\`)
console.log(\`📁 Check the generated test-case-*-input.tsx and test-case-*-output.js files\`)