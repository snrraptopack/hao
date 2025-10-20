import { AuwlaFile } from './auwla-parser'
import { analyzeJSX } from './jsx-analyzer'

interface ScopeAnalysis {
  moduleScope: string[]    // Global imports, types, utilities
  componentScope: string[] // Component-local state, lifecycle
  renderScope: string[]    // Inside Component() function
}

/**
 * Analyze script content and determine proper scope placement
 */
export function analyzeScopeRequirements(parsed: AuwlaFile): ScopeAnalysis {
  const analysis: ScopeAnalysis = {
    moduleScope: [],
    componentScope: [],
    renderScope: []
  }

  // Analyze each helper to determine its scope
  for (const helper of parsed.helpers) {
    const scope = determineHelperScope(helper)
    analysis[scope].push(helper)
  }

  return analysis
}

/**
 * Determine which scope a helper belongs to
 */
function determineHelperScope(helper: string): keyof ScopeAnalysis {
  // Module scope: imports, types, pure functions, constants
  if (helper.includes('import ') || 
      helper.includes('interface ') || 
      helper.includes('type ') ||
      helper.includes('const ') && !helper.includes('ref(') ||
      helper.includes('function ') && !containsReactiveCode(helper)) {
    return 'moduleScope'
  }

  // Component scope: refs, reactive state, lifecycle hooks
  if (helper.includes('ref(') || 
      helper.includes('watch(') ||
      helper.includes('onMount(') ||
      helper.includes('onUnmount(') ||
      helper.includes('setInterval') ||
      helper.includes('setTimeout')) {
    return 'componentScope'
  }

  // Render scope: everything else (computed values, etc.)
  return 'renderScope'
}

/**
 * Check if code contains reactive patterns
 */
function containsReactiveCode(code: string): boolean {
  return code.includes('ref(') || 
         code.includes('watch(') || 
         code.includes('.value') ||
         code.includes('onMount') ||
         code.includes('onUnmount')
}

/**
 * Generate scope-aware Auwla file
 */
export function generateScopeAwareAuwlaFile(parsed: AuwlaFile): string {
  const analysis = analyzeScopeRequirements(parsed)
  const defaultComponent = parsed.components.find(c => c.isDefault) || parsed.components[0]
  
  if (!defaultComponent) {
    throw new Error('No component found in file')
  }

  let code = ''

  // 1. Module scope - imports, types, utilities
  code += generateImports(parsed)
  code += '\n'

  if (analysis.moduleScope.length > 0) {
    code += analysis.moduleScope.join('\n\n') + '\n\n'
  }

  // 2. Component function with proper scoping
  code += `export default function Component() {\n`
  
  // Component scope - refs, state, lifecycle
  if (analysis.componentScope.length > 0) {
    const indentedComponentScope = analysis.componentScope
      .map(helper => `  ${helper}`)
      .join('\n\n')
    code += indentedComponentScope + '\n\n'
  }

  // 3. Return Component with render scope
  code += `  return Component((ui) => {\n`
  
  // Render scope - computed values, etc.
  if (analysis.renderScope.length > 0) {
    const indentedRenderScope = analysis.renderScope
      .map(helper => `    ${helper}`)
      .join('\n\n')
    code += indentedRenderScope + '\n\n'
  }

  // Generate JSX
  const jsxNodes = analyzeJSX(defaultComponent.body)
  for (const node of jsxNodes) {
    code += generateNode(node, 2) // Will need to import this
  }

  code += `  })\n`
  code += `}\n`

  return code
}

/**
 * Generate imports (simplified version)
 */
function generateImports(parsed: AuwlaFile): string {
  const auwlaImports = ['Component']
  
  // Check if we need ref, watch, lifecycle hooks
  const allHelpers = parsed.helpers.join(' ')
  if (allHelpers.includes('ref(')) auwlaImports.push('ref')
  if (allHelpers.includes('watch(')) auwlaImports.push('watch')
  if (allHelpers.includes('onMount(')) auwlaImports.push('onMount')
  if (allHelpers.includes('onUnmount(')) auwlaImports.push('onUnmount')

  let code = `import { ${auwlaImports.join(', ')} } from 'auwla'\n`
  
  // Add other imports
  const otherImports = parsed.imports.filter(imp => 
    !imp.includes("from 'auwla'") && !imp.includes('from "auwla')
  )
  if (otherImports.length > 0) {
    code += otherImports.join('\n') + '\n'
  }

  return code
}

// Placeholder for generateNode - will import from existing codegen
function generateNode(node: any, indent: number): string {
  // This will be imported from the existing auwla-codegen.ts
  return ''
}