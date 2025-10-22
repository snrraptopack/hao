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
    </div>
  )
}