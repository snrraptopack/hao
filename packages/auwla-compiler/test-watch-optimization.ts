import { parseTSXFile, generateAuwlaFromTSX } from './src/tsx-compiler'

console.log('🧪 Testing watch optimization...')

const testCode = `
// @page /dynamic-button
// Test case: Button with dynamic text
import { ref, type Ref } from 'auwla'

const count: Ref<number> = ref(0)

export default function DynamicButtonPage() {
  return (
    <div className="p-8">
      <h1>Dynamic Button Test</h1>
      <button className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={() => count.value++}>
        Clicked {count.value} times
      </button>
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
    
    // Check for single dependency optimization
    if (result.includes('watch(count, () =>') && result.includes('as Ref<string>')) {
        console.log('\n✅ OPTIMIZED: Single dependency uses watch(ref, callback) with proper type assertion')
    } else if (result.includes('watch([count], () =>')) {
        console.log('\n⚠️  UNOPTIMIZED: Single dependency still uses array syntax')
    } else {
        console.log('\n? Unexpected result - check manually')
        console.log('Looking for watch expression...')
        const watchMatch = result.match(/watch\([^)]+\)/g)
        if (watchMatch) {
            console.log('Found:', watchMatch)
        }
    }
    
} catch (error) {
    console.log('❌ Compilation failed:', error)
}