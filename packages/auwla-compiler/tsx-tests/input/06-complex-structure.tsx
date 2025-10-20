// @page /complex-structure
// Test case: Complex nested structure with multiple features

import { ref, watch, type Ref } from 'auwla'
import { $if, $each } from 'auwla/template'

// Complex state structure
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

// Helper functions - simplified to avoid parser issues
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

// Computed filtered todos
const filteredTodos: Ref<Array<{ id: number; text: string; completed: boolean; priority: 'low' | 'medium' | 'high' }>> = ref([])
watch([todos, filter], () => {
  filteredTodos.value = todos.value.filter(todo => {
    if (filter.value === 'active') return !todo.completed
    if (filter.value === 'completed') return todo.completed
    return true 
  })
})

export default function ComplexStructurePage() {
  return (
    <div className={`min-h-screen p-8 transition-colors ${theme.value === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Header with user info and theme toggle */}
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Complex Todo App</h1>
          {$if(user.value.isAdmin) && (
            <span className="inline-block mt-2 px-2 py-1 bg-red-500 text-white text-xs rounded">
              Admin User
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <span>Welcome, {user.value.name}</span>
          <button 
            onClick={() => theme.value = theme.value === 'light' ? 'dark' : 'light'}
            className="px-3 py-1 border rounded hover:bg-gray-100"
          >
            {theme.value === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      {/* Stats section */}
      {$if(showStats.value) && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-100 rounded-lg">
            <h3 className="font-semibold">Total Tasks</h3>
            <p className="text-2xl font-bold">{todos.value.length}</p>
          </div>
          <div className="p-4 bg-green-100 rounded-lg">
            <h3 className="font-semibold">Completed</h3>
            <p className="text-2xl font-bold">{todos.value.filter(t => t.completed).length}</p>
          </div>
          <div className="p-4 bg-yellow-100 rounded-lg">
            <h3 className="font-semibold">Remaining</h3>
            <p className="text-2xl font-bold">{todos.value.filter(t => !t.completed).length}</p>
          </div>
        </div>
      )}

      {/* Add new todo form */}
      <div className="mb-6 flex gap-2">
        <input
          type="text"
          value={newTodoText.value}
          onChange={(e) => newTodoText.value = e.target.value}
          onKeyPress={(e) => e.key === 'Enter' && addTodo}
          placeholder="Add a new todo..."
          className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addTodo}
          disabled={!newTodoText.value.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Add Todo
        </button>
      </div>

      {/* Filter buttons */}
      <div className="mb-6 flex gap-2">
        {['all', 'active', 'completed'].map(filterType => (
          <button
            key={filterType}
            onClick={() => filter.value = filterType as any}
            className={`px-3 py-1 rounded capitalize ${
              filter.value === filterType 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {filterType}
          </button>
        ))}
      </div>

      {/* Todo list */}
      <div className="space-y-2">
        {$if(filteredTodos.value.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            {$if(filter.value === 'all') && (
              <p>No todos yet. Add one above!</p>
            )}
            {$if(filter.value === 'active') && (
              <p>No active todos. Great job! 🎉</p>
            )}
            {$if(filter.value === 'completed') && (
              <p>No completed todos yet.s</p>
            )}
          </div>
        )}

        {/* Using $each for todo list */}
        {$each(filteredTodos, (todo, index) => (
          <div
            key={todo.id}
            className={`p-4 border rounded-lg flex items-center gap-3 ${
              todo.completed ? 'bg-gray-50 opacity-75' : 'bg-white'
            } ${
              todo.priority === 'high' ? 'border-l-4 border-l-red-500' :
              todo.priority === 'medium' ? 'border-l-4 border-l-yellow-500' :
              'border-l-4 border-l-green-500'
            }`}
          >
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
              className="w-4 h-4"
            />
            
            <div className="flex-1">
              <span className={todo.completed ? 'line-through text-gray-500' : ''}>
                {todo.text}
              </span>
              <div className="text-xs text-gray-400 mt-1">
                Priority: {todo.priority} | ID: {todo.id}
              </div>
            </div>

            {/* Priority badge */}
            <span className={`px-2 py-1 text-xs rounded ${
              todo.priority === 'high' ? 'bg-red-100 text-red-800' :
              todo.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {todo.priority}
            </span>

            {/* Delete button - only show for completed todos or admins */}
            {$if(todo.completed || user.value.isAdmin) && (
              <button
                onClick={() => deleteTodo(todo.id)}
                className="px-2 py-1 text-red-500 hover:bg-red-50 rounded"
                title="Delete todo"
              >
                🗑️
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Footer with additional controls */}
      <footer className="mt-8 pt-4 border-t flex justify-between items-center">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showStats.value}
              onChange={(e) => showStats.value = e.target.checked}
            />
            Show Statistics
          </label>
          
          {$if(user.value.isAdmin) && (
            <button
              onClick={() => todos.value = []}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              Clear All (Admin)
            </button>
          )}
        </div>

        <div className="text-sm text-gray-500">
          {$if(todos.value.length > 0) && (
            <span>
              {todos.value.filter(t => t.completed).length} of {todos.value.length} completed
              {$if(todos.value.filter(t => !t.completed).length === 0) && (
                <span className="ml-2 text-green-600 font-semibold">🎉 All done!</span>
              )}
            </span>
          )}
        </div>
      </footer>
    </div>
  )
}