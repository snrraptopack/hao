import { generateAuwlaFromTSX, parseTSXFile } from './src/tsx-compiler'

// Test with the actual complex $each from 06-complex-structure
const complexInput = `
export default function TestPage() {
  const filteredTodos = ref([])
  const user = ref({ isAdmin: false })
  
  return (
    <div>
      {$each(filteredTodos, (todo, index) => (
        <div
          key={todo.id}
          className={\`p-4 border rounded-lg flex items-center gap-3 \${
            todo.completed ? 'bg-gray-50 opacity-75' : 'bg-white'
          }\`}
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
          </div>
        </div>
      ))}
    </div>
  )
}
`

console.log('=== Testing Complex $each ===')
const component = parseTSXFile(complexInput)
const result = generateAuwlaFromTSX(component)

console.log('Generated code:')
console.log(result)