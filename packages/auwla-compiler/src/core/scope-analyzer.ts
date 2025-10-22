/**
 * Scope Analyzer - Determines correct scoping for variables and functions
 */

import type { 
  TSXFile, 
  ScopedFile, 
  CodeBlock, 
  ComponentDeclaration,
  DependencyGraph
} from '../types/index.js'
import { ScopeError } from '../types/index.js'
import { 
  extractDependencies, 
  buildDependencyGraph, 
  resolveDependencies, 
  groupByScope 
} from '../utils/index.js'

/**
 * Analyze scoping for TSX file
 */
export class ScopeAnalyzer {
  analyze(tsxFile: TSXFile, filename: string = 'unknown.tsx'): ScopedFile {
    try {
      // Find the main component (default export or first component)
      const mainComponent = this.findMainComponent(tsxFile)
      if (!mainComponent) {
        throw new ScopeError('No main component found', filename)
      }

      // Combine all code blocks for analysis
      const allCodeBlocks = [
        ...tsxFile.topLevelCode,
        ...mainComponent.body
      ]

      // Extract dependencies for all code blocks
      const blocksWithDeps = this.extractAllDependencies(allCodeBlocks)

      // Group blocks by target scope based on page directive
      const { componentScope, uiScope } = groupByScope(blocksWithDeps, tsxFile.metadata.isPage)

      // Resolve dependencies within each scope
      const resolvedComponentScope = this.resolveScopeDependencies(componentScope)
      const resolvedUiScope = this.resolveScopeDependencies(uiScope)

      return {
        metadata: tsxFile.metadata,
        imports: tsxFile.imports,
        componentScope: resolvedComponentScope,
        uiScope: resolvedUiScope,
        mainComponent
      }

    } catch (error) {
      if (error instanceof ScopeError) {
        throw error
      }
      throw new ScopeError(`Scope analysis failed: ${error}`, filename)
    }
  }

  /**
   * Find the main component (default export or first component)
   */
  private findMainComponent(tsxFile: TSXFile): ComponentDeclaration | null {
    // Look for default export first
    const defaultComponent = tsxFile.components.find(c => c.isDefault)
    if (defaultComponent) return defaultComponent

    // Fall back to first component
    return tsxFile.components[0] || null
  }

  /**
   * Extract dependencies for all code blocks
   */
  private extractAllDependencies(blocks: CodeBlock[]): CodeBlock[] {
    return blocks.map(block => ({
      ...block,
      dependencies: extractDependencies(block.code)
    }))
  }

  /**
   * Resolve dependencies within a scope
   */
  private resolveScopeDependencies(blocks: CodeBlock[]): CodeBlock[] {
    if (blocks.length === 0) return blocks

    // Build dependency graph
    const graph = buildDependencyGraph(blocks)
    
    // Resolve dependencies using topological sort
    const resolved = resolveDependencies(graph)
    
    // Return resolved blocks, falling back to original order if resolution fails
    return resolved.length > 0 ? resolved : blocks
  }

  /**
   * Determine target scope for a code block
   */
  private determineScope(block: CodeBlock, isPageFile: boolean): 'component' | 'ui' {
    if (!isPageFile) {
      // Regular component: maintain original scoping
      return block.scope === 'top-level' ? 'component' : 'ui'
    }
    
    // Page file: apply scoping rules
    if (block.scope === 'top-level') {
      // Outside export default -> inside page function (component scope)
      return 'component'
    } else {
      // Inside export default -> inside Component callback (ui scope)
      return 'ui'
    }
  }

  /**
   * Validate that all dependencies are satisfied
   */
  private validateDependencies(blocks: CodeBlock[], scopeName: string): void {
    const definedSymbols = new Set<string>()
    
    // Collect all defined symbols
    for (const block of blocks) {
      const symbolName = this.extractDefinedSymbol(block.code)
      if (symbolName) {
        definedSymbols.add(symbolName)
      }
    }
    
    // Check that all dependencies are satisfied
    for (const block of blocks) {
      for (const dep of block.dependencies) {
        if (!definedSymbols.has(dep) && !this.isBuiltinSymbol(dep)) {
          console.warn(`Unresolved dependency '${dep}' in ${scopeName} scope`)
        }
      }
    }
  }

  /**
   * Extract the symbol defined by a code block
   */
  private extractDefinedSymbol(code: string): string | null {
    // Match variable declarations
    const varMatch = code.match(/(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
    if (varMatch) return varMatch[1]
    
    // Match function declarations
    const funcMatch = code.match(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
    if (funcMatch) return funcMatch[1]
    
    return null
  }

  /**
   * Check if a symbol is a built-in (doesn't need to be defined in scope)
   */
  private isBuiltinSymbol(symbol: string): boolean {
    const builtins = new Set([
      'console', 'window', 'document', 'setTimeout', 'setInterval',
      'ref', 'watch', 'computed', // Auwla built-ins
      'React', 'useState', 'useEffect' // React built-ins (in case of mixed usage)
    ])
    
    return builtins.has(symbol)
  }
}