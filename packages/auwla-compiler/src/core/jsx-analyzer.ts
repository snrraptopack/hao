/**
 * JSX Analyzer - Analyzes JSX structure for code generation
 */

import type { 
  JSXElement, 
  JSXStructure, 
  UIElement, 
  ReactiveExpression,
  ConditionalBlock,
  LoopBlock
} from '../types/index.js'
import { JSXError } from '../types/index.js'

/**
 * Analyze JSX structure for code generation
 */
export class JSXAnalyzer {
  analyze(jsxElement: JSXElement | null, filename: string = 'unknown.tsx'): JSXStructure {
    try {
      if (!jsxElement) {
        return {
          elements: [],
          conditionals: [],
          loops: [],
          expressions: []
        }
      }

      const structure: JSXStructure = {
        elements: [],
        conditionals: [],
        loops: [],
        expressions: []
      }

      this.analyzeElement(jsxElement, structure)
      
      return structure

    } catch (error) {
      if (error instanceof JSXError) {
        throw error
      }
      throw new JSXError(`JSX analysis failed: ${error}`, filename)
    }
  }

  /**
   * Analyze a single JSX element
   */
  private analyzeElement(element: JSXElement, structure: JSXStructure): void {
    switch (element.type) {
      case 'element':
        this.analyzeJSXElement(element, structure)
        break
      case 'fragment':
        this.analyzeFragment(element, structure)
        break
      case 'text':
        this.analyzeText(element, structure)
        break
      case 'expression':
        this.analyzeExpression(element, structure)
        break
    }
  }

  /**
   * Analyze JSX element
   */
  private analyzeJSXElement(element: JSXElement, structure: JSXStructure): void {
    if (!element.tag) return

    const uiElement: UIElement = {
      tag: element.tag,
      props: [],
      children: [],
      events: []
    }

    // Analyze props
    if (element.props) {
      for (const prop of element.props) {
        this.analyzeProp(prop, uiElement, structure)
      }
    }

    // Analyze children - create a child structure to collect child elements
    if (element.children) {
      for (const child of element.children) {
        const childStructure: JSXStructure = {
          elements: [],
          conditionals: [],
          loops: [],
          expressions: []
        }
        
        this.analyzeElement(child, childStructure)
        
        // Add child elements to this element's children
        uiElement.children.push(...childStructure.elements)
        
        // Merge child expressions, conditionals, and loops into main structure
        structure.expressions.push(...childStructure.expressions)
        structure.conditionals.push(...childStructure.conditionals)
        structure.loops.push(...childStructure.loops)
      }
    }

    structure.elements.push(uiElement)
  }

  /**
   * Analyze JSX fragment
   */
  private analyzeFragment(element: JSXElement, structure: JSXStructure): void {
    if (element.children) {
      for (const child of element.children) {
        this.analyzeElement(child, structure)
      }
    }
  }

  /**
   * Analyze text content
   */
  private analyzeText(element: JSXElement, structure: JSXStructure): void {
    if (element.text && element.text.trim()) {
      // Static text - create a text element
      const textElement: UIElement = {
        tag: 'text',
        props: [{ name: 'text', value: element.text, isReactive: false }],
        children: [],
        events: []
      }
      structure.elements.push(textElement)
    }
  }

  /**
   * Analyze expression
   */
  private analyzeExpression(element: JSXElement, structure: JSXStructure): void {
    if (!element.expression) return

    const exprCode = this.extractExpressionCode(element.expression)
    
    // Check for conditional rendering (condition && <element>)
    if (this.isConditionalExpression(exprCode)) {
      this.analyzeConditional(exprCode, structure)
    }
    // Check for loop rendering (array.map(...))
    else if (this.isLoopExpression(exprCode)) {
      this.analyzeLoop(exprCode, structure)
    }
    // Regular reactive expression
    else {
      const reactiveExpr = this.createReactiveExpression(exprCode, 'text')
      structure.expressions.push(reactiveExpr)
      
      // Create a text element for the expression
      const textElement: UIElement = {
        tag: 'text',
        props: [{ name: 'text', value: exprCode, isReactive: true }],
        children: [],
        events: []
      }
      structure.elements.push(textElement)
    }
  }

  /**
   * Analyze JSX prop
   */
  private analyzeProp(prop: any, uiElement: UIElement, structure: JSXStructure): void {
    if (!prop.name) return

    // Handle event handlers (onClick, onInput, etc.)
    if (prop.name.startsWith('on') && prop.name.length > 2) {
      const eventType = prop.name.slice(2).toLowerCase() // onClick -> click
      
      let handler = ''
      if (typeof prop.value === 'object' && prop.value.type === 'expression' && prop.value.expression) {
        handler = this.extractExpressionCode(prop.value.expression)
      } else if (typeof prop.value === 'string') {
        handler = prop.value
      }

      uiElement.events.push({
        event: eventType,
        handler: handler || '() => {}',
        isInline: true
      })
      return
    }

    // Handle regular props
    let propValue = prop.value
    let isReactive = false

    if (typeof prop.value === 'object' && prop.value.expression) {
      propValue = this.extractExpressionCode(prop.value.expression)
      isReactive = this.isReactiveExpression(propValue)
      
      if (isReactive) {
        const reactiveExpr = this.createReactiveExpression(propValue, 'attribute')
        structure.expressions.push(reactiveExpr)
      }
    }

    uiElement.props.push({
      name: prop.name,
      value: propValue,
      isReactive
    })
  }

  /**
   * Check if expression is reactive (contains .value references)
   */
  private isReactiveExpression(expr: string): boolean {
    return expr.includes('.value')
  }

  /**
   * Extract dependencies from reactive expression
   */
  private extractDependencies(expr: string): string[] {
    const deps: string[] = []
    const matches = expr.match(/(\w+)\.value/g)
    if (matches) {
      for (const match of matches) {
        const varName = match.replace('.value', '')
        if (!deps.includes(varName)) {
          deps.push(varName)
        }
      }
    }
    return deps
  }

  /**
   * Create reactive expression
   */
  private createReactiveExpression(
    expr: string, 
    type: 'text' | 'attribute' | 'condition' | 'loop'
  ): ReactiveExpression {
    return {
      expression: expr,
      dependencies: this.extractDependencies(expr),
      type,
      isWatch: this.isReactiveExpression(expr)
    }
  }

  /**
   * Extract expression code from Babel AST node
   */
  private extractExpressionCode(expression: any): string {
    if (!expression) return ''
    
    // Handle different expression types
    if (expression.type === 'Identifier') {
      return expression.name
    } else if (expression.type === 'ArrowFunctionExpression') {
      return this.extractArrowFunction(expression)
    } else if (expression.type === 'FunctionExpression') {
      return this.extractFunctionExpression(expression)
    } else if (expression.type === 'MemberExpression') {
      const object = this.extractExpressionCode(expression.object)
      const property = expression.computed 
        ? `[${this.extractExpressionCode(expression.property)}]`
        : `.${expression.property.name}`
      return `${object}${property}`
    } else if (expression.type === 'CallExpression') {
      const callee = this.extractExpressionCode(expression.callee)
      const args = expression.arguments.map((arg: any) => this.extractExpressionCode(arg)).join(', ')
      return `${callee}(${args})`
    } else if (expression.type === 'LogicalExpression') {
      const left = this.extractExpressionCode(expression.left)
      const right = this.extractExpressionCode(expression.right)
      return `${left} ${expression.operator} ${right}`
    } else if (expression.type === 'StringLiteral') {
      return `"${expression.value}"`
    } else if (expression.type === 'NumericLiteral') {
      return expression.value.toString()
    } else if (expression.type === 'BooleanLiteral') {
      return expression.value.toString()
    } else if (expression.type === 'ConditionalExpression') {
      // Handle ternary operator: condition ? true : false
      const test = this.extractExpressionCode(expression.test)
      const consequent = this.extractExpressionCode(expression.consequent)
      const alternate = this.extractExpressionCode(expression.alternate)
      return `${test} ? ${consequent} : ${alternate}`
    } else if (expression.type === 'BinaryExpression') {
      // Handle binary operations: a + b, a > b, etc.
      const left = this.extractExpressionCode(expression.left)
      const right = this.extractExpressionCode(expression.right)
      return `${left} ${expression.operator} ${right}`
    } else if (expression.type === 'BlockStatement') {
      return this.extractBlockStatement(expression)
    }
    
    // Fallback - try to extract from source if available
    return expression.name || expression.value || 'unknown'
  }

  /**
   * Extract arrow function expression
   */
  private extractArrowFunction(expr: any): string {
    const params = expr.params.map((param: any) => param.name || 'unknown').join(', ')
    const body = expr.body.type === 'BlockStatement' 
      ? this.extractBlockStatement(expr.body)
      : this.extractExpressionCode(expr.body)
    
    return `(${params}) => ${body}`
  }

  /**
   * Extract function expression
   */
  private extractFunctionExpression(expr: any): string {
    const params = expr.params.map((param: any) => param.name || 'unknown').join(', ')
    const body = this.extractBlockStatement(expr.body)
    
    return `function(${params}) ${body}`
  }

  /**
   * Extract block statement
   */
  private extractBlockStatement(block: any): string {
    if (!block || !block.body) return '{}'
    
    // For simple cases, try to extract the main statement
    if (block.body.length === 1) {
      const stmt = block.body[0]
      if (stmt.type === 'ExpressionStatement') {
        return this.extractExpressionCode(stmt.expression)
      } else if (stmt.type === 'ReturnStatement') {
        return this.extractExpressionCode(stmt.argument)
      }
    }
    
    // For complex blocks, return a placeholder
    return `{ /* ${block.body.length} statements */ }`
  }

  /**
   * Check if expression is conditional rendering (not conditional text expressions)
   */
  private isConditionalExpression(expr: string): boolean {
    // Only treat && and || as conditional rendering, not ternary operators
    // Ternary operators (?) are conditional expressions for text/values, not rendering
    return expr.includes('&&') || expr.includes('||')
  }

  /**
   * Check if expression is loop rendering
   */
  private isLoopExpression(expr: string): boolean {
    return expr.includes('.map(') || expr.includes('.filter(') || expr.includes('.forEach(')
  }

  /**
   * Analyze conditional expression
   */
  private analyzeConditional(expr: string, structure: JSXStructure): void {
    const reactiveExpr = this.createReactiveExpression(expr, 'condition')
    structure.expressions.push(reactiveExpr)

    // Extract condition and content
    let condition = ''
    let content = ''
    
    if (expr.includes('&&')) {
      const parts = expr.split('&&')
      condition = parts[0]?.trim() || ''
      content = parts.slice(1).join('&&').trim()
    } else if (expr.includes('?')) {
      const parts = expr.split('?')
      condition = parts[0]?.trim() || ''
      const ternaryParts = parts[1]?.split(':') || []
      content = ternaryParts[0]?.trim() || ''
    }

    const conditional: ConditionalBlock = {
      condition: this.createReactiveExpression(condition, 'condition'),
      thenBlock: [], // TODO: Parse JSX content
      elseBlock: undefined
    }
    
    structure.conditionals.push(conditional)
  }

  /**
   * Analyze loop expression
   */
  private analyzeLoop(expr: string, structure: JSXStructure): void {
    const reactiveExpr = this.createReactiveExpression(expr, 'loop')
    structure.expressions.push(reactiveExpr)

    // Extract array and iterator
    let arrayExpr = ''
    let iterator = ''
    
    const mapMatch = expr.match(/(.+)\.map\s*\(\s*([^)]+)\s*\)/)
    if (mapMatch) {
      arrayExpr = mapMatch[1]?.trim() || ''
      iterator = mapMatch[2]?.trim() || ''
    }

    const loop: LoopBlock = {
      iterable: this.createReactiveExpression(arrayExpr, 'loop'),
      itemName: iterator.split(',')[0]?.trim() || 'item',
      indexName: iterator.split(',')[1]?.trim(),
      body: [] // TODO: Parse JSX content
    }
    
    structure.loops.push(loop)
  }
}