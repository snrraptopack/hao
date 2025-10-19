// Main exports for @auwla/compiler package
export { parseAuwlaFile } from './auwla-parser'
export { generateAuwlaFile } from './auwla-codegen'
export { generateRoutes } from './route-generator'
export { templateCompiler } from './vite-plugin'

// Types
export type { AuwlaFile, ComponentFunction } from './auwla-parser'
export type { JSXNode, JSXProp, Directive } from './jsx-analyzer'