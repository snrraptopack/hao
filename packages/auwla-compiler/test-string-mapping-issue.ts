import { parseTSXFile, generateAuwlaFromTSX } from './src/tsx-compiler'

console.log('🧪 Testing string mapping issue...')

function compileTSXToUI(tsxCode: string): string {
    const component = parseTSXFile(tsxCode)
    return generateAuwlaFromTSX(component)
}

// Test case that shows the string mapping issue
const testCode = `
import { ref } from 'auwla'

const counter = ref(0)
const isEnabled = ref(true)

export default function TestComponent() {
    return (
        <div>
            {/* This invalid pattern gets treated as string */}
            {$if(counter.value > 5) && isEnabled.value && <p>This becomes a string</p>}
        </div>
    )
}
`

console.log('Testing invalid $if pattern that becomes string...')

const result = compileTSXToUI(testCode)
console.log('Result:')
console.log(result)

// Check if it contains ui.Text with template string
if (result.includes('ui.Text({ value: `${')) {
    console.log('❌ Issue confirmed: Invalid $if pattern is being treated as string template')
    console.log('The expression is being converted to ui.Text instead of being rejected or handled properly')
} else if (result.includes('ui.When(')) {
    console.log('✅ Pattern was correctly transformed to conditional')
} else {
    console.log('? Unexpected result - pattern was handled differently')
}