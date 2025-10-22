import { parseTSXFile, generateAuwlaFromTSX } from './src/tsx-compiler'

console.log('🧪 Testing main compiler with $if && jsx pattern...')

function compileTSXToUI(tsxCode: string): string {
    const component = parseTSXFile(tsxCode)
    return generateAuwlaFromTSX(component)
}

const testCode = `
import { ref } from 'auwla'

const counter = ref(0)
const isEnabled = ref(true)

export default function TestComponent() {
    return (
        <div>
            {/* ✅ Correct: Single condition */}
            {$if(counter.value > 5) && <p>Counter is high</p>}
            
            {/* ✅ Correct: Multiple conditions grouped in parentheses */}
            {$if((isEnabled.value && counter.value > 10)) && <div>Both conditions</div>}
            
            {/* ✅ Alternative: Using $if helper syntax */}
            {$if(counter.value > 15, <span>Very high</span>)}
        </div>
    )
}
`

try {
    const result = compileTSXToUI(testCode)
    console.log('✅ Compilation successful!')
    console.log('Result:')
    console.log(result)
    
    // Check if the result contains the expected patterns
    if (result.includes('ui.When(')) {
        console.log('✅ Contains ui.When() - using reactive conditionals')
    } else if (result.includes('if (watch(')) {
        console.log('✅ Contains if (watch()) - using reactive if statements')
    } else {
        console.log('❌ No reactive conditional patterns found')
    }
    
} catch (error) {
    console.log('❌ Compilation failed:', error)
}