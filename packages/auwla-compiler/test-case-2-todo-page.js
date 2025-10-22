import { Component, ref, watch } from 'auwla'
import type { Ref, LayoutBuilder } from 'auwla'

// Page component (has lifecycle)
export default function TodoPage() {
  // Logic that was outside page scope → now inside page scope
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

  return Component((ui: LayoutBuilder) => {
    // Logic that was inside page scope → now inside Component UI scope
    const newTodoText = ref("")
    const filter = ref("all")
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

    ui.Div({}, (ui: LayoutBuilder) => {
      ui.H1({ text: "Todo App" })
      ui.Form({ on: { submit: (e) => handleSubmit() } }, (ui: LayoutBuilder) => {
        ui.Input({ placeholder: "Add new todo...", value: newTodoText.value })
        ui.Button({ text: "Add", type: "submit" })
      })
      ui.Div({}, (ui: LayoutBuilder) => {
        ui.Button({ text: "All", on: { click: () => filter.value = "all" } })
        ui.Button({ text: "Active", on: { click: () => filter.value = "active" } })
        ui.Button({ text: "Completed", on: { click: () => filter.value = "completed" } })
      })
    })
  })
}
