/**
 * AST utility functions for TSX compilation
 */

import * as t from '@babel/types'
// @ts-ignore - ESM interop issue
import * as _babelGenerator from '@babel/generator'

// Normalize the generator import
const generate: any = (_babelGenerator as any)?.generate ?? (_babelGenerator as any)?.default?.default ?? (_babelGenerator as any)?.default

/**
 * Check if a function name follows PascalCase (component naming convention)
 */
export function isPascalCase(name: string): boolean {
  return /^[A-Z][a-zA-Z0-9]*$/.test(name)
}

/**
 * Check if a function returns JSX elements
 */
export function returnsJSX(body: t.BlockStatement | t.Expression): boolean {
  if (t.isBlockStatement(body)) {
    // Check if any return statement returns JSX
    for (const statement of body.body) {
      if (t.isReturnStatement(statement) && statement.argument) {
        return isJSXExpression(statement.argument)
      }
    }
  } else if (t.isExpression(body)) {
    // Arrow function with expression body
    return isJSXExpression(body)
  }
  return false
}

/**
 * Check if an expression is JSX
 */
export function isJSXExpression(expr: t.Expression): boolean {
  return (
    t.isJSXElement(expr) ||
    t.isJSXFragment(expr) ||
    (t.isParenthesizedExpression(expr) && isJSXExpression(expr.expression))
  )
}

/**
 * Extract code from AST node with source mapping
 */
export function extractCode(node: t.Node, source: string): string {
  if (node.start !== null && node.end !== null && node.start !== undefined && node.end !== undefined) {
    return source.substring(node.start, node.end)
  }
  // Fallback to generator if source positions not available
  return generate(node).code
}

/**
 * Get line and column from source position
 */
export function getPosition(source: string, pos: number): { line: number; column: number } {
  const lines = source.substring(0, pos).split('\n')
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  }
}

/**
 * Extract variable names from an expression
 */
export function extractVariableNames(expr: t.Expression): string[] {
  const variables: string[] = []
  
  function visit(node: t.Node) {
    if (t.isIdentifier(node)) {
      variables.push(node.name)
    } else if (t.isMemberExpression(node)) {
      visit(node.object)
      if (t.isIdentifier(node.property) && !node.computed) {
        // Don't include property names for non-computed access
      } else if (node.computed) {
        visit(node.property)
      }
    } else if (t.isCallExpression(node)) {
      visit(node.callee)
      node.arguments.forEach(visit)
    } else if (t.isBinaryExpression(node) || t.isLogicalExpression(node)) {
      visit(node.left)
      visit(node.right)
    } else if (t.isUnaryExpression(node)) {
      visit(node.argument)
    } else if (t.isConditionalExpression(node)) {
      visit(node.test)
      visit(node.consequent)
      visit(node.alternate)
    }
  }
  
  visit(expr)
  return [...new Set(variables)] // Remove duplicates
}

/**
 * Check if expression contains reactive references (.value)
 */
export function hasReactiveReferences(expr: t.Expression): boolean {
  let hasReactive = false
  
  function visit(node: t.Node) {
    if (hasReactive) return
    
    if (t.isMemberExpression(node) && 
        t.isIdentifier(node.property) && 
        node.property.name === 'value' && 
        !node.computed) {
      hasReactive = true
      return
    }
    
    // Recursively check child nodes
    Object.values(node).forEach(value => {
      if (value && typeof value === 'object' && 'type' in value) {
        visit(value as t.Node)
      } else if (Array.isArray(value)) {
        value.forEach(item => {
          if (item && typeof item === 'object' && 'type' in item) {
            visit(item as t.Node)
          }
        })
      }
    })
  }
  
  visit(expr)
  return hasReactive
}