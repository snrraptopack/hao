/**
 * Code Generator - Generates clean Auwla component code
 */

import type {
    ScopedFile,
    JSXStructure,
    ImportDeclaration,
    CodeBlock,
    UIElement
} from '../types/index.js'
import { GenerationError } from '../types/index.js'
import {
    indent,
    formatImports,
    formatParameters,
    ensureNewline,
    removeExtraBlankLines
} from '../utils/index.js'

/**
 * Generate Auwla component code from scoped file
 */
export class CodeGenerator {
    generate(scopedFile: ScopedFile, jsxStructure: JSXStructure, filename: string = 'unknown.tsx'): string {
        try {
            let code = ''

            // Generate imports
            code += this.generateImports(scopedFile.imports, jsxStructure)
            code += '\n\n'

            // Generate main component function
            code += this.generatePageFunction(scopedFile, jsxStructure)

            // Clean up formatting
            code = removeExtraBlankLines(code)
            code = ensureNewline(code)

            return code

        } catch (error) {
            if (error instanceof GenerationError) {
                throw error
            }
            throw new GenerationError(`Code generation failed: ${error}`, filename)
        }
    }

    /**
     * Generate imports section
     */
    private generateImports(imports: ImportDeclaration[], jsxStructure: JSXStructure): string {
        const auwlaImports = ['Component']

        // Determine what we need from auwla based on usage
        const needsRef = this.needsRef(imports)
        const needsWatch = this.needsWatch(jsxStructure)
        const needsComputed = this.needsComputed(imports)

        if (needsRef) {
            auwlaImports.push('ref')
        }

        if (needsWatch) {
            auwlaImports.push('watch')
        }

        if (needsComputed) {
            auwlaImports.push('computed')
        }

        // Generate auwla imports
        let code = `import { ${auwlaImports.join(', ')} } from 'auwla'\n`

        // Add other imports (filter out auwla imports)
        const otherImports = imports
            .filter(imp => imp.source !== 'auwla')
            .map(imp => imp.raw)

        if (otherImports.length > 0) {
            code += otherImports.join('\n') + '\n'
        }

        return code
    }

    /**
     * Generate page function with correct scoping
     */
    private generatePageFunction(scopedFile: ScopedFile, jsxStructure?: JSXStructure): string {
        const { mainComponent, componentScope, uiScope } = scopedFile
        const componentName = mainComponent.name || 'Component'
        const params = this.formatComponentParameters(mainComponent.params)

        let code = `// Page component (has lifecycle)\n`
        code += `export default function ${componentName}(${params}) {\n`

        // Add component scope code (variables that were outside export default)
        if (componentScope.length > 0) {
            code += '  // Logic that was outside page scope → now inside page scope\n'
            code += componentScope.map(block => indent(block.code, 2)).join('\n') + '\n\n'
        }

        // Generate Component callback
        code += '  return Component((ui) => {\n'

        // Add UI scope code (variables that were inside export default)
        if (uiScope.length > 0) {
            code += '    // Logic that was inside page scope → now inside Component UI scope\n'
            code += uiScope.map(block => indent(block.code, 4)).join('\n') + '\n\n'
        }

        // Generate UI elements from JSX
        if (jsxStructure && jsxStructure.elements.length > 0) {
            code += '    // Generated UI from JSX\n'
            code += this.generateUIElements(jsxStructure.elements, 4)
        } else if (mainComponent.jsxReturn) {
            code += '    // Generated UI from JSX (fallback to raw JSX)\n'
            code += this.generateUIElement(mainComponent.jsxReturn, 4)
        } else {
            code += '    // No JSX return found\n'
            code += '    ui.Text({ text: "No content" })\n'
        }

        code += '  })\n'
        code += '}\n'

        return code
    }

    /**
     * Generate UI elements from JSX structure
     */
    private generateUIElements(elements: UIElement[], indentLevel: number = 4): string {
        return elements.map(element => this.generateUIElement(element, indentLevel)).join('\n')
    }

    /**
     * Generate a single UI element
     */
    private generateUIElement(element: any, indentLevel: number): string {
        if (!element) return ''

        // Handle elements based on type or tag
        const elementType = element.type || (element.tag === 'text' ? 'expression' : 'element')

        switch (elementType) {
            case 'element':
                return this.generateJSXElement(element, indentLevel)
            case 'fragment':
                return this.generateFragment(element, indentLevel)
            case 'text':
                return this.generateTextElement(element, indentLevel)
            case 'expression':
                return this.generateExpressionElement(element, indentLevel)
            default:
                return indent(`// Unknown element type: ${elementType}`, indentLevel)
        }
    }

    /**
     * Generate JSX element as UI builder call
     */
    private generateJSXElement(element: any, indentLevel: number): string {
        const tag = element.tag
        const uiMethod = this.getUIMethod(tag)
        
        // Generate props and events from JSX analyzer structure
        const props = this.generateElementProps(element.props || [])
        const events = this.generateElementEvents(element.events || [])
        
        // For elements that support text property (Button, etc.), convert text children to text prop
        const textSupportingElements = ['button', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']
        let textProp: string | null = null
        let nonTextChildren: any[] = []
        
        if (textSupportingElements.includes(tag.toLowerCase()) && element.children) {
            // Check if all children are text elements
            const textChildren = element.children.filter((child: any) => child.tag === 'text')
            nonTextChildren = element.children.filter((child: any) => child.tag !== 'text')
            
            if (textChildren.length === 1 && nonTextChildren.length === 0) {
                // Single text child - convert to text property
                const textChild = textChildren[0]
                if (textChild.props && textChild.props.length > 0) {
                    const textPropData = textChild.props.find((p: any) => p.name === 'text')
                    if (textPropData && textPropData.isReactive) {
                        // Reactive text - generate watch expression
                        const deps = this.extractReactiveDependencies(textPropData.value)
                        textProp = `text: watch([${deps.join(', ')}], () => ${textPropData.value}) as Ref<string>`
                    } else if (textPropData) {
                        // Static text
                        textProp = `text: "${textPropData.value}"`
                    }
                }
            }
        }
        
        // Combine props, events, and text
        const allProps = [...props, ...events]
        if (textProp) {
            allProps.push(textProp)
        }
        const propsStr = allProps.length > 0 ? `{ ${allProps.join(', ')} }` : '{}'
        
        if (nonTextChildren.length > 0) {
            // Element with non-text children
            let code = indent(`ui.${uiMethod}(${propsStr}, (ui) => {`, indentLevel) + '\n'
            
            for (const child of nonTextChildren) {
                code += this.generateUIElement(child, indentLevel + 2) + '\n'
            }
            
            code += indent('})', indentLevel)
            return code
        } else {
            // Self-closing element or element with only text (now converted to text prop)
            return indent(`ui.${uiMethod}(${propsStr})`, indentLevel)
        }
    }

    /**
     * Generate fragment (multiple elements)
     */
    private generateFragment(element: any, indentLevel: number): string {
        if (!element.children || element.children.length === 0) {
            return ''
        }
        
        return element.children
            .map((child: any) => this.generateUIElement(child, indentLevel))
            .join('\n')
    }

    /**
     * Generate text element
     */
    private generateTextElement(element: any, indentLevel: number): string {
        const text = element.text || ''
        if (text.trim() === '') return ''
        
        // For static text, use Span with text property
        return indent(`ui.Span({ text: "${text.replace(/"/g, '\\"')}" })`, indentLevel)
    }

    /**
     * Generate expression element
     */
    private generateExpressionElement(element: any, indentLevel: number): string {
        // Extract expression code properly
        let expr = 'unknown'
        
        // Check if this is a text element with reactive expression (from JSX analyzer)
        if (element.tag === 'text' && element.props && element.props.length > 0) {
            const textProp = element.props.find((p: any) => p.name === 'text')
            if (textProp && textProp.value) {
                expr = textProp.value
            }
        }
        // Legacy format support
        else if (element.expression) {
            if (typeof element.expression === 'string') {
                expr = element.expression
            } else if (element.expression.type === 'Identifier') {
                expr = element.expression.name
            } else if (element.expression.type === 'MemberExpression') {
                expr = this.extractMemberExpression(element.expression)
            } else {
                // Try to extract a meaningful representation
                expr = element.expression.name || element.expression.value || 'unknown'
            }
        }
        
        // Generate reactive text based on expression type
        return this.generateReactiveText(expr, indentLevel)
    }

    /**
     * Generate reactive text element with proper Auwla patterns
     */
    private generateReactiveText(expr: string, indentLevel: number): string {
        if (expr === 'unknown') {
            return indent(`ui.Text({ text: "unknown" })`, indentLevel)
        }
        
        // Check if it's a reactive expression (contains .value or is a conditional/complex expression)
        const isReactive = expr.includes('.value') || 
                          expr.includes('?') || 
                          expr.includes('&&') || 
                          expr.includes('||') ||
                          expr.includes('(') // Function calls, complex expressions
        
        if (isReactive) {
            // Extract dependencies and generate watch expression
            const deps = this.extractReactiveDependencies(expr)
            
            if (deps.length > 0) {
                // Has reactive dependencies - wrap in watch with proper Auwla DSL pattern
                const watchExpr = `watch([${deps.join(', ')}], () => ${expr}) as Ref<string>`
                return indent(`ui.Text({ text: ${watchExpr} })`, indentLevel)
            } else {
                // Complex expression but no reactive deps - evaluate directly
                return indent(`ui.Text({ text: String(${expr}) })`, indentLevel)
            }
        } else {
            // Static expression - use as string literal if it's a simple string
            if (expr.startsWith('"') && expr.endsWith('"')) {
                return indent(`ui.Text({ text: ${expr} })`, indentLevel)
            } else {
                return indent(`ui.Text({ text: String(${expr}) })`, indentLevel)
            }
        }
    }

    /**
     * Extract reactive dependencies from expression
     */
    private extractReactiveDependencies(expr: string): string[] {
        const deps: string[] = []
        
        // Match patterns like "varName.value" - more comprehensive regex
        const matches = expr.match(/(\w+)\.value\b/g)
        if (matches) {
            matches.forEach(match => {
                const refName = match.replace('.value', '')
                if (!deps.includes(refName)) {
                    deps.push(refName)
                }
            })
        }
        
        return deps
    }

    /**
     * Generate watch expression with dependencies
     */
    private generateWatchExpression(expr: string, deps: string[], returnType: string = 'string'): string {
        const depsArray = `[${deps.join(', ')}]`
        
        // For simple expressions, return as-is
        if (deps.length === 1 && expr === `${deps[0]}.value`) {
            return `watch(${depsArray}, () => ${expr}) as Ref<${returnType}>`
        }
        
        // For template literals or complex expressions
        let templateExpr = expr
        
        // Handle template literals
        if (expr.includes('`')) {
            // Already a template literal, just replace .value references
            templateExpr = expr.replace(/(\w+)\.value/g, '${$1.value}')
        } else if (returnType === 'string' && (expr.includes('+') || expr.includes('${') || deps.length > 1)) {
            // Convert to template literal for string concatenation
            templateExpr = `\`${expr.replace(/(\w+)\.value/g, '${$1.value}')}\``
        } else {
            // Keep as expression for non-string types
            templateExpr = expr
        }
        
        return `watch(${depsArray}, () => ${templateExpr}) as Ref<${returnType}>`
    }

    /**
     * Extract member expression (e.g., obj.prop.value)
     */
    private extractMemberExpression(expr: any): string {
        if (!expr) return 'unknown'
        
        if (expr.type === 'MemberExpression') {
            const object = this.extractMemberExpression(expr.object)
            const property = expr.computed 
                ? `[${this.extractMemberExpression(expr.property)}]`
                : `.${expr.property.name || 'unknown'}`
            return `${object}${property}`
        } else if (expr.type === 'Identifier') {
            return expr.name
        } else {
            return expr.value || expr.name || 'unknown'
        }
    }

    /**
     * Get UI method name for HTML tag
     */
    private getUIMethod(tag: string): string {
        const tagMap: Record<string, string> = {
            'div': 'Div',
            'span': 'Span',
            'p': 'P',
            'h1': 'H1',
            'h2': 'H2',
            'h3': 'H3',
            'h4': 'H4',
            'h5': 'H5',
            'h6': 'H6',
            'button': 'Button',
            'input': 'Input',
            'textarea': 'TextArea',
            'img': 'Image',
            'a': 'Link',
            'ul': 'List',
            'ol': 'OrderedList',
            'li': 'ListItem',
            'table': 'Table',
            'tr': 'TableRow',
            'td': 'TableCell',
            'th': 'TableHeader',
            'form': 'Form',
            'label': 'Label'
        }
        
        return tagMap[tag.toLowerCase()] || 'Div'
    }

    /**
     * Generate element props
     */
    private generateElementProps(props: any[]): string[] {
        return props
            .filter(prop => !prop.name.startsWith('on')) // Filter out events
            .map(prop => {
                let name = prop.name
                let value = prop.value
                
                // Handle different value types
                if (typeof value === 'string') {
                    value = `"${value.replace(/"/g, '\\"')}"`
                } else if (typeof value === 'object' && value.type === 'expression' && value.expression) {
                    // Handle JSX expressions
                    const exprCode = this.extractExpressionFromAST(value.expression)
                    
                    // For reactive expressions, use watch pattern
                    if (exprCode.includes('.value')) {
                        const deps = this.extractReactiveDependencies(exprCode)
                        // Determine return type based on attribute name and expression
                        let returnType = 'string'
                        if (name === 'className' || name === 'value' || name === 'placeholder') {
                            returnType = 'string'
                        } else if (name === 'disabled' || name === 'checked' || name === 'hidden') {
                            returnType = 'boolean'
                        }
                        const watchExpr = this.generateWatchExpression(exprCode, deps, returnType)
                        value = watchExpr
                    } else {
                        value = exprCode
                    }
                } else if (prop.isReactive) {
                    // For reactive values marked by analyzer - generate proper watch expression
                    const deps = this.extractReactiveDependencies(value)
                    if (deps.length > 0) {
                        // Determine return type based on attribute name
                        let returnType = 'string'
                        if (name === 'disabled' || name === 'checked' || name === 'hidden') {
                            returnType = 'boolean'
                        }
                        const watchExpr = this.generateWatchExpression(value, deps, returnType)
                        value = watchExpr
                    } else {
                        value = `String(${value})`
                    }
                }
                
                return `${name}: ${value}`
            })
    }



    /**
     * Generate events from JSX analyzer event structure
     */
    private generateElementEvents(events: any[]): string[] {
        if (events.length === 0) return []
        
        const eventHandlers = events.map(event => {
            const cleanHandler = this.cleanEventHandler(event.handler || '() => {}', event.event)
            return `${event.event}: ${cleanHandler}`
        })
        
        return [`on: { ${eventHandlers.join(', ')} }`]
    }

    /**
     * Generate events from JSX props (onClick, onInput, etc.) - Legacy method
     */
    private generateElementEventsFromProps(eventProps: any[]): string[] {
        if (eventProps.length === 0) return []
        
        const eventHandlers = eventProps.map(prop => {
            const eventType = prop.name.slice(2).toLowerCase() // onClick -> click
            
            let handler = ''
            if (typeof prop.value === 'object' && prop.value.type === 'expression' && prop.value.expression) {
                handler = this.extractEventHandlerFromAST(prop.value.expression)
            } else if (typeof prop.value === 'string') {
                handler = prop.value
            }
            
            const cleanHandler = this.cleanEventHandler(handler || '() => {}', eventType)
            return `${eventType}: ${cleanHandler}`
        })
        
        return [`on: { ${eventHandlers.join(', ')} }`]
    }

    /**
     * Extract event handler code from AST node
     */
    private extractEventHandlerFromAST(expression: any): string {
        if (!expression) return '() => {}'
        
        if (expression.type === 'Identifier') {
            return expression.name
        } else if (expression.type === 'ArrowFunctionExpression') {
            const params = expression.params.map((param: any) => param.name || 'unknown').join(', ')
            const body = expression.body.type === 'BlockStatement' 
                ? this.extractBlockStatementFromAST(expression.body)
                : this.extractExpressionFromAST(expression.body)
            
            return `(${params}) => ${body}`
        } else if (expression.type === 'FunctionExpression') {
            const params = expression.params.map((param: any) => param.name || 'unknown').join(', ')
            const body = this.extractBlockStatementFromAST(expression.body)
            
            return `function(${params}) ${body}`
        }
        
        return '() => {}'
    }

    /**
     * Extract block statement from AST
     */
    private extractBlockStatementFromAST(block: any): string {
        if (!block || !block.body) return '{}'
        
        // For simple cases, try to extract the main statement
        if (block.body.length === 1) {
            const stmt = block.body[0]
            if (stmt.type === 'ExpressionStatement') {
                return this.extractExpressionFromAST(stmt.expression)
            } else if (stmt.type === 'ReturnStatement') {
                return this.extractExpressionFromAST(stmt.argument)
            }
        }
        
        // For complex blocks, return a placeholder that can be manually fixed
        return `{ /* ${block.body.length} statements */ }`
    }

    /**
     * Extract expression from AST
     */
    private extractExpressionFromAST(expr: any): string {
        if (!expr) return ''
        
        if (expr.type === 'CallExpression') {
            const callee = this.extractExpressionFromAST(expr.callee)
            const args = expr.arguments.map((arg: any) => this.extractExpressionFromAST(arg)).join(', ')
            return `${callee}(${args})`
        } else if (expr.type === 'MemberExpression') {
            const object = this.extractExpressionFromAST(expr.object)
            const property = expr.computed 
                ? `[${this.extractExpressionFromAST(expr.property)}]`
                : `.${expr.property.name}`
            return `${object}${property}`
        } else if (expr.type === 'Identifier') {
            return expr.name
        } else if (expr.type === 'StringLiteral') {
            return `"${expr.value}"`
        } else if (expr.type === 'NumericLiteral') {
            return expr.value.toString()
        } else if (expr.type === 'BooleanLiteral') {
            return expr.value.toString()
        } else if (expr.type === 'ConditionalExpression') {
            // Handle ternary operator: condition ? true : false
            const test = this.extractExpressionFromAST(expr.test)
            const consequent = this.extractExpressionFromAST(expr.consequent)
            const alternate = this.extractExpressionFromAST(expr.alternate)
            return `${test} ? ${consequent} : ${alternate}`
        } else if (expr.type === 'BinaryExpression') {
            // Handle binary operations: a + b, a > b, etc.
            const left = this.extractExpressionFromAST(expr.left)
            const right = this.extractExpressionFromAST(expr.right)
            return `${left} ${expr.operator} ${right}`
        } else if (expr.type === 'LogicalExpression') {
            // Handle logical operations: a && b, a || b
            const left = this.extractExpressionFromAST(expr.left)
            const right = this.extractExpressionFromAST(expr.right)
            return `${left} ${expr.operator} ${right}`
        } else if (expr.type === 'TemplateLiteral') {
            // Handle template literals: `Hello ${name}`
            let result = '`'
            for (let i = 0; i < expr.quasis.length; i++) {
                result += expr.quasis[i].value.raw
                if (i < expr.expressions.length) {
                    result += '${' + this.extractExpressionFromAST(expr.expressions[i]) + '}'
                }
            }
            result += '`'
            return result
        } else if (expr.type === 'ArrayExpression') {
            // Handle arrays: [1, 2, 3]
            const elements = expr.elements.map((el: any) => this.extractExpressionFromAST(el)).join(', ')
            return `[${elements}]`
        } else if (expr.type === 'ObjectExpression') {
            // Handle objects: { key: value }
            const properties = expr.properties.map((prop: any) => {
                const key = prop.key.name || this.extractExpressionFromAST(prop.key)
                const value = this.extractExpressionFromAST(prop.value)
                return `${key}: ${value}`
            }).join(', ')
            return `{ ${properties} }`
        }
        
        return 'unknown'
    }

    /**
     * Clean event handler to use proper TypeScript types and avoid unused parameters
     */
    private cleanEventHandler(handler: string, eventType: string): string {
        if (!handler) return '() => {}'

        // If handler is already a function expression, clean it up
        if (handler.includes('=>')) {
            // Check if it uses the event parameter
            const usesEvent = handler.includes('event') || handler.includes('e.')
            
            if (usesEvent) {
                // Keep event parameter with proper type
                const eventTypeMap: Record<string, string> = {
                    'click': 'MouseEvent',
                    'input': 'InputEvent', 
                    'change': 'Event',
                    'submit': 'SubmitEvent',
                    'focus': 'FocusEvent',
                    'blur': 'FocusEvent',
                    'keydown': 'KeyboardEvent',
                    'keyup': 'KeyboardEvent',
                    'mouseenter': 'MouseEvent',
                    'mouseleave': 'MouseEvent'
                }
                
                const tsEventType = eventTypeMap[eventType] || 'Event'
                
                // Replace common parameter patterns with typed version
                return handler
                    .replace(/\(\s*e\s*\)/, `(e: ${tsEventType})`)
                    .replace(/\(\s*event\s*\)/, `(event: ${tsEventType})`)
                    .replace(/\(\s*\)/, `(e: ${tsEventType})`) // Add parameter if missing but used
            } else {
                // Remove unused event parameter
                return handler.replace(/\([^)]*\)\s*=>/, '() =>')
            }
        } else {
            // Simple function call - wrap in arrow function
            return `() => ${handler}`
        }
    }

    /**
     * Check if ref() is needed
     */
    private needsRef(imports: ImportDeclaration[]): boolean {
        // Check if any import already includes ref
        return imports.some(imp =>
            imp.source === 'auwla' &&
            imp.specifiers.some(spec => spec.imported === 'ref')
        )
    }

    /**
     * Check if watch() is needed
     */
    private needsWatch(jsxStructure: JSXStructure): boolean {
        // Check if any reactive expressions need watch
        return jsxStructure.expressions.some(expr => expr.isWatch) ||
            jsxStructure.conditionals.length > 0
    }

    /**
     * Check if computed() is needed
     */
    private needsComputed(imports: ImportDeclaration[]): boolean {
        // Check if any import already includes computed
        return imports.some(imp =>
            imp.source === 'auwla' &&
            imp.specifiers.some(spec => spec.imported === 'computed')
        )
    }

    /**
     * Generate event handler
     */
    private generateEventHandler(event: string, handler: string): string {
        // Clean up event handler to avoid unused parameters
        const cleanHandler = handler.includes('=>') ? handler : `() => ${handler}`
        return `${event}: ${cleanHandler}`
    }

    /**
     * Generate reactive expression with watch
     */
    private generateReactiveExpression(expr: string, dependencies: string[]): string {
        if (dependencies.length === 0) {
            return expr
        }

        return `watch([${dependencies.join(', ')}], () => ${expr}) as Ref<string>`
    }

    /**
     * Format component parameters with proper TypeScript types
     */
    private formatComponentParameters(params: any[]): string {
        if (!params || params.length === 0) {
            return ''
        }

        return params.map(param => {
            const name = param.name || 'unknown'
            const type = param.type || 'any'
            return `${name}: ${type}`
        }).join(', ')
    }
}