// Test specific validation cases that should be detected by our enhanced system
import { parseTSXFile, generateAuwlaFromTSX } from './src/tsx-compiler'

const validationTestCases = [
  {
    name: "Valid reactive mapping",
    code: `export default function Test() {
      const items = ref(['a', 'b', 'c'])
      return <div>{items.value.map(item => <span key={item}>{item}</span>)}</div>
    }`
  },
  {
    name: "Valid static mapping", 
    code: `export default function Test() {
      return <div>{['a', 'b', 'c'].map(item => <span key={item}>{item}</span>)}</div>
    }`
  },
  {
    name: "Valid $each mapping",
    code: `export default function Test() {
      const items = ref(['a', 'b', 'c'])
      return <div>{$each(items, (item, index) => <span key={index}>{item}</span>)}</div>
    }`
  },
  {
    name: "Invalid array name in $each",
    code: `export default function Test() {
      return <div>{$each(123invalid, item => <span>{item}</span>)}</div>
    }`
  },
  {
    name: "Missing parameters in $each",
    code: `export default function Test() {
      return <div>{$each(items, => <span>test</span>)}</div>
    }`
  }
]

console.log('🧪 Testing Specific Validation Cases\n')

// Test the detection function directly
console.log('=== Direct Detection Tests ===')

const directTests = [
  'items.value.map(item => <span>{item}</span>)',
  "['a', 'b'].map(item => <span>{item}</span>)",
  '$each(items, (item, index) => <span>{item}</span>)',
  '$each(123invalid, item => <span>{item}</span>)',
  '$each(items, => <span>test</span>)'
]

// Import the detection function (we'll need to make it accessible)
// For now, let's test through the full compilation

validationTestCases.forEach((testCase, index) => {
  console.log(`\n=== ${testCase.name} ===`)
  
  try {
    const component = parseTSXFile(testCase.code)
    const output = generateAuwlaFromTSX(component)
    
    // Check for different types of results
    if (output.includes('ui.List({ items:')) {
      console.log('✅ Generated ui.List for reactive/each mapping')
    } else if (output.includes('.forEach(')) {
      console.log('✅ Generated forEach for static mapping')
    } else if (output.includes('// Array mapping error:')) {
      console.log('✅ Detected validation error')
    } else if (output.includes('// Warning:')) {
      console.log('⚠️  Generated validation warning')
    } else if (output.includes('ui.Text') && (output.includes('.map(') || output.includes('$each('))) {
      console.log('❌ Array mapping not detected - still in ui.Text')
    } else {
      console.log('❓ No array mapping detected')
    }
    
    // Show relevant output lines
    const lines = output.split('\n')
    const relevantLines = lines.filter(line => 
      line.includes('ui.List') ||
      line.includes('.forEach(') ||
      line.includes('// Array mapping error:') ||
      line.includes('// Warning:') ||
      line.includes('ui.Text') && (line.includes('.map(') || line.includes('$each('))
    )
    
    if (relevantLines.length > 0) {
      console.log('Relevant output:')
      relevantLines.slice(0, 3).forEach(line => {
        console.log('  ', line.trim())
      })
    }
    
  } catch (error) {
    console.log('✅ Caught compilation error:', error.message)
  }
})