import { parseTSXFile, generateAuwlaFromTSX } from './src/tsx-compiler'

console.log('🧪 Testing invalid $if && jsx patterns...')

function compileTSXToUI(tsxCode: string): string {
    const component = parseTSXFile(tsxCode)
    return generateAuwlaFromTSX(component)
}

const invalidTestCode = `
import { ref } from 'auwla'

const counter = ref(0)
const isEnabled = ref(true)

export default function TestComponent() {
    return (
        <div>
            {/* ❌ Invalid: Multiple conditions outside $if parentheses */}
            {$if(counter.value > 5) && isEnabled.value && <p>Invalid pattern</p>}
        </div>
    )
}
`

console.log('Testing invalid pattern: $if(condition) && otherCondition && jsx')

try {
    const result = compileTSXToUI(invalidTestCode)
    console.log('Result:')
    console.log(result)
} catch (error) {
    console.log('❌ Compilation failed:', error)
}