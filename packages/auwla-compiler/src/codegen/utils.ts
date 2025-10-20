// Utility functions for codegen
import * as t from '@babel/types'
// @ts-ignore - ESM interop issue
import * as _babelGenerator from '@babel/generator'

// Normalize the generator import
const generate: any = (_babelGenerator as any)?.generate ?? (_babelGenerator as any)?.default?.default ?? (_babelGenerator as any)?.default;
import { getCurrentParsedFile } from './types.js'
import { analyzeJSX } from '../jsx-analyzer.js'

/**
 * Check if an identifier is declared as a ref in the helpers
 */
export function isRefIdentifier(name: string): boolean {
  const currentParsedFile = getCurrentParsedFile()
  if (!currentParsedFile) return false
  
  // Check pageHelpers (from <script>) for patterns like: const name = ref(...) or const name: Type = ref(...)
  for (const helper of currentParsedFile.pageHelpers) {
    // Match: const/let/var identifier (with optional type annotation) = ref(...)
    const refPattern = new RegExp(`(?:const|let|var)\\s+${name}\\s*(?::\\s*[^=]+)?\\s*=\\s*ref[<(]`)
    if (refPattern.test(helper)) {
      return true
    }
  }
  
  // Also check global helpers
  for (const helper of currentParsedFile.helpers) {
    const refPattern = new RegExp(`(?:const|let|var)\\s+${name}\\s*(?::\\s*[^=]+)?\\s*=\\s*ref[<(]`)
    if (refPattern.test(helper)) {
      return true
    }
  }
  
  // For TSX files, also check component function bodies for ref declarations
  for (const component of currentParsedFile.components) {
    if (component.body) {
      // Check if body is a BlockStatement with body array
      if (component.body.type === 'BlockStatement' && Array.isArray(component.body.body)) {
        for (const stmt of component.body.body) {
          if (stmt.type === 'VariableDeclaration') {
            for (const declarator of stmt.declarations) {
              if (declarator.id && declarator.id.name === name && 
                  declarator.init && declarator.init.type === 'CallExpression' &&
                  declarator.init.callee && declarator.init.callee.name === 'ref') {
                return true
              }
            }
          }
        }
      }
      // Check if body is directly an array (as seen in the JSON output)
      else if (Array.isArray(component.body)) {
        for (const stmt of component.body) {
          if (stmt.type === 'VariableDeclaration') {
            for (const declarator of stmt.declarations) {
              if (declarator.id && declarator.id.name === name && 
                  declarator.init && declarator.init.type === 'CallExpression' &&
                  declarator.init.callee && declarator.init.callee.name === 'ref') {
                return true
              }
            }
          }
        }
      }
    }
  }
  
  return false
}

/**
 * Extract ref identifiers from expression for watch()
 */
export function extractRefsFromExpression(expr: any): string[] {
  const refs = new Set<string>()
  
  function traverse(node: any) {
    if (!node) return
    
    if (t.isMemberExpression(node)) {
      // Check if this member expression is accessing .value (indicates the parent is a ref)
      if (t.isIdentifier(node.property) && node.property.name === 'value') {
        // Extract the object before .value (that's the ref)
        // e.g., todo.done.value -> we want todo.done
        const refCode = generate(node.object).code
        refs.add(refCode)
      }
      // Continue traversing
      traverse(node.object)
    } else if (t.isConditionalExpression(node)) {
      traverse(node.test)
      traverse(node.consequent)
      traverse(node.alternate)
    } else if (t.isLogicalExpression(node) || t.isBinaryExpression(node)) {
      traverse(node.left)
      traverse(node.right)
    } else if (t.isCallExpression(node)) {
      traverse(node.callee)
      node.arguments.forEach((arg: any) => traverse(arg))
    } else if (t.isArrayExpression(node)) {
      node.elements.forEach((el: any) => traverse(el))
    }
  }
  
  traverse(expr)
  return Array.from(refs)
}

/**
 * Check if tag name is PascalCase (custom component)
 */
export function isPascalCase(name: string): boolean {
  return /^[A-Z]/.test(name)
}

/**
 * Format complex expressions (like objects) with proper indentation
 */
export function formatComplexExpression(expr: any, baseIndent: number = 0): string {
  const code = generate(expr).code
  
  // If it's a simple expression (no braces or short), return as-is
  if (!code.includes('{') || code.length < 60) {
    return code
  }
  
  // For complex objects, format with proper indentation
  const spaces = '  '.repeat(baseIndent)
  const innerSpaces = '  '.repeat(baseIndent + 1)
  
  // Handle object literals
  if (t.isObjectExpression(expr)) {
    if (expr.properties.length === 0) {
      return '{}'
    }
    
    let formatted = '{\n'
    for (let i = 0; i < expr.properties.length; i++) {
      const prop = expr.properties[i]
      if (t.isObjectProperty(prop) || t.isObjectMethod(prop)) {
        const key = t.isIdentifier(prop.key) ? prop.key.name : generate(prop.key).code
        const value = t.isObjectProperty(prop) ? generate(prop.value).code : generate(prop).code
        formatted += `${innerSpaces}${key}: ${value}`
        if (i < expr.properties.length - 1) {
          formatted += ','
        }
        formatted += '\n'
      }
    }
    formatted += `${spaces}}`
    return formatted
  }
  
  // For other complex expressions, just return the generated code
  return code
}

/**
 * Simple JSX element analyzer (without full traversal)
 */
export function analyzeJSXElementSimple(element: any): any {
  // Create a temp function body to analyze
  const tempBody: any = {
    type: 'BlockStatement',
    body: [{
      type: 'ReturnStatement',
      argument: element
    }]
  }
  
  const analyzed = analyzeJSX(tempBody)
  return analyzed[0] || { type: 'element', tag: 'div', children: [] }
}