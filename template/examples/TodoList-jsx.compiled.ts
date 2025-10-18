import { Component, ref, watch } from 'auwla'
import type { Ref } from 'auwla'

interface Todo {
  id: number
  text: Ref<string>
  done: Ref<boolean>
  isEditing: Ref<boolean>
}

const todos = ref<Todo[]>([
  { 
    id: 1, 
    text: ref('Learn Auwla'), 
    done: ref(true),
    isEditing: ref(false)
  },
  { 
    id: 2, 
    text: ref('Build something awesome'), 
    done: ref(false),
    isEditing: ref(false)
  }
])

const newTodo = ref('')

function addTodo() {
  if (!newTodo.value.trim()) return
  todos.value = [...todos.value, {
    id: Date.now(),
    text: ref(newTodo.value),
    done: ref(false),
    isEditing: ref(false)
  }]
  newTodo.value = ''
}

function toggleTodo(todo: Todo) {
  todo.done.value = !todo.done.value
}

function deleteTodo(id: number) {
  todos.value = todos.value.filter(t => t.id !== id)
}

function startEdit(todo: Todo) {
  todo.isEditing.value = true
}

function saveEdit(todo: Todo, newText: string) {
  if (newText.trim()) {
    todo.text.value = newText.trim()
  }
  todo.isEditing.value = false
}

function cancelEdit(todo: Todo) {
  todo.isEditing.value = false
}

export default Component((ui) => {
  ui.Div({ className: "min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4" }, (ui) => {
    ui.Div({ className: "max-w-2xl mx-auto" }, (ui) => {
      ui.Div({ className: "bg-white rounded-2xl shadow-xl p-8" }, (ui) => {
        ui.H1({ text: "✨ Todo List", className: "text-4xl font-bold text-gray-800 mb-8 text-center" })
        ui.Div({ className: "mb-6 flex gap-2" }, (ui) => {
          ui.Input({ type: "text", placeholder: "What needs to be done?", className: "flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors", on: { input: e => newTodo.value = e.target.value }, value: newTodo })
          ui.Button({ text: "Add", className: "px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium", on: { click: addTodo } })
        })
        ui.Ul({ className: "space-y-2" }, (ui) => {
          ui.List({
            items: todos,
            key: (todo) => todo.id,
            render: (todo, index, ui) => {
              ui.Li({ className: "group" }, (ui) => {
                ui.When(todo.isEditing, (ui) => {
                  ui.Div({ className: "flex gap-2 p-3 bg-blue-50 rounded-lg border-2 border-blue-300" }, (ui) => {
                    ui.Input({ type: "text", className: "flex-1 px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:outline-none", on: { input: e => todo.text.value = e.target.value }, value: todo.text })
                    ui.Button({ text: "Save", className: "px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors", on: { click: () => saveEdit(todo, todo.text.value) } })
                    ui.Button({ text: "Cancel", className: "px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors", on: { click: () => cancelEdit(todo) } })
                  })
                }).Else((ui) => {
                  ui.Div({ className: watch([todo.done], () => todo.done.value ? 'flex items-center gap-3 p-3 bg-gray-50 rounded-lg border-2 border-gray-200 opacity-60' : 'flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-purple-300 transition-all') as Ref<string> }, (ui) => {
                    ui.Input({ type: "checkbox", className: "w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500 cursor-pointer", on: { click: () => toggleTodo(todo) }, checked: todo.done })
                    ui.Span({ text: watch([todo.text], () => String(todo.text.value)) as Ref<string>, className: watch([todo.done], () => todo.done.value ? 'flex-1 text-gray-500 line-through' : 'flex-1 text-gray-800') as Ref<string> })
                    ui.Button({ text: "Edit", className: "opacity-0 group-hover:opacity-100 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-all", on: { click: () => startEdit(todo) } })
                    ui.Button({ text: "Delete", className: "opacity-0 group-hover:opacity-100 px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-all", on: { click: () => deleteTodo(todo.id) } })
                  })
                })
              })
            }
          })
        })
        ui.When(watch([todos], () => todos.value.length === 0) as Ref<boolean>, (ui) => {
          ui.Div({ className: "text-center py-12" }, (ui) => {
            ui.P({ text: "No todos yet! Add one above to get started.", className: "text-gray-400 text-lg" })
          })
        })
      })
    })
  })
})
