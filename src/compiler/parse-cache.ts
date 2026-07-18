/**
 * @fileoverview Cached TypeScript source-file parsing for the compiler.
 *
 * The analysis passes re-parse small expression strings on every call
 * (`expand`, `extractIdentifiers`, `looksPure`, `rowDependencies`,
 * `externalSourceDeps`) — a fresh `ts.createSourceFile` per patch line was
 * the dominant compiler cost (P2). Parsed SourceFiles are immutable, so they
 * can be shared safely across compilations.
 */

import ts from 'typescript';

/** Soft cap; when hit, the oldest quarter is evicted (FIFO by insertion). */
const CACHE_LIMIT = 512;

const parenthesizedCache = new Map<string, ts.SourceFile>();
const tsxCache = new Map<string, ts.SourceFile>();

function getCached(
  cache: Map<string, ts.SourceFile>,
  key: string,
  create: (text: string) => ts.SourceFile,
): ts.SourceFile {
  const hit = cache.get(key);
  if (hit) return hit;

  const created = create(key);
  if (cache.size >= CACHE_LIMIT) {
    let evictions = CACHE_LIMIT / 4;
    for (const oldest of cache.keys()) {
      cache.delete(oldest);
      if (--evictions <= 0) break;
    }
  }
  cache.set(key, created);
  return created;
}

/** Parse `(${expression})` as a TS source file, cached by expression text. */
export function parseParenthesizedExpression(expression: string): ts.SourceFile {
  return getCached(parenthesizedCache, `(${expression})`, (text) =>
    ts.createSourceFile('temp.ts', text, ts.ScriptTarget.Latest, true),
  );
}

/** Parse a full TSX snippet (used by derived-state expansion), cached by text. */
export function parseTsxSnippet(expression: string): ts.SourceFile {
  return getCached(tsxCache, expression, (text) =>
    ts.createSourceFile('temp.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX),
  );
}
