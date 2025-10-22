/**
 * Core AST types for TSX compilation
 */

export interface TSXFile {
  metadata: PageMetadata
  imports: ImportDeclaration[]
  components: ComponentDeclaration[]
  topLevelCode: CodeBlock[]
}

export interface PageMetadata {
  isPage: boolean
  route?: string
  title?: string
  description?: string
  guard?: string
}

export interface ImportDeclaration {
  source: string
  specifiers: ImportSpecifier[]
  raw: string
}

export interface ImportSpecifier {
  imported: string
  local: string
  type: 'default' | 'named' | 'namespace'
}

export interface ComponentDeclaration {
  name: string
  isDefault: boolean
  isExported: boolean
  params: Parameter[]
  body: CodeBlock[]
  jsxReturn: JSXElement | null
}

export interface Parameter {
  name: string
  type?: string
  defaultValue?: string
}

export interface CodeBlock {
  type: 'variable' | 'function' | 'expression'
  code: string
  dependencies: string[]
  scope: 'top-level' | 'component-body'
  startLine?: number
  endLine?: number
}

export interface JSXElement {
  type: 'element' | 'fragment' | 'text' | 'expression'
  tag?: string
  props?: JSXProp[]
  children?: JSXElement[]
  text?: string
  expression?: any
}

export interface JSXProp {
  name: string
  value: any
  isSpread?: boolean
}