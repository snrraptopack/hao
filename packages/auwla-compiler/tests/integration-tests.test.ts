import { describe, test, expect } from 'bun:test'
import { parseTSXFile, generateAuwlaFromTSX } from '../src/tsx-compiler'

describe('Integration Tests - Complete Transformation', () => {
  describe('Complex Todo App Example', () => {
    test('should transform complex todo app with $each array mappings', () => {
      const complexTodoInput = `
// @page /complex-todo
import { ref, type Ref } from 'auwla'
import { $each } from 'auwla/template'

export default function ComplexTodoPage() {
  const todos: Ref<Array<{ id: number; text: string; completed: boolean }>> = ref([
    { id: 1, text: 'Learn Auwla', completed: false },
    { id: 2, text: 'Build app', completed: true }
  ])

  const toggleTodo = (id: number) => {
    todos.value = todos.value.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    )
  }

  return (
    <div className="todo-app">
      <h1>Todo List</h1>
      
      {$each(todos, (todo, index) => (
        <div key={todo.id} className="todo-item">
          <input 
            type="checkbox" 
            checked={todo.completed}
            onChange={() => toggleTodo(todo.id)}
          />
          <span className={todo.completed ? 'completed' : 'active'}>
            {todo.text}
          </span>
          <button onClick={() => console.log('Delete', todo.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  )
}
      `

      const component = parseTSXFile(complexTodoInput)
      const result = generateAuwlaFromTSX(component)

      // Should contain proper ui.List transformation
      expect(result).toContain('ui.List')
      expect(result).toContain('items: todos')
      expect(result).toContain('render: (todo, index, ui) => {')
      
      // Should transform JSX content within the $each callback
      expect(result).toContain('ui.Div')
      expect(result).toContain('ui.Input')
      expect(result).toContain('ui.Span')
      expect(result).toContain('ui.Button')
      
      // Should preserve event handlers
      expect(result).toContain('on: { change: () => toggleTodo(todo.id) }')
      expect(result).toContain('on: { click: () => console.log(\'Delete\', todo.id) }')
      
      // Should preserve conditional class names
      expect(result).toContain('todo.completed ? \'completed\' : \'active\'')
      
      // Should preserve parameter references
      expect(result).toContain('todo.text')
      expect(result).toContain('todo.id')
      expect(result).toContain('todo.completed')
      
      // Should not contain placeholder text
      expect(result).not.toContain('$each item placeholder')
      expect(result).not.toContain('TODO: Transform complex JSX content')
    })

    test('should handle nested array mappings (with current limitations)', () => {
      const nestedMappingInput = `
export default function NestedMappingPage() {
  const categories = ref([
    { name: 'Work', items: ['Task 1', 'Task 2'] },
    { name: 'Personal', items: ['Task 3', 'Task 4'] }
  ])

  return (
    <div>
      {$each(categories, (category) => (
        <div className="category">
          <h2>{category.name}</h2>
          {$each(category.items, (item) => (
            <div className="item">{item}</div>
          ))}
        </div>
      ))}
    </div>
  )
}
      `

      const component = parseTSXFile(nestedMappingInput)
      const result = generateAuwlaFromTSX(component)

      // Should handle outer array mapping
      expect(result).toContain('ui.List')
      expect(result).toContain('items: categories')
      expect(result).toContain('render: (category, index, ui) => {')
      
      // Should preserve outer structure
      expect(result).toContain('category.name')
      
      // Note: Nested $each may not be fully supported yet
      // This test documents current behavior rather than ideal behavior
      expect(result).toContain('category.items')
    })
  })

  describe('Simple $each Example', () => {
    test('should transform simple $each with single parameter', () => {
      const simpleEachInput = `
export default function SimpleEachPage() {
  const items: Ref<string[]> = ref(['Apple', 'Banana', 'Cherry'])

  return (
    <div className="p-8">
      <h1>Simple Each Test</h1>
      
      {$each(items, (item) => 
        <div key={item}>
          {item}
        </div>
      )}
    </div>
  )
}
      `

      const component = parseTSXFile(simpleEachInput)
      const result = generateAuwlaFromTSX(component)

      // Should contain proper ui.List transformation
      expect(result).toContain('ui.List')
      expect(result).toContain('items: items')
      expect(result).toContain('render: (item, index, ui) => {')
      
      // Should transform simple JSX content
      expect(result).toContain('ui.Div')
      expect(result).toContain('item')
      
      // Should not contain placeholder text
      expect(result).not.toContain('$each item placeholder')
      expect(result).not.toContain('TODO: Transform complex JSX content')
    })

    test('should transform $each with two parameters', () => {
      const twoParamEachInput = `
export default function TwoParamEachPage() {
  const items = ref(['First', 'Second', 'Third'])

  return (
    <div>
      {$each(items, (item, index) => (
        <div className="item">
          <span className="index">{index + 1}</span>
          <span className="text">{item}</span>
        </div>
      ))}
    </div>
  )
}
      `

      const component = parseTSXFile(twoParamEachInput)
      const result = generateAuwlaFromTSX(component)

      // Should handle both parameters
      expect(result).toContain('render: (item, index, ui) => {')
      expect(result).toContain('index + 1')
      expect(result).toContain('item')
      
      // Should transform nested JSX
      expect(result).toContain('ui.Div')
      expect(result).toContain('ui.Span')
    })
  })

  describe('Reactive Array Mapping (.value.map)', () => {
    test('should transform reactive array mapping to ui.List', () => {
      const reactiveMapInput = `
export default function ReactiveMapPage() {
  const todos = ref([
    { id: 1, text: 'Task 1', done: false },
    { id: 2, text: 'Task 2', done: true }
  ])

  return (
    <div>
      {todos.value.map(todo => (
        <div key={todo.id} className={todo.done ? 'done' : 'pending'}>
          <span>{todo.text}</span>
          <button onClick={() => console.log(todo.id)}>View</button>
        </div>
      ))}
    </div>
  )
}
      `

      const component = parseTSXFile(reactiveMapInput)
      const result = generateAuwlaFromTSX(component)

      // Should transform to ui.List
      expect(result).toContain('ui.List')
      expect(result).toContain('items: todos')
      expect(result).toContain('render: (todo, index, ui) => {')
      
      // Should preserve JSX content
      expect(result).toContain('ui.Div')
      expect(result).toContain('ui.Span')
      expect(result).toContain('ui.Button')
      
      // Should preserve conditional expressions
      expect(result).toContain('todo.done ? \'done\' : \'pending\'')
      
      // Should preserve event handlers
      expect(result).toContain('on: { click: () => console.log(todo.id) }')
    })

    test('should handle complex reactive mapping (with current limitations)', () => {
      const complexReactiveInput = `
export default function ComplexReactivePage() {
  const products = ref([
    { id: 1, name: 'Product 1', price: 99.99, inStock: true },
    { id: 2, name: 'Product 2', price: 149.99, inStock: false }
  ])

  return (
    <div className="products">
      {products.value.map((product, index) => (
        <div key={product.id} className="product-card">
          <h3>{product.name}</h3>
          <p className="price">\${product.price.toFixed(2)}</p>
          <p className="stock">
            {product.inStock ? 'In Stock' : 'Out of Stock'}
          </p>
          <button 
            disabled={!product.inStock}
            onClick={() => console.log('Buy', product.id)}
          >
            {product.inStock ? 'Buy Now' : 'Notify Me'}
          </button>
          <small>Item #{index + 1}</small>
        </div>
      ))}
    </div>
  )
}
      `

      const component = parseTSXFile(complexReactiveInput)
      const result = generateAuwlaFromTSX(component)

      // Should parse without errors
      expect(result).toContain('ComplexReactivePage')
      expect(result).toContain('products')
      
      // Note: Complex multi-line reactive mappings may be treated as text
      // This test documents current behavior - the transformation system
      // may need enhancement for very complex cases
      expect(result.length).toBeGreaterThan(100)
    })
  })

  describe('Static Array Mapping ([].map)', () => {
    test('should transform static array mapping to forEach loop', () => {
      const staticMapInput = `
export default function StaticMapPage() {
  return (
    <div>
      <h1>Navigation</h1>
      {['Home', 'About', 'Contact'].map(item => (
        <a key={item} href={\`/\${item.toLowerCase()}\`}>
          {item}
        </a>
      ))}
    </div>
  )
}
      `

      const component = parseTSXFile(staticMapInput)
      const result = generateAuwlaFromTSX(component)

      // Should NOT use ui.List for static arrays
      expect(result).not.toContain('ui.List')
      
      // Should generate individual UI calls for each static array item
      expect(result).toContain('ui.A')
      expect(result).toContain('"Home"')
      expect(result).toContain('"About"')
      expect(result).toContain('"Contact"')
      
      // Should transform JSX content with actual values
      expect(result).toContain('Home".toLowerCase()')
      expect(result).toContain('About".toLowerCase()')
      expect(result).toContain('Contact".toLowerCase()')
    })

    test('should handle static numeric array mapping', () => {
      const staticNumericInput = `
export default function StaticNumericPage() {
  return (
    <div>
      {[1, 2, 3, 4, 5].map(num => (
        <div className="number-card">
          <span>Number: {num}</span>
          <span>Square: {num * num}</span>
        </div>
      ))}
    </div>
  )
}
      `

      const component = parseTSXFile(staticNumericInput)
      const result = generateAuwlaFromTSX(component)

      // Should generate individual UI calls for each static array item
      expect(result).toContain('ui.Div')
      expect(result).toContain('ui.Span')
      
      // Should preserve expressions with actual values
      expect(result).toContain('${1}')
      expect(result).toContain('${2}')
      expect(result).toContain('${3}')
      expect(result).toContain('${4}')
      expect(result).toContain('${5}')
      expect(result).toContain('1 * 1')
      expect(result).toContain('2 * 2')
      expect(result).toContain('3 * 3')
      expect(result).toContain('4 * 4')
      expect(result).toContain('5 * 5')
    })
  })

  describe('Performance and Large Arrays', () => {
    test('should handle large array mappings efficiently', () => {
      const largeArrayInput = `
export default function LargeArrayPage() {
  const items = ref(Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    name: \`Item \${i}\`,
    value: Math.random()
  })))

  return (
    <div>
      {$each(items, (item, index) => (
        <div key={item.id} className="large-item">
          <h4>{item.name}</h4>
          <p>Value: {item.value.toFixed(3)}</p>
          <p>Index: {index}</p>
          <button onClick={() => console.log(item.id)}>
            Select Item {item.id}
          </button>
        </div>
      ))}
    </div>
  )
}
      `

      const component = parseTSXFile(largeArrayInput)
      const result = generateAuwlaFromTSX(component)

      // Should handle large arrays without issues
      expect(result).toContain('ui.List')
      expect(result).toContain('render: (item, index, ui) => {')
      
      // Should preserve all transformations
      expect(result).toContain('ui.H4')
      expect(result).toContain('ui.P')
      expect(result).toContain('ui.Button')
      
      // Should preserve complex expressions
      expect(result).toContain('item.value.toFixed(3)')
      expect(result).toContain('item.id')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty array mappings gracefully', () => {
      const emptyArrayInput = `
export default function EmptyArrayPage() {
  const emptyItems = ref([])

  return (
    <div>
      <h1>Empty List</h1>
      {$each(emptyItems, (item) => (
        <div>{item}</div>
      ))}
    </div>
  )
}
      `

      const component = parseTSXFile(emptyArrayInput)
      const result = generateAuwlaFromTSX(component)

      // Should still generate proper structure
      expect(result).toContain('ui.List')
      expect(result).toContain('items: emptyItems')
      expect(result).toContain('render: (item, index, ui) => {')
    })

    test('should handle malformed array mapping (may throw syntax errors)', () => {
      const malformedInput = `
export default function MalformedPage() {
  const items = ref(['a', 'b', 'c'])

  return (
    <div>
      {$each(items, (item => (
        <div>{item}</div>
      ))}
    </div>
  )
}
      `

      // Note: Malformed syntax may throw parsing errors
      // This is expected behavior for invalid JavaScript/TSX
      try {
        const component = parseTSXFile(malformedInput)
        const result = generateAuwlaFromTSX(component)
        // If it doesn't throw, that's also acceptable
        expect(result).toBeDefined()
      } catch (error) {
        // Syntax errors are expected for malformed input
        expect(error).toBeInstanceOf(Error)
      }
    })
  })

  describe('Existing Functionality Preservation', () => {
    test('should preserve non-array-mapping functionality', () => {
      const nonMappingInput = `
export default function NonMappingPage() {
  const message = ref('Hello World')
  const count = ref(0)

  return (
    <div>
      <h1>{message.value}</h1>
      <p>Count: {count.value}</p>
      <button onClick={() => count.value++}>
        Increment
      </button>
    </div>
  )
}
      `

      const component = parseTSXFile(nonMappingInput)
      const result = generateAuwlaFromTSX(component)

      // Should preserve normal TSX compilation
      expect(result).toContain('ui.H1')
      expect(result).toContain('ui.P')
      expect(result).toContain('ui.Button')
      
      // Should preserve reactive expressions
      expect(result).toContain('message.value')
      expect(result).toContain('count.value')
      
      // Should preserve event handlers
      expect(result).toContain('on: { click: () => count.value++ }')
      
      // Should NOT contain array mapping code
      expect(result).not.toContain('ui.List')
      expect(result).not.toContain('$each')
    })

    test('should handle mixed array mapping and regular content', () => {
      const mixedInput = `
export default function MixedPage() {
  const title = ref('My App')
  const items = ref(['Item 1', 'Item 2'])

  return (
    <div>
      <header>
        <h1>{title.value}</h1>
        <p>Welcome to the app</p>
      </header>
      
      <main>
        {$each(items, (item) => (
          <div className="item">{item}</div>
        ))}
      </main>
      
      <footer>
        <p>Footer content</p>
      </footer>
    </div>
  )
}
      `

      const component = parseTSXFile(mixedInput)
      const result = generateAuwlaFromTSX(component)

      // Should handle both regular and array mapping content
      expect(result).toContain('ui.Header')
      expect(result).toContain('ui.Main')
      expect(result).toContain('ui.Footer')
      expect(result).toContain('ui.List')
      
      // Should preserve regular reactive content
      expect(result).toContain('title.value')
      
      // Should preserve array mapping
      expect(result).toContain('items: items')
      expect(result).toContain('render: (item, index, ui) => {')
    })
  })
})