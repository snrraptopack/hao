import { detectArrayMapping, parseJSXContent, JSXTransformationContext } from './src/tsx-compiler'

// Test the $each detection and JSX parsing
const complexEachExpr = `$each(filteredTodos, (todo, index) => (
  <div
    key={todo.id}
    className={\`p-4 border rounded-lg flex items-center gap-3 \${
      todo.completed ? 'bg-gray-50 opacity-75' : 'bg-white'
    } \${
      todo.priority === 'high' ? 'border-l-4 border-l-red-500' :
      todo.priority === 'medium' ? 'border-l-4 border-l-yellow-500' :
      'border-l-4 border-l-green-500'
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
))`

console.log('=== Testing $each Detection ===')
const detection = detectArrayMapping(complexEachExpr)
console.log('Detection result:', {
  isArrayMapping: detection.isArrayMapping,
  type: detection.expression?.type,
  arrayExpression: detection.expression?.arrayExpression,
  itemParameter: detection.expression?.itemParameter,
  indexParameter: detection.expression?.indexParameter,
  error: detection.error
})

if (detection.expression?.jsxContent) {
  console.log('\n=== JSX Content ===')
  console.log(detection.expression.jsxContent.substring(0, 200) + '...')
  
  console.log('\n=== Testing JSX Parsing ===')
  const context: JSXTransformationContext = {
    itemParameter: detection.expression.itemParameter,
    indexParameter: detection.expression.indexParameter,
    indentLevel: 2
  }
  
  try {
    const jsxCalls = parseJSXContent(detection.expression.jsxContent, context)
    console.log('JSX Calls generated:', jsxCalls.length)
    if (jsxCalls.length > 0) {
      console.log('First few calls:')
      jsxCalls.slice(0, 3).forEach((call, i) => {
        console.log(`${i}: ${call}`)
      })
    } else {
      console.log('No JSX calls generated!')
    }
  } catch (error) {
    console.error('JSX parsing failed:', error)
  }
}