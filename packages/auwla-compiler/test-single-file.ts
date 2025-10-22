import { parseTSXFile, generateAuwlaFromTSX } from './src/tsx-compiler'

console.log('🧪 Testing single file fix...')

const testCode = `
// @page /simple-button
import { ref, type Ref } from 'auwla'

const count: Ref<number> = ref(0)

export default function SimpleButtonPage() {
  return (
    <div className="p-8">
      <h1>Button Test</h1>
      <button onClick={() => count.value++}>Click me</button>
      <p>Count: {count.value}</p>
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
    
    // Check if the fix worked
    if (result.includes('ui.P({text: watch(count, () =>') && result.includes('as Ref<string>')) {
        console.log('\n✅ FIXED: P element uses text property with optimized watch!')
    } else if (result.includes('ui.P({}, (ui: LayoutBuilder) => {')) {
        console.log('\n❌ STILL BROKEN: P element still creates nested content')
    } else {
        console.log('\n? Unexpected result - check manually')
    }
    
} catch (error) {
    console.log('❌ Compilation failed:', error)
}