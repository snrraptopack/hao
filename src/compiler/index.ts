/**
 * @fileoverview Auwla TSX compiler transform.
 *
 * Parses TypeScript/TSX source and lowers component render closures into
 * imperative DOM blocks that call into `compiler-runtime` helpers.
 */

import ts from 'typescript';
import { COMPILER_IMPORT, CompileContext } from './types';
import { compileTemplateRootBlock } from './template';
import { compileJsxNode } from './jsx-node';
import { unwrapJsxReturn, unwrapJsxBody } from './utils';

function compileRenderClosure(source: ts.SourceFile, jsx: ts.JsxElement | ts.JsxSelfClosingElement): string | null {
  const templateResult = compileTemplateRootBlock(source, jsx);
  if (templateResult) return templateResult;

  const ctx: CompileContext = {
    source,
    elementId: 0,
    mapId: 0,
    textId: 0,
    patches: [],
    deps: [],
    setup: [],
  };

  const result = compileJsxNode(ctx, jsx);
  if (!result) return null;

  const update = ctx.patches.length
    ? ctx.patches.map((patch) => `          ${patch.code}`).join('\n')
    : '          // Static block; no dynamic fields to patch.';

  return `__componentBlock(() => {
${ctx.setup.map((line) => `        ${line}`).join('\n')}

        return __createBlock(() => ({
          node: ${result.root},
          update() {
${update}
          },
        }));
      })`;
}

function transformReturn(source: ts.SourceFile, node: ts.ReturnStatement): string | null {
  const expression = node.expression;
  if (!expression || !ts.isArrowFunction(expression)) return null;

  let body: ts.JsxElement | ts.JsxSelfClosingElement | null = null;
  const leadingStatements: string[] = [];

  if (ts.isBlock(expression.body)) {
    body = unwrapJsxReturn(expression.body);
    if (!body) return null;

    for (const stmt of expression.body.statements) {
      if (ts.isReturnStatement(stmt)) break;
      leadingStatements.push(stmt.getText(source));
    }
  } else {
    body = unwrapJsxBody(expression.body);
    if (!body) return null;
  }

  const compiled = compileRenderClosure(source, body);
  if (!compiled) return null;

  if (leadingStatements.length > 0) {
    const params = expression.parameters.length > 0
      ? expression.parameters.map((p) => p.getText(source)).join(', ')
      : '';
    const paramsWithParens = params ? `(${params})` : '()';
    return `return ${paramsWithParens} => {\n        ${leadingStatements.join('\n        ')}\n        return ${compiled};\n      };`;
  }

  return `return ${compiled};`;
}

function findReplacements(source: ts.SourceFile): Array<{ start: number; end: number; text: string }> {
  const replacements: Array<{ start: number; end: number; text: string }> = [];

  function visit(node: ts.Node) {
    if (ts.isReturnStatement(node)) {
      const replacement = transformReturn(source, node);
      if (replacement) {
        replacements.push({
          start: node.getStart(source),
          end: node.getEnd(),
          text: replacement,
        });
        return;
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
  return replacements;
}

function applyReplacements(source: string, replacements: Array<{ start: number; end: number; text: string }>): string {
  let output = source;
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    output = `${output.slice(0, replacement.start)}${replacement.text}${output.slice(replacement.end)}`;
  }
  return output;
}

function addCompilerImport(code: string, didCompile: boolean): string {
  if (didCompile) {
    return `import { ${COMPILER_IMPORT} } from 'auwla';\n${code}`;
  }
  return code;
}

/**
 * Compile Auwla TSX source by transforming component render closures
 * into imperative DOM blocks.
 *
 * @param sourceText - Raw TSX source code.
 * @param fileName - Optional file name for error reporting.
 * @returns The transformed source code, or the original if no transforms apply.
 */
export function compileAuwla(sourceText: string, fileName = 'input.tsx'): string {
  const source = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const replacements = findReplacements(source);
  if (replacements.length === 0) return sourceText;
  return addCompilerImport(applyReplacements(sourceText, replacements), true);
}
