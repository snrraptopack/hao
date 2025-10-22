import { parseTSXFile, generateAuwlaFromTSX } from './src/tsx-compiler'

console.log('🧪 Testing array mapping detection...')

const testCode = `
// @page /test-array-mapping
import { ref, type Ref } from 'auwla'
import { $each } from 'auwla/template'

const items: Ref<string[]> = ref(['Apple', 'Banana', 'Cherry'])
const staticItems = ['Red', 'Green', 'Blue']

export default function TestArrayMappingPage() {
  return (
    <div>
      <h1>Array Mapping Test</h1>
      
      {/* Test $each */}
      {$each(items, (item, index) => (
        <div key={item}>{item}</div>
      ))}
      
      {/* Test reactive .map */}
      {items.value.map(item => (
        <p key={item}>{item}</p>
      ))}
      
      {/* Test static .map */}
      {staticItems.map(item => (
        <span key={item}>{item}</span>
      ))}
    </div>
  )
}
`

try {
    const component = parseTSXFile(testCode)
    const result = generateAuwlaFromTSX(component)
    
    console.log('✅ Compilation successful!')
    console.log('Result:')
    console.log(result)
    
    // Check for array mapping transformations
    const checks = [
        {
            name: '$each transformed to ui.List',
            test: result.includes('ui.List'),
            expected: true
        },
        {
            name: 'No JSX in ui.Text',
            test: !result.includes('ui.Text({ value: `${$each'),
            expected: true
        },
        {
            name: 'TODO comments present',
            test: result.includes('TODO: Transform JSX'),
            expected: true
        }
    ]
    
    console.log('\n📋 Array Mapping Status:')
    checks.forEach(check => {
        const status = check.test === check.expected ? '✅' : '❌'
        console.log(`${status} ${check.name}: ${check.test}`)
    })
    
} catch (error) {
    console.log('❌ Compilation failed:', error)
}