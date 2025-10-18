import { Component, ref } from 'auwla'
import { if as $if, each as $each } from 'auwla/template'

interface Todo {
  id: number
  text: string
  done: boolean
}

const todos = ref<Todo[]>([
  { id: 1, text: 'Learn Auwla', done: true },
  { id: 2, text: 'Build something', done: false }
])

const newTodo = ref('')

function addTodo() {
  if (!newTodo.value.trim()) return
  todos.value = [...todos.value, {
    id: Date.now(),
    text: newTodo.value,
    done: false
  }]
  newTodo.value = ''
}

function toggleTodo(id: number) {
  todos.value = todos.value.map(t => 
    t.id === id ? { ...t, done: !t.done } : t
  )
}

export default Component((ui) => {
  ui.Div({ className: "todo-app" }, (ui) => {
    ui.H1({ text: "Todo List" })
    ui.Div({ className: "input-section" }, (ui) => {
      ui.Input({ type: "text", placeholder: "Add a todo", value: newTodo })
      ui.Button({ text: "Add", on: { click: addTodo } })
    })
    ui.Ul({ className: "todo-list" }, (ui) => {
      ui.List({
        items: todos.value,
        key: (todo) => todo.id,
        render: (todo, index, ui) => {
          ui.Li({}, (ui) => {
            ui.Div({ className: todo.done ? 'done' : '' }, (ui) => {
              ui.Input({ type: "checkbox", on: { click: () => toggleTodo(todo.id) }, checked: todo.done })
              ui.Span({ text: String(todo.text) })
            })
          })
        }
      })
    })
    ui.When(watch([todos], () => todos.value.length === 0), (ui) => {
      ui.P({ text: "No todos yet!" })
    })
  })
})
