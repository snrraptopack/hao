import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import * as t from '@babel/types'
import generate from '@babel/generator'

export interface TSXComponent {
  name: string
  isDefault: boolean
  isExported: boolean
  componentScopeCode: string[] // Code outside component function (refs, helpers)
  uiScopeCode: string[] // Code inside component function (before return)
  jsxContent: string // The JSX return content
  imports: string[]
  types: string[]
  metadata: {
    page?: string
    title?: string
    description?: string
    guard?: string
  }
}

/**
 * Parse TSX file and extract component structure
 */
export function parseTSXFile(content: string): TSXComponent {
  const ast = parse(content, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx']
  })

  const result: TSXComponent = {
    name: 'Component',
    isDefault: false,
    isExported: false,
    componentScopeCode: [],
    uiScopeCode: [],
    jsxContent: '',
    imports: [],
    types: [],
    metadata: {}
  }

  // Extract metadata from comments
  result.metadata = extractMetadata(content)

  traverse(ast, {
    // Extract imports
    ImportDeclaration(path) {
      const importCode = generate(path.node).code
      // Filter out auwla imports - we'll add our own
      if (!importCode.includes("from 'auwla'") && !importCode.includes('from "auwla"')) {
        result.imports.push(importCode)
      }
    },

    // Extract type declarations
    TSInterfaceDeclaration(path) {
      result.types.push(generate(path.node).code)
    },

    TSTypeAliasDeclaration(path) {
      result.types.push(generate(path.node).code)
    },

    // Extract top-level variables (component scope)
    VariableDeclaration(path) {
      // Skip if inside a function
      if (path.getFunctionParent()) return
      
      result.componentScopeCode.push(generate(path.node).code)
    },

    // Extract top-level functions (component scope)
    FunctionDeclaration(path) {
      const functionName = path.node.id?.name
      if (!functionName) return

      // Check if this is a component function (PascalCase)
      if (isPascalCase(functionName)) {
        result.name = functionName
        extractComponentBody(path.node, result)
      } else {
        // Helper function - goes to component scope
        result.componentScopeCode.push(generate(path.node).code)
      }
    },

    // Extract exported functions
    ExportDefaultDeclaration(path) {
      if (t.isFunctionDeclaration(path.node.declaration)) {
        const functionName = path.node.declaration.id?.name || 'Component'
        result.name = functionName
        result.isDefault = true
        result.isExported = true
        extractComponentBody(path.node.declaration, result)
      }
    },

    ExportNamedDeclaration(path) {
      if (path.node.declaration && t.isFunctionDeclaration(path.node.declaration)) {
        const functionName = path.node.declaration.id?.name
        if (functionName && isPascalCase(functionName)) {
          result.name = functionName
          result.isExported = true
          extractComponentBody(path.node.declaration, result)
        }
      }
    }
  })

  return result
}

/**
 * Extract component function body and separate UI scope code from JSX
 */
function extractComponentBody(functionNode: t.FunctionDeclaration, result: TSXComponent) {
  const body = functionNode.body.body

  for (const statement of body) {
    if (t.isReturnStatement(statement)) {
      // This is the JSX return - extract it
      if (statement.argument) {
        result.jsxContent = generate(statement.argument).code
      }
    } else {
      // This is UI scope code (inside component function, before return)
      const code = generate(statement).code
      // Avoid duplicates
      if (!result.uiScopeCode.includes(code)) {
        result.uiScopeCode.push(code)
      }
    }
  }
}

/**
 * Convert TSX component to Auwla Component format
 */
export function generateAuwlaFromTSX(component: TSXComponent): string {
  let code = ''

  // Add imports
  code += generateImports(component)
  code += '\n'

  // Add types
  if (component.types.length > 0) {
    code += component.types.join('\n\n') + '\n\n'
  }

  // Generate component function
  code += `export default function ${component.name}() {\n`

  // Add component scope code (refs, helpers)
  if (component.componentScopeCode.length > 0) {
    code += component.componentScopeCode.map(line => `  ${line}`).join('\n') + '\n\n'
  }

  code += `  return Component((ui: LayoutBuilder) => {\n`

  // Add UI scope code (inside component function)
  if (component.uiScopeCode.length > 0) {
    code += component.uiScopeCode.map(line => `    ${line}`).join('\n') + '\n\n'
  }

  // Convert JSX to UI builder calls
  if (component.jsxContent) {
    const uiCalls = convertJSXToUIBuilder(component.jsxContent)
    code += uiCalls.map(call => `    ${call}`).join('\n') + '\n'
  }

  code += `  })\n`
  code += `}\n`

  return code
}

/**
 * Generate proper imports for Auwla
 */
function generateImports(component: TSXComponent): string {
  let code = ''

  // Determine what we need from auwla
  const auwlaImports = ['Component']
  const auwlaTypeImports = ['LayoutBuilder']

  // Check if we need ref
  const needsRef = component.componentScopeCode.some(line => 
    line.includes('ref(') || line.includes('ref<')
  )
  if (needsRef) {
    auwlaImports.push('ref')
    auwlaTypeImports.push('Ref')
  }

  // Check if we need watch
  const needsWatch = component.componentScopeCode.some(line => 
    line.includes('watch(') || line.includes('watch<')
  ) || component.jsxContent.includes('&&') || component.jsxContent.includes('?') ||
  component.jsxContent.includes('.value')
  if (needsWatch) {
    auwlaImports.push('watch')
  }

  code += `import { ${auwlaImports.join(', ')} } from 'auwla'\n`
  code += `import type { ${auwlaTypeImports.join(', ')} } from 'auwla'\n`

  // Add other imports
  if (component.imports.length > 0) {
    code += component.imports.join('\n') + '\n'
  }

  return code
}

/**
 * Convert JSX content to UI builder method calls
 */
function convertJSXToUIBuilder(jsxContent: string): string[] {
  try {
    // Parse the JSX
    const ast = parse(`const temp = ${jsxContent}`, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx']
    })

    const calls: string[] = []

    traverse(ast, {
      JSXElement(path) {
        // Only process top-level JSX elements
        if (path.findParent(p => p.isJSXElement())) return

        const uiCall = convertJSXElementToUICall(path.node)
        if (uiCall) {
          calls.push(uiCall)
        }
      }
    })

    return calls
  } catch (error) {
    console.warn('Failed to parse JSX:', error)
    return [`ui.Div({ text: "Failed to parse JSX" })`]
  }
}

/**
 * Convert a single JSX element to UI builder call
 */
function convertJSXElementToUICall(element: t.JSXElement): string {
  const openingElement = element.openingElement
  const tagName = getTagName(openingElement.name)
  
  if (!tagName) return ''

  // Convert tag name to UI method (div -> Div)
  const uiMethod = tagName.charAt(0).toUpperCase() + tagName.slice(1)

  // Extract props
  const config = extractPropsConfig(openingElement.attributes)
  
  // Extract children
  const children = element.children
  const hasChildren = children.length > 0

  // Check if this element should have text content in config (buttons, spans, etc.)
  const isTextInConfigElement = ['button', 'span', 'a'].includes(tagName.toLowerCase())
  
  // Check if this is a simple text-only element (single text or single expression)
  const isSimpleTextOnly = hasChildren && children.length === 1 && 
    (t.isJSXText(children[0]) || 
     (t.isJSXExpressionContainer(children[0]) && 
      !t.isLogicalExpression((children[0] as t.JSXExpressionContainer).expression)))

  // Check if this is mixed text content that can be combined (for buttons)
  const isMixedTextContent = hasChildren && isTextInConfigElement &&
    children.every(child => 
      t.isJSXText(child) || 
      (t.isJSXExpressionContainer(child) && 
       !t.isLogicalExpression((child as t.JSXExpressionContainer).expression))
    )

  if ((isSimpleTextOnly || isMixedTextContent) && isTextInConfigElement) {
    // Elements like button, span, a - put text content in config
    let textConfig = config.slice(0, -1) // Remove closing brace
    
    if (isSimpleTextOnly) {
      // Single child (text or expression)
      const child = children[0]
      
      if (t.isJSXText(child)) {
        const text = child.value.trim()
        if (text) {
          textConfig += textConfig === '{' ? '' : ', '
          textConfig += `text: "${text}"`
        }
      } else if (t.isJSXExpressionContainer(child)) {
        const exprCode = generate((child as t.JSXExpressionContainer).expression as any).code
        textConfig += textConfig === '{' ? '' : ', '
        
        // Handle reactive expressions - for buttons we need to use watch for dynamic text
        if (exprCode.includes('.value')) {
          // For dynamic button text, we need to create a reactive expression
          const refs = extractRefsFromExpression(exprCode)
          if (refs.length > 0) {
            // Convert template literal with .value to proper watch expression
            const watchExpression = exprCode.replace(/(\w+)\.value/g, '${$1.value}')
            textConfig += `text: watch([${refs.join(', ')}], () => \`${watchExpression}\`)`
          } else {
            textConfig += `text: \`${exprCode}\``
          }
        } else {
          textConfig += `text: ${exprCode}`
        }
      }
    } else if (isMixedTextContent) {
      // Mixed text and expressions - combine into template literal
      textConfig += textConfig === '{' ? '' : ', '
      
      let templateParts: string[] = []
      let hasReactiveContent = false
      let allRefs: string[] = []
      
      for (const child of children) {
        if (t.isJSXText(child)) {
          templateParts.push(child.value)
        } else if (t.isJSXExpressionContainer(child)) {
          const exprCode = generate((child as t.JSXExpressionContainer).expression as any).code
          if (exprCode.includes('.value')) {
            hasReactiveContent = true
            const refs = extractRefsFromExpression(exprCode)
            allRefs.push(...refs)
            templateParts.push(`\${${exprCode}}`)
          } else {
            templateParts.push(`\${${exprCode}}`)
          }
        }
      }
      
      const templateLiteral = templateParts.join('')
      
      if (hasReactiveContent && allRefs.length > 0) {
        // Use watch for reactive template
        const uniqueRefs = [...new Set(allRefs)]
        textConfig += `text: watch([${uniqueRefs.join(', ')}], () => \`${templateLiteral}\`)`
      } else {
        // Static template
        textConfig += `text: \`${templateLiteral}\``
      }
    }
    
    textConfig += '}'
    return `ui.${uiMethod}(${textConfig})`
  } else if (isSimpleTextOnly && !isTextInConfigElement) {
    // Elements like p, h1, etc. - can use value prop for simple reactive text
    const child = children[0]
    let textConfig = config.slice(0, -1) // Remove closing brace
    
    if (t.isJSXText(child)) {
      const text = child.value.trim()
      if (text) {
        textConfig += textConfig === '{' ? '' : ', '
        textConfig += `text: "${text}"`
      }
    } else if (t.isJSXExpressionContainer(child)) {
      const exprCode = generate((child as t.JSXExpressionContainer).expression as any).code
      textConfig += textConfig === '{' ? '' : ', '
      
      // Handle reactive expressions
      if (exprCode.includes('.value')) {
        // Convert count.value to count for reactive binding
        const refName = exprCode.replace('.value', '')
        textConfig += `value: ${refName}`
      } else {
        textConfig += `value: ${exprCode}`
      }
    }
    
    textConfig += '}'
    return `ui.${uiMethod}(${textConfig})`
  } else if (hasChildren) {
    // Element with complex children
    const childrenCode = convertChildrenToUICode(children)
    return `ui.${uiMethod}(${config}, (ui: LayoutBuilder) => {\n${childrenCode}\n    })`
  } else {
    // Self-closing element
    return `ui.${uiMethod}(${config})`
  }
}

/**
 * Extract props from JSX attributes and convert to config object
 */
function extractPropsConfig(attributes: (t.JSXAttribute | t.JSXSpreadAttribute)[]): string {
  const props: string[] = []

  for (const attr of attributes) {
    if (t.isJSXAttribute(attr)) {
      const propName = getAttributeName(attr.name)
      if (!propName) continue

      // Handle different prop types
      if (propName === 'className' || propName === 'class') {
        const value = getAttributeValue(attr.value)
        if (value) {
          props.push(`className: ${value}`)
        }
      } else if (propName.startsWith('on') && propName.length > 2) {
        // Event handler (onClick, onInput, etc.)
        const eventName = propName.slice(2).toLowerCase()
        const handler = getAttributeValue(attr.value)
        if (handler) {
          props.push(`on: { ${eventName}: ${handler} }`)
        }
      } else if (propName === 'children') {
        // Skip children prop - handled separately
        continue
      } else {
        // Regular prop
        const value = getAttributeValue(attr.value)
        if (value) {
          props.push(`${propName}: ${value}`)
        }
      }
    }
  }

  return props.length > 0 ? `{ ${props.join(', ')} }` : '{}'
}

/**
 * Convert JSX children to UI builder code
 */
function convertChildrenToUICode(children: (t.JSXText | t.JSXElement | t.JSXExpressionContainer | t.JSXFragment | t.JSXSpreadChild)[]): string {
  const childCalls: string[] = []

  // Combine adjacent text and expressions into a single text element when possible
  let textParts: string[] = []
  
  const flushTextParts = () => {
    if (textParts.length > 0) {
      if (textParts.length === 1 && !textParts[0].includes('${')) {
        // Simple text
        childCalls.push(`      ui.Text({ text: "${textParts[0]}" })`)
      } else {
        // Complex text with interpolation
        const combinedText = textParts.join('')
        childCalls.push(`      ui.Text({ value: \`${combinedText}\` })`)
      }
      textParts = []
    }
  }

  for (const child of children) {
    if (t.isJSXText(child)) {
      const text = child.value.trim()
      if (text) {
        textParts.push(text)
      }
    } else if (t.isJSXExpressionContainer(child)) {
      const expr = child.expression
      if (t.isExpression(expr)) {
        const exprCode = generate(expr).code
        
        // Handle different expression types
        if (t.isLogicalExpression(expr) && expr.operator === '&&') {
          // Flush any pending text first
          flushTextParts()
          
          // Conditional rendering: condition && <element>
          const conditionCode = generate(expr.left).code
          const rightSide = expr.right
          
          // Convert condition to proper ref if needed
          const condition = convertExpressionToReactiveCondition(conditionCode)
          
          if (t.isJSXElement(rightSide)) {
            const elementCall = convertJSXElementToUICall(rightSide)
            childCalls.push(`      ui.When(${condition}, (ui: LayoutBuilder) => {`)
            childCalls.push(`        ${elementCall}`)
            childCalls.push(`      })`)
          }
        } else {
          // Regular expression - add to text parts
          const reactiveExpr = convertExpressionToReactiveValue(exprCode)
          textParts.push(`\${${reactiveExpr}}`)
        }
      }
    } else if (t.isJSXElement(child)) {
      // Flush any pending text first
      flushTextParts()
      
      const childCall = convertJSXElementToUICall(child)
      if (childCall) {
        childCalls.push(`      ${childCall}`)
      }
    }
  }
  
  // Flush any remaining text
  flushTextParts()

  return childCalls.join('\n')
}

/**
 * Convert expression to reactive condition for ui.When()
 */
function convertExpressionToReactiveCondition(exprCode: string): string {
  // If expression uses .value, we need to wrap it in watch
  if (exprCode.includes('.value')) {
    // Extract ref names from the expression
    const refMatches = exprCode.match(/(\w+)\.value/g)
    if (refMatches) {
      const refNames = refMatches.map(match => match.replace('.value', ''))
      const uniqueRefs = [...new Set(refNames)]
      return `watch([${uniqueRefs.join(', ')}], () => ${exprCode}) as Ref<boolean>`
    }
  }
  
  // If it's a simple ref without .value, return as-is
  return exprCode
}

/**
 * Convert expression to reactive value for text interpolation
 */
function convertExpressionToReactiveValue(exprCode: string): string {
  // If expression uses .value, keep it for template literals
  return exprCode
}

/**
 * Clean up and format text content
 */
function cleanTextContent(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

/**
 * Helper functions
 */
function isPascalCase(name: string): boolean {
  return /^[A-Z]/.test(name)
}

function getTagName(name: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName): string | null {
  if (t.isJSXIdentifier(name)) {
    return name.name
  }
  return null
}

function getAttributeName(name: t.JSXIdentifier | t.JSXNamespacedName): string | null {
  if (t.isJSXIdentifier(name)) {
    return name.name
  }
  return null
}

function getAttributeValue(value: t.JSXElement | t.JSXFragment | t.StringLiteral | t.JSXExpressionContainer | null | undefined): string | null {
  if (!value) return 'true' // Boolean attribute
  
  if (t.isStringLiteral(value)) {
    return `"${value.value}"`
  }
  
  if (t.isJSXExpressionContainer(value)) {
    return generate(value.expression as any).code
  }
  
  return null
}

function extractMetadata(content: string): TSXComponent['metadata'] {
  const metadata: TSXComponent['metadata'] = {}
  
  const pageMatch = content.match(/\/\/\s*@page\s+(.+)/i)
  if (pageMatch) metadata.page = pageMatch[1].trim()
  
  const titleMatch = content.match(/\/\/\s*@title\s+(.+)/i)
  if (titleMatch) metadata.title = titleMatch[1].trim()
  
  const descMatch = content.match(/\/\/\s*@description\s+(.+)/i)
  if (descMatch) metadata.description = descMatch[1].trim()
  
  const guardMatch = content.match(/\/\/\s*@guard\s+(.+)/i)
  if (guardMatch) metadata.guard = guardMatch[1].trim()
  
  return metadata
}

/**
 * Extract ref names from an expression like "count.value > 5"
 */
function extractRefsFromExpression(exprCode: string): string[] {
  const refMatches = exprCode.match(/(\w+)\.value/g)
  if (refMatches) {
    const refNames = refMatches.map(match => match.replace('.value', ''))
    return [...new Set(refNames)] // Remove duplicates
  }
  return []
}