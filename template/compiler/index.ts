import { parseAuwlaFile } from './auwla-parser'
import { generateAuwlaFile } from 'auwla-compiler'
import { templateCompiler } from './vite-plugin'
import debugTranspile from './debug-transpile-auwla'

export { templateCompiler }
export { parseAuwlaFile }
export { generateAuwlaFile }
export { debugTranspile as cli }

/**
 * Main compiler entry point
 * Returns generated TypeScript source for the provided .auwla content.
 */
export function compile(htmlContent: string): string {
  const parsed = parseAuwlaFile(htmlContent)
  const ts = generateAuwlaFile(parsed)
  return ts
}
