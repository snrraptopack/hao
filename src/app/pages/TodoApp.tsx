import { h } from '../../jsx'
import { ref, watch, derive } from '../../state'
import { createResource } from '../../resource'
import { When, For } from '../../jsxutils'
import { $api } from '../$api'
import {asyncOp,onMount} from "../../index"

type Todo = {
  id: number
  text: string
  completed: boolean
  createdAt: string
}

export function TodoApp() {
  const newTodoText = ref('')
  
  const{
    data,
    loading,
    error,
    refetch:fetchTodo
}  = asyncOp<{todos:Todo[]}>(()=> $api.todos.get({}))

  const handleAddTodo = async (e: Event) => {
    e.preventDefault()
    const text = newTodoText.value.trim()
    if (!text) return

    try {
        await $api.todos.post({ body: { text } })
        newTodoText.value = ''
        fetchTodo()
    } catch (err) {
      console.error('Failed to add todo:', err)
    }
  }

  const toggleTodo = async (todo: Todo) => {
    try {
      await $api.todo.patch({
        params: { id: todo.id },
        body: { completed: !todo.completed }
      })
      fetchTodo()
    } catch (err) {
      console.error('Failed to toggle todo:', err)
    }
  }

  const deleteTodo = async (id: number) => {
    try {
      await $api.todo.delete({ params: { id } })
       fetchTodo()
    } catch (err) {
      console.error('Failed to delete todo:', err)
    }
  }


  const activeTodos = derive(()=>{
    const todos = data.value
    return todos?.todos.filter(it=> !it.completed) ?? []
  })


  const completedTodos = derive(()=>{
    const todos = data.value
    return todos?.todos.filter(it=> it.completed) ?? []
  })


  onMount(()=>{
    fetchTodo()
  })

  return (
    <div class="max-w-2xl mx-auto p-8">
      <div class="bg-white rounded-lg shadow-lg p-6">
        <h1 class="text-3xl font-bold mb-6 text-gray-800">
          📝 Todo App
        </h1>

        {/* Add Todo Form */}
        <form onSubmit={handleAddTodo} class="mb-6">
          <div class="flex gap-2">
            <input
              type="text"
              value={newTodoText}
              onInput={(e) => { newTodoText.value = (e.target as HTMLInputElement).value }}
              placeholder="What needs to be done?"
              class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
          </div>
        </form>

        {/* Loading / Error / Content */}
        <When>
          {loading}
          {() => (
            <div class="text-center py-8 text-gray-500">
              <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p class="mt-2">Loading todos...</p>
            </div>
          )}

          {watch(error, (err) => err !== null)}
          {() => (
            <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              Error: {error.value ?? ""}
            </div>
          )}

          {() => (
            <div class="space-y-6">
              {/* Stats */}
              <div class="flex justify-between text-sm text-gray-600">
                <span>
                  {watch(activeTodos, (todos) => todos.length)} active
                </span>
                <span>
                  {watch(completedTodos, (todos) => todos.length)} completed
                </span>
              </div>

              {/* Active Todos */}
              <div>
                <h2 class="text-lg font-semibold mb-3 text-gray-700">Active</h2>
                <div class="space-y-2">
                  <For each={activeTodos}>
                    {(todo) => (
                      <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() => toggleTodo(todo)}
                          class="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span class="flex-1 text-gray-800">{todo.text}</span>
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          class="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </For>
                </div>
                {watch(activeTodos, (todos) => todos.length === 0) && (
                  <p class="text-gray-400 text-center py-4">No active todos! 🎉</p>
                )}
              </div>

              {/* Completed Todos */}
              {watch(completedTodos, (todos) => todos.length > 0) && (
                <div>
                  <h2 class="text-lg font-semibold mb-3 text-gray-700">Completed</h2>
                  <div class="space-y-2">
                    <For each={completedTodos}>
                      {(todo) => (
                        <div class="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                          <input
                            type="checkbox"
                            checked={todo.completed}
                            onChange={() => toggleTodo(todo)}
                            class="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                          />
                          <span class="flex-1 text-gray-600 line-through">{todo.text}</span>
                          <button
                            onClick={() => deleteTodo(todo.id)}
                            class="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              )}
            </div>
          )}
        </When>
      </div>
    </div>
  ) as HTMLElement
}
