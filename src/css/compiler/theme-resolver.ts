import ts from 'typescript';
import path from 'path';
import fs from 'fs';
import { evalNode } from './evaluator';

export const themeCache = new Map<string, any>();

export function clearThemeCache(): void {
  themeCache.clear();
}

export function resolveThemeFile(dir: string, moduleSpecifier: string): string | null {
  const base = path.resolve(dir, moduleSpecifier);
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];
  if (fs.existsSync(base) && fs.statSync(base).isFile()) {
    return base;
  }
  for (const ext of extensions) {
    const p = base + ext;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      return p;
    }
  }
  for (const ext of extensions) {
    const p = path.join(base, 'index' + ext);
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      return p;
    }
  }
  return null;
}

export function getThemeObject(themePath: string): any {
  if (themeCache.has(themePath)) {
    return themeCache.get(themePath);
  }

  try {
    const content = fs.readFileSync(themePath, 'utf8');
    const source = ts.createSourceFile(themePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    let themeValue: any = null;

    const localScope = new Map<string, any>();

    // Pass 1: Build local scope from variable statements in declaration order
    for (const stmt of source.statements) {
      if (ts.isVariableStatement(stmt)) {
        for (const decl of stmt.declarationList.declarations) {
          if (ts.isIdentifier(decl.name) && decl.initializer) {
            const evalRes = evalNode(decl.initializer, source, localScope);
            if (evalRes.isStatic) {
              localScope.set(decl.name.text, evalRes.value);
            }
          }
        }
      }
    }

    // Pass 2: Find and evaluate the exported 'theme' declaration using localScope
    for (const stmt of source.statements) {
      if (ts.isVariableStatement(stmt)) {
        const isExported = stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
        if (isExported) {
          for (const decl of stmt.declarationList.declarations) {
            if (ts.isIdentifier(decl.name) && decl.name.text === 'theme') {
              if (decl.initializer) {
                const evalRes = evalNode(decl.initializer, source, localScope);
                if (evalRes.isStatic) {
                  themeValue = evalRes.value;
                }
              }
            }
          }
        }
      }
    }

    themeCache.set(themePath, themeValue);
    return themeValue;
  } catch (err) {
    console.error(`Error loading theme from ${themePath}:`, err);
    return null;
  }
}
