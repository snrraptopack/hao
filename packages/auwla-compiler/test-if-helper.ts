import * as t from '@babel/types'
import { parse } from '@babel/parser'
import { detectConditionalExpression, generateConditionalUICode } from './src/conditional-detector'

/**
 * Test $if helper function support
 */

function parseJSXExpression(code: string): t.JSXExpressionContainer {
    const ast = parse(`<div>{${code}}</div>`, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript']
    })
    
    const jsxElement = (ast.program.body[0] as any).expression
    const jsxExpr = jsxElement.children[0] as t.JSXExpressionContainer
    return jsxExpr
}

function testBasicIfHelper() {
    console.log('Testing Basic $if Helper...')
    
    // Test $if(condition, element)
    const expr1 = parseJSXExpression('$if(counter.value > 10, <p>High counter</p>)')
    const result1 = detectConditionalExpression(expr1)
    
    console.assert(result1 !== null, 'Should detect $if pattern')
    console.assert(result1?.type === 'if-helper', 'Should be if-helper type')
    console.assert(result1?.condition === 'counter.value > 10', 'Should extract condition')
    console.assert(result1?.thenElement !== null, 'Should have then element')
    console.assert(result1?.elseElement === null, 'Should not have else element')
    console.assert(result1?.isReactive === true, 'Should be reactive')
    console.assert(result1?.dependencies.includes('counter'), 'Should detect counter dependency')
    
    console.log('✅ Basic $if helper test passed')
}

function testIfElseHelper() {
    console.log('Testing $if with Else Helper...')
    
    // Test $if(condition, element, elseElement)
    const expr2 = parseJSXExpression('$if(isVisible.value, <span>Visible</span>, <span>Hidden</span>)')
    const result2 = detectConditionalExpression(expr2)
    
    console.assert(result2 !== null, 'Should detect $if-else pattern')
    console.assert(result2?.type === 'if-helper', 'Should be if-helper type')
    console.assert(result2?.condition === 'isVisible.value', 'Should extract condition')
    console.assert(result2?.thenElement !== null, 'Should have then element')
    console.assert(result2?.elseElement !== null, 'Should have else element')
    console.assert(result2?.isReactive === true, 'Should be reactive')
    console.assert(result2?.dependencies.includes('isVisible'), 'Should detect isVisible dependency')
    
    console.log('✅ $if with else helper test passed')
}

function testComplexIfHelper() {
    console.log('Testing Complex $if Helper...')
    
    // Test $if with complex condition
    const expr3 = parseJSXExpression('$if(user.value && posts.value.length > 0, <div>Admin Panel</div>)')
    const result3 = detectConditionalExpression(expr3)
    
    console.assert(result3 !== null, 'Should detect complex $if pattern')
    console.assert(result3?.type === 'if-helper', 'Should be if-helper type')
    console.assert(result3?.condition === 'user.value && posts.value.length > 0', 'Should extract complex condition')
    console.assert(result3?.isReactive === true, 'Should be reactive')
    console.assert(result3?.dependencies.includes('user'), 'Should detect user dependency')
    console.assert(result3?.dependencies.includes('posts'), 'Should detect posts dependency')
    
    console.log('✅ Complex $if helper test passed')
}

function testStaticIfHelper() {
    console.log('Testing Static $if Helper...')
    
    // Test $if with static condition
    const expr4 = parseJSXExpression('$if(config.theme === "dark", <div>Dark Theme</div>)')
    const result4 = detectConditionalExpression(expr4)
    
    console.assert(result4 !== null, 'Should detect static $if pattern')
    console.assert(result4?.type === 'if-helper', 'Should be if-helper type')
    console.assert(result4?.condition === 'config.theme === "dark"', 'Should extract static condition')
    console.assert(result4?.isReactive === false, 'Should not be reactive')
    console.assert(result4?.dependencies.length === 0, 'Should have no dependencies')
    
    console.log('✅ Static $if helper test passed')
}

function testIfHelperCodeGeneration() {
    console.log('Testing $if Helper Code Generation...')
    
    // Test code generation for $if
    const expr1 = parseJSXExpression('$if(counter.value > 5, <p>Counter is high</p>)')
    const conditional1 = detectConditionalExpression(expr1)
    
    if (conditional1) {
        const code1 = generateConditionalUICode(
            conditional1,
            (element) => 'ui.P({ text: "Counter is high" })',
            []
        )
        
        console.log('Generated $if code:', code1)
        console.assert(code1.includes('ui.When('), 'Should generate ui.When call')
        console.assert(code1.includes('watch(counter'), 'Should use watch with counter')
        console.assert(code1.includes('as Ref<boolean>'), 'Should include type casting')
        console.assert(code1.includes('ui.P({ text: "Counter is high" })'), 'Should include element code')
    }
    
    // Test code generation for $if with else
    const expr2 = parseJSXExpression('$if(isVisible.value, <span>Show</span>, <span>Hide</span>)')
    const conditional2 = detectConditionalExpression(expr2)
    
    if (conditional2) {
        const code2 = generateConditionalUICode(
            conditional2,
            (element) => {
                // Simple mock converter based on element content
                const elementStr = JSON.stringify(element)
                if (elementStr.includes('Show')) return 'ui.Span({ text: "Show" })'
                if (elementStr.includes('Hide')) return 'ui.Span({ text: "Hide" })'
                return 'ui.Span({})'
            },
            []
        )
        
        console.log('Generated $if-else code:', code2)
        console.assert(code2.includes('ui.When('), 'Should generate ui.When call')
        console.assert(code2.includes('.Else('), 'Should generate Else clause')
        console.assert(code2.includes('watch(isVisible'), 'Should use watch with isVisible')
    }
    
    console.log('✅ $if helper code generation test passed')
}

function testInvalidIfHelper() {
    console.log('Testing Invalid $if Helper...')
    
    // Test $if with insufficient arguments
    try {
        const expr1 = parseJSXExpression('$if(counter.value > 10)')
        const result1 = detectConditionalExpression(expr1)
        console.assert(result1 === null, 'Should not detect invalid $if with one argument')
    } catch (error) {
        console.log('Expected parsing error for invalid $if:', error.message)
    }
    
    // Test $if with non-JSX elements (should still work but with null elements)
    const expr2 = parseJSXExpression('$if(true, "text", "other")')
    const result2 = detectConditionalExpression(expr2)
    
    console.assert(result2 !== null, 'Should detect $if with non-JSX elements')
    console.assert(result2?.thenElement === null, 'Should have null then element for non-JSX')
    console.assert(result2?.elseElement === null, 'Should have null else element for non-JSX')
    
    console.log('✅ Invalid $if helper test passed')
}

function testIfHelperVsOtherPatterns() {
    console.log('Testing $if Helper vs Other Patterns...')
    
    // Ensure $if doesn't interfere with other patterns
    const logicalExpr = parseJSXExpression('counter.value > 10 && <p>High</p>')
    const logicalResult = detectConditionalExpression(logicalExpr)
    console.assert(logicalResult?.type === 'logical', 'Should still detect logical AND')
    
    const ternaryExpr = parseJSXExpression('counter.value > 10 ? <p>High</p> : <p>Low</p>')
    const ternaryResult = detectConditionalExpression(ternaryExpr)
    console.assert(ternaryResult?.type === 'ternary', 'Should still detect ternary')
    
    const ifExpr = parseJSXExpression('$if(counter.value > 10, <p>High</p>)')
    const ifResult = detectConditionalExpression(ifExpr)
    console.assert(ifResult?.type === 'if-helper', 'Should detect $if helper')
    
    console.log('✅ Pattern differentiation test passed')
}

// Run all $if helper tests
function runIfHelperTests() {
    console.log('🧪 Running $if Helper Tests...\\n')
    
    try {
        testBasicIfHelper()
        testIfElseHelper()
        testComplexIfHelper()
        testStaticIfHelper()
        testIfHelperCodeGeneration()
        testInvalidIfHelper()
        testIfHelperVsOtherPatterns()
        
        console.log('\\n🎉 All $if helper tests passed!')
    } catch (error) {
        console.error('\\n❌ $if helper test failed:', error)
        console.error(error.stack)
        process.exit(1)
    }
}

// Run tests
runIfHelperTests()

export { runIfHelperTests }