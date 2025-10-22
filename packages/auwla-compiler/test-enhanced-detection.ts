// Test the enhanced array mapping detection system
import { parseTSXFile, generateAuwlaFromTSX } from './src/tsx-compiler'

// Test cases for different array mapping patterns
const testCases = [
  // Reactive array mapping
  `export default function Test() {
    return <div>{todos.value.map(todo => <span>{todo.text}</span>)}</div>
  }`,
  
  // Static array mapping
  `export default function Test() {
    return <div>{['all', 'active', 'completed'].map(filter => <button>{filter}</button>)}</div>
  }`,
  
  // $each with two parameters
  `export default function Test() {
    return <div>{$each(items, (item, index) => <div key={index}>{item}</div>)}</div>
  }`,
  
  // $each with single parameter
  `export default function Test() {
    return <div>{$each(items, item => <div>{item}</div>)}</div>
  }`,
  
  // Multi-line JSX
  `export default function Test() {
    return <div>{todos.value.map(todo => (
      <div className="todo">
        <span>{todo.text}</span>
        <button onClick={() => delete(todo.id)}>Delete</button>
      </div>
    ))}</div>
  }`
]

console.log('Testing Enhanced Array Mapping Detection\n')

testCases.forEach((testCase, index) => {
  console.log(`\n=== Test Case ${index + 1} ===`)
  console.log('Input:', testCase.split('\n')[1].trim())
  
  try {
    const component = parseTSXFile(testCase)
    const output = generateAuwlaFromTSX(component)
    
    // Look for array mapping patterns in output
    if (output.includes('ui.List')) {
      console.log('✅ Generated ui.List')
    } else if (output.includes('.forEach')) {
      console.log('✅ Generated forEach')
    } else if (output.includes('TODO: Transform')) {
      console.log('⚠️  Still has TODO placeholder')
    } else {
      console.log('❌ No array mapping detected')
    }
    
    // Show relevant output lines
    const lines = output.split('\n')
    const relevantLines = lines.filter(line => 
      line.includes('ui.List') || 
      line.includes('.forEach') || 
      line.includes('TODO: Transform') ||
      line.includes('placeholder')
    )
    
    if (relevantLines.length > 0) {
      console.log('Output:', relevantLines[0].trim())
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message)
  }
})