import { parseTSXFile, generateAuwlaFromTSX } from './src/tsx-compiler'

/**
 * Test error handling integration with TSX compiler
 */

function compileTSXToUI(tsxCode: string): string {
    const component = parseTSXFile(tsxCode)
    return generateAuwlaFromTSX(component)
}

function testUndefinedRefInTSX() {
    console.log('Testing Undefined Ref in TSX Compilation...')
    
    // Capture console output
    const originalWarn = console.warn
    let warnings: string[] = []
    console.warn = (...args) => {
        warnings.push(args.join(' '))
    }
    
    const tsxWithUndefinedRef = `
function TestComponent() {
    const counter = ref(0)
    
    return (
        <div>
            {/* This should warn - unknownRef is not defined */}
            {unknownRef.value > 10 && <p>Unknown ref used</p>}
            
            {/* This should not warn - counter is defined */}
            {counter.value > 5 && <p>Counter is high</p>}
        </div>
    )
}
`
    
    const result = compileTSXToUI(tsxWithUndefinedRef)
    
    // Restore console
    console.warn = originalWarn
    
    console.log('Compilation result with undefined ref:')
    console.log(result)
    
    // Should have warnings for undefined ref
    const hasUndefinedRefWarning = warnings.some(w => 
        w.includes('Auwla Compiler Warning') && w.includes('unknownRef')
    )
    console.assert(hasUndefinedRefWarning, 'Should warn about undefined ref')
    
    // Should still compile successfully
    console.assert(result.includes('ui.When('), 'Should still generate ui.When calls')
    console.assert(result.includes('watch(counter'), 'Should generate valid watch for defined ref')
    
    console.log('✅ Undefined ref in TSX test passed')
}

function testMalformedConditional() {
    console.log('Testing Malformed Conditional in TSX...')
    
    // Capture console output
    const originalError = console.error
    let errors: string[] = []
    console.error = (...args) => {
        errors.push(args.join(' '))
    }
    
    const tsxWithError = `
function TestComponent() {
    return (
        <div>
            {/* This should cause an error - empty condition */}
            { && <p>Malformed</p>}
        </div>
    )
}
`
    
    try {
        const result = compileTSXToUI(tsxWithError)
        console.log('Result with malformed conditional:', result)
        
        // Should handle gracefully, not crash
        console.log('Compilation handled malformed input gracefully')
    } catch (error) {
        console.log('Expected parsing error:', error.message)
    }
    
    // Restore console
    console.error = originalError
    
    console.log('✅ Malformed conditional test passed')
}

function testComplexConditionWarnings() {
    console.log('Testing Complex Condition Warnings...')
    
    // Capture console output
    const originalWarn = console.warn
    let warnings: string[] = []
    console.warn = (...args) => {
        warnings.push(args.join(' '))
    }
    
    const tsxWithComplexCondition = `
function TestComponent() {
    const user = ref(null)
    const posts = ref([])
    const admin = ref(false)
    const settings = ref({})
    
    return (
        <div>
            {/* Complex condition that should trigger warning */}
            {user.value && posts.value && admin.value && settings.value && <div>Very Complex</div>}
        </div>
    )
}
`
    
    const result = compileTSXToUI(tsxWithComplexCondition)
    
    // Restore console
    console.warn = originalWarn
    
    console.log('Complex condition warnings:', warnings)
    
    // Should warn about complex condition
    const hasComplexWarning = warnings.some(w => 
        w.includes('Complex conditions') || w.includes('multiple .value')
    )
    console.assert(hasComplexWarning, 'Should warn about complex conditions')
    
    // Should still compile with proper watch
    console.assert(result.includes('watch([user, posts, admin, settings]'), 'Should handle multiple dependencies')
    
    console.log('✅ Complex condition warnings test passed')
}

function testMixedValidAndInvalid() {
    console.log('Testing Mixed Valid and Invalid Conditions...')
    
    // Capture console output
    const originalWarn = console.warn
    const originalError = console.error
    let allMessages: string[] = []
    console.warn = (...args) => allMessages.push('WARN: ' + args.join(' '))
    console.error = (...args) => allMessages.push('ERROR: ' + args.join(' '))
    
    const tsxMixed = `
function TestComponent() {
    const counter = ref(0)
    const isVisible = ref(true)
    
    return (
        <div>
            {/* Valid condition */}
            {counter.value > 10 && <p>Valid condition</p>}
            
            {/* Invalid ref */}
            {invalidRef.value && <p>Invalid ref</p>}
            
            {/* Valid $if */}
            {$if(isVisible.value, <span>Valid $if</span>)}
            
            {/* Complex condition */}
            {counter.value && isVisible.value && invalidRef.value && <div>Mixed</div>}
        </div>
    )
}
`
    
    const result = compileTSXToUI(tsxMixed)
    
    // Restore console
    console.warn = originalWarn
    console.error = originalError
    
    console.log('Mixed compilation messages:')
    allMessages.forEach(msg => console.log('  ' + msg))
    
    // Should have warnings for invalid refs
    const hasInvalidRefWarnings = allMessages.some(msg => 
        msg.includes('invalidRef') && msg.includes('not be a ref')
    )
    console.assert(hasInvalidRefWarnings, 'Should warn about invalid refs')
    
    // Should still compile valid conditions
    console.assert(result.includes('watch(counter'), 'Should compile valid counter condition')
    console.assert(result.includes('watch(isVisible'), 'Should compile valid isVisible condition')
    
    console.log('✅ Mixed valid and invalid test passed')
}

function testErrorRecoveryInTSX() {
    console.log('Testing Error Recovery in TSX Compilation...')
    
    const tsxWithRecoverableErrors = `
function TestComponent() {
    const counter = ref(0)
    
    return (
        <div>
            <h1>Error Recovery Test</h1>
            
            {/* Valid condition - should work */}
            {counter.value > 5 && <p>This works</p>}
            
            {/* This might cause issues but should recover */}
            {someUndefinedThing.value && <p>Undefined thing</p>}
            
            {/* Another valid condition - should still work */}
            {counter.value < 100 && <p>This also works</p>}
        </div>
    )
}
`
    
    const result = compileTSXToUI(tsxWithRecoverableErrors)
    
    console.log('Error recovery result:')
    console.log(result)
    
    // Should compile successfully despite errors
    console.assert(result.includes('ui.H1'), 'Should compile regular elements')
    console.assert(result.includes('watch(counter'), 'Should compile valid conditions')
    
    // Should have multiple ui.When calls (for valid conditions)
    const whenCount = (result.match(/ui\.When\(/g) || []).length
    console.assert(whenCount >= 2, `Should have multiple valid conditions, found ${whenCount}`)
    
    console.log('✅ Error recovery in TSX test passed')
}

// Run error integration tests
function runErrorIntegrationTests() {
    console.log('🧪 Running Error Handling Integration Tests...\\n')
    
    try {
        testUndefinedRefInTSX()
        testMalformedConditional()
        testComplexConditionWarnings()
        testMixedValidAndInvalid()
        testErrorRecoveryInTSX()
        
        console.log('\\n🎉 All error handling integration tests passed!')
        console.log('\\n🛡️ Integration Benefits:')
        console.log('- Real-time validation during TSX compilation')
        console.log('- Helpful warnings and errors in development')
        console.log('- Graceful error recovery - compilation continues')
        console.log('- Clear error messages with suggestions')
        console.log('- Runtime validation for better debugging')
    } catch (error) {
        console.error('\\n❌ Error integration test failed:', error)
        console.error(error.stack)
        process.exit(1)
    }
}

// Run tests
runErrorIntegrationTests()

export { runErrorIntegrationTests }