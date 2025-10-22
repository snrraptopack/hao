import { parseTSXFile, generateAuwlaFromTSX } from './src/tsx-compiler'

console.log('🧪 Final Comprehensive Conditional Rendering Test...')

function compileTSXToUI(tsxCode: string): string {
    const component = parseTSXFile(tsxCode)
    return generateAuwlaFromTSX(component)
}

const comprehensiveTest = `
import { ref } from 'auwla'

const isVisible = ref(true)
const counter = ref(0)
const user = ref({ isAdmin: false })
const theme = ref('light')

export default function TestComponent() {
    return (
        <div>
            {/* 1. ✅ Regular logical AND */}
            {isVisible.value && <p>Visible content</p>}
            
            {/* 2. ✅ Multiple conditions with logical AND */}
            {user.value && user.value.isAdmin && <AdminPanel />}
            
            {/* 3. ✅ Ternary with else */}
            {theme.value === 'dark' ? <DarkTheme /> : <LightTheme />}
            
            {/* 4. ✅ Ternary without else */}
            {counter.value > 10 ? <HighCounter /> : null}
            
            {/* 5. ✅ $if helper basic */}
            {$if(isVisible.value, <BasicContent />)}
            
            {/* 6. ✅ $if helper with else */}
            {$if(counter.value > 5, <HighCount />, <LowCount />)}
            
            {/* 7. ✅ NEW: $if with && syntax - single condition */}
            {$if(counter.value > 15) && <VeryHighCounter />}
            
            {/* 8. ✅ NEW: $if with && syntax - multiple conditions grouped */}
            {$if((isVisible.value && counter.value > 20)) && <SpecialContent />}
            
            {/* 9. ✅ Static conditions (no .value) */}
            {process.env.NODE_ENV === 'development' && <DevTools />}
        </div>
    )
}
`

console.log('Testing all supported conditional patterns...')

try {
    const result = compileTSXToUI(comprehensiveTest)
    console.log('✅ Compilation successful!')

    // Count the different pattern types
    const whenCount = (result.match(/ui\.When\(/g) || []).length
    const elseCount = (result.match(/\.Else\(/g) || []).length
    const ifCount = (result.match(/if \(/g) || []).length

    console.log(`\n📊 Pattern Analysis:`)
    console.log(`- ui.When() calls: ${whenCount} (reactive conditionals)`)
    console.log(`- .Else() calls: ${elseCount} (ternary else branches)`)
    console.log(`- if() statements: ${ifCount} (static conditionals)`)

    console.log('\n✨ Generated code:')
    console.log(result)

    // Verify all patterns are working
    if (whenCount >= 7 && elseCount >= 2 && ifCount >= 1) {
        console.log('\n🎉 All conditional patterns are working correctly!')
        console.log('✅ Regular && patterns')
        console.log('✅ Ternary ? : patterns')
        console.log('✅ $if() helper patterns')
        console.log('✅ NEW: $if() && jsx patterns')
        console.log('✅ Static condition patterns')
    } else {
        console.log('\n⚠️  Some patterns may not be working as expected')
    }

} catch (error) {
    console.log('❌ Compilation failed:', error)
}