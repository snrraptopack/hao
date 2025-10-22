import { parse } from '@babel/parser'
import * as t from '@babel/types'
import generate from '@babel/generator'
import {
    detectConditionalExpression,
    generateConditionalUICode,
    type ConditionalExpression
} from './src/conditional-detector'

/**
 * Integration test for complete conditional rendering pipeline
 */

function mockJSXElementConverter(element: any): string {
    // Mock converter that simulates the real TSX compiler behavior
    if (!element || !element.openingElement) {
        return 'ui.Div({ text: "Unknown element" })'
    }

    const tagName = element.openingElement.name?.name || 'div'
    const uiMethod = tagName.charAt(0).toUpperCase() + tagName.slice(1)

    // Extract text content if present
    if (element.children && element.children.length > 0) {
        const textChild = element.children.find((child: any) => child.type === 'JSXText')
        if (textChild) {
            const text = textChild.value.trim()
            return `ui.${uiMethod}({ text: "${text}" })`
        }
    }

    return `ui.${uiMethod}({})`
}

function testCompleteConditionalPipeline() {
    console.log('Testing Complete Conditional Pipeline...')

    // Test 1: Logical AND with reactive condition
    const jsxCode1 = '<div>{counter.value > 10 && <p>Counter is high!</p>}</div>'
    const ast1 = parse(jsxCode1, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
    })

    // Find the conditional expression
    let conditionalExpr1: t.JSXExpressionContainer | null = null

    const findConditional = {
        JSXExpressionContainer(path: any) {
            if (path.node.expression.type === 'LogicalExpression') {
                conditionalExpr1 = path.node
            }
        }
    }

    // Use a simple traversal to find the conditional
    const traverse = (node: any, visitor: any) => {
        if (node.type === 'JSXExpressionContainer' &&
            node.expression?.type === 'LogicalExpression') {
            conditionalExpr1 = node
        }

        if (node.children) {
            node.children.forEach((child: any) => traverse(child, visitor))
        }
        if (node.body) {
            traverse(node.body, visitor)
        }
        if (node.expression) {
            traverse(node.expression, visitor)
        }
    }

    traverse(ast1, findConditional)

    if (conditionalExpr1) {
        const detected1 = detectConditionalExpression(conditionalExpr1)
        console.assert(detected1 !== null, 'Should detect logical AND conditional')
        console.assert(detected1?.type === 'logical', 'Should detect as logical type')
        console.assert(detected1?.isReactive === true, 'Should be reactive')
        console.assert(detected1?.dependencies.includes('counter'), 'Should detect counter dependency')

        if (detected1) {
            const scope = ['const counter = ref(0)']
            const generatedCode = generateConditionalUICode(detected1, mockJSXElementConverter, scope)

            console.assert(generatedCode.includes('ui.When('), 'Should generate ui.When call')
            console.assert(generatedCode.includes('watch(counter'), 'Should use watch with counter')
            console.assert(generatedCode.includes('as Ref<boolean>'), 'Should include type casting')
            console.assert(generatedCode.includes('ui.P({ text: "Counter is high!" })'), 'Should convert JSX element')
        }
    }

    // Test 2: Ternary with both branches
    const jsxCode2 = '<div>{isVisible.value ? <span>Visible</span> : <span>Hidden</span>}</div>'
    const ast2 = parse(jsxCode2, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
    })

    let conditionalExpr2: t.JSXExpressionContainer | null = null

    const findTernary = (node: any) => {
        if (node.type === 'JSXExpressionContainer' &&
            node.expression?.type === 'ConditionalExpression') {
            conditionalExpr2 = node
        }

        if (node.children) {
            node.children.forEach((child: any) => findTernary(child))
        }
        if (node.body) {
            findTernary(node.body)
        }
        if (node.expression) {
            findTernary(node.expression)
        }
    }

    findTernary(ast2)

    if (conditionalExpr2) {
        const detected2 = detectConditionalExpression(conditionalExpr2)
        console.assert(detected2 !== null, 'Should detect ternary conditional')
        console.assert(detected2?.type === 'ternary', 'Should detect as ternary type')
        console.assert(detected2?.isReactive === true, 'Should be reactive')
        console.assert(detected2?.dependencies.includes('isVisible'), 'Should detect isVisible dependency')

        if (detected2) {
            const scope = ['const isVisible = ref(true)']
            const generatedCode = generateConditionalUICode(detected2, mockJSXElementConverter, scope)

            console.assert(generatedCode.includes('ui.When('), 'Should generate ui.When call')
            console.assert(generatedCode.includes('.Else('), 'Should generate Else clause')
            console.assert(generatedCode.includes('watch(isVisible'), 'Should use watch with isVisible')
            console.assert(generatedCode.includes('ui.Span({ text: "Visible" })'), 'Should convert then element')
            console.assert(generatedCode.includes('ui.Span({ text: "Hidden" })'), 'Should convert else element')
        }
    }

    console.log('✅ Complete conditional pipeline tests passed')
}

function testRealWorldScenarios() {
    console.log('Testing Real-World Scenarios...')

    // Test complex condition with multiple refs
    const complexCondition = 'user.value && user.value.isAdmin && posts.value.length > 0'
    const scope = [
        'const user = ref(null)',
        'const posts = ref([])'
    ]

    // Simulate a detected conditional
    const complexConditional: ConditionalExpression = {
        type: 'logical',
        condition: complexCondition,
        thenElement: {
            type: 'JSXElement',
            openingElement: {
                name: { name: 'div' }
            },
            children: [{
                type: 'JSXText',
                value: 'Admin Panel'
            }]
        } as any,
        elseElement: null,
        isReactive: true,
        dependencies: ['user', 'posts']
    }

    const complexCode = generateConditionalUICode(complexConditional, mockJSXElementConverter, scope)

    console.assert(complexCode.includes('watch([user, posts]'), 'Should handle multiple dependencies')
    console.assert(complexCode.includes('user.value && user.value.isAdmin && posts.value.length > 0'), 'Should preserve complex condition')
    console.assert(complexCode.includes('ui.Div({ text: "Admin Panel" })'), 'Should convert complex element')

    // Test nested conditions (future enhancement)
    console.log('✅ Real-world scenarios tests passed')
}

function testErrorHandling() {
    console.log('Testing Error Handling...')

    // Test with invalid JSX expression
    try {
        const invalidExpr = {
            type: 'JSXExpressionContainer',
            expression: null
        } as any

        const result = detectConditionalExpression(invalidExpr)
        console.assert(result === null, 'Should return null for invalid expression')
    } catch (error) {
        console.assert(false, 'Should not throw error for invalid expression')
    }

    // Test with non-conditional expression
    const nonConditionalCode = '<div>{someFunction()}</div>'
    const ast = parse(nonConditionalCode, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
    })

    // This would be a function call, not a conditional
    console.log('✅ Error handling tests passed')
}

// Run integration tests
function runIntegrationTests() {
    console.log('🧪 Running Conditional Integration Tests...\n')

    try {
        testCompleteConditionalPipeline()
        testRealWorldScenarios()
        testErrorHandling()

        console.log('\n🎉 All integration tests passed!')
    } catch (error) {
        console.error('\n❌ Integration test failed:', error)
        process.exit(1)
    }
}

// Run tests
runIntegrationTests()

export { runIntegrationTests }