/**
 * New TSX Compiler - Clean architecture for TSX compilation
 */

import { parseTSX } from './core/tsx-parser.js'
import { ScopeAnalyzer } from './core/scope-analyzer.js'
import { JSXAnalyzer } from './core/jsx-analyzer.js'
import { CodeGenerator } from './core/code-generator.js'

/**
 * Compile TSX to Auwla component using new architecture
 */
export function compileNewTSX(content: string, filename: string = 'unknown.tsx'): string {
  // Step 1: Parse TSX file
  const tsxFile = parseTSX(content, filename)
  
  // Step 2: Analyze scoping
  const scopeAnalyzer = new ScopeAnalyzer()
  const scopedFile = scopeAnalyzer.analyze(tsxFile, filename)
  
  // Step 3: Analyze JSX structure
  const jsxAnalyzer = new JSXAnalyzer()
  const jsxStructure = jsxAnalyzer.analyze(scopedFile.mainComponent.jsxReturn, filename)
  
  // Step 4: Generate code
  const codeGenerator = new CodeGenerator()
  const output = codeGenerator.generate(scopedFile, jsxStructure, filename)
  
  return output
}

/**
 * Compile TSX with error handling and debugging
 */
export function compileNewTSXWithDebug(content: string, filename: string = 'unknown.tsx'): {
  output: string
  debug: {
    tsxFile: any
    scopedFile: any
    jsxStructure: any
  }
} {
  // Step 1: Parse TSX file
  const tsxFile = parseTSX(content, filename)
  
  // Step 2: Analyze scoping
  const scopeAnalyzer = new ScopeAnalyzer()
  const scopedFile = scopeAnalyzer.analyze(tsxFile, filename)
  
  // Step 3: Analyze JSX structure
  const jsxAnalyzer = new JSXAnalyzer()
  const jsxStructure = jsxAnalyzer.analyze(scopedFile.mainComponent.jsxReturn, filename)
  
  // Step 4: Generate code
  const codeGenerator = new CodeGenerator()
  const output = codeGenerator.generate(scopedFile, jsxStructure, filename)
  
  return {
    output,
    debug: {
      tsxFile,
      scopedFile,
      jsxStructure
    }
  }
}