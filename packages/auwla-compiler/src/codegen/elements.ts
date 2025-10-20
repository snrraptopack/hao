// JSX element generators (regular elements, custom components, etc.)
import * as t from '@babel/types'
// @ts-ignore - ESM interop issue
import * as _babelGenerator from '@babel/generator'

// Normalize the generator import
const generate: any = (_babelGenerator as any)?.generate ?? (_babelGenerator as any)?.default?.default ?? (_babelGenerator as any)?.default;
import { isPascalCase, extractRefsFromExpression, formatComplexExpression } from './utils.js'
import * as controlFlow from './control-flow.js'

/**
 * Generate code for a single JSX node
 */
export function generateNode(node: any, indent: number): string {
  const spaces = '  '.repeat(indent)
  
  if (node.type === 'text') {
    // Static text
    return `${spaces}ui.Text({ value: "${node.text}" })\n`
  }
  
  if (node.type === 'expression') {
    // Check if it's a control flow expression ($if, $each, or .map())
    if ((node as any).isControlFlow) {
      const controlFlowType = (node as any).controlFlowType
      
      if (controlFlowType === 'if') {
        return controlFlow.generateIfExpression(node.expression, indent, generateNode)
      }
      
      if (controlFlowType === 'elseif') {
        return controlFlow.generateElseIfExpression(node.expression, indent, generateNode)
      }
      
      if (controlFlowType === 'else') {
        return controlFlow.generateElseExpression(node.expression, indent, generateNode)
      }
      
      if (controlFlowType === 'each') {
        return controlFlow.generateEachExpression(node.expression, indent, generateNode)
      }
      
      if (controlFlowType === 'map') {
        return controlFlow.generateMapExpression(node.expression, indent, generateNode)
      }
    }
    
    // Dynamic expression {someValue}
    const expr = generate(node.expression as any).code
    
    // Check if this expression contains reactive refs
    const refs = extractRefsFromExpression(node.expression)
    
    if (refs.length > 0) {
      // Reactive expression - wrap in watch() to create a Ref<string>
      return `${spaces}ui.Text({ value: watch([${refs.join(', ')}], () => String(${expr})) as Ref<string> })\n`
    } else {
      // Static expression - evaluate directly
      return `${spaces}ui.Text({ value: String(${expr}) })\n`
    }
  }
  
  if (node.type === 'element') {
    return generateElement(node, indent)
  }
  
  return ''
}

/**
 * Generate code for an element (regular elements only, control flow handled in generateNode)
 */
function generateElement(node: any, indent: number): string {
  // Special case: <a> tags with href should compile to Link component
  if (node.tag === 'a' && node.props && node.props.some((p: any) => p.name === 'href')) {
    return generateLinkComponent(node, indent)
  }
  
  // Special case: PascalCase components (custom components)
  if (node.tag && isPascalCase(node.tag)) {
    return generateCustomComponent(node, indent)
  }
  
  return generateElementBody(node, indent)
}

/**
 * Generate custom component usage: <Card prop={value} /> → ui.append(Card({ prop: value }))
 */
function generateCustomComponent(node: any, indent: number): string {
  const spaces = '  '.repeat(indent)
  const componentName = node.tag
  
  // Build props object
  const propsParts: string[] = []
  
  if (node.props) {
    for (const prop of node.props) {
      if (prop.isSpread) continue
      
      const propName = prop.name
      
      // Skip event handler props - they'll be handled separately
      if (propName.startsWith('on') && propName.length > 2) {
        continue
      }
      
      let propValue: string
      
      if (!prop.value) {
        // Boolean prop
        propValue = 'true'
      } else if (t.isStringLiteral(prop.value)) {
        propValue = `"${prop.value.value}"`
      } else if (t.isJSXExpressionContainer(prop.value)) {
        propValue = generate(prop.value.expression as any).code
      } else {
        propValue = generate(prop.value as any).code
      }
      
      propsParts.push(`${propName}: ${propValue}`)
    }
  }
  
  // Handle event handler props (onClick, onInput, etc.)
  if (node.props) {
    for (const prop of node.props) {
      if (prop.isSpread) continue
      
      if (prop.name.startsWith('on') && prop.name.length > 2) {
        // Convert onClick -> onClick (keep as-is for component props)
        const eventPropName = prop.name
        
        if (prop.value && t.isJSXExpressionContainer(prop.value)) {
          const handlerCode = generate(prop.value.expression as any).code
          propsParts.push(`${eventPropName}: ${handlerCode}`)
        }
      }
    }
  }
  
  // Handle directives (event handlers from JSX analyzer)
  if (node.directives) {
    for (const directive of node.directives) {
      // Convert directive back to prop name (click -> onClick)
      const propName = `on${directive.name.charAt(0).toUpperCase() + directive.name.slice(1)}`
      const handlerCode = generate(directive.value as any).code
      propsParts.push(`${propName}: ${handlerCode}`)
    }
  }
  
  const propsStr = propsParts.length > 0 ? `{ ${propsParts.join(', ')} }` : '{}'
  
  return `${spaces}ui.append(${componentName}(${propsStr}))\n`
}

/**
 * Generate Link component for <a href="/path">text</a>
 * Compiles to: ui.append(Link({ to: '/path', text: 'text', className: '...' }))
 */
function generateLinkComponent(node: any, indent: number): string {
  const spaces = '  '.repeat(indent)
  
  // Extract href from props array
  const hrefProp = node.props?.find((p: any) => p.name === 'href')
  if (!hrefProp) return ''
  
  const to = typeof hrefProp.value === 'string' 
    ? `'${hrefProp.value}'` 
    : generate(hrefProp.value as any).code
  
  // Extract text from children
  let text = ''
  if (node.children && node.children.length > 0) {
    const firstChild = node.children[0]
    if (firstChild.type === 'text') {
      text = `'${firstChild.text?.trim()}'`
    } else if (firstChild.type === 'expression') {
      text = generate(firstChild.expression as any).code
    }
  }
  
  // Extract className from props array (could be 'class' or 'className')
  const classNameProp = node.props?.find((p: any) => p.name === 'class' || p.name === 'className')
  const classNameStr = classNameProp
    ? typeof classNameProp.value === 'string' 
      ? `className: '${classNameProp.value}'`
      : `className: ${generate(classNameProp.value as any).code}`
    : ''
  
  // Build Link config
  const config = [
    `to: ${to}`,
    text ? `text: ${text}` : '',
    classNameStr
  ].filter(Boolean).join(', ')
  
  return `${spaces}ui.append(Link({ ${config} }))\n`
}

/**
 * Generate the element body (config + children)
 */
function generateElementBody(node: any, indent: number): string {
  const spaces = '  '.repeat(indent)
  let code = ''
  
  if (!node.tag) return code
  
  // Capitalize tag name (div -> Div)
  const tagName = node.tag.charAt(0).toUpperCase() + node.tag.slice(1)
  
  // Check if this is a text-only element (optimization)
  const hasChildren = node.children && node.children.length > 0
  
  // Check if all children are text/expressions (can be combined into text prop)
  // But exclude control flow expressions - they need their own structure
  const isTextOnly = hasChildren && node.children!.every((child: any) => 
    (child.type === 'text' || child.type === 'expression') && !(child as any).isControlFlow
  )
  
  if (isTextOnly && node.children!.length > 0) {
    // Element with only text/expressions - combine into single text prop
    const configWithText = buildConfigObjectWithMultipleText(node, node.children!)
    code += `${spaces}ui.${tagName}(${configWithText})\n`
  } else {
    // Build config object
    const config = buildConfigObject(node)
    
    if (hasChildren) {
      // Element with children: ui.Div({ ... }, (ui: LayoutBuilder) => { ... })
      code += `${spaces}ui.${tagName}(${config}, (ui: LayoutBuilder) => {\n`
      
      // Generate children
      if (node.children) {
        for (const child of node.children) {
          code += generateNode(child, indent + 1)
        }
      }
      
      code += `${spaces}})\n`
    } else {
      // Element without children: ui.Div({ ... })
      code += `${spaces}ui.${tagName}(${config})\n`
    }
  }
  
  return code
}

/**
 * Build config object: { className: "...", on: { click: handler }, value: ref }
 */
function buildConfigObject(node: any): string {
  return buildConfigObjectInternal(node, null)
}

/**
 * Build config object with multiple text/expression children
 */
function buildConfigObjectWithMultipleText(node: any, textChildren: any[]): string {
  return buildConfigObjectInternal(node, textChildren)
}

/**
 * Build config object implementation
 */
function buildConfigObjectInternal(node: any, textChildren: any[] | null): string {
  const configParts: string[] = []
  
  // Add text content if provided
  if (textChildren && textChildren.length > 0) {
    if (textChildren.length === 1) {
      // Single text/expression child
      const child = textChildren[0]
      
      if (child.type === 'text') {
        // Static text
        configParts.push(`text: "${child.text || ''}"`)
      } else if (child.type === 'expression') {
        // Dynamic expression
        const exprCode = generate(child.expression as any).code
        
        // Check if it's reactive (contains .value)
        if (exprCode.includes('.value')) {
          const refs = extractRefsFromExpression(child.expression)
          if (refs.length > 0) {
            // Use template literal for better formatting
            configParts.push(`text: watch([${refs.join(', ')}], () => \`${exprCode}\`) as Ref<string>`)
          } else {
            configParts.push(`text: () => \`${exprCode}\``)
          }
        } else {
          // Not reactive
          configParts.push(`text: \`${exprCode}\``)
        }
      }
    } else {
      // Multiple text/expression children - use template literal for better formatting
      const templateParts: string[] = []
      const allRefs: string[] = []
      
      for (const child of textChildren) {
        if (child.type === 'text') {
          templateParts.push(child.text || '')
        } else if (child.type === 'expression') {
          const exprCode = generate(child.expression as any).code
          templateParts.push(`\${${exprCode}}`)
          
          // Collect refs for watch
          if (exprCode.includes('.value')) {
            const refs = extractRefsFromExpression(child.expression)
            refs.forEach(ref => {
              if (!allRefs.includes(ref)) {
                allRefs.push(ref)
              }
            })
          }
        }
      }
      
      const templateLiteral = templateParts.join('')
      
      if (allRefs.length > 0) {
        // Has reactive refs - wrap in watch
        configParts.push(`text: watch([${allRefs.join(', ')}], () => \`${templateLiteral}\`) as Ref<string>`)
      } else {
        // All static
        configParts.push(`text: \`${templateLiteral}\``)
      }
    }
  }
  
  // Add regular props (except special ones handled by directives)
  if (node.props) {
    for (const prop of node.props) {
      if (prop.isSpread) continue
      
      // Convert 'class' to 'className'
      const propName = prop.name === 'class' ? 'className' : prop.name
      
      // Skip event handler props - they'll be handled separately
      if (propName.startsWith('on') && propName.length > 2) {
        continue
      }
      
      let propValue: string
      
      if (!prop.value) {
        // Boolean prop
        propValue = 'true'
      } else if (t.isStringLiteral(prop.value)) {
        propValue = `"${prop.value.value}"`
      } else if (t.isJSXExpressionContainer(prop.value)) {
        const exprCode = generate(prop.value.expression as any).code
        
        // For className, style, and other reactive props that accept Ref<string>
        // We need to wrap in watch() to create a reactive ref
        if (['className', 'style'].includes(propName)) {
          // Check if expression contains property access or conditionals (might be reactive)
          if (t.isConditionalExpression(prop.value.expression) || 
              t.isLogicalExpression(prop.value.expression) ||
              exprCode.includes('.')) {
            // Extract any refs from the expression
            const refs = extractRefsFromExpression(prop.value.expression)
            if (refs.length > 0) {
              // Wrap in watch to create a Ref<string>
              propValue = `watch([${refs.join(', ')}], () => ${exprCode}) as Ref<string>`
            } else {
              propValue = exprCode
            }
          } else {
            propValue = exprCode
          }
        } else {
          propValue = exprCode
        }
      } else {
        propValue = generate(prop.value as any).code
      }
      
      configParts.push(`${propName}: ${propValue}`)
    }
  }
  
  // Add event handlers: on: { click: handler, input: handler2 }
  const eventHandlers: string[] = []
  
  // Handle event handler props (onClick, onInput, etc.)
  if (node.props) {
    for (const prop of node.props) {
      if (prop.isSpread) continue
      
      if (prop.name.startsWith('on') && prop.name.length > 2) {
        // Convert onClick -> click, onInput -> input, etc.
        const eventName = prop.name.charAt(2).toLowerCase() + prop.name.slice(3)
        
        if (prop.value && t.isJSXExpressionContainer(prop.value)) {
          const handlerCode = formatComplexExpression(prop.value.expression as any, 0)
          
          // If the handler is already a function expression, use it directly
          // Otherwise, wrap it as (e) => handler()
          let finalHandler: string
          if (t.isArrowFunctionExpression(prop.value.expression) || 
              t.isFunctionExpression(prop.value.expression)) {
            finalHandler = handlerCode
          } else {
            finalHandler = `(e) => ${handlerCode}()`
          }
          
          eventHandlers.push(`${eventName}: ${finalHandler}`)
        }
      }
    }
  }
  
  // Handle event directives (legacy support)
  if (node.directives) {
    for (const directive of node.directives) {
      // Only handle event directives (not if, each, key)
      if (directive.type === 'click' && !['if', 'each', 'key'].includes(directive.name)) {
        const handler = generate(directive.value as any).code
        
        // If the handler is already a function expression, use it directly
        // Otherwise, wrap it as (e) => handler()
        let finalHandler: string
        if (t.isArrowFunctionExpression(directive.value) || 
            t.isFunctionExpression(directive.value)) {
          finalHandler = handler
        } else {
          finalHandler = `(e) => ${handler}()`
        }
        
        eventHandlers.push(`${directive.name}: ${finalHandler}`)
      }
    }
  }
  
  if (eventHandlers.length > 0) {
    configParts.push(`on: { ${eventHandlers.join(', ')} }`)
  }
  
  // Add bindings (value, checked, disabled, etc.)
  if (node.directives) {
    for (const directive of node.directives) {
      if (directive.type === 'bind') {
        const value = generate(directive.value as any).code
        configParts.push(`${directive.name}: ${value}`)
      }
    }
  }
  
  if (configParts.length === 0) {
    return '{}'
  }
  
  // If only one config item and it's short, inline it
  if (configParts.length === 1 && configParts[0].length < 40) {
    return `{ ${configParts[0]} }`
  }
  
  return `{ ${configParts.join(', ')} }`
}