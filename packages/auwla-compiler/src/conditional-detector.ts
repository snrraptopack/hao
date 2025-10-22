import * as t from '@babel/types'
import generate from '@babel/generator'

/**
 * Conditional expression detection utilities for Auwla TSX compiler
 */

export interface ValidationError {
  type: 'warning' | 'error'
  message: string
  code: string
  suggestion?: string
}

export interface ConditionalExpression {
  type: 'logical' | 'ternary' | 'if-helper'
  condition: string
  thenElement: t.JSXElement | null
  elseElement?: t.JSXElement | null
  isReactive: boolean
  dependencies: string[]
  validationErrors?: ValidationError[]
}

export interface DependencyAnalysis {
  dependencies: string[]
  expression: string
  watchPattern: 'single' | 'multiple'
  isReactive: boolean
}

/**
 * Validate conditional expression and return any errors or warnings
 */
export function validateConditionalExpression(
  conditional: ConditionalExpression,
  scopeContext?: string[]
): ValidationError[] {
  const errors: ValidationError[] = []

  // Check for undefined refs
  for (const dep of conditional.dependencies) {
    if (!isValidRef(dep, scopeContext)) {
      errors.push({
        type: 'warning',
        code: 'UNDEFINED_REF',
        message: `Variable '${dep}' is used with .value but may not be a ref`,
        suggestion: `Ensure '${dep}' is declared with ref() or consider using a static condition`
      })
    }
  }

  // Check for malformed conditions
  if (!conditional.condition.trim()) {
    errors.push({
      type: 'error',
      code: 'EMPTY_CONDITION',
      message: 'Conditional expression cannot be empty',
      suggestion: 'Provide a valid boolean expression'
    })
  }

  // Check for missing JSX elements
  if (!conditional.thenElement && conditional.type !== 'if-helper') {
    errors.push({
      type: 'error',
      code: 'MISSING_JSX_ELEMENT',
      message: 'Conditional expression must have at least one JSX element',
      suggestion: 'Ensure the condition returns a JSX element'
    })
  }

  // Check for potentially problematic patterns
  if (conditional.condition.includes('&&') && conditional.type === 'logical') {
    const parts = conditional.condition.split('&&')
    if (parts.some(part => part.trim().includes('.value') && !part.includes('()'))) {
      errors.push({
        type: 'warning',
        code: 'COMPLEX_CONDITION',
        message: 'Complex conditions with multiple .value accesses may be hard to debug',
        suggestion: 'Consider breaking into separate conditions or using computed refs'
      })
    }
  }

  // Check for $if helper specific issues
  if (conditional.type === 'if-helper') {
    if (!conditional.thenElement && !conditional.elseElement) {
      errors.push({
        type: 'error',
        code: 'INVALID_IF_HELPER',
        message: '$if helper must have at least one JSX element argument',
        suggestion: 'Use $if(condition, <element>) or $if(condition, <element>, <elseElement>)'
      })
    }
  }

  return errors
}

/**
 * Check if a variable is likely a valid ref
 */
function isValidRef(varName: string, scopeContext?: string[]): boolean {
  if (!scopeContext) {
    // Without scope context, we can't be sure, so don't warn
    return true
  }

  // Check if explicitly declared as ref
  const isRefDeclaration = scopeContext.some(line => 
    line.includes(`${varName} = ref(`) || 
    line.includes(`const ${varName} = ref(`) ||
    line.includes(`let ${varName} = ref(`) ||
    line.includes(`var ${varName} = ref(`)
  )

  if (isRefDeclaration) return true

  // Check if explicitly NOT a ref (object with .value property)
  const isObjectWithValue = scopeContext.some(line => 
    (line.includes(`${varName} = {`) && line.includes('value:')) ||
    (line.includes(`const ${varName} = {`) && line.includes('value:')) ||
    (line.includes(`let ${varName} = {`) && line.includes('value:'))
  )

  if (isObjectWithValue) return false

  // If we can't determine, assume it might be valid (avoid false positives)
  return true
}

/**
 * Detect conditional rendering patterns in JSX expressions
 */
export function detectConditionalExpression(expr: t.JSXExpressionContainer): ConditionalExpression | null {
  if (!t.isExpression(expr.expression)) {
    return null
  }

  const expression = expr.expression

  // Detect logical AND pattern: condition && element
  if (t.isLogicalExpression(expression) && expression.operator === '&&') {
    return detectLogicalAndPattern(expression)
  }

  // Detect ternary pattern: condition ? element : other
  if (t.isConditionalExpression(expression)) {
    return detectTernaryPattern(expression)
  }

  // Detect $if helper pattern: $if(condition, element, ...)
  if (t.isCallExpression(expression) && 
      t.isIdentifier(expression.callee) && 
      expression.callee.name === '$if') {
    return detectIfHelperPattern(expression)
  }

  return null
}

/**
 * Detect logical AND pattern: condition && element
 */
function detectLogicalAndPattern(expr: t.LogicalExpression): ConditionalExpression | null {
  try {
    const conditionCode = generate(expr.left).code
    const rightSide = expr.right

    // Check for $if usage in logical AND - this should be handled by JSX analyzer transformation
    if (conditionCode.includes('$if(')) {
      // Let JSX analyzer handle $if(condition) && jsx transformation
      // This will be converted to $if(condition, jsx) before conditional detection
      return null
    }

    // Ensure right side is a JSX element
    if (!t.isJSXElement(rightSide)) {
      return null
    }

    const analysis = analyzeDependencies(conditionCode)

    const conditional: ConditionalExpression = {
      type: 'logical',
      condition: conditionCode,
      thenElement: rightSide,
      elseElement: null,
      isReactive: analysis.isReactive,
      dependencies: analysis.dependencies
    }

    // Add validation
    conditional.validationErrors = validateConditionalExpression(conditional)

    return conditional
  } catch (error) {
    console.warn('Error detecting logical AND pattern:', error)
    return null
  }
}

/**
 * Detect ternary pattern: condition ? element : other
 */
function detectTernaryPattern(expr: t.ConditionalExpression): ConditionalExpression | null {
  try {
    const conditionCode = generate(expr.test).code
    const thenElement = t.isJSXElement(expr.consequent) ? expr.consequent : null
    const elseElement = t.isJSXElement(expr.alternate) ? expr.alternate : null

    // At least one side should be a JSX element
    if (!thenElement && !elseElement) {
      return null
    }

    const analysis = analyzeDependencies(conditionCode)

    const conditional: ConditionalExpression = {
      type: 'ternary',
      condition: conditionCode,
      thenElement,
      elseElement,
      isReactive: analysis.isReactive,
      dependencies: analysis.dependencies
    }

    // Add validation
    conditional.validationErrors = validateConditionalExpression(conditional)

    return conditional
  } catch (error) {
    console.warn('Error detecting ternary pattern:', error)
    return null
  }
}

/**
 * Detect $if helper pattern: $if(condition, element, elseElement?)
 */
function detectIfHelperPattern(expr: t.CallExpression): ConditionalExpression | null {
  try {
    const args = expr.arguments

    // Must have at least 2 arguments: condition and element
    if (args.length < 2) {
      return null
    }

    const conditionArg = args[0]
    const thenArg = args[1]
    const elseArg = args.length > 2 ? args[2] : null

    if (!t.isExpression(conditionArg)) {
      return null
    }

    const conditionCode = generate(conditionArg).code
    const thenElement = t.isJSXElement(thenArg) ? thenArg : null
    const elseElement = elseArg && t.isJSXElement(elseArg) ? elseArg : null

    const analysis = analyzeDependencies(conditionCode)

    const conditional: ConditionalExpression = {
      type: 'if-helper',
      condition: conditionCode,
      thenElement,
      elseElement,
      isReactive: analysis.isReactive,
      dependencies: analysis.dependencies
    }

    // Add validation
    conditional.validationErrors = validateConditionalExpression(conditional)

    return conditional
  } catch (error) {
    console.warn('Error detecting $if helper pattern:', error)
    return null
  }
}

/**
 * Analyze dependencies in a conditional expression
 * Only considers variables that are likely to be Auwla refs
 */
export function analyzeDependencies(conditionCode: string, scopeContext?: string[]): DependencyAnalysis {
  // Extract .value patterns using regex
  const valuePattern = /(\w+)\.value/g
  const matches = [...conditionCode.matchAll(valuePattern)]
  
  if (matches.length === 0) {
    // No .value patterns found - static condition
    return {
      dependencies: [],
      expression: conditionCode,
      watchPattern: 'single',
      isReactive: false
    }
  }

  // Extract potential ref names
  const potentialRefs = [...new Set(matches.map(match => match[1]))]
  
  // Filter to only include variables that are likely to be refs
  const likelyRefs = potentialRefs.filter(varName => isLikelyRef(varName, scopeContext))
  
  if (likelyRefs.length === 0) {
    // No actual refs found - treat as static
    return {
      dependencies: [],
      expression: conditionCode,
      watchPattern: 'single',
      isReactive: false
    }
  }
  
  return {
    dependencies: likelyRefs,
    expression: conditionCode,
    watchPattern: likelyRefs.length === 1 ? 'single' : 'multiple',
    isReactive: true
  }
}

/**
 * Determine if a variable name is likely to be an Auwla ref
 * Uses heuristics based on naming patterns and context
 */
function isLikelyRef(varName: string, scopeContext?: string[]): boolean {
  // If we have scope context, check if the variable was declared with ref()
  if (scopeContext) {
    const isInScope = scopeContext.some(line => 
      line.includes(`${varName} = ref(`) || 
      line.includes(`const ${varName} = ref(`) ||
      line.includes(`let ${varName} = ref(`) ||
      line.includes(`var ${varName} = ref(`)
    )
    if (isInScope) return true
    
    // If it's explicitly NOT a ref (object literal with .value), exclude it
    const isNotRef = scopeContext.some(line => 
      line.includes(`${varName} = {`) && line.includes('value:') ||
      line.includes(`const ${varName} = {`) && line.includes('value:') ||
      line.includes(`let ${varName} = {`) && line.includes('value:')
    )
    if (isNotRef) return false
  }
  
  // Common ref naming patterns in Auwla
  const refPatterns = [
    /^(is|has|can|should|will)[A-Z]/, // Boolean refs: isVisible, hasData, canEdit
    /^(show|hide|enable|disable)[A-Z]/, // UI state refs: showModal, hidePanel
    /^(current|selected|active)[A-Z]/, // Current state refs: currentUser, selectedItem
    /^(count|total|num)[A-Z]?/, // Counter refs: count, counter, totalItems
    /^(data|items|list|results)$/, // Data refs: data, items, list
    /^(loading|pending|busy)$/, // Loading state refs
    /^(error|errors)$/, // Error state refs
    /^(value|input|text)$/, // Input refs
    /^(toggle|flag)$/, // Toggle refs
    /Counter$/, // Ends with Counter: pageCounter, itemCounter
    /State$/, // Ends with State: userState, appState
    /Ref$/, // Explicitly named refs: userRef, dataRef
  ]
  
  // Check against common ref patterns
  const matchesPattern = refPatterns.some(pattern => pattern.test(varName))
  
  // Common non-ref patterns to exclude
  const nonRefPatterns = [
    /^(config|settings|options|props)$/, // Configuration objects
    /^(api|client|service)$/, // Service objects
    /^(window|document|console)$/, // Global objects
    /^(event|e|evt)$/, // Event objects
    /Config$/, // Ends with Config: appConfig, userConfig
    /Settings$/, // Ends with Settings: userSettings
  ]
  
  const matchesNonRefPattern = nonRefPatterns.some(pattern => pattern.test(varName))
  
  // If it matches a non-ref pattern, it's probably not a ref
  if (matchesNonRefPattern) return false
  
  // If no scope context and matches ref pattern, likely a ref
  if (matchesPattern) return true
  
  // For short variable names without context, be more permissive
  // (common in examples and tests: a, b, x, y, etc.)
  if (!scopeContext && varName.length <= 2) return true
  
  // Default: assume it could be a ref (better to be reactive than miss reactivity)
  return true
}

/**
 * Enhanced dependency analysis that takes component scope into account
 */
export function analyzeDependenciesWithScope(
  conditionCode: string, 
  componentScope: string[]
): DependencyAnalysis {
  return analyzeDependencies(conditionCode, componentScope)
}

/**
 * Generate watch expression for reactive conditions
 */
export function generateWatchExpression(analysis: DependencyAnalysis): string {
  if (!analysis.isReactive || analysis.dependencies.length === 0) {
    return analysis.expression
  }

  // Add runtime validation for watch expressions
  const validationCode = generateWatchValidation(analysis.dependencies)

  if (analysis.watchPattern === 'single') {
    return `watch(${analysis.dependencies[0]}, () => { ${validationCode} return ${analysis.expression} }) as Ref<boolean>`
  } else {
    return `watch([${analysis.dependencies.join(', ')}], () => { ${validationCode} return ${analysis.expression} }) as Ref<boolean>`
  }
}

/**
 * Generate runtime validation code for watch dependencies
 */
function generateWatchValidation(dependencies: string[]): string {
  const validations = dependencies.map(dep => 
    `if (typeof ${dep} === 'undefined') console.warn('[Auwla Runtime Warning] Ref ${dep} is undefined in watch expression');`
  )
  
  return validations.join(' ')
}

/**
 * Generate ui.When() call for conditional expression
 */
export function generateWhenCall(
  conditional: ConditionalExpression,
  thenBuilder: string,
  elseBuilder?: string,
  scopeContext?: string[]
): string {
  const analysis = analyzeDependenciesWithScope(conditional.condition, scopeContext || [])
  
  // For static conditions, generate native if statement instead of ui.When
  if (!analysis.isReactive) {
    return generateStaticConditional(conditional.condition, thenBuilder, elseBuilder)
  }
  
  const watchExpr = generateWatchExpression(analysis)

  let result = `ui.When(${watchExpr}, (ui: LayoutBuilder) => {\n${thenBuilder}\n      })`

  if (elseBuilder) {
    result += `.Else((ui: LayoutBuilder) => {\n${elseBuilder}\n      })`
  }

  return result
}

/**
 * Generate native JavaScript if statement for static conditions
 */
function generateStaticConditional(
  condition: string,
  thenBuilder: string,
  elseBuilder?: string
): string {
  let result = `if (${condition}) {\n${thenBuilder}\n      }`
  
  if (elseBuilder) {
    result += ` else {\n${elseBuilder}\n      }`
  }
  
  return result
}

/**
 * Convert JSX element to UI builder call string
 * This is a simplified version for use in conditional generation
 */
export function convertJSXElementToUICall(element: any): string {
  // This will be implemented to work with the existing TSX compiler
  // For now, return a placeholder that can be replaced by the actual converter
  return `__CONVERT_JSX_ELEMENT__`
}

/**
 * Generate conditional UI code from detected conditional expression
 */
export function generateConditionalUICode(
  conditional: ConditionalExpression,
  jsxElementConverter: (element: any) => string,
  scopeContext?: string[]
): string {
  // Report validation errors
  if (conditional.validationErrors && conditional.validationErrors.length > 0) {
    for (const error of conditional.validationErrors) {
      if (error.type === 'error') {
        console.error(`[Auwla Compiler Error] ${error.message}`)
        if (error.suggestion) {
          console.error(`  Suggestion: ${error.suggestion}`)
        }
      } else if (error.type === 'warning') {
        console.warn(`[Auwla Compiler Warning] ${error.message}`)
        if (error.suggestion) {
          console.warn(`  Suggestion: ${error.suggestion}`)
        }
      }
    }

    // If there are errors, generate a fallback
    const hasErrors = conditional.validationErrors.some(e => e.type === 'error')
    if (hasErrors) {
      return `// Error in conditional expression: ${conditional.condition}\n        ui.Text({ text: "Conditional rendering error - check console" })`
    }
  }

  let thenBuilder = ''
  let elseBuilder: string | undefined

  // Generate then clause
  if (conditional.thenElement) {
    try {
      const thenCall = jsxElementConverter(conditional.thenElement)
      thenBuilder = `        ${thenCall}`
    } catch (error) {
      console.error('[Auwla Compiler Error] Failed to convert then element:', error)
      thenBuilder = `        ui.Text({ text: "Error rendering then element" })`
    }
  }

  // Generate else clause if present
  if (conditional.elseElement) {
    try {
      const elseCall = jsxElementConverter(conditional.elseElement)
      elseBuilder = `        ${elseCall}`
    } catch (error) {
      console.error('[Auwla Compiler Error] Failed to convert else element:', error)
      elseBuilder = `        ui.Text({ text: "Error rendering else element" })`
    }
  }

  return generateWhenCall(conditional, thenBuilder, elseBuilder, scopeContext)
}

/**
 * Enhanced watch expression generator with better type inference
 */
export function generateEnhancedWatchExpression(
  condition: string,
  dependencies: string[],
  scopeContext?: string[]
): string {
  if (dependencies.length === 0) {
    return condition
  }

  // Analyze the condition to determine the return type
  const returnType = inferReturnType(condition)
  
  if (dependencies.length === 1) {
    return `watch(${dependencies[0]}, () => ${condition}) as Ref<${returnType}>`
  } else {
    return `watch([${dependencies.join(', ')}], () => ${condition}) as Ref<${returnType}>`
  }
}

/**
 * Infer the return type of a conditional expression
 */
function inferReturnType(condition: string): string {
  // Simple heuristics for type inference
  if (condition.includes('&&') || condition.includes('||') || 
      condition.includes('===') || condition.includes('!==') ||
      condition.includes('>') || condition.includes('<') ||
      condition.includes('>=') || condition.includes('<=')) {
    return 'boolean'
  }
  
  if (condition.includes('.length') || condition.match(/\d+/)) {
    return 'number'
  }
  
  if (condition.includes('"') || condition.includes("'") || condition.includes('`')) {
    return 'string'
  }
  
  // Default to boolean for conditionals
  return 'boolean'
}