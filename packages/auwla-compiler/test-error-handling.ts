// Test comprehensive error handling and validation for array mapping
import { parseTSXFile, generateAuwlaFromTSX } from './src/tsx-compiler'

const errorTestCases = [
  {
    name: "Invalid parameter name",
    code: `export default function Test() {
      return <div>{items.map(123invalid => <span>{123invalid}</span>)}</div>
    }`
  },
  {
    name: "Missing JSX content",
    code: `export default function Test() {
      return <div>{items.map(item => )}</div>
    }`
  },
  {
    name: "Invalid $each syntax",
    code: `export default function Test() {
      return <div>{$each(items, invalid syntax here)}</div>
    }`
  },
  {
    name: "Empty array expression",
    code: `export default function Test() {
      return <div>{.map(item => <span>{item}</span>)}</div>
    }`
  },
  {
    name: "Malformed JSX in mapping",
    code: `export default function Test() {
      return <div>{items.map(item => <span>{item</span>)}</div>
    }`
  },
  {
    name: "Variable scoping issues",
    code: `export default function Test() {
      return <div>{items.map(item => <span onClick={(item) => handleClick(item)}>{item}</span>)}</div>
    }`
  },
  {
    name: "Complex but valid case",
    code: `export default function Test() {
      return <div>{items.map(item => <span key={item.id} onClick={() => handleClick(item)}>{item.name}</span>)}</div>
    }`
  }
]

console.log('🧪 Testing Error Handling and Validation\n')

errorTestCases.forEach((testCase, index) => {
  console.log(`\n=== ${testCase.name} ===`)
  
  try {
    const component = parseTSXFile(testCase.code)
    const output = generateAuwlaFromTSX(component)
    
    // Check for error handling indicators
    if (output.includes('// Array mapping error:')) {
      console.log('✅ Detected and handled array mapping error')
    } else if (output.includes('// Warning:')) {
      console.log('⚠️  Generated warning for potential issue')
    } else if (output.includes('ui.List') || output.includes('.forEach(')) {
      console.log('✅ Successfully transformed despite complexity')
    } else if (output.includes('// Parse error:')) {
      console.log('✅ Detected and handled JSX parse error')
    } else if (output.includes('// Complex JSX')) {
      console.log('⚠️  Fell back to complex JSX handling')
    } else {
      console.log('❓ Unexpected result')
    }
    
    // Show error/warning messages
    const lines = output.split('\n')
    const errorLines = lines.filter(line => 
      line.includes('// Array mapping error:') ||
      line.includes('// Warning:') ||
      line.includes('// Parse error:') ||
      line.includes('// Complex JSX') ||
      line.includes('validation error') ||
      line.includes('transformation error')
    )
    
    if (errorLines.length > 0) {
      console.log('Error/Warning messages:')
      errorLines.forEach(line => {
        console.log('  ', line.trim())
      })
    }
    
  } catch (error) {
    console.log('✅ Caught compilation error:', error.message)
  }
})