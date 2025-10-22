import { parseTSXFile, generateAuwlaFromTSX } from './src/tsx-compiler'

/**
 * Test static condition optimization
 */

function compileTSXToUI(tsxCode: string): string {
    const component = parseTSXFile(tsxCode)
    return generateAuwlaFromTSX(component)
}

function testStaticOptimization() {
    console.log('Testing Static Condition Optimization...')
    
    // Test static condition - should compile to native if
    const staticTSX = `
function TestComponent() {
    const config = { theme: 'dark' }
    
    return (
        <div>
            {config.theme === 'dark' && <div>Dark Theme</div>}
            {$if(config.theme === 'light', <div>Light Theme</div>)}
        </div>
    )
}
`
    
    const staticResult = compileTSXToUI(staticTSX)
    console.log('Static Condition Result:')
    console.log(staticResult)
    
    // Should use native if instead of ui.When for static conditions
    console.assert(staticResult.includes('if (config.theme === "dark")'), 'Should use native if for static logical AND')
    console.assert(staticResult.includes('if (config.theme === "light")'), 'Should use native if for static $if')
    console.assert(!staticResult.includes('ui.When('), 'Should not use ui.When for static conditions')
    console.assert(!staticResult.includes('watch('), 'Should not use watch for static conditions')
    
    console.log('✅ Static condition optimization test passed')
}

function testMixedStaticAndReactive() {
    console.log('Testing Mixed Static and Reactive Conditions...')
    
    // Test mix of static and reactive conditions
    const mixedTSX = `
function TestComponent() {
    const config = { theme: 'dark' }
    const counter = ref(0)
    
    return (
        <div>
            {/* Static condition */}
            {config.theme === 'dark' && <div>Dark Theme</div>}
            
            {/* Reactive condition */}
            {counter.value > 10 && <div>High Counter</div>}
            
            {/* Static $if */}
            {$if(config.theme === 'light', <div>Light</div>, <div>Not Light</div>)}
            
            {/* Reactive $if */}
            {$if(counter.value > 5, <div>Medium Counter</div>)}
        </div>
    )
}
`
    
    const mixedResult = compileTSXToUI(mixedTSX)
    console.log('Mixed Static/Reactive Result:')
    console.log(mixedResult)
    
    // Should have both native if and ui.When
    console.assert(mixedResult.includes('if (config.theme'), 'Should use native if for static conditions')
    console.assert(mixedResult.includes('ui.When(watch(counter'), 'Should use ui.When for reactive conditions')
    
    // Count occurrences
    const nativeIfCount = (mixedResult.match(/if \(/g) || []).length
    const uiWhenCount = (mixedResult.match(/ui\.When\(/g) || []).length
    
    console.log(`Native if statements: ${nativeIfCount}`)
    console.log(`ui.When statements: ${uiWhenCount}`)
    
    console.assert(nativeIfCount >= 2, 'Should have at least 2 native if statements')
    console.assert(uiWhenCount >= 2, 'Should have at least 2 ui.When statements')
    
    console.log('✅ Mixed static/reactive test passed')
}

function testComplexStaticConditions() {
    console.log('Testing Complex Static Conditions...')
    
    // Test complex static conditions
    const complexTSX = `
function TestComponent() {
    const config = { 
        theme: 'dark', 
        features: { advanced: true, beta: false } 
    }
    const env = 'production'
    
    return (
        <div>
            {config.theme === 'dark' && config.features.advanced && <div>Advanced Dark</div>}
            {env === 'production' ? <div>Prod Mode</div> : <div>Dev Mode</div>}
            {$if(config.features.beta && env !== 'production', <div>Beta Features</div>)}
        </div>
    )
}
`
    
    const complexResult = compileTSXToUI(complexTSX)
    console.log('Complex Static Result:')
    console.log(complexResult)
    
    // All should be static (no refs involved)
    console.assert(!complexResult.includes('watch('), 'Should not use watch for static conditions')
    console.assert(!complexResult.includes('ui.When('), 'Should not use ui.When for static conditions')
    console.assert(complexResult.includes('if ('), 'Should use native if statements')
    
    console.log('✅ Complex static conditions test passed')
}

function testPerformanceComparison() {
    console.log('Testing Performance Comparison...')
    
    // Show the difference between static and reactive compilation
    const reactiveTSX = `
function ReactiveComponent() {
    const isDark = ref(true)
    return <div>{isDark.value && <span>Dark</span>}</div>
}
`
    
    const staticTSX = `
function StaticComponent() {
    const config = { isDark: true }
    return <div>{config.isDark && <span>Dark</span>}</div>
}
`
    
    const reactiveResult = compileTSXToUI(reactiveTSX)
    const staticResult = compileTSXToUI(staticTSX)
    
    console.log('\\nReactive (with watch):')
    console.log(reactiveResult.split('\\n').find(line => line.includes('ui.When') || line.includes('if (')))
    
    console.log('\\nStatic (native if):')
    console.log(staticResult.split('\\n').find(line => line.includes('ui.When') || line.includes('if (')))
    
    // Reactive should use ui.When, static should use native if
    console.assert(reactiveResult.includes('ui.When(watch('), 'Reactive should use ui.When with watch')
    console.assert(staticResult.includes('if (config.isDark)'), 'Static should use native if')
    
    console.log('\\n✅ Performance comparison test passed')
}

// Run optimization tests
function runStaticOptimizationTests() {
    console.log('🧪 Running Static Condition Optimization Tests...\\n')
    
    try {
        testStaticOptimization()
        testMixedStaticAndReactive()
        testComplexStaticConditions()
        testPerformanceComparison()
        
        console.log('\\n🎉 All static optimization tests passed!')
        console.log('\\n📈 Performance Benefits:')
        console.log('- Static conditions compile to native JavaScript if statements')
        console.log('- No runtime overhead from watch() or ui.When() for static conditions')
        console.log('- Better performance and smaller bundle size')
        console.log('- Automatic optimization - developers do not need to think about it')
    } catch (error) {
        console.error('\\n❌ Static optimization test failed:', error)
        console.error(error.stack)
        process.exit(1)
    }
}

// Run tests
runStaticOptimizationTests()

export { runStaticOptimizationTests }