import { describe, expect, test } from 'vitest';
import {
  decodeJsxText,
  escapeHtml,
  rowDependencies,
  expressionDependencies,
  isStaticExpression,
} from '../../src/compiler/utils';
import ts from 'typescript';

describe('decodeJsxText', () => {
  test('decodes basic entities', () => {
    expect(decodeJsxText('&amp;')).toBe('&');
    expect(decodeJsxText('&lt;')).toBe('<');
    expect(decodeJsxText('&gt;')).toBe('>');
    expect(decodeJsxText('&quot;')).toBe('"');
    expect(decodeJsxText('&apos;')).toBe("'");
    expect(decodeJsxText('&nbsp;')).toBe('\u00a0');
  });

  test('decodes numeric entities', () => {
    expect(decodeJsxText('&#65;')).toBe('A');
    expect(decodeJsxText('&#x41;')).toBe('A');
  });

  test('decodes mixed text', () => {
    expect(decodeJsxText('Hello &amp; welcome')).toBe('Hello & welcome');
  });

  test('passes through unknown entities', () => {
    expect(decodeJsxText('&unknown;')).toBe('&unknown;');
  });
});

describe('escapeHtml', () => {
  test('escapes special characters', () => {
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('>')).toBe('&gt;');
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('"')).toBe('&quot;');
  });

  test('escapes mixed content', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
  });
});

describe('rowDependencies', () => {
  test('extracts item properties', () => {
    expect(rowDependencies(['item.label', 'item.id'], 'item')).toEqual([
      'item.label',
      'item.id',
    ]);
  });

  test('falls back to full expression when closure vars present', () => {
    expect(rowDependencies(['selected === item.id'], 'item')).toEqual([
      'selected === item.id',
    ]);
  });

  test('deduplicates dependencies', () => {
    expect(rowDependencies(['item.label', 'item.label'], 'item')).toEqual(['item.label']);
  });

  test('ignores string literals', () => {
    expect(rowDependencies(["item.label + 'suffix'"], 'item')).toEqual(['item.label']);
  });
});

describe('expressionDependencies', () => {
  test('delegates to rowDependencies', () => {
    expect(expressionDependencies('item.value', 'item')).toEqual(['item.value']);
  });
});

describe('isStaticExpression', () => {
  function parseExpression(code: string): ts.Expression {
    const source = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest);
    return (source.statements[0] as ts.ExpressionStatement).expression;
  }

  test('recognizes string literals', () => {
    expect(isStaticExpression(parseExpression("'hello'"))).toBe(true);
  });

  test('recognizes numeric literals', () => {
    expect(isStaticExpression(parseExpression('42'))).toBe(true);
  });

  test('recognizes booleans and null', () => {
    expect(isStaticExpression(parseExpression('true'))).toBe(true);
    expect(isStaticExpression(parseExpression('false'))).toBe(true);
    expect(isStaticExpression(parseExpression('null'))).toBe(true);
  });

  test('rejects identifiers', () => {
    expect(isStaticExpression(parseExpression('foo'))).toBe(false);
  });

  test('rejects binary expressions', () => {
    expect(isStaticExpression(parseExpression('1 + 2'))).toBe(false);
  });
});
