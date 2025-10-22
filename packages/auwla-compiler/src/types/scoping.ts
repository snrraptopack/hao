/**
 * Scoping types for TSX compilation
 */

import type { PageMetadata, ImportDeclaration, ComponentDeclaration, CodeBlock } from './ast.js'

export interface ScopedFile {
  metadata: PageMetadata
  imports: ImportDeclaration[]
  componentScope: CodeBlock[]  // Goes inside page function
  uiScope: CodeBlock[]        // Goes inside Component callback
  mainComponent: ComponentDeclaration
}

export type ScopeType = 'component' | 'ui'

export interface ScopeAnalysisResult {
  scope: ScopeType
  dependencies: string[]
  order: number
}

export interface DependencyGraph {
  nodes: Map<string, CodeBlock>
  edges: Map<string, string[]>
  resolved: CodeBlock[]
}