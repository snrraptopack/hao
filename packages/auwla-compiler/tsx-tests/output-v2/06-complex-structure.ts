import { Component, ref, watch } from 'auwla'
import type { Ref, LayoutBuilder } from 'auwla'

// Component helpers (shared across all components)
const user: Ref<{ name: string; email: string; isAdmin: boolean }> = ref({
  name: 'John Doe',
  email: 'john@example.com',
  isAdmin: false
})
const todos: Ref<Array<{ id: number; text: string; completed: boolean; priority: 'low' | 'medium' | 'high' }>> = ref([
  { id: 1, text: 'Learn Auwla', completed: false, priority: 'high' },
  { id: 2, text: 'Build awesome app', completed: false, priority: 'medium' },
  { id: 3, text: 'Deploy to production', completed: false, priority: 'low' }
])
const filter: Ref<'all' | 'active' | 'completed'> = ref('all')
const newTodoText: Ref<string> = ref('')
const showStats: Ref<boolean> = ref(true)
const theme: Ref<'light' | 'dark'> = ref('light')
const addTodo = () => {
  todos.value = [...todos.value, { id: Date.now(), text: newTodoText.value, completed: false, priority: 'medium' }]
  newTodoText.value = ''
}
const toggleTodo = (id: number) => {
  todos.value = todos.value.map(todo => todo.id === id ? { ...todo, completed: !todo.completed } : todo)
}
const deleteTodo = (id: number) => {
  todos.value = todos.value.filter(todo => todo.id !== id)
}
const filteredTodos: Ref<Array<{ id: number; text: string; completed: boolean; priority: 'low' | 'medium' | 'high' }>> = ref([])
watch([todos, filter], () => {
  filteredTodos.value = todos.value.filter(todo => {
    if (filter.value === 'active') return !todo.completed
    if (filter.value === 'completed') return todo.completed
    return true 
  })
})

// Page component (has lifecycle)
export default function ComplexStructurePage() {
  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: `min-h-screen p-8 transition-colors ${theme.value === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}` }, (ui: LayoutBuilder) => {
      ui.Header({ className: "mb-8 flex justify-between items-center" }, (ui: LayoutBuilder) => {
        ui.Div({}, (ui: LayoutBuilder) => {
          ui.H1({ text: "Complex Todo App", className: "text-3xl font-bold" })
          if (watch([user], () => user.value.isAdmin) as Ref<boolean>) {
            ui.Span({ text: "Admin User", className: "inline-block mt-2 px-2 py-1 bg-red-500 text-white text-xs rounded" })
          }
        })
        ui.Div({ className: "flex items-center gap-4" }, (ui: LayoutBuilder) => {
          ui.Span({ text: watch([user], () => "Welcome," + String(user.value.name)) as Ref<string> })
          ui.Button({ text: watch([theme], () => String(theme.value === 'light' ? '🌙' : '☀️')) as Ref<string>, className: "px-3 py-1 border rounded hover:bg-gray-100", on: { click: () => theme.value = theme.value === 'light' ? 'dark' : 'light' } })
        })
      })
      if (watch([showStats], () => showStats.value) as Ref<boolean>) {
        ui.Div({ className: "mb-6 grid grid-cols-1 md:grid-cols-3 gap-4" }, (ui: LayoutBuilder) => {
          ui.Div({ className: "p-4 bg-blue-100 rounded-lg" }, (ui: LayoutBuilder) => {
            ui.H3({ text: "Total Tasks", className: "font-semibold" })
            ui.P({ text: watch([todos], () => String(todos.value.length)) as Ref<string>, className: "text-2xl font-bold" })
          })
          ui.Div({ className: "p-4 bg-green-100 rounded-lg" }, (ui: LayoutBuilder) => {
            ui.H3({ text: "Completed", className: "font-semibold" })
            ui.P({ text: watch([todos], () => String(todos.value.filter(t => t.completed).length)) as Ref<string>, className: "text-2xl font-bold" })
          })
          ui.Div({ className: "p-4 bg-yellow-100 rounded-lg" }, (ui: LayoutBuilder) => {
            ui.H3({ text: "Remaining", className: "font-semibold" })
            ui.P({ text: watch([todos], () => String(todos.value.filter(t => !t.completed).length)) as Ref<string>, className: "text-2xl font-bold" })
          })
        })
      }
      ui.Div({ className: "mb-6 flex gap-2" }, (ui: LayoutBuilder) => {
        ui.Input({ type: "text", placeholder: "Add a new todo...", className: "flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500", on: { change: e => newTodoText.value = e.target.value, keyPress: e => e.key === 'Enter' && addTodo }, value: newTodoText.value })
        ui.Button({ text: "Add Todo", className: "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50", on: { click: (e) => addTodo() }, disabled: !newTodoText.value.trim() })
      })
      ui.Div({ className: "mb-6 flex gap-2" }, (ui: LayoutBuilder) => {
        ['all', 'active', 'completed'].forEach((filterType, index) => {
          ui.Button({ text: String(filterType), className: `px-3 py-1 rounded capitalize ${filter.value === filterType ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`, on: { click: () => filter.value = filterType as any } })
        })
      })
      ui.Div({ className: "space-y-2" }, (ui: LayoutBuilder) => {
        if (watch([filteredTodos], () => filteredTodos.value.length === 0) as Ref<boolean>) {
          ui.Div({ className: "text-center py-8 text-gray-500" }, (ui: LayoutBuilder) => {
            if (watch([filter], () => filter.value === 'all') as Ref<boolean>) {
              ui.P({ text: "No todos yet. Add one above!" })
            }
            if (watch([filter], () => filter.value === 'active') as Ref<boolean>) {
              ui.P({ text: "No active todos. Great job! 🎉" })
            }
            if (watch([filter], () => filter.value === 'completed') as Ref<boolean>) {
              ui.P({ text: "No completed todos yet.s" })
            }
          })
        }
        ui.List({
          items: filteredTodos,
          key: (todo) => todo.id,
          render: (todo: any, index: number, ui: LayoutBuilder) => {
            ui.Div({ className: `p-4 border rounded-lg flex items-center gap-3 ${todo.completed ? 'bg-gray-50 opacity-75' : 'bg-white'} ${todo.priority === 'high' ? 'border-l-4 border-l-red-500' : todo.priority === 'medium' ? 'border-l-4 border-l-yellow-500' : 'border-l-4 border-l-green-500'}` }, (ui: LayoutBuilder) => {
              ui.Input({ type: "checkbox", className: "w-4 h-4", on: { change: () => toggleTodo(todo.id) }, checked: todo.completed })
              ui.Div({ className: "flex-1" }, (ui: LayoutBuilder) => {
                ui.Span({ text: String(todo.text), className: todo.completed ? 'line-through text-gray-500' : '' })
                ui.Div({ text: "Priority:" + String(todo.priority) + "| ID:" + String(todo.id), className: "text-xs text-gray-400 mt-1" })
              })
              ui.Span({ text: String(todo.priority), className: `px-2 py-1 text-xs rounded ${todo.priority === 'high' ? 'bg-red-100 text-red-800' : todo.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}` })
              if (watch([user], () => todo.completed || user.value.isAdmin) as Ref<boolean>) {
                ui.Button({ text: "🗑️", className: "px-2 py-1 text-red-500 hover:bg-red-50 rounded", title: "Delete todo", on: { click: () => deleteTodo(todo.id) } })
              }
            })
          }
        })
      })
      ui.Footer({ className: "mt-8 pt-4 border-t flex justify-between items-center" }, (ui: LayoutBuilder) => {
        ui.Div({ className: "flex items-center gap-4" }, (ui: LayoutBuilder) => {
          ui.Label({ className: "flex items-center gap-2" }, (ui: LayoutBuilder) => {
            ui.Input({ type: "checkbox", on: { change: e => showStats.value = e.target.checked }, checked: showStats.value })
            ui.Text({ value: "Show Statistics" })
          })
          if (watch([user], () => user.value.isAdmin) as Ref<boolean>) {
            ui.Button({ text: "Clear All (Admin)", className: "px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm", on: { click: () => todos.value = [] } })
          }
        })
        ui.Div({ className: "text-sm text-gray-500" }, (ui: LayoutBuilder) => {
          if (watch([todos], () => todos.value.length > 0) as Ref<boolean>) {
            ui.Span({}, (ui: LayoutBuilder) => {
              ui.Text({ value: watch([todos], () => String(todos.value.filter(t => t.completed).length)) as Ref<string> })
              ui.Text({ value: "of" })
              ui.Text({ value: watch([todos], () => String(todos.value.length)) as Ref<string> })
              ui.Text({ value: "completed" })
              if (watch([todos], () => todos.value.filter(t => !t.completed).length === 0) as Ref<boolean>) {
                ui.Span({ text: "🎉 All done!", className: "ml-2 text-green-600 font-semibold" })
              }
            })
          }
        })
      })
    })
  })
}
