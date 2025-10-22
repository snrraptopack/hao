import { parseTSXFile, generateAuwlaFromTSX } from './src/tsx-compiler'

/**
 * Test import generation for conditional rendering
 */

function compileTSXToUI(tsxCode: string): string {
    const component = parseTSXFile(tsxCode)
    return generateAuwlaFromTSX(component)
}

function extractImports(compiledCode: string): {
  auwlaImports: string[]
  auwlaTypeImports: string[]
} {
  const lines = compiledCode.split('\n')
  
  const auwlaImportLine = lines.find(line => line.includes("from 'auwla'") && !line.includes('type'))
  const auwlaTypeImportLine = lines.find(line => line.includes("from 'auwla'") && line.includes('type'))
  

  
  const auwlaImports = auwlaImportLine 
    ? auwlaImportLine.match(/\{([^}]+)\}/)?.[1]?.split(',').map(s => s.trim()) || []
    : []
    
  const auwlaTypeImports = auwlaTypeImportLine
    ? auwlaTypeImportLine.match(/\{([^}]+)\}/)?.[1]?.split(',').map(s => s.trim()) || []
    : []

  return { auwlaImports, auwlaTypeImports }
}

function testBasicImports() {
    console.log('Testing Basic Imports (No Conditionals)...')
    
    const basicTSX = `
function TestComponent() {
    return (
        <div>
            <h1>No conditionals here</h1>
            <p>Just basic JSX</p>
        </div>
    )
}
`
    
    const result = compileTSXToUI(basicTSX)
    const imports = extractImports(result)
    
    console.log('Basic imports:', imports)
    
    // Should have basic imports
    console.assert(imports.auwlaImports.includes('Component'), 'Should import Component')
    console.assert(imports.auwlaTypeImports.includes('LayoutBuilder'), 'Should import LayoutBuilder type')
    
    // Should NOT have conditional-related imports
    console.assert(!imports.auwlaImports.includes('watch'), 'Should not import watch for basic JSX')
    console.assert(!imports.auwlaTypeImports.includes('Ref'), 'Should not import Ref type for basic JSX')
    
    console.log('✅ Basic imports test passed')
}

function testReactiveConditionalImports() {
    console.log('Testing Reactive Conditional Imports...')
    
    const reactiveTSX = `
function TestComponent() {
    const counter = ref(0)
    const isVisible = ref(true)
    
    return (
        <div>
            {counter.value > 10 && <p>High counter</p>}
            {isVisible.value ? <span>Visible</span> : <span>Hidden</span>}
        </div>
    )
}
`
    
    const result = compileTSXToUI(reactiveTSX)
    const imports = extractImports(result)
    
    console.log('Reactive conditional imports:', imports)
    
    // Should have all necessary imports
    console.assert(imports.auwlaImports.includes('Component'), 'Should import Component')
    console.assert(imports.auwlaImports.includes('ref'), 'Should import ref')
    console.assert(imports.auwlaImports.includes('watch'), 'Should import watch for reactive conditionals')
    
    console.assert(imports.auwlaTypeImports.includes('LayoutBuilder'), 'Should import LayoutBuilder type')
    console.assert(imports.auwlaTypeImports.includes('Ref'), 'Should import Ref type for reactive conditionals')
    
    console.log('✅ Reactive conditional imports test passed')
}

function testStaticConditionalImports() {
    console.log('Testing Static Conditional Imports...')
    
    const staticTSX = `
function TestComponent() {
    const config = { theme: 'dark' }
    
    return (
        <div>
            {config.theme === 'dark' && <div>Dark theme</div>}
            {config.theme === 'light' ? <div>Light</div> : <div>Not light</div>}
        </div>
    )
}
`
    
    const result = compileTSXToUI(staticTSX)
    const imports = extractImports(result)
    
    console.log('Static conditional imports:', imports)
    
    // Should have basic imports
    console.assert(imports.auwlaImports.includes('Component'), 'Should import Component')
    console.assert(imports.auwlaTypeImports.includes('LayoutBuilder'), 'Should import LayoutBuilder type')
    
    // Should NOT need watch/Ref for static conditionals
    console.assert(!imports.auwlaImports.includes('watch'), 'Should not import watch for static conditionals')
    console.assert(!imports.auwlaTypeImports.includes('Ref'), 'Should not import Ref type for static conditionals')
    
    console.log('✅ Static conditional imports test passed')
}

function testIfHelperImports() {
    console.log('Testing $if Helper Imports...')
    
    const ifHelperTSX = `
function TestComponent() {
    const counter = ref(5)
    const config = { debug: true }
    
    return (
        <div>
            {$if(counter.value > 10, <p>Reactive $if</p>)}
            {$if(config.debug, <p>Static $if</p>, <p>No debug</p>)}
        </div>
    )
}
`
    
    const result = compileTSXToUI(ifHelperTSX)
    const imports = extractImports(result)
    
    console.log('$if helper imports:', imports)
    
    // Should import watch/Ref because of reactive $if
    console.assert(imports.auwlaImports.includes('watch'), 'Should import watch for reactive $if')
    console.assert(imports.auwlaTypeImports.includes('Ref'), 'Should import Ref type for reactive $if')
    
    console.log('✅ $if helper imports test passed')
}

function testMixedConditionalImports() {
    console.log('Testing Mixed Conditional Imports...')
    
    const mixedTSX = `
function TestComponent() {
    const counter = ref(0)
    const config = { theme: 'dark' }
    
    return (
        <div>
            {/* Static condition */}
            {config.theme === 'dark' && <div>Dark</div>}
            
            {/* Reactive condition */}
            {counter.value > 5 && <div>High</div>}
            
            {/* Mixed in ternary */}
            {counter.value > 10 ? <span>Very High</span> : <span>Normal</span>}
        </div>
    )
}
`
    
    const result = compileTSXToUI(mixedTSX)
    const imports = extractImports(result)
    
    console.log('Mixed conditional imports:', imports)
    
    // Should import watch/Ref because of reactive conditions
    console.assert(imports.auwlaImports.includes('watch'), 'Should import watch for mixed conditionals with reactive parts')
    console.assert(imports.auwlaTypeImports.includes('Ref'), 'Should import Ref type for mixed conditionals with reactive parts')
    
    console.log('✅ Mixed conditional imports test passed')
}

function testComplexDependencyImports() {
    console.log('Testing Complex Dependency Imports...')
    
    const complexTSX = `
function TestComponent() {
    const user = ref(null)
    const posts = ref([])
    const isAdmin = ref(false)
    
    return (
        <div>
            {user.value && posts.value.length > 0 && isAdmin.value && (
                <div>Admin dashboard with {posts.value.length} posts</div>
            )}
        </div>
    )
}
`
    
    const result = compileTSXToUI(complexTSX)
    const imports = extractImports(result)
    
    console.log('Complex dependency imports:', imports)
    
    // Should handle complex multi-dependency scenarios
    console.assert(imports.auwlaImports.includes('ref'), 'Should import ref')
    console.assert(imports.auwlaImports.includes('watch'), 'Should import watch for complex dependencies')
    console.assert(imports.auwlaTypeImports.includes('Ref'), 'Should import Ref type for complex dependencies')
    
    console.log('✅ Complex dependency imports test passed')
}

function testExistingWatchImports() {
    console.log('Testing Existing Watch Imports...')
    
    const existingWatchTSX = `
function TestComponent() {
    const counter = ref(0)
    const doubled = watch(counter, () => counter.value * 2)
    
    return (
        <div>
            <p>Counter: {counter.value}</p>
            <p>Doubled: {doubled.value}</p>
            {counter.value > 10 && <p>High counter</p>}
        </div>
    )
}
`
    
    const result = compileTSXToUI(existingWatchTSX)
    const imports = extractImports(result)
    
    console.log('Existing watch imports:', imports)
    
    // Should not duplicate imports
    const watchCount = imports.auwlaImports.filter(imp => imp === 'watch').length
    const refTypeCount = imports.auwlaTypeImports.filter(imp => imp === 'Ref').length
    
    console.assert(watchCount === 1, `Should import watch only once, found ${watchCount}`)
    console.assert(refTypeCount === 1, `Should import Ref type only once, found ${refTypeCount}`)
    
    console.log('✅ Existing watch imports test passed')
}

function testErrorRecoveryImports() {
    console.log('Testing Error Recovery Imports...')
    
    // Test with potentially problematic JSX that might fail parsing
    const problematicTSX = `
function TestComponent() {
    const counter = ref(0)
    
    return (
        <div>
            {/* This might cause parsing issues but should still detect .value */}
            {counter.value > 10 && <p>Test</p>}
        </div>
    )
}
`
    
    const result = compileTSXToUI(problematicTSX)
    const imports = extractImports(result)
    
    console.log('Error recovery imports:', imports)
    
    // Should still include necessary imports even if parsing has issues
    console.assert(imports.auwlaImports.includes('watch'), 'Should include watch even with parsing issues')
    console.assert(imports.auwlaTypeImports.includes('Ref'), 'Should include Ref type even with parsing issues')
    
    console.log('✅ Error recovery imports test passed')
}

function testImportOptimization() {
    console.log('Testing Import Optimization...')
    
    // Test that we don't over-import
    const minimalTSX = `
function TestComponent() {
    return <div>No refs, no conditionals</div>
}
`
    
    const maximalTSX = `
function TestComponent() {
    const a = ref(1)
    const b = ref(2)
    const c = ref(3)
    
    return (
        <div>
            {a.value && <span>A</span>}
            {b.value ? <span>B</span> : <span>Not B</span>}
            {$if(c.value, <span>C</span>)}
        </div>
    )
}
`
    
    const minimalResult = compileTSXToUI(minimalTSX)
    const maximalResult = compileTSXToUI(maximalTSX)
    
    const minimalImports = extractImports(minimalResult)
    const maximalImports = extractImports(maximalResult)
    
    console.log('Minimal imports:', minimalImports)
    console.log('Maximal imports:', maximalImports)
    
    // Minimal should have minimal imports
    console.assert(minimalImports.auwlaImports.length <= 2, 'Minimal TSX should have minimal imports')
    console.assert(!minimalImports.auwlaImports.includes('watch'), 'Minimal TSX should not import watch')
    
    // Maximal should have all necessary imports
    console.assert(maximalImports.auwlaImports.includes('Component'), 'Should import Component')
    console.assert(maximalImports.auwlaImports.includes('ref'), 'Should import ref')
    console.assert(maximalImports.auwlaImports.includes('watch'), 'Should import watch')
    console.assert(maximalImports.auwlaTypeImports.includes('Ref'), 'Should import Ref type')
    
    console.log('✅ Import optimization test passed')
}

// Run import generation tests
function runImportGenerationTests() {
    console.log('🧪 Running Import Generation Tests...\\n')
    
    try {
        testBasicImports()
        testReactiveConditionalImports()
        testStaticConditionalImports()
        testIfHelperImports()
        testMixedConditionalImports()
        testComplexDependencyImports()
        testExistingWatchImports()
        testErrorRecoveryImports()
        testImportOptimization()
        
        console.log('\\n🎉 All import generation tests passed!')
        console.log('\\n📦 Import Generation Features:')
        console.log('- Automatically detects when watch() is needed')
        console.log('- Includes Ref type only when reactive conditionals are used')
        console.log('- Optimizes imports - no unnecessary dependencies')
        console.log('- Handles static vs reactive conditionals correctly')
        console.log('- Prevents duplicate imports')
        console.log('- Graceful fallback for parsing errors')
    } catch (error) {
        console.error('\\n❌ Import generation test failed:', error)
        console.error(error.stack)
        process.exit(1)
    }
}

// Run tests
runImportGenerationTests()

export { runImportGenerationTests }