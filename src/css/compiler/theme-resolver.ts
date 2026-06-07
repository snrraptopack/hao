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
    const unresolved = new Map<string, ts.Expression>();

    // Collect all local variables
    for (const stmt of source.statements) {
      if (ts.isVariableStatement(stmt)) {
        for (const decl of stmt.declarationList.declarations) {
          if (ts.isIdentifier(decl.name) && decl.initializer) {
            unresolved.set(decl.name.text, decl.initializer);
          }
        }
      }
    }

    // Fixed-point evaluation loop to support forward references
    let resolvedAny = true;
    while (resolvedAny && unresolved.size > 0) {
      resolvedAny = false;
      for (const [name, initializer] of unresolved.entries()) {
        const evalRes = evalNode(initializer, source, undefined, undefined, localScope);
        if (evalRes.isStatic) {
          localScope.set(name, evalRes.value);
          unresolved.delete(name);
          resolvedAny = true;
        }
      }
    }

    themeValue = localScope.get('theme') ?? null;

    themeCache.set(themePath, themeValue);
    return themeValue;
  } catch (err) {
    console.error(`Error loading theme from ${themePath}:`, err);
    return null;
  }
}
