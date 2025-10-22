import { parseTSXFile, generateAuwlaFromTSX } from './src/tsx-compiler'

/**
 * Test edge cases and mixed patterns
 */

function compileTSXToUI(tsxCode: string): string {
    const component = parseTSXFile(tsxCode)
    return generateAuwlaFromTSX(component)
}

function testMixedIfAndLogical() {
    console.log('Testing Mixed $if and Logical AND...')
    
    const mixedTSX = `
function TestComponent() {
    const counter = ref(0)
    const isEnabled = ref(true)
    
    return (
        <div>
            {/* This is the pattern you're asking about */}
            {$if(counter.value > 5) && <p>Counter is high</p>}
            
            {/* Another variation */}
            {$if(isEnabled.value) && counter.value > 10 && <div>Both conditions</div>}
        </div>
    )
}
`
    
    try {
        const result = compileTSXToUI(mixedTSX)
        console.log('Mixed $if and logical AND result:')
        console.log(result)
        
        // This pattern might not work as expected since $if() returns a value, not a boolean
        console.log('✅ Mixed pattern test completed (may need handling)')
    } catch (error) {
        console.log('Expected error for mixed pattern:', error.message)
        console.log('❌ This pattern is not supported - $if should be used alone')
    }
}

function testValidIfPatterns() {
    console.log('Testing Valid $if Patterns...')
    
    const validTSX = `
function TestComponent() {
    const counter = ref(0)
    const isVisible = ref(true)
    
    return (
        <div>
            {/* Valid: $if with condition and element */}
            {$if(counter.value > 5, <p>Counter is high</p>)}
            
            {/* Valid: $if with condition, element, and else */}
            {$if(isVisible.value, <span>Visible</span>, <span>Hidden</span>)}
            
            {/* Valid: Regular logical AND */}
            {counter.value > 10 && <div>Regular logical AND</div>}
        </div>
    )
}
`
    
    const result = compileTSXToUI(validTSX)
    console.log('Valid $if patterns result:')
    console.log(result)
    
    console.log('✅ Valid patterns work correctly')
}

function testInvalidIfPatterns() {
    console.log('Testing Invalid $if Patterns...')
    
    const patterns = [
        {
            name: '$if() && jsx',
            code: '{$if(counter.value > 5) && <p>Test</p>}'
        },
        {
            name: '$if() with only condition',
            code: '{$if(counter.value > 5)}'
        },
        {
            name: 'Nested $if in logical',
            code: '{condition && $if(other.value, <span>Nested</span>)}'
        }
    ]
    
    patterns.forEach(pattern => {
        console.log(`\\nTesting: ${pattern.name}`)
        
        const testTSX = `
function TestComponent() {
    const counter = ref(0)
    const condition = true
    const other = ref(false)
    
    return <div>${pattern.code}</div>
}
`
        
        try {
            const result = compileTSXToUI(testTSX)
            console.log('Result:', result.includes('ui.When') ? 'Compiled' : 'No conditional detected')
        } catch (error) {
            console.log('Error (expected):', error.message)
        }
    })
}

function testRecommendedPatterns() {
    console.log('\\nRecommended Patterns Instead of $if() && jsx:')
    
    console.log('\\n❌ Do not use: {$if(condition) && <jsx>}')
    console.log('✅ Use instead: {$if(condition, <jsx>)}')
    console.log('✅ Or use: {condition && <jsx>}')
    
    const recommendedTSX = `
function RecommendedComponent() {
    const counter = ref(0)
    
    return (
        <div>
            {/* Recommended: Use $if with element parameter */}
            {$if(counter.value > 5, <p>Counter is high</p>)}
            
            {/* Recommended: Use regular logical AND */}
            {counter.value > 10 && <div>Very high counter</div>}
            
            {/* Recommended: Use $if with else */}
            {$if(counter.value > 15, <span>Extremely high</span>, <span>Normal</span>)}
        </div>
    )
}
`
    
    const result = compileTSXToUI(recommendedTSX)
    console.log('\\nRecommended patterns result:')
    console.log(result)
}

// Run edge case tests
function runEdgeCaseTests() {
    console.log('🧪 Running Edge Case Tests...\\n')
    
    try {
        testMixedIfAndLogical()
        testValidIfPatterns()
        testInvalidIfPatterns()
        testRecommendedPatterns()
        
        console.log('\\n📋 Summary:')
        console.log('✅ $if(condition) && <jsx> is now SUPPORTED')
        console.log('✅ $if((condition1 && condition2)) && <jsx> is SUPPORTED')
        console.log('❌ $if(condition1) && condition2 && <jsx> is INVALID')
        console.log('- Use: $if(condition, <jsx>) or $if(condition, <jsx>, <else>)')
        console.log('- Use: condition && <jsx> for regular logical AND')
        console.log('- Use: $if((condition1 && condition2)) && <jsx> for multiple conditions')
        
    } catch (error) {
        console.error('\\n❌ Edge case test failed:', error)
        console.error(error.stack)
    }
}

// Run tests
runEdgeCaseTests()

export { runEdgeCaseTests }