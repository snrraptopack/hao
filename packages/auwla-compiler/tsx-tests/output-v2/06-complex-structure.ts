import { Component, ref, watch } from 'auwla'
import type { LayoutBuilder, Ref } from 'auwla'
import { $if, $each } from 'auwla/template';

// Complex state structure

export default function ComplexStructurePage() {
  // Logic that was outside page scope → now inside page scope
  // Complex state structure
const user: Ref<{
  name: string;
  email: string;
  isAdmin: boolean;
}> = ref({
  name: 'John Doe',
  email: 'john@example.com',
  isAdmin: false
});
  const todos: Ref<Array<{
  id: number;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}>> = ref([{
  id: 1,
  text: 'Learn Auwla',
  completed: false,
  priority: 'high'
}, {
  id: 2,
  text: 'Build awesome app',
  completed: false,
  priority: 'medium'
}, {
  id: 3,
  text: 'Deploy to production',
  completed: false,
  priority: 'low'
}]);
  const filter: Ref<'all' | 'active' | 'completed'> = ref('all');
  const newTodoText: Ref<string> = ref('');
  const showStats: Ref<boolean> = ref(true);
  const theme: Ref<'light' | 'dark'> = ref('light');

// Helper functions - simplified to avoid parser issues
  // Helper functions - simplified to avoid parser issues
const addTodo = () => {
  todos.value = [...todos.value, {
    id: Date.now(),
    text: newTodoText.value,
    completed: false,
    priority: 'medium'
  }];
  newTodoText.value = '';
};
  const toggleTodo = (id: number) => {
  todos.value = todos.value.map(todo => todo.id === id ? {
    ...todo,
    completed: !todo.completed
  } : todo);
};
  const deleteTodo = (id: number) => {
  todos.value = todos.value.filter(todo => todo.id !== id);
};

// Computed filtered todos
  // Computed filtered todos
const filteredTodos: Ref<Array<{
  id: number;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}>> = ref([]);

  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: `min-h-screen p-8 transition-colors ${theme.value === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}` }, (ui: LayoutBuilder) => {
      ui.Header({ className: "mb-8 flex justify-between items-center" }, (ui: LayoutBuilder) => {
      ui.Div({}, (ui: LayoutBuilder) => {
      ui.H1({ className: "text-3xl font-bold" , text: "Complex Todo App"})
      ui.When(watch([user], () => $if(user.value.isAdmin)) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Span({ className: "inline-block mt-2 px-2 py-1 bg-red-500 text-white text-xs rounded" , text: "Admin User"})
      })
    })
      ui.Div({ className: "flex items-center gap-4" }, (ui: LayoutBuilder) => {
      ui.Span({text: watch([user], () => `Welcome, ${user.value.name}`)})
      ui.Button({ className: "px-3 py-1 border rounded hover:bg-gray-100", on: { click: () => theme.value = theme.value === 'light' ? 'dark' : 'light' } , text: watch([theme], () => `
            ${theme.value === 'light' ? '🌙' : '☀️'}
          `)})
    })
    })
      ui.When(watch([showStats], () => $if(showStats.value)) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Div({ className: "mb-6 grid grid-cols-1 md:grid-cols-3 gap-4" }, (ui: LayoutBuilder) => {
      ui.Div({ className: "p-4 bg-blue-100 rounded-lg" }, (ui: LayoutBuilder) => {
      ui.H3({ className: "font-semibold" , text: "Total Tasks"})
      ui.P({ className: "text-2xl font-bold" , value: todos.length})
    })
      ui.Div({ className: "p-4 bg-green-100 rounded-lg" }, (ui: LayoutBuilder) => {
      ui.H3({ className: "font-semibold" , text: "Completed"})
      ui.P({ className: "text-2xl font-bold" , value: todos.filter(t => t.completed).length})
    })
      ui.Div({ className: "p-4 bg-yellow-100 rounded-lg" }, (ui: LayoutBuilder) => {
      ui.H3({ className: "font-semibold" , text: "Remaining"})
      ui.P({ className: "text-2xl font-bold" , value: todos.filter(t => !t.completed).length})
    })
    })
      })
      ui.Div({ className: "mb-6 flex gap-2" }, (ui: LayoutBuilder) => {
      ui.Input({ type: "text", value: newTodoText.value, placeholder: "Add a new todo...", className: "flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500", on: { change: e => newTodoText.value = e.target.value, keypress: e => e.key === 'Enter' && addTodo } })
      ui.Button({ disabled: !newTodoText.value.trim(), className: "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50", on: { click: (e) => addTodo() } , text: "Add Todo"})
    })
      ui.Div({ className: "mb-6 flex gap-2" }, (ui: LayoutBuilder) => {
      ui.Text({ value: `${['all', 'active', 'completed'].map(filterType => <button key={filterType} onClick={() => filter.value = filterType as any} className={`px-3 py-1 rounded capitalize ${filter.value === filterType ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
            {filterType}
          </button>)}` })
    })
      ui.Div({ className: "space-y-2" }, (ui: LayoutBuilder) => {
      ui.When(watch([filteredTodos], () => $if(filteredTodos.value.length === 0)) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Div({ className: "text-center py-8 text-gray-500" }, (ui: LayoutBuilder) => {
      ui.When(watch([filter], () => $if(filter.value === 'all')) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.P({text: "No todos yet. Add one above!"})
      })
      ui.When(watch([filter], () => $if(filter.value === 'active')) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.P({text: "No active todos. Great job! 🎉"})
      })
      ui.When(watch([filter], () => $if(filter.value === 'completed')) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.P({text: "No completed todos yet.s"})
      })
    })
      })
      ui.Text({ value: `${$each(filteredTodos, (todo, index) => <div key={todo.id} className={`p-4 border rounded-lg flex items-center gap-3 ${todo.completed ? 'bg-gray-50 opacity-75' : 'bg-white'} ${todo.priority === 'high' ? 'border-l-4 border-l-red-500' : todo.priority === 'medium' ? 'border-l-4 border-l-yellow-500' : 'border-l-4 border-l-green-500'}`}>
            <input type="checkbox" checked={todo.completed} onChange={() => toggleTodo(todo.id)} className="w-4 h-4" />
            
            <div className="flex-1">
              <span className={todo.completed ? 'line-through text-gray-500' : ''}>
                {todo.text}
              </span>
              <div className="text-xs text-gray-400 mt-1">
                Priority: {todo.priority} | ID: {todo.id}
              </div>
            </div>

            {/* Priority badge */}
            <span className={`px-2 py-1 text-xs rounded ${todo.priority === 'high' ? 'bg-red-100 text-red-800' : todo.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
              {todo.priority}
            </span>

            {/* Delete button - only show for completed todos or admins */}
            {$if(todo.completed || user.value.isAdmin) && <button onClick={() => deleteTodo(todo.id)} className="px-2 py-1 text-red-500 hover:bg-red-50 rounded" title="Delete todo">
                🗑️
              </button>}
          </div>)}` })
    })
      ui.Footer({ className: "mt-8 pt-4 border-t flex justify-between items-center" }, (ui: LayoutBuilder) => {
      ui.Div({ className: "flex items-center gap-4" }, (ui: LayoutBuilder) => {
      ui.Label({ className: "flex items-center gap-2" }, (ui: LayoutBuilder) => {
      ui.Input({ type: "checkbox", checked: showStats.value, on: { change: e => showStats.value = e.target.checked } })
      ui.Text({ text: "Show Statistics" })
    })
      ui.When(watch([user], () => $if(user.value.isAdmin)) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Button({ className: "px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm", on: { click: () => todos.value = [] } , text: "Clear All (Admin)"})
      })
    })
      ui.Div({ className: "text-sm text-gray-500" }, (ui: LayoutBuilder) => {
      ui.When(watch([todos], () => $if(todos.value.length > 0)) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Span({}, (ui: LayoutBuilder) => {
      ui.Text({ value: `${todos.value.filter(t => t.completed).length}of${todos.value.length}completed` })
      ui.When(watch([todos], () => $if(todos.value.filter(t => !t.completed).length === 0)) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Span({ className: "ml-2 text-green-600 font-semibold" , text: "🎉 All done!"})
      })
    })
      })
    })
    })
    })
  })
}
