import { parseTSXFile, generateAuwlaFromTSX } from './src/tsx-compiler'

console.log('🧪 Testing multi-dependency watch...')

const testCode = `
// @page /multi-deps
import { ref, type Ref } from 'auwla'

const count: Ref<number> = ref(0)
const multiplier: Ref<number> = ref(2)

export default function MultiDepsPage() {
  return (
    <div>
      <p>Result: {count.value * multiplier.value}</p>
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
    
    // Check for multi-dependency handling
    if (result.includes('watch([count, multiplier], () =>')) {
        console.log('\n✅ CORRECT: Multiple dependencies use array syntax')
    } else if (result.includes('watch(count, () =>') || result.includes('watch(multiplier, () =>')) {
        console.log('\n❌ WRONG: Multiple dependencies should use array syntax')
    } else {
        console.log('\n? Unexpected result - check manually')
    }
    
} catch (error) {
    console.log('❌ Compilation failed:', error)
}