import { parse } from '@babel/parser'
import * as t from '@babel/types'
import {
    detectConditionalExpression,
    analyzeDependencies,
    analyzeDependenciesWithScope,
    generateWatchExpression,
    generateWhenCall,
    generateEnhancedWatchExpression,
    generateConditionalUICode,
    type ConditionalExpression
} from './src/conditional-detector'

/**
 * Test suite for conditional expression detection utilities
 */

function parseJSXExpression(code: string): t.JSXExpressionContainer {
    // Parse as a JSX element containing the expression
    const jsxCode = `<div>${code}</div>`
    const ast = parse(jsxCode, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
    })

    // Navigate to the JSX expression
    const program = ast.program
    const statement = program.body[0] as t.ExpressionStatement
    const jsxElement = statement.expression as t.JSXElement
    const child = jsxElement.children[0] as t.JSXExpressionContainer

    return child
}

function testLogicalAndDetection() {
    console.log('Testing Logical AND Detection...')

    // Test reactive logical AND
    const expr1 = parseJSXExpression('{counter.value > 10 && <div>High</div>}')
    const result1 = detectConditionalExpression(expr1)

    console.assert(result1?.type === 'logical', 'Should detect logical type')
    console.assert(result1?.isReactive === true, 'Should be reactive')
    console.assert(result1?.dependencies.includes('counter'), 'Should detect counter dependency')
    console.assert(result1?.thenElement !== null, 'Should have then element')
    console.assert(result1?.elseElement === null, 'Should not have else element')

    // Test static logical AND
    const expr2 = parseJSXExpression('{true && <div>Always</div>}')
    const result2 = detectConditionalExpression(expr2)

    console.assert(result2?.type === 'logical', 'Should detect logical type')
    console.assert(result2?.isReactive === false, 'Should not be reactive')
    console.assert(result2?.dependencies.length === 0, 'Should have no dependencies')

    console.log('✅ Logical AND detection tests passed')
}

function testTernaryDetection() {
    console.log('Testing Ternary Detection...')

    // Test reactive ternary with both elements
    const expr1 = parseJSXExpression('{isVisible.value ? <div>Visible</div> : <div>Hidden</div>}')
    const result1 = detectConditionalExpression(expr1)

    console.assert(result1?.type === 'ternary', 'Should detect ternary type')
    console.assert(result1?.isReactive === true, 'Should be reactive')
    console.assert(result1?.dependencies.includes('isVisible'), 'Should detect isVisible dependency')
    console.assert(result1?.thenElement !== null, 'Should have then element')
    console.assert(result1?.elseElement !== null, 'Should have else element')

    // Test reactive ternary with null else
    const expr2 = parseJSXExpression('{showContent.value ? <div>Content</div> : null}')
    const result2 = detectConditionalExpression(expr2)

    console.assert(result2?.type === 'ternary', 'Should detect ternary type')
    console.assert(result2?.isReactive === true, 'Should be reactive')
    console.assert(result2?.thenElement !== null, 'Should have then element')
    console.assert(result2?.elseElement === null, 'Should not have else element (null)')

    console.log('✅ Ternary detection tests passed')
}

function testIfHelperDetection() {
    console.log('Testing $if Helper Detection...')

    // Test $if with two arguments
    const expr1 = parseJSXExpression('{$if(condition.value, <div>Content</div>)}')
    const result1 = detectConditionalExpression(expr1)

    console.assert(result1?.type === 'if-helper', 'Should detect if-helper type')
    console.assert(result1?.isReactive === true, 'Should be reactive')
    console.assert(result1?.dependencies.includes('condition'), 'Should detect condition dependency')
    console.assert(result1?.thenElement !== null, 'Should have then element')
    console.assert(result1?.elseElement === null, 'Should not have else element')

    // Test $if with three arguments
    const expr2 = parseJSXExpression('{$if(flag.value, <div>True</div>, <div>False</div>)}')
    const result2 = detectConditionalExpression(expr2)

    console.assert(result2?.type === 'if-helper', 'Should detect if-helper type')
    console.assert(result2?.isReactive === true, 'Should be reactive')
    console.assert(result2?.thenElement !== null, 'Should have then element')
    console.assert(result2?.elseElement !== null, 'Should have else element')

    console.log('✅ $if helper detection tests passed')
}

function testDependencyAnalysis() {
    console.log('Testing Dependency Analysis...')

    // Test single dependency with ref pattern
    const analysis1 = analyzeDependencies('counter.value > 10')
    console.assert(analysis1.dependencies.length === 1, 'Should have one dependency')
    console.assert(analysis1.dependencies[0] === 'counter', 'Should detect counter')
    console.assert(analysis1.watchPattern === 'single', 'Should use single pattern')
    console.assert(analysis1.isReactive === true, 'Should be reactive')

    // Test multiple dependencies with ref patterns
    const analysis2 = analyzeDependencies('isVisible.value && hasData.value')
    console.assert(analysis2.dependencies.length === 2, 'Should have two dependencies')
    console.assert(analysis2.dependencies.includes('isVisible'), 'Should detect isVisible')
    console.assert(analysis2.dependencies.includes('hasData'), 'Should detect hasData')
    console.assert(analysis2.watchPattern === 'multiple', 'Should use multiple pattern')
    console.assert(analysis2.isReactive === true, 'Should be reactive')

    // Test no dependencies (static)
    const analysis3 = analyzeDependencies('true')
    console.assert(analysis3.dependencies.length === 0, 'Should have no dependencies')
    console.assert(analysis3.isReactive === false, 'Should not be reactive')

    // Test complex expression with ref pattern
    const analysis4 = analyzeDependencies('currentUser.value && currentUser.value.name === "admin"')
    console.assert(analysis4.dependencies.length === 1, 'Should deduplicate dependencies')
    console.assert(analysis4.dependencies[0] === 'currentUser', 'Should detect currentUser')

    // Test non-ref .value usage (should be filtered out)
    const analysis5 = analyzeDependencies('config.value.theme === "dark"')
    console.assert(analysis5.isReactive === false, 'Should not be reactive for non-ref patterns')
    console.assert(analysis5.dependencies.length === 0, 'Should have no dependencies for non-ref')

    // Test with scope context
    const scope = ['const counter = ref(0)', 'const config = { value: { theme: "dark" } }']
    const analysis6 = analyzeDependenciesWithScope('counter.value > 10', scope)
    console.assert(analysis6.isReactive === true, 'Should be reactive when ref is in scope')
    console.assert(analysis6.dependencies.includes('counter'), 'Should detect counter from scope')

    const analysis7 = analyzeDependenciesWithScope('config.value.theme === "dark"', scope)
    console.assert(analysis7.isReactive === false, 'Should not be reactive for non-ref in scope')

    console.log('✅ Dependency analysis tests passed')
}

function testWatchExpressionGeneration() {
    console.log('Testing Watch Expression Generation...')

    // Test single dependency
    const analysis1 = analyzeDependencies('counter.value > 10')
    const watch1 = generateWatchExpression(analysis1)
    const expected1 = 'watch(counter, () => counter.value > 10) as Ref<boolean>'
    console.assert(watch1 === expected1, `Expected: ${expected1}, Got: ${watch1}`)

    // Test multiple dependencies
    const analysis2 = analyzeDependencies('a.value && b.value')
    const watch2 = generateWatchExpression(analysis2)
    const expected2 = 'watch([a, b], () => a.value && b.value) as Ref<boolean>'
    console.assert(watch2 === expected2, `Expected: ${expected2}, Got: ${watch2}`)

    // Test static expression
    const analysis3 = analyzeDependencies('true')
    const watch3 = generateWatchExpression(analysis3)
    console.assert(watch3 === 'true', 'Static expression should remain unchanged')

    console.log('✅ Watch expression generation tests passed')
}

function testWhenCallGeneration() {
    console.log('Testing ui.When Call Generation...')

    const conditional: ConditionalExpression = {
        type: 'logical',
        condition: 'counter.value > 10',
        thenElement: null, // We don't need the actual JSX element for this test
        elseElement: null,
        isReactive: true,
        dependencies: ['counter']
    }

    const thenBuilder = '        ui.P({ text: "Counter is high" })'
    const result = generateWhenCall(conditional, thenBuilder)

    const expected = `ui.When(watch(counter, () => counter.value > 10) as Ref<boolean>, (ui: LayoutBuilder) => {
${thenBuilder}
      })`

    console.assert(result === expected, `Expected: ${expected}, Got: ${result}`)

    // Test with else clause
    const elseBuilder = '        ui.P({ text: "Counter is low" })'
    const resultWithElse = generateWhenCall(conditional, thenBuilder, elseBuilder)

    const expectedWithElse = `ui.When(watch(counter, () => counter.value > 10) as Ref<boolean>, (ui: LayoutBuilder) => {
${thenBuilder}
      }).Else((ui: LayoutBuilder) => {
${elseBuilder}
      })`

    console.assert(resultWithElse === expectedWithElse, 'Should generate correct else clause')

    console.log('✅ ui.When call generation tests passed')
}

function testComplexScenarios() {
    console.log('Testing Complex Scenarios...')

    // Test complex condition with multiple refs
    const expr1 = parseJSXExpression('{user.value && user.value.isAdmin && posts.value.length > 0 && <div>Admin Panel</div>}')
    const result1 = detectConditionalExpression(expr1)

    console.assert(result1?.isReactive === true, 'Should be reactive')
    console.assert(result1?.dependencies.includes('user'), 'Should detect user dependency')
    console.assert(result1?.dependencies.includes('posts'), 'Should detect posts dependency')
    console.assert(result1?.dependencies.length === 2, 'Should have exactly 2 unique dependencies')

    // Test nested property access
    const analysis = analyzeDependencies('config.value.theme === "dark" && settings.value.enabled')
    console.assert(analysis.dependencies.includes('config'), 'Should detect config')
    console.assert(analysis.dependencies.includes('settings'), 'Should detect settings')
    console.assert(analysis.watchPattern === 'multiple', 'Should use multiple pattern')

    console.log('✅ Complex scenarios tests passed')
}

function testRefVsNonRefDetection() {
    console.log('Testing Ref vs Non-Ref Detection...')

    // Test with scope context that clearly defines refs vs non-refs
    const scope = [
        'const counter = ref(0)',
        'const isVisible = ref(true)',
        'const config = { value: { theme: "dark" } }',
        'const apiResponse = { value: "success", data: [] }'
    ]

    // Should detect actual refs
    const refAnalysis = analyzeDependenciesWithScope('counter.value > 10 && isVisible.value', scope)
    console.assert(refAnalysis.isReactive === true, 'Should be reactive for actual refs')
    console.assert(refAnalysis.dependencies.includes('counter'), 'Should detect counter ref')
    console.assert(refAnalysis.dependencies.includes('isVisible'), 'Should detect isVisible ref')
    console.assert(refAnalysis.dependencies.length === 2, 'Should have 2 ref dependencies')

    // Should NOT detect non-refs
    const nonRefAnalysis = analyzeDependenciesWithScope('config.value.theme === "dark"', scope)
    console.assert(nonRefAnalysis.isReactive === false, 'Should not be reactive for non-refs')
    console.assert(nonRefAnalysis.dependencies.length === 0, 'Should have no dependencies for non-refs')

    // Mixed scenario: one ref, one non-ref
    const mixedAnalysis = analyzeDependenciesWithScope('counter.value > 0 && config.value.theme === "dark"', scope)
    console.assert(mixedAnalysis.isReactive === true, 'Should be reactive when at least one ref present')
    console.assert(mixedAnalysis.dependencies.includes('counter'), 'Should detect the ref')
    console.assert(!mixedAnalysis.dependencies.includes('config'), 'Should not detect the non-ref')
    console.assert(mixedAnalysis.dependencies.length === 1, 'Should have only the ref dependency')

    console.log('✅ Ref vs Non-Ref detection tests passed')
}

function testEnhancedCodeGeneration() {
    console.log('Testing Enhanced Code Generation...')

    // Test with scope context
    const scope = ['const counter = ref(0)', 'const isVisible = ref(true)']

    // Test single dependency with scope
    const conditional1: ConditionalExpression = {
        type: 'logical',
        condition: 'counter.value > 5',
        thenElement: null,
        elseElement: null,
        isReactive: true,
        dependencies: ['counter']
    }

    const result1 = generateWhenCall(conditional1, '        ui.P({ text: "High" })', undefined, scope)
    console.assert(result1.includes('watch(counter, () => counter.value > 5)'), 'Should generate single dependency watch')
    console.assert(result1.includes('as Ref<boolean>'), 'Should include type casting')

    // Test multiple dependencies
    const conditional2: ConditionalExpression = {
        type: 'logical',
        condition: 'counter.value > 5 && isVisible.value',
        thenElement: null,
        elseElement: null,
        isReactive: true,
        dependencies: ['counter', 'isVisible']
    }

    const result2 = generateWhenCall(conditional2, '        ui.P({ text: "Both true" })', undefined, scope)
    console.assert(result2.includes('watch([counter, isVisible]'), 'Should generate multiple dependency watch')
    console.assert(result2.includes('as Ref<boolean>'), 'Should include type casting')

    // Test static condition (should not use watch)
    const conditional3: ConditionalExpression = {
        type: 'logical',
        condition: 'true',
        thenElement: null,
        elseElement: null,
        isReactive: false,
        dependencies: []
    }

    const result3 = generateWhenCall(conditional3, '        ui.P({ text: "Always" })', undefined, scope)
    console.assert(result3.includes('ui.When(true,'), 'Should use static condition without watch')
    console.assert(!result3.includes('watch('), 'Should not include watch for static condition')

    // Test enhanced watch expression generation
    const enhanced1 = generateEnhancedWatchExpression('counter.value > 10', ['counter'])
    console.assert(enhanced1.includes('as Ref<boolean>'), 'Should infer boolean type for comparison')

    const enhanced2 = generateEnhancedWatchExpression('items.value.length', ['items'])
    console.assert(enhanced2.includes('as Ref<number>'), 'Should infer number type for length')

    console.log('✅ Enhanced code generation tests passed')
}

// Run all tests
function runTests() {
    console.log('🧪 Running Conditional Detector Tests...\n')

    try {
        testLogicalAndDetection()
        testTernaryDetection()
        testIfHelperDetection()
        testDependencyAnalysis()
        testWatchExpressionGeneration()
        testWhenCallGeneration()
        testComplexScenarios()
        testRefVsNonRefDetection()
        testEnhancedCodeGeneration()

        console.log('\n🎉 All tests passed!')
    } catch (error) {
        console.error('\n❌ Test failed:', error)
        process.exit(1)
    }
}

// Run tests
runTests()

export { runTests }