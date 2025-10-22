import { parseTSXFile, generateAuwlaFromTSX } from './src/tsx-compiler'

console.log('🧪 Testing pattern validation (valid vs invalid)...')

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
            <h1>Valid Patterns:</h1>
            
            {/* ✅ Valid: Single condition */}
            {$if(counter.value > 5) && <p>Valid single condition</p>}
            
            {/* ✅ Valid: Multiple conditions grouped */}
            {$if((isEnabled.value && counter.value > 10)) && <div>Valid grouped conditions</div>}
            
            <h1>Invalid Patterns:</h1>
            
            {/* ❌ Invalid: Multiple conditions outside $if */}
            {$if(counter.value > 5) && isEnabled.value && <p>Invalid pattern 1</p>}
            
            {/* ❌ Invalid: Complex chain */}
            {$if(counter.value > 0) && isEnabled.value && counter.value < 100 && <div>Invalid pattern 2</div>}
            
            <h1>Regular Patterns (should still work):</h1>
            
            {/* ✅ Regular logical AND */}
            {counter.value > 15 && <span>Regular AND works</span>}
            
            {/* ✅ Regular $if helper */}
            {$if(counter.value > 20, <span>Helper works</span>)}
        </div>
    )
}
`

console.log('Testing mixed valid and invalid patterns...')

const result = compileTSXToUI(testCode)
console.log('\nResult:')
console.log(result)

// Analyze the result
const whenCount = (result.match(/ui\.When\(/g) || []).length
const textCount = (result.match(/ui\.Text\(/g) || []).length
const h1Count = (result.match(/ui\.H1\(/g) || []).length

console.log(`\n📊 Analysis:`)
console.log(`- ui.When() calls: ${whenCount} (should be 4: 2 valid $if&&, 1 regular &&, 1 $if helper)`)
console.log(`- ui.H1() calls: ${h1Count} (should be 3: the headers)`)
console.log(`- ui.Text() calls: ${textCount} (should be 0: no invalid patterns converted to text)`)

if (whenCount === 4 && textCount === 0) {
    console.log('\n✅ Perfect! Valid patterns work, invalid patterns are properly rejected')
} else {
    console.log('\n⚠️  Something might not be working as expected')
}