/**
 * Scoping utility functions
 */

import type { CodeBlock, DependencyGraph } from '../types/index.js'

/**
 * Extract dependencies from code block
 */
export function extractDependencies(code: string): string[] {
  const dependencies: string[] = []
  
  // Simple regex-based dependency extraction
  // Focus on actual variable references, not comments
  
  // Remove comments first
  const codeWithoutComments = code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  
  // Match variable references (not declarations)
  const variableRefs = codeWithoutComments.match(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g) || []
  
  // Filter out keywords and built-ins
  const keywords = new Set([
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
    'true', 'false', 'null', 'undefined', 'console', 'window', 'document',
    'log', 'value' // Common property names
  ])
  
  for (const ref of variableRefs) {
    if (!keywords.has(ref) && !dependencies.includes(ref)) {
      // Only include if it looks like a variable reference
      if (!/^[A-Z]/.test(ref)) { // Skip PascalCase (likely types/constructors)
        dependencies.push(ref)
      }
    }
  }
  
  return dependencies
}

/**
 * Build dependency graph from code blocks
 */
export function buildDependencyGraph(blocks: CodeBlock[]): DependencyGraph {
  const nodes = new Map<string, CodeBlock>()
  const edges = new Map<string, string[]>()
  
  // Extract variable names from each block
  for (const block of blocks) {
    const varName = extractVariableName(block.code)
    if (varName) {
      nodes.set(varName, block)
      edges.set(varName, block.dependencies)
    }
  }
  
  return {
    nodes,
    edges,
    resolved: []
  }
}

/**
 * Resolve dependencies using topological sort
 */
export function resolveDependencies(graph: DependencyGraph): CodeBlock[] {
  const resolved: CodeBlock[] = []
  const visiting = new Set<string>()
  const visited = new Set<string>()
  
  function visit(varName: string) {
    if (visited.has(varName)) return
    if (visiting.has(varName)) {
      // Circular dependency - just add it anyway
      return
    }
    
    visiting.add(varName)
    
    const deps = graph.edges.get(varName) || []
    for (const dep of deps) {
      if (graph.nodes.has(dep)) {
        visit(dep)
      }
    }
    
    visiting.delete(varName)
    visited.add(varName)
    
    const block = graph.nodes.get(varName)
    if (block) {
      resolved.push(block)
    }
  }
  
  // Visit all nodes
  for (const varName of graph.nodes.keys()) {
    visit(varName)
  }
  
  return resolved
}

/**
 * Extract variable name from code block
 */
function extractVariableName(code: string): string | null {
  // Match variable declarations
  const varMatch = code.match(/(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
  if (varMatch) return varMatch[1]
  
  // Match function declarations
  const funcMatch = code.match(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
  if (funcMatch) return funcMatch[1]
  
  return null
}

/**
 * Check if code block defines a variable or function
 */
export function definesSymbol(block: CodeBlock, symbolName: string): boolean {
  const definedName = extractVariableName(block.code)
  return definedName === symbolName
}

/**
 * Group code blocks by scope type
 */
export function groupByScope(blocks: CodeBlock[], isPageFile: boolean): {
  componentScope: CodeBlock[]
  uiScope: CodeBlock[]
} {
  const componentScope: CodeBlock[] = []
  const uiScope: CodeBlock[] = []
  
  for (const block of blocks) {
    const targetScope = determineTargetScope(block, isPageFile)
    if (targetScope === 'component') {
      componentScope.push(block)
    } else {
      uiScope.push(block)
    }
  }
  
  return { componentScope, uiScope }
}

/**
 * Determine target scope for a code block
 */
function determineTargetScope(block: CodeBlock, isPageFile: boolean): 'component' | 'ui' {
  if (!isPageFile) {
    // Regular component: maintain original scoping
    return block.scope === 'top-level' ? 'component' : 'ui'
  }
  
  // Page file: invert the scoping
  if (block.scope === 'top-level') {
    // Outside export default -> inside page function (component scope)
    return 'component'
  } else {
    // Inside export default -> inside Component callback (ui scope)
    return 'ui'
  }
}