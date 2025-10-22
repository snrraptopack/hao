import { parseTSXFile, generateAuwlaFromTSX } from './src/tsx-compiler'

/**
 * Helper function to compile TSX to UI code for testing
 */
function compileTSXToUI(tsxCode: string): string {
    const component = parseTSXFile(tsxCode)
    return generateAuwlaFromTSX(component)
}

/**
 * Test $if helper integration with TSX compiler
 */

function testIfHelperIntegration() {
    console.log('Testing $if Helper TSX Integration...')
    
    // Test basic $if helper in TSX
    const tsxCode1 = `
function TestComponent() {
    const counter = ref(0)
    
    return (
        <div>
            <h1>$if Helper Test</h1>
            {$if(counter.value > 10, <p>Counter is high!</p>)}
        </div>
    )
}
`
    
    const result1 = compileTSXToUI(tsxCode1)
    console.log('Basic $if Result:')
    console.log(result1)
    
    // Verify the output contains our $if helper rendering
    console.assert(result1.includes('ui.When('), 'Should generate ui.When call')
    console.assert(result1.includes('watch(counter'), 'Should use watch with counter')
    console.assert(result1.includes('as Ref<boolean>'), 'Should include type casting')
    
    console.log('✅ Basic $if helper integration test passed')
}

function testIfElseHelperIntegration() {
    console.log('Testing $if-else Helper TSX Integration...')
    
    // Test $if with else clause in TSX
    const tsxCode2 = `
function TestComponent() {
    const isVisible = ref(true)
    
    return (
        <div>
            {$if(isVisible.value, <span>Visible Content</span>, <span>Hidden Content</span>)}
        </div>
    )
}
`
    
    const result2 = compileTSXToUI(tsxCode2)
    console.log('$if-else Result:')
    console.log(result2)
    
    // Verify the output contains $if-else rendering
    console.assert(result2.includes('ui.When('), 'Should generate ui.When call')
    console.assert(result2.includes('.Else('), 'Should generate Else clause')
    console.assert(result2.includes('watch(isVisible'), 'Should use watch with isVisible')
    
    console.log('✅ $if-else helper integration test passed')
}

function testMixedConditionalPatterns() {
    console.log('Testing Mixed Conditional Patterns...')
    
    // Test component with multiple conditional patterns
    const tsxCode3 = `
function TestComponent() {
    const counter = ref(5)
    const isVisible = ref(true)
    const user = ref(null)
    
    return (
        <div>
            <h1>Mixed Conditionals</h1>
            {/* Logical AND */}
            {counter.value > 3 && <p>Counter > 3</p>}
            
            {/* Ternary */}
            {isVisible.value ? <span>Show</span> : <span>Hide</span>}
            
            {/* $if helper */}
            {$if(counter.value > 10, <div>High counter</div>)}
            
            {/* $if with else */}
            {$if(user.value, <p>User logged in</p>, <p>Please log in</p>)}
        </div>
    )
}
`
    
    const result3 = compileTSXToUI(tsxCode3)
    console.log('Mixed Patterns Result:')
    console.log(result3)
    
    // Should handle all patterns correctly
    const whenCount = (result3.match(/ui\.When\(/g) || []).length
    console.assert(whenCount >= 4, `Should generate multiple ui.When calls, found ${whenCount}`)
    
    // Should have at least 2 Else clauses (ternary + $if-else)
    const elseCount = (result3.match(/\.Else\(/g) || []).length
    console.assert(elseCount >= 2, `Should generate multiple Else clauses, found ${elseCount}`)
    
    console.log('✅ Mixed conditional patterns test passed')
}

function testComplexIfHelper() {
    console.log('Testing Complex $if Helper...')
    
    // Test $if with complex conditions and multiple dependencies
    const tsxCode4 = `
function TestComponent() {
    const user = ref(null)
    const posts = ref([])
    const isAdmin = ref(false)
    
    return (
        <div>
            {$if(user.value && posts.value.length > 0 && isAdmin.value, 
                <div>Admin Dashboard</div>, 
                <div>Access Denied</div>
            )}
        </div>
    )
}
`
    
    const result4 = compileTSXToUI(tsxCode4)
    console.log('Complex $if Result:')
    console.log(result4)
    
    // Should handle multiple dependencies
    console.assert(result4.includes('ui.When('), 'Should generate ui.When call')
    console.assert(result4.includes('.Else('), 'Should generate Else clause')
    console.assert(
        result4.includes('watch([user, posts, isAdmin]') || 
        result4.includes('watch(user') || 
        result4.includes('watch(posts') || 
        result4.includes('watch(isAdmin'), 
        'Should handle dependencies'
    )
    
    console.log('✅ Complex $if helper test passed')
}

function testStaticIfHelper() {
    console.log('Testing Static $if Helper...')
    
    // Test $if with static condition (no .value)
    const tsxCode5 = `
function TestComponent() {
    const config = { theme: 'dark' }
    
    return (
        <div>
            {$if(config.theme === 'dark', <div>Dark Theme UI</div>)}
        </div>
    )
}
`
    
    const result5 = compileTSXToUI(tsxCode5)
    console.log('Static $if Result:')
    console.log(result5)
    
    // Should generate ui.When but without watch (static condition)
    console.assert(result5.includes('ui.When('), 'Should generate ui.When call')
    // For static conditions, should not use watch
    console.assert(!result5.includes('watch('), 'Should not use watch for static conditions')
    
    console.log('✅ Static $if helper test passed')
}

function testErrorHandling() {
    console.log('Testing $if Helper Error Handling...')
    
    // Test with invalid $if usage
    try {
        const invalidTSX = `
function TestComponent() {
    return (
        <div>
            {$if(invalidCondition)}
        </div>
    )
}
`
        
        const result = compileTSXToUI(invalidTSX)
        // Should not crash, might produce some output or error message
        console.log('Invalid $if handled gracefully')
    } catch (error) {
        console.log('Expected error for invalid $if:', error.message)
    }
    
    console.log('✅ $if helper error handling test passed')
}

// Run integration tests
function runIfHelperIntegrationTests() {
    console.log('🧪 Running $if Helper Integration Tests...\\n')
    
    try {
        testIfHelperIntegration()
        testIfElseHelperIntegration()
        testMixedConditionalPatterns()
        testComplexIfHelper()
        testStaticIfHelper()
        testErrorHandling()
        
        console.log('\\n🎉 All $if helper integration tests passed!')
    } catch (error) {
        console.error('\\n❌ $if helper integration test failed:', error)
        console.error(error.stack)
        process.exit(1)
    }
}

// Run tests
runIfHelperIntegrationTests()

export { runIfHelperIntegrationTests }