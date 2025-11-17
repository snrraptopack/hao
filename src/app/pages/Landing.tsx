import { h } from '../../jsx'
import {ref, type Ref,watch,createStore} from "../../index"
import { Link } from '../../router'
import '../../transition/view-transitions.css'


type Todo = { id: number; text: string; completed: Ref<boolean> };

const todos = ref<Todo[]>([
  { id: 1, text: 'Learn Auwla', completed: ref(true)},
  { id: 2, text: 'Build an app', completed: ref(false)},
]);

const one = [ 
  { id: 1, text: 'Learn Auwla', completed: true},
  { id: 2, text: 'Build an app', completed: false},
]

const store = createStore(one)

function toggleTodo(id: number) {
  console.log("clicked")
  const todo = todos.value.find(t => t.id === id);
  if (todo) {
    // Update the existing Ref to preserve reactivity
    todo.completed.value = !todo.completed.value;
  }
  store.update(todos=>
    todos.map(todo=>
      todo.id === id ? {...todo,completed:!todo.completed} : todo
    )
  )
}

export function TodoList() {
  return (
    <ul>
      {store.value.value.map(todo => (
        <li
          style={todo.completed? { textDecoration: 'line-through' } : {}}
          onClick={() => toggleTodo(todo.id)}
        >
          {todo.text}
        </li>
      ))}
    </ul>
  );
}


export function LandingPage(): HTMLElement {
  return (
    <div class="min-h-screen flex items-center justify-center bg-gray-50" style={{ viewTransitionName: 'root' }}>
      <div class="p-8 bg-white rounded-xl shadow-sm space-y-4 text-center">
        <h1 class="text-3xl font-bold">Auwla Demo</h1>
        <p class="text-gray-600">Start the modular app experience.</p>
        <div class="flex justify-center gap-2">
          <Link to="/app/home" text="Enter App (Left)" className="px-4 py-2 rounded border" activeClassName="bg-indigo-600 text-white" transition={{ direction: 'left' }} />
          <Link to="/app/home" text="Enter App (Right)" className="px-4 py-2 rounded border" activeClassName="bg-indigo-600 text-white" transition={{ direction: 'right' }} />
        </div>
      </div>
      <TodoList />
    </div>
  )
}
