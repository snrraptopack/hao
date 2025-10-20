// Main exports for @auwla/compiler package
export { parseAuwlaFile } from './auwla-parser.js'
export { generateAuwlaFile } from './codegen/main.js'
export { generateRoutes } from './route-generator.js'
export { templateCompiler } from './vite-plugin.js'

// Types
export type { AuwlaFile, ComponentFunction } from './auwla-parser.js'
export type { JSXNode, JSXProp, Directive } from './jsx-analyzer.js'