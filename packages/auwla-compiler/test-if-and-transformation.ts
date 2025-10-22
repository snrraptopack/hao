import { parse } from '@babel/parser'
import * as t from '@babel/types'
import { analyzeJSX } from './src/jsx-analyzer'

console.log('🧪 Testing $if && JSX transformation...')

function testIfAndTransformation() {
    const code = `
    function TestComponent() {
        return (
            <div>
                {$if(counter.value > 5) && <p>Counter is high</p>}
            </div>
        )
    }
    `
    
    const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
    })
    
    // Find the function body
    let functionBody: t.BlockStatement | null = null
    
    if (t.isProgram(ast)) {
        for (const node of ast.body) {
            if (t.isFunctionDeclaration(node) && node.body) {
                functionBody = node.body
                break
            }
        }
    }
    
    if (functionBody) {
        console.log('✅ Found function body')
        
        // Analyze JSX
        const jsxNodes = analyzeJSX(functionBody)
        console.log('JSX Analysis Result:', JSON.stringify(jsxNodes, null, 2))
        
        // Check if transformation happened
        const hasTransformation = JSON.stringify(jsxNodes).includes('$if')
        console.log('Has $if transformation:', hasTransformation)
    } else {
        console.log('❌ Could not find function body')
    }
}

testIfAndTransformation()