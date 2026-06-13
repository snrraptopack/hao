/**
 * @file css-compiler.ts
 * @description
 * Entry point for the modular AST compiler for Auwla CSS styles.
 */

import ts from 'typescript';
import { clearThemeCache as resolverClearThemeCache } from './theme-resolver';
import { findCSSReplacements, clearReplacerCache as replacerClearCache } from './replacer';

export interface CSSRuleCallback {
  (className: string, declaration: string, mediaQuery?: string): void;
}

/**
 * Clears the theme cache stored in the theme resolver.
 */
export function clearThemeCache(): void {
  resolverClearThemeCache();
  replacerClearCache();
}

/**
 * Compiles and rewrites TSX code to extract static CSS styles.
 *
 * @param sourceText Raw TSX source code
 * @param fileName File name for AST builder
 * @param onCssRule Callback received for each extracted CSS rule
 */
export function compileCSS(
  sourceText: string,
  fileName: string,
  onCssRule: CSSRuleCallback = () => {}
): string {
  const source = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const replacements = findCSSReplacements(source, fileName, onCssRule);

  if (replacements.length === 0) return sourceText;

  // Apply replacements in reverse order (to keep offsets valid)
  let output = sourceText;
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    output = `${output.slice(0, replacement.start)}${replacement.text}${output.slice(replacement.end)}`;
  }

  return output;
}

