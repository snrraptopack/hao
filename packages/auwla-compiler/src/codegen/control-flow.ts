// Control flow generators ($if, $else, $each, .map)
import * as t from '@babel/types'
// @ts-ignore - ESM interop issue
import * as _babelGenerator from '@babel/generator'

// Normalize the generator import
const generate: any = (_babelGenerator as any)?.generate ?? (_babelGenerator as any)?.default?.default ?? (_babelGenerator as any)?.default;
import { isRefIdentifier, extractRefsFromExpression, analyzeJSXElementSimple } from './utils.js'

// generateNode will be passed as a parameter to avoid circular dependency

/**
 * Generate $if(condition, <jsx>) expression
 * $if(isVisible.value, <div>Content</div>) -> if(watch(() => isVisible.value)) { ui.Div(...) }
 * $if(count.value > 3, <span>High</span>) -> if(watch(() => count.value > 3)) { ui.Span(...) }
 */
export function generateIfExpression(callExpr: any, indent: number, generateNode: (node: any, indent: number) => string): string {
  const spaces = '  '.repeat(indent)

  if (!t.isCallExpression(callExpr) || callExpr.arguments.length < 2) {
    return ''
  }

  // First argument: condition
  const conditionArg = callExpr.arguments[0]
  const conditionCode = generate(conditionArg as any).code

  // Second argument: then content (can be JSX directly or callback function)
  const thenArg = callExpr.arguments[1]

  // Third argument (optional): else content (can be JSX directly or callback function)
  const elseArg = callExpr.arguments[2]

  let code = ''

  // Extract refs from the condition for watch dependencies
  const refs = extractRefsFromExpression(conditionArg)

  // Generate if(watch([refs], () => condition) as Ref<boolean>) {
  if (refs.length > 0) {
    code += `${spaces}if (watch([${refs.join(', ')}], () => ${conditionCode}) as Ref<boolean>) {\n`
  } else {
    // No reactive refs, just use the condition directly
    code += `${spaces}if (${conditionCode}) {\n`
  }

  // Handle then content - can be direct JSX or callback function
  if (t.isJSXElement(thenArg)) {
    // Direct JSX: $if(condition, <div>content</div>)
    const jsxNode = analyzeJSXElementSimple(thenArg)
    code += generateNode(jsxNode, indent + 1)
  } else if (t.isArrowFunctionExpression(thenArg) || t.isFunctionExpression(thenArg)) {
    // Callback function: $if(condition, () => <div>content</div>)
    const body = thenArg.body

    if (t.isJSXElement(body)) {
      const jsxNode = analyzeJSXElementSimple(body)
      code += generateNode(jsxNode, indent + 1)
    } else if (t.isBlockStatement(body)) {
      for (const stmt of body.body) {
        if (t.isReturnStatement(stmt) && stmt.argument && t.isJSXElement(stmt.argument)) {
          const jsxNode = analyzeJSXElementSimple(stmt.argument)
          code += generateNode(jsxNode, indent + 1)
        }
      }
    }
  }

  code += `${spaces}}\n`

  // Handle else clause if present
  if (elseArg && (t.isArrowFunctionExpression(elseArg) || t.isFunctionExpression(elseArg))) {
    code += `${spaces}else {\n`

    const body = elseArg.body

    if (t.isJSXElement(body)) {
      const jsxNode = analyzeJSXElementSimple(body)
      code += generateNode(jsxNode, indent + 1)
    } else if (t.isBlockStatement(body)) {
      for (const stmt of body.body) {
        if (t.isReturnStatement(stmt) && stmt.argument && t.isJSXElement(stmt.argument)) {
          const jsxNode = analyzeJSXElementSimple(stmt.argument)
          code += generateNode(jsxNode, indent + 1)
        }
      }
    }

    code += `${spaces}}\n`
  }

  return code
}

/**
 * Generate $elseif(condition, <jsx>) expression
 * $elseif(count.value > 5, <span>Very High</span>) -> else if(watch(() => count.value > 5)) { ui.Span(...) }
 */
export function generateElseIfExpression(callExpr: any, indent: number, generateNode: (node: any, indent: number) => string): string {
  const spaces = '  '.repeat(indent)

  if (!t.isCallExpression(callExpr) || callExpr.arguments.length < 2) {
    return ''
  }

  // First argument: condition
  const conditionArg = callExpr.arguments[0]
  const conditionCode = generate(conditionArg as any).code

  // Second argument: then content (can be JSX directly or callback function)
  const thenArg = callExpr.arguments[1]

  let code = ''

  // Extract refs from the condition for watch dependencies
  const refs = extractRefsFromExpression(conditionArg)

  // Generate else if(watch([refs], () => condition) as Ref<boolean>) {
  if (refs.length > 0) {
    code += `${spaces}else if (watch([${refs.join(', ')}], () => ${conditionCode}) as Ref<boolean>) {\n`
  } else {
    // No reactive refs, just use the condition directly
    code += `${spaces}else if (${conditionCode}) {\n`
  }

  // Handle then content - can be direct JSX or callback function
  if (t.isJSXElement(thenArg)) {
    // Direct JSX: $elseif(condition, <div>content</div>)
    const jsxNode = analyzeJSXElementSimple(thenArg)
    code += generateNode(jsxNode, indent + 1)
  } else if (t.isArrowFunctionExpression(thenArg) || t.isFunctionExpression(thenArg)) {
    // Callback function: $elseif(condition, () => <div>content</div>)
    const body = thenArg.body

    if (t.isJSXElement(body)) {
      const jsxNode = analyzeJSXElementSimple(body)
      code += generateNode(jsxNode, indent + 1)
    } else if (t.isBlockStatement(body)) {
      for (const stmt of body.body) {
        if (t.isReturnStatement(stmt) && stmt.argument && t.isJSXElement(stmt.argument)) {
          const jsxNode = analyzeJSXElementSimple(stmt.argument)
          code += generateNode(jsxNode, indent + 1)
        }
      }
    }
  }

  code += `${spaces}}\n`

  return code
}

/**
 * Generate $else(<jsx>) expression
 * $else(<span>Default</span>) -> else { ui.Span(...) }
 */
export function generateElseExpression(callExpr: any, indent: number, generateNode: (node: any, indent: number) => string): string {
  const spaces = '  '.repeat(indent)

  if (!t.isCallExpression(callExpr) || callExpr.arguments.length < 1) {
    return ''
  }

  // First argument: content (can be JSX directly or callback function)
  const contentArg = callExpr.arguments[0]

  let code = ''
  code += `${spaces}else {\n`

  // Handle content - can be direct JSX or callback function
  if (t.isJSXElement(contentArg)) {
    // Direct JSX: $else(<div>content</div>)
    const jsxNode = analyzeJSXElementSimple(contentArg)
    code += generateNode(jsxNode, indent + 1)
  } else if (t.isArrowFunctionExpression(contentArg) || t.isFunctionExpression(contentArg)) {
    // Callback function: $else(() => <div>content</div>)
    const body = contentArg.body

    if (t.isJSXElement(body)) {
      const jsxNode = analyzeJSXElementSimple(body)
      code += generateNode(jsxNode, indent + 1)
    } else if (t.isBlockStatement(body)) {
      for (const stmt of body.body) {
        if (t.isReturnStatement(stmt) && stmt.argument && t.isJSXElement(stmt.argument)) {
          const jsxNode = analyzeJSXElementSimple(stmt.argument)
          code += generateNode(jsxNode, indent + 1)
        }
      }
    }
  }

  code += `${spaces}}\n`

  return code
}

/**
 * Generate $each(items, (item) => <jsx>) expression
 */
export function generateEachExpression(callExpr: any, indent: number, generateNode: (node: any, indent: number) => string): string {
  const spaces = '  '.repeat(indent)

  if (!t.isCallExpression(callExpr) || callExpr.arguments.length < 2) {
    return ''
  }

  // First argument: items array (could be ref.value, ref, or static array)
  const itemsArg = callExpr.arguments[0]
  let itemsExpr = generate(itemsArg as any).code

  // Check if this is a reactive ref or static array
  // - If it has .value → it's a ref being accessed, strip .value
  // - If it's a simple identifier → check if it's declared with ref()
  // - If it's an array literal [...] → ERROR: can't use static array in $each
  let isReactiveRef = false
  let identifierName = ''

  if (itemsExpr.endsWith('.value')) {
    // Strip .value for ui.List (it expects the ref itself)
    itemsExpr = itemsExpr.replace(/\\.value$/, '')
    isReactiveRef = true
  } else if (t.isIdentifier(itemsArg)) {
    // Simple identifier - check if it's a ref
    identifierName = itemsArg.name
    isReactiveRef = isRefIdentifier(identifierName)

    if (!isReactiveRef) {
      throw new Error(
        `$each() requires a reactive ref. The variable '${identifierName}' is not declared with ref(). ` +
        `Change to: const ${identifierName} = ref([...]) to make it reactive.`
      )
    }
  } else if (t.isArrayExpression(itemsArg)) {
    // Static array literal - this won't work with ui.List
    throw new Error(
      `$each() requires a reactive ref, not a static array literal. ` +
      `Declare the array with ref([...]) to make it reactive, or use a regular map outside of JSX.`
    )
  }

  // Second argument: (item) => <jsx>
  const renderFn = callExpr.arguments[1]

  let itemParam = 'item'
  let keyExpr = 'item.id'

  if (t.isArrowFunctionExpression(renderFn) || t.isFunctionExpression(renderFn)) {
    // Get parameter name
    if (renderFn.params.length > 0 && t.isIdentifier(renderFn.params[0])) {
      itemParam = renderFn.params[0].name
    }

    const body = renderFn.body
    let jsxElement: any = null

    if (t.isJSXElement(body)) {
      jsxElement = body
    } else if (t.isBlockStatement(body)) {
      for (const stmt of body.body) {
        if (t.isReturnStatement(stmt) && stmt.argument && t.isJSXElement(stmt.argument)) {
          jsxElement = stmt.argument
          break
        }
      }
    }

    if (jsxElement) {
      // Check for key prop
      const openingElement = jsxElement.openingElement
      const keyAttr = openingElement.attributes.find((attr: any) =>
        t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name) && attr.name.name === 'key'
      )

      if (keyAttr && t.isJSXAttribute(keyAttr) && keyAttr.value) {
        if (t.isJSXExpressionContainer(keyAttr.value)) {
          keyExpr = generate(keyAttr.value.expression as any).code
        }
      }

      // Generate the JSX element
      const jsxNode = analyzeJSXElementSimple(jsxElement)

      // $each() always compiles to ui.List() for reactive rendering
      // The array MUST be a ref, otherwise ui.List will error at runtime
      let code = ''
      code += `${spaces}ui.List({\n`
      code += `${spaces}  items: ${itemsExpr},\n`
      code += `${spaces}  key: (${itemParam}) => ${keyExpr},\n`
      code += `${spaces}  render: (${itemParam}: any, index: number, ui: LayoutBuilder) => {\n`
      code += generateNode(jsxNode, indent + 2)
      code += `${spaces}  }\n`
      code += `${spaces}})\n`

      return code
    }
  }

  return ''
}

/**
 * Generate code for .map() expression - smart about reactivity
 * If array is reactive ref: use ui.List() for reactive rendering
 * If array is static: use forEach() for non-reactive iteration
 * Example: items.map(item => <Component {...} />)
 */
export function generateMapExpression(callExpr: any, indent: number, generateNode: (node: any, indent: number) => string): string {
  const spaces = '  '.repeat(indent)

  if (!t.isCallExpression(callExpr) || callExpr.arguments.length < 1) {
    return ''
  }

  // Get the array expression (e.g., "items" from "items.map(...)")
  let arrayExpr = ''
  let arrayIdentifier = ''

  if (t.isMemberExpression(callExpr.callee)) {
    arrayExpr = generate(callExpr.callee.object as any).code

    // Extract the base identifier for reactivity check
    if (t.isIdentifier(callExpr.callee.object)) {
      arrayIdentifier = callExpr.callee.object.name
    } else if (t.isMemberExpression(callExpr.callee.object) &&
      t.isIdentifier(callExpr.callee.object.object)) {
      // Handle cases like "items.value.map(...)" -> check "items"
      arrayIdentifier = callExpr.callee.object.object.name
    }
  }

  // First argument: (item) => <jsx>
  const renderFn = callExpr.arguments[0]

  let itemParam = 'item'

  if (t.isArrowFunctionExpression(renderFn) || t.isFunctionExpression(renderFn)) {
    // Get parameter name
    if (renderFn.params.length > 0 && t.isIdentifier(renderFn.params[0])) {
      itemParam = renderFn.params[0].name
    }

    const body = renderFn.body
    let jsxElement: any = null

    if (t.isJSXElement(body)) {
      jsxElement = body
    } else if (t.isBlockStatement(body)) {
      for (const stmt of body.body) {
        if (t.isReturnStatement(stmt) && stmt.argument && t.isJSXElement(stmt.argument)) {
          jsxElement = stmt.argument
          break
        }
      }
    } else if (t.isParenthesizedExpression(body) && t.isJSXElement(body.expression)) {
      jsxElement = body.expression
    }

    if (jsxElement) {
      // Generate the JSX element
      const jsxNode = analyzeJSXElementSimple(jsxElement)

      // Check if the array is a reactive ref
      const isReactiveRef = arrayIdentifier && isRefIdentifier(arrayIdentifier)

      if (isReactiveRef) {
        // Reactive array: use ui.List() for reactive rendering
        let itemsExpr = arrayIdentifier // Use the ref identifier directly, not the .value access

        // ui.List expects the ref itself, not .value

        // Extract key expression from JSX element
        let keyExpr = `${itemParam}.id || ${itemParam}`

        // Check for key prop in JSX
        const openingElement = jsxElement.openingElement
        const keyAttr = openingElement.attributes.find((attr: any) =>
          t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name) && attr.name.name === 'key'
        )

        if (keyAttr && t.isJSXAttribute(keyAttr) && keyAttr.value) {
          if (t.isJSXExpressionContainer(keyAttr.value)) {
            keyExpr = generate(keyAttr.value.expression as any).code
          }
        }

        // Generate ui.List() for reactive rendering
        let code = ''
        code += `${spaces}ui.List({\n`
        code += `${spaces}  items: ${itemsExpr},\n`
        code += `${spaces}  key: (${itemParam}) => ${keyExpr},\n`
        code += `${spaces}  render: (${itemParam}: any, index: number, ui: LayoutBuilder) => {\n`
        code += generateNode(jsxNode, indent + 2)
        code += `${spaces}  }\n`
        code += `${spaces}})\n`

        return code
      } else {
        // Static array: use forEach() for non-reactive iteration
        let code = ''
        code += `${spaces}${arrayExpr}.forEach((${itemParam}, index) => {\n`
        code += generateNode(jsxNode, indent + 1)
        code += `${spaces}})\n`

        return code
      }
    }
  }

  return ''
}
