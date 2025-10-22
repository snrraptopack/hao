// Test static array mapping transformation
import { parseTSXFile, generateAuwlaFromTSX } from './src/tsx-compiler'

const testCases = [
  {
    name: "Simple static array with buttons",
    code: `export default function Test() {
      return (
        <div>
          {['all', 'active', 'completed'].map(filter => 
            <button key={filter} onClick={() => setFilter(filter)}>
              {filter}
            </button>
          )}
        </div>
      )
    }`
  },
  {
    name: "Static array with complex JSX",
    code: `export default function Test() {
      return (
        <div>
          {['red', 'green', 'blue'].map(color => 
            <div key={color} className={\`bg-\${color}-500 p-4\`}>
              <h3>{color.toUpperCase()}</h3>
              <p>This is {color} color</p>
            </div>
          )}
        </div>
      )
    }`
  },
  {
    name: "Static array with numbers",
    code: `export default function Test() {
      return (
        <div>
          {[1, 2, 3, 4, 5].map(num => 
            <span key={num} className="number">
              {num * 2}
            </span>
          )}
        </div>
      )
    }`
  },
  {
    name: "Static array with objects",
    code: `export default function Test() {
      return (
        <div>
          {[{id: 1, name: 'John'}, {id: 2, name: 'Jane'}].map(user => 
            <div key={user.id}>
              <strong>{user.name}</strong>
            </div>
          )}
        </div>
      )
    }`
  }
]

console.log('🧪 Testing Static Array Mapping Transformation\n')

testCases.forEach((testCase, index) => {
  console.log(`\n=== ${testCase.name} ===`)
  
  try {
    const component = parseTSXFile(testCase.code)
    const output = generateAuwlaFromTSX(component)
    
    // Check if static array mapping is properly transformed
    if (output.includes('.forEach(')) {
      console.log('✅ Generated forEach for static array')
    } else if (output.includes('ui.List')) {
      console.log('⚠️  Generated ui.List instead of forEach')
    } else if (output.includes('ui.Text') && output.includes('.map(')) {
      console.log('❌ Still placing .map() in ui.Text')
    } else {
      console.log('❓ Unknown transformation result')
    }
    
    // Show the relevant transformation
    const lines = output.split('\n')
    const relevantLines = lines.filter(line => 
      line.includes('.forEach(') || 
      line.includes('ui.List') ||
      (line.includes('ui.Text') && line.includes('.map(')) ||
      line.includes('ui.Button') ||
      line.includes('ui.Div') ||
      line.includes('ui.Span')
    )
    
    if (relevantLines.length > 0) {
      console.log('Generated code preview:')
      relevantLines.slice(0, 5).forEach(line => {
        console.log('  ', line.trim())
      })
      if (relevantLines.length > 5) {
        console.log('  ', '...')
      }
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message)
  }
})