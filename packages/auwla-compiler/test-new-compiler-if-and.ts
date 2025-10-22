import { compileNewTSX } from './src/new-tsx-compiler'

console.log('🧪 Testing new compiler with $if && jsx pattern...')

const testCode = `
import { ref } from 'auwla'

const counter = ref(0)
const isEnabled = ref(true)

export default function TestComponent() {
    return (
        <div>
            {$if(counter.value > 5) && <p>Counter is high</p>}
            {$if(isEnabled.value) && counter.value > 10 && <div>Both conditions</div>}
        </div>
    )
}
`

try {
    const result = compileNewTSX(testCode, 'test.tsx')
    console.log('✅ Compilation successful!')
    console.log('Result:')
    console.log(result)
} catch (error) {
    console.log('❌ Compilation failed:', error)
}