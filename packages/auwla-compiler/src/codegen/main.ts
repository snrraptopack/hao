// Main codegen orchestrator
import type { AuwlaFile, ComponentFunction } from '../auwla-parser.js'
import { setCurrentParsedFile, getCurrentParsedFile } from './types.js'
import { generateNode } from './elements.js'
import { analyzeJSX } from '../jsx-analyzer.js'
import * as t from '@babel/types'
// @ts-ignore - ESM interop issue
import * as _babelGenerator from '@babel/generator'

// Normalize the generator import
const generate: any = (_babelGenerator as any)?.generate ?? (_babelGenerator as any)?.default?.default ?? (_babelGenerator as any)?.default;

/**
 * Generate complete Auwla file from parsed structure
 * Handles multiple components with proper scoping:
 * - export default = Page (has lifecycle)
 * - export = Reusable components
 */
export function generateAuwlaFile(parsed: AuwlaFile): string {
  // Store parsed file in module scope for helper functions to access
  setCurrentParsedFile(parsed)
  
  let code = ''
  
  // Find default component and exported components
  const defaultComponent = parsed.components.find(c => c.isDefault)
  const exportedComponents = parsed.components.filter(c => c.isExported && !c.isDefault)
  const regularComponents = parsed.components.filter(c => !c.isExported)
  
  if (!defaultComponent && parsed.components.length === 0) {
    throw new Error('No component found in file')
  }
  
  // Use first component as default if no explicit default
  const mainComponent = defaultComponent || regularComponents[0] || parsed.components[0]
  
  // Collect all JSX nodes to detect needed imports
  const allJsxNodes: any[] = []
  for (const comp of parsed.components) {
    const jsxNodes = analyzeJSX(comp.body)
    allJsxNodes.push(...jsxNodes)
  }
  
  // Generate imports
  code += generateImports(parsed, allJsxNodes)
  code += '\n'
  
  // Add component helpers (shared across all components in this file)
  if (parsed.helpers.length > 0) {

    code += '// Component helpers (shared across all components)\n'
    code += parsed.helpers.join('\n') + '\n\n'
  }
  
  // Add types
  if (parsed.types.length > 0) {
    code += parsed.types.join('\n\n') + '\n\n'
  }
  
  // Generate exported sub-components (reusable components)
  for (const component of exportedComponents) {
    code += generateReusableComponent(component)
    code += '\n\n'
  }
  
  // Generate main page component (export default)
  code += generatePageComponent(mainComponent)
  
  return code
}

/**
 * Generate imports based on what's used in the file
 */
function generateImports(parsed: AuwlaFile, allJsxNodes: any[]): string {
  let code = ''
  
  // Filter out auwla imports (we'll add our own)
  const filteredImports = parsed.imports.filter(imp => 
    !imp.includes("from 'auwla'") && 
    !imp.includes('from "auwla') &&
    !imp.includes("from 'auwla/template'") &&
    !imp.includes('from "auwla/template')
  )
  
  // Auwla imports
  const auwlaImports = ['Component']
  const auwlaTypeImports: string[] = []
  
  // Check if helpers or pageHelpers use ref()
  const usesRef = parsed.helpers.some(h => h.includes('ref(') || h.includes('ref<')) ||
                  parsed.pageHelpers.some(h => h.includes('ref(') || h.includes('ref<'))
  if (usesRef) {
    auwlaImports.push('ref')
  }
  
  // Check if we need watch
  const needsWatch = allJsxNodes.some(node => hasConditional(node)) || 
                     parsed.helpers.some(h => h.includes('ref(') || h.includes('ref<')) ||
                     parsed.pageHelpers.some(h => h.includes('ref(') || h.includes('ref<'))
  if (needsWatch) {
    auwlaImports.push('watch')
  }
  
  // Add Ref type
  if (usesRef || needsWatch) {
    auwlaTypeImports.push('Ref')
  }
  
  // Always add LayoutBuilder type for proper TypeScript support
  auwlaTypeImports.push('LayoutBuilder')
  
  // Check if we need Link
  const needsLink = hasLinkElements(allJsxNodes)
  if (needsLink) {
    auwlaImports.push('Link')
  }
  
  code += `import { ${auwlaImports.join(', ')} } from 'auwla'\n`
  
  if (auwlaTypeImports.length > 0) {
    code += `import type { ${auwlaTypeImports.join(', ')} } from 'auwla'\n`
  }
  
  // Add other imports
  if (filteredImports.length > 0) {
    code += filteredImports.join('\n') + '\n'
  }
  
  return code
}

/**
 * Generate a reusable component (export function)
 * Logic inside function = Component logic (no lifecycle, just component state)
 */
function generateReusableComponent(component: ComponentFunction): string {
  // Extract component logic from the component body (before JSX return)
  const componentLogic: string[] = []
  const bodyStatements = component.body.body || []
  
  for (const stmt of bodyStatements) {
    // Skip the return statement (that's the JSX we'll compile)
    if (t.isReturnStatement(stmt)) continue
    
    // Add variable declarations and other statements as component logic
    if (t.isVariableDeclaration(stmt) || t.isExpressionStatement(stmt)) {
      const stmtCode = generate(stmt as any).code
      componentLogic.push(stmtCode)
    }
  }
  
  const jsxNodes = analyzeJSX(component.body)
  
  // Extract props parameter with full type annotation
  let propsParam = ''
  if (component.params && component.params.length > 0) {
    const param = component.params[0]
    
    // Generate the full parameter including type annotation
    propsParam = generate(param as any).code
  }
  
  let code = `// Reusable component\n`
  code += `export function ${component.name}(${propsParam}) {\n`
  
  // Add component logic (variables and functions defined inside the component)
  if (componentLogic.length > 0) {
    code += '  // Component logic (component state)\n'
    code += componentLogic.map(h => `  ${h}`).join('\n') + '\n\n'
  }
  
  code += `  return Component((ui: LayoutBuilder) => {\n`
  
  for (const node of jsxNodes) {
    code += generateNode(node, 2)
  }
  
  code += `  })\n`
  code += `}`
  
  return code
}

/**
 * Generate the main page component (export default)
 * Logic outside function = Component helpers (shared across components)
 * Logic inside function = UI helpers (scoped to that page's UI)
 */
function generatePageComponent(component: ComponentFunction): string {
  const jsxNodes = analyzeJSX(component.body)
  
  let code = `// Page component (has lifecycle)\n`
  code += `export default function ${component.name || 'Component'}() {\n`
  
  // Add UI helpers (pageHelpers from <script> section) at component function scope
  const currentFile = getCurrentParsedFile()
  if (currentFile && currentFile.pageHelpers.length > 0) {

    code += '  // UI helpers (scoped to this page UI)\n'
    code += currentFile.pageHelpers.map(h => `  ${h}`).join('\n') + '\n\n'
  }
  
  code += `  return Component((ui: LayoutBuilder) => {\n`
  
  // Extract any variable declarations from the component body (component builder scope)
  const uiHelpers: string[] = []
  const bodyStatements = component.body.body || []
  
  for (const stmt of bodyStatements) {
    // Skip the return statement (that's the JSX we'll compile)
    if (t.isReturnStatement(stmt)) continue
    
    // Add variable declarations and other statements to UI helpers scope
    if (t.isVariableDeclaration(stmt) || t.isExpressionStatement(stmt)) {
      const stmtCode = generate(stmt as any).code
      uiHelpers.push(`    ${stmtCode}`)
    }
  }
  
  // Add UI helpers inside the Component builder
  if (uiHelpers.length > 0) {
    code += '    // Additional UI helpers\n'
    code += uiHelpers.join('\n') + '\n\n'
  }
  
  // Generate JSX
  for (const node of jsxNodes) {
    code += generateNode(node, 2)
  }
  
  code += `  })\n`
  code += `}\n`
  
  return code
}

/**
 * Check if JSX tree has conditionals
 */
function hasConditional(node: any): boolean {
  if (node.directives?.some((d: any) => d.type === 'if')) {
    return true
  }
  if (node.children) {
    return node.children.some((child: any) => hasConditional(child))
  }
  return false
}

/**
 * Check if JSX tree has <a> tags (Link components)
 */
function hasLinkElements(nodes: any[]): boolean {
  for (const node of nodes) {
    if (node.type === 'element' && node.tag === 'a' && 
        node.props && node.props.some((p: any) => p.name === 'href')) {
      return true
    }
    if (node.children && hasLinkElements(node.children)) {
      return true
    }
  }
  return false
}