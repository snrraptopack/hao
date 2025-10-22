/**
 * TSX Parser - Parses TSX files and extracts component structure
 */

import { parse } from '@babel/parser'
// @ts-ignore - ESM interop issue
import traverseImport from '@babel/traverse'
import * as t from '@babel/types'

import type {
  TSXFile,
  PageMetadata,
  ImportDeclaration,
  ComponentDeclaration,
  CodeBlock,
  JSXElement,
  Parameter
} from '../types/index.js'
import { ParseError } from '../types/index.js'
import { isPascalCase, returnsJSX, extractCode, getPosition } from '../utils/index.js'

// Handle default export from @babel/traverse
const traverse = (traverseImport as any).default || traverseImport

/**
 * Parse TSX file and extract component structure
 */
export function parseTSX(content: string, filename: string = 'unknown.tsx'): TSXFile {
  try {
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx']
    })

    const result: TSXFile = {
      metadata: extractMetadata(content),
      imports: [],
      components: [],
      topLevelCode: []
    }

    traverse(ast, {
      // Extract imports
      ImportDeclaration(path: any) {
        const node = path.node
        const importDecl: ImportDeclaration = {
          source: node.source.value,
          specifiers: node.specifiers.map((spec: any) => ({
            imported: t.isImportDefaultSpecifier(spec) ? 'default' :
              t.isImportNamespaceSpecifier(spec) ? '*' :
                spec.imported.name,
            local: spec.local.name,
            type: t.isImportDefaultSpecifier(spec) ? 'default' :
              t.isImportNamespaceSpecifier(spec) ? 'namespace' : 'named'
          })),
          raw: extractCode(node, content)
        }
        result.imports.push(importDecl)
      },

      // Extract function declarations
      FunctionDeclaration(path: any) {
        const node = path.node
        const functionName = node.id?.name || 'Anonymous'

        // Skip if this is inside another function (will be handled as component body)
        if (path.getFunctionParent()) {
          return
        }

        // Skip if this function is being exported (will be handled by export handlers)
        const parent = path.parent
        if (t.isExportDefaultDeclaration(parent) || t.isExportNamedDeclaration(parent)) {
          return
        }

        // Check if this is a component function
        const isComponent = isPascalCase(functionName) || returnsJSX(node.body)

        if (isComponent) {
          const component = extractComponent(node, content, false, false)
          result.components.push(component)
        } else {
          // Regular function - add to top-level code
          const codeBlock = extractCodeBlock(node, content, 'top-level')
          result.topLevelCode.push(codeBlock)
        }
      },

      // Extract variable declarations
      VariableDeclaration(path: any) {
        const node = path.node

        // Check if this declares a component (const Component = () => JSX)
        let hasComponent = false
        for (const declarator of node.declarations) {
          if (t.isIdentifier(declarator.id) &&
            (t.isArrowFunctionExpression(declarator.init) || t.isFunctionExpression(declarator.init))) {
            const functionName = declarator.id.name
            const isComponent = isPascalCase(functionName) || returnsJSX(declarator.init.body)

            if (isComponent) {
              hasComponent = true
              const component = extractComponentFromVariable(declarator, content, false, false)
              result.components.push(component)
            }
          }
        }

        // If not a component, add as top-level code
        if (!hasComponent) {
          const parentFunction = path.getFunctionParent()
          const scope = parentFunction ? 'component-body' : 'top-level'
          const codeBlock = extractCodeBlock(node, content, scope)

          if (scope === 'top-level') {
            result.topLevelCode.push(codeBlock)
          } else {
            // This will be handled when processing the parent component
          }
        }
      },

      // Extract exported functions
      ExportDefaultDeclaration(path: any) {
        const node = path.node

        if (t.isFunctionDeclaration(node.declaration)) {
          const component = extractComponent(node.declaration, content, true, true)
          result.components.push(component)
        } else if (t.isArrowFunctionExpression(node.declaration) || t.isFunctionExpression(node.declaration)) {
          const component = extractComponentFromExpression(node.declaration, content, true, true)
          result.components.push(component)
        }
      },

      ExportNamedDeclaration(path: any) {
        const node = path.node

        if (node.declaration && t.isFunctionDeclaration(node.declaration)) {
          const component = extractComponent(node.declaration, content, true, false)
          result.components.push(component)
        }
      }
    })

    return result

  } catch (error) {
    if (error instanceof Error) {
      throw new ParseError(`Failed to parse TSX: ${error.message}`, filename)
    }
    throw new ParseError('Unknown parsing error', filename)
  }
}

/**
 * Extract metadata from file comments
 */
function extractMetadata(content: string): PageMetadata {
  const metadata: PageMetadata = {
    isPage: false
  }

  // Look for @page directive - check first few lines
  const lines = content.split(/\r?\n/)
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i]?.trim()
    if (!line || !line.startsWith('//')) continue

    // @page directive - use flexible regex
    const pageMatch = line.match(/\/\/.*@page(?:[\/\s]+(.*))?/)
    if (pageMatch) {
      metadata.isPage = true
      let pagePath = pageMatch[1]?.trim() || ''
      
      // Ensure path starts with / if it exists
      if (pagePath && !pagePath.startsWith('/')) {
        pagePath = `/${pagePath}`
      }
      
      if (pagePath) {
        metadata.route = pagePath
      }
      continue
    }

    // @title directive
    const titleMatch = line.match(/^\/\/\s*@title\s+(.+)$/i)
    if (titleMatch) {
      metadata.title = titleMatch[1].trim()
      continue
    }

    // @description directive
    const descMatch = line.match(/^\/\/\s*@description\s+(.+)$/i)
    if (descMatch) {
      metadata.description = descMatch[1].trim()
      continue
    }

    // @guard directive
    const guardMatch = line.match(/^\/\/\s*@guard\s+(.+)$/i)
    if (guardMatch) {
      metadata.guard = guardMatch[1].trim()
      continue
    }
  }

  return metadata
}

/**
 * Extract component from function declaration
 */
function extractComponent(
  node: t.FunctionDeclaration,
  content: string,
  isExported: boolean,
  isDefault: boolean
): ComponentDeclaration {
  const name = node.id?.name || (isDefault ? 'default' : 'Anonymous')

  return {
    name,
    isDefault,
    isExported,
    params: extractParameters(node.params),
    body: extractComponentBody(node.body, content),
    jsxReturn: extractJSXReturn(node.body)
  }
}

/**
 * Extract component from variable declaration (const Component = () => JSX)
 */
function extractComponentFromVariable(
  declarator: t.VariableDeclarator,
  content: string,
  isExported: boolean,
  isDefault: boolean
): ComponentDeclaration {
  const name = t.isIdentifier(declarator.id) ? declarator.id.name : 'Anonymous'
  const init = declarator.init as t.ArrowFunctionExpression | t.FunctionExpression

  return {
    name,
    isDefault,
    isExported,
    params: extractParameters(init.params),
    body: t.isBlockStatement(init.body) ? extractComponentBody(init.body, content) : [],
    jsxReturn: t.isBlockStatement(init.body) ? extractJSXReturn(init.body) : extractJSXFromExpression(init.body)
  }
}

/**
 * Extract component from function expression
 */
function extractComponentFromExpression(
  node: t.ArrowFunctionExpression | t.FunctionExpression,
  content: string,
  isExported: boolean,
  isDefault: boolean
): ComponentDeclaration {
  return {
    name: isDefault ? 'default' : 'Anonymous',
    isDefault,
    isExported,
    params: extractParameters(node.params),
    body: t.isBlockStatement(node.body) ? extractComponentBody(node.body, content) : [],
    jsxReturn: t.isBlockStatement(node.body) ? extractJSXReturn(node.body) : extractJSXFromExpression(node.body)
  }
}

/**
 * Extract parameters from function
 */
function extractParameters(params: (t.Identifier | t.Pattern | t.RestElement)[]): Parameter[] {
  return params.map(param => {
    if (t.isIdentifier(param)) {
      return {
        name: param.name,
        type: param.typeAnnotation ? 'any' : undefined // TODO: extract actual type
      }
    }
    // TODO: Handle other parameter types
    return { name: 'unknown' }
  })
}

/**
 * Extract component body (statements before return)
 */
function extractComponentBody(body: t.BlockStatement, content: string): CodeBlock[] {
  const codeBlocks: CodeBlock[] = []

  for (const statement of body.body) {
    if (t.isReturnStatement(statement)) {
      // Skip return statements - they're handled separately
      continue
    }

    const codeBlock = extractCodeBlock(statement, content, 'component-body')
    codeBlocks.push(codeBlock)
  }

  return codeBlocks
}

/**
 * Extract JSX return from function body
 */
function extractJSXReturn(body: t.BlockStatement): JSXElement | null {
  for (const statement of body.body) {
    if (t.isReturnStatement(statement) && statement.argument) {
      return extractJSXFromExpression(statement.argument)
    }
  }
  return null
}

/**
 * Extract JSX from expression
 */
function extractJSXFromExpression(expr: t.Expression): JSXElement | null {
  if (t.isJSXElement(expr)) {
    return {
      type: 'element',
      tag: getJSXTagName(expr.openingElement.name),
      props: extractJSXProps(expr.openingElement.attributes),
      children: extractJSXChildren(expr.children)
    }
  } else if (t.isJSXFragment(expr)) {
    return {
      type: 'fragment',
      children: extractJSXChildren(expr.children)
    }
  } else if (t.isParenthesizedExpression(expr)) {
    return extractJSXFromExpression(expr.expression)
  }
  return null
}

/**
 * Get JSX tag name
 */
function getJSXTagName(name: t.JSXElement['openingElement']['name']): string {
  if (t.isJSXIdentifier(name)) {
    return name.name
  } else if (t.isJSXMemberExpression(name)) {
    return getJSXMemberExpressionName(name)
  } else if (t.isJSXNamespacedName(name)) {
    return `${name.namespace.name}:${name.name.name}`
  }
  return 'unknown'
}

/**
 * Get member expression name (e.g., Foo.Bar)
 */
function getJSXMemberExpressionName(expr: t.JSXMemberExpression): string {
  const object = expr.object
  const property = t.isJSXIdentifier(expr.property) ? expr.property.name : 'unknown'

  if (t.isJSXIdentifier(object)) {
    return `${object.name}.${property}`
  } else if (t.isJSXMemberExpression(object)) {
    return `${getJSXMemberExpressionName(object)}.${property}`
  }
  return property
}

/**
 * Extract JSX props from attributes
 */
function extractJSXProps(attributes: (t.JSXAttribute | t.JSXSpreadAttribute)[]): any[] {
  return attributes.map(attr => {
    if (t.isJSXAttribute(attr)) {
      const name = t.isJSXIdentifier(attr.name) ? attr.name.name : 'unknown'
      let value = null

      if (attr.value) {
        if (t.isStringLiteral(attr.value)) {
          value = attr.value.value
        } else if (t.isJSXExpressionContainer(attr.value)) {
          value = { type: 'expression', expression: attr.value.expression }
        }
      }

      return { name, value, isSpread: false }
    } else if (t.isJSXSpreadAttribute(attr)) {
      return { name: '...spread', value: attr.argument, isSpread: true }
    }
    return { name: 'unknown', value: null, isSpread: false }
  })
}

/**
 * Extract JSX children
 */
function extractJSXChildren(children: (t.JSXText | t.JSXElement | t.JSXFragment | t.JSXExpressionContainer | t.JSXSpreadChild)[]): JSXElement[] {
  const result: JSXElement[] = []

  for (const child of children) {
    if (t.isJSXElement(child)) {
      result.push({
        type: 'element',
        tag: getJSXTagName(child.openingElement.name),
        props: extractJSXProps(child.openingElement.attributes),
        children: extractJSXChildren(child.children)
      })
    } else if (t.isJSXFragment(child)) {
      result.push({
        type: 'fragment',
        children: extractJSXChildren(child.children)
      })
    } else if (t.isJSXText(child)) {
      const text = child.value.trim()
      if (text) {
        result.push({
          type: 'text',
          text
        })
      }
    } else if (t.isJSXExpressionContainer(child)) {
      result.push({
        type: 'expression',
        expression: child.expression
      })
    }
  }

  return result
}

/**
 * Extract code block from AST node
 */
function extractCodeBlock(node: t.Node, content: string, scope: 'top-level' | 'component-body'): CodeBlock {
  const code = extractCode(node, content)

  return {
    type: getCodeBlockType(node),
    code,
    dependencies: extractBasicDependencies(code),
    scope,
    startLine: node.loc?.start.line,
    endLine: node.loc?.end.line
  }
}

/**
 * Extract basic dependencies from code (simple version)
 */
function extractBasicDependencies(code: string): string[] {
  const dependencies: string[] = []

  // Remove comments and strings to avoid false positives
  const cleanCode = code
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/"[^"]*"/g, '""')
    .replace(/'[^']*'/g, "''")
    .replace(/`[^`]*`/g, '``')

  // Find variable references (not declarations)
  const refs = cleanCode.match(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g) || []

  const keywords = new Set([
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
    'true', 'false', 'null', 'undefined', 'console', 'window', 'document',
    'value', 'length', 'push', 'pop', 'map', 'filter', 'reduce'
  ])

  for (const ref of refs) {
    if (!keywords.has(ref) && !dependencies.includes(ref)) {
      dependencies.push(ref)
    }
  }

  return dependencies
}

/**
 * Determine code block type
 */
function getCodeBlockType(node: t.Node): 'variable' | 'function' | 'expression' {
  if (t.isVariableDeclaration(node)) return 'variable'
  if (t.isFunctionDeclaration(node)) return 'function'
  return 'expression'
}