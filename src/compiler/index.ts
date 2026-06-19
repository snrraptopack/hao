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
import { buildDerivedContext, DerivedContext } from './derived';
import { dirtySetupLine, renderUpdateBody, sourceTrackingLines, usesDirtyTracking } from './dirty';

export type CompileOptions = {
  ssr?: boolean;
};

function compileRenderClosure(
  source: ts.SourceFile,
  jsx: ts.JsxElement | ts.JsxSelfClosingElement,
  derivedCtx: DerivedContext | null,
  forceAllUpdate = false,
  preUpdateStatements: readonly string[] = [],
  options?: CompileOptions,
): string | null {
  const ssr = options?.ssr === true;
  const templateResult = compileTemplateRootBlock(source, jsx, derivedCtx, forceAllUpdate, preUpdateStatements, ssr);
  if (templateResult) return templateResult;

  const ctx: CompileContext = {
    source,
    elementId: 0,
    mapId: 0,
    textId: 0,
    patches: [],
    deps: [],
    setup: [],
    derivedCtx,
    renderScoped: preUpdateStatements.length > 0,
  };

  const result = compileJsxNode(ctx, jsx);
  if (!result) return null;

  const patches = derivedCtx
    ? ctx.patches.map((p) => ({ ...p, code: derivedCtx.expand(p.code) }))
    : ctx.patches;
  const dirtyAware = usesDirtyTracking(ctx.setup, patches);
  const setupLines = [
    ...dirtySetupLine(ctx.setup, patches),
    ...sourceTrackingLines(patches, derivedCtx),
    ...ctx.setup,
  ];

  const patchUpdate = renderUpdateBody(patches, derivedCtx, '          ', dirtyAware, forceAllUpdate);
  const update = [
    ...preUpdateStatements.map((line) => `          ${line}`),
    patchUpdate,
  ].filter(Boolean).join('\n');

  return `__componentBlock(() => {
${setupLines.map((line) => `        ${line}`).join('\n')}

        return __createBlock(() => ({
          node: ${result.root},
          update() {
${update}
          },
        }));
      })`;
}

function transformReturn(
  source: ts.SourceFile,
  node: ts.ReturnStatement,
  containingFunction: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression | null,
  options?: CompileOptions,
): string | null {
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

  // Extract setup statements from the containing function to build derived-value context
  let derivedCtx: DerivedContext | null = null;
  if (containingFunction && containingFunction.body && ts.isBlock(containingFunction.body)) {
    const setupStatements: ts.Statement[] = [];
    for (const stmt of containingFunction.body.statements) {
      if (ts.isReturnStatement(stmt) && stmt.expression === expression) break;
      if (ts.isReturnStatement(stmt)) continue;
      setupStatements.push(stmt);
    }
    if (setupStatements.length > 0) {
      derivedCtx = buildDerivedContext(source, setupStatements);
    }
  }

  const compiled = compileRenderClosure(source, body, derivedCtx, leadingStatements.length > 0, leadingStatements, options);
  if (!compiled) return null;

  return `return ${compiled};`;
}

function findReplacements(source: ts.SourceFile, options?: CompileOptions): Array<{ start: number; end: number; text: string }> {
  const replacements: Array<{ start: number; end: number; text: string }> = [];

  function visit(node: ts.Node, containingFunction: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression | null) {
    if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      ts.forEachChild(node, (child) => visit(child, node));
      return;
    }

    if (ts.isReturnStatement(node)) {
      const replacement = transformReturn(source, node, containingFunction, options);
      if (replacement) {
        replacements.push({
          start: node.getStart(source),
          end: node.getEnd(),
          text: replacement,
        });
        return;
      }
    }

    ts.forEachChild(node, (child) => visit(child, containingFunction));
  }

  visit(source, null);
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
export function compileAuwla(sourceText: string, fileName = 'input.tsx', options?: CompileOptions): string {
  // Pass 1: Inject __auwlaSite into Component tags
  let siteCounter = 0;
  const siteReplacements: Array<{ start: number; end: number; text: string }> = [];
  const source1 = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  
  function isComponentTag(tagName: ts.JsxTagNameExpression): boolean {
    if (!ts.isIdentifier(tagName)) return false;
    return /^[A-Z]/.test(tagName.text);
  }

  function visitSite(node: ts.Node) {
    if (ts.isJsxElement(node) && isComponentTag(node.openingElement.tagName)) {
      siteReplacements.push({
        start: node.openingElement.tagName.getEnd(),
        end: node.openingElement.tagName.getEnd(),
        text: ` __auwlaSite="${siteCounter++}"`
      });
    } else if (ts.isJsxSelfClosingElement(node) && isComponentTag(node.tagName)) {
      siteReplacements.push({
        start: node.tagName.getEnd(),
        end: node.tagName.getEnd(),
        text: ` __auwlaSite="${siteCounter++}"`
      });
    }
    ts.forEachChild(node, visitSite);
  }
  visitSite(source1);
  
  const textWithSites = siteReplacements.length > 0 
    ? applyReplacements(sourceText, siteReplacements)
    : sourceText;

  // Pass 2: Compile Auwla DOM blocks
  const source2 = ts.createSourceFile(fileName, textWithSites, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const replacements = findReplacements(source2, options);
  
  if (replacements.length === 0 && siteReplacements.length === 0) return sourceText;
  
  const finalCode = replacements.length > 0 ? applyReplacements(textWithSites, replacements) : textWithSites;
  return addCompilerImport(finalCode, replacements.length > 0);
}
