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
import { unwrapJsxReturn, unwrapJsxBody, analyzeComponentSkips } from './utils';
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

  if (ssr) return null;

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
    ...preUpdateStatements.map((line) => `          ${derivedCtx ? derivedCtx.expand(line) : line}`),
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
  _containingFunction: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression | null,
  derivedCtx: DerivedContext | null,
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

  const compiled = compileRenderClosure(source, body, derivedCtx, leadingStatements.length > 0, leadingStatements, options);
  if (!compiled) return null;

  return `return ${compiled};`;
}

function addDerivedReplacements(
  source: ts.SourceFile,
  setupStatements: ts.Statement[],
  derivedCtx: DerivedContext,
  replacements: Array<{ start: number; end: number; text: string }>,
): void {
  for (const stmt of setupStatements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name)) continue;
      const name = decl.name.text;
      if (!derivedCtx.derived.has(name)) continue;
      if (!decl.initializer) continue;
      const init = decl.initializer.getText(source);
      replacements.push({
        start: decl.initializer.getStart(source),
        end: decl.initializer.getEnd(),
        text: `__computed(() => ${derivedCtx.expand(init)})`,
      });
    }
  }
}

function findReplacements(
  source: ts.SourceFile,
  skipCompile: Set<string>,
  options?: CompileOptions,
): Array<{ start: number; end: number; text: string }> {
  const replacements: Array<{ start: number; end: number; text: string }> = [];
  const derivedReplacementsByFunc = new Map<ts.Node, Array<{ start: number; end: number; text: string }>>();
  const appliedDerivedFuncs = new Set<ts.Node>();
  const componentSelfNames = new Map<ts.Node, string>();

  function isSkippedComponent(node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression): boolean {
    if (ts.isFunctionDeclaration(node) && node.name && skipCompile.has(node.name.text)) {
      return true;
    }
    return false;
  }

  function extractSetupStatements(
    node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression,
  ): ts.Statement[] {
    if (!node.body || !ts.isBlock(node.body)) return [];
    const setupStatements: ts.Statement[] = [];
    for (const stmt of node.body.statements) {
      if (ts.isReturnStatement(stmt)) break;
      setupStatements.push(stmt);
    }
    return setupStatements;
  }

  function visit(
    node: ts.Node,
    containingFunction: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression | null,
    derivedCtx: DerivedContext | null,
    activeSelfName: string | null,
    activeLocals: Set<string> | null,
    inWrappedAsyncSelfName: string | null = null,
  ) {
    if (ts.isAwaitExpression(node) && inWrappedAsyncSelfName) {
      replacements.push({
        start: node.getStart(source),
        end: node.getEnd(),
        text: `(__commit(${inWrappedAsyncSelfName}), ${node.getText(source)})`,
      });
    }

    if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      if (isSkippedComponent(node)) return;

      const isAsync = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) || false;
      let willWrap = false;

      // Wrap helper functions inside component setups that perform local mutations
      if (activeSelfName && activeLocals && node.body && ts.isBlock(node.body)) {
        if (mutatesLocals(node.body, activeLocals) && !hasCommitCall(node.body, activeSelfName)) {
          willWrap = true;
          // Boundary insertions: insert try/finally wrapper at start/end of function block
          replacements.push({
            start: node.body.getStart(source) + 1,
            end: node.body.getStart(source) + 1,
            text: `\n  try {\n`,
          });
          replacements.push({
            start: node.body.getEnd() - 1,
            end: node.body.getEnd() - 1,
            text: `\n  } finally {\n    __commit(${activeSelfName});\n  }\n`,
          });
        }
      }

      const setupStatements = extractSetupStatements(node);
      const selfName = findComponentSelfName(setupStatements);
      if (selfName) {
        componentSelfNames.set(node, selfName);
      }

      const childDerivedCtx = (containingFunction === null && setupStatements.length > 0)
        ? buildDerivedContext(source, setupStatements)
        : null;
      if (childDerivedCtx && childDerivedCtx.derived.size > 0) {
        const funcReplacements: Array<{ start: number; end: number; text: string }> = [];
        addDerivedReplacements(source, setupStatements, childDerivedCtx, funcReplacements);
        derivedReplacementsByFunc.set(node, funcReplacements);
      }

      const childWrappedAsyncSelfName = (willWrap && isAsync) ? activeSelfName : null;

      ts.forEachChild(node, (child) => visit(
        child,
        node,
        childDerivedCtx,
        selfName || activeSelfName,
        childDerivedCtx?.locals || activeLocals,
        childWrappedAsyncSelfName,
      ));
      return;
    }

    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          skipCompile.has(decl.name.text) &&
          decl.initializer &&
          (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
        ) {
          // Skip the initializer subtree for runtime-fallback components.
          continue;
        }
        visit(decl, containingFunction, derivedCtx, activeSelfName, activeLocals, inWrappedAsyncSelfName);
      }
      return;
    }

    if (ts.isReturnStatement(node)) {
      const replacement = transformReturn(source, node, containingFunction, derivedCtx, options);
      if (replacement) {
        replacements.push({
          start: node.getStart(source),
          end: node.getEnd(),
          text: replacement,
        });
        if (containingFunction && !appliedDerivedFuncs.has(containingFunction)) {
          const funcReplacements = derivedReplacementsByFunc.get(containingFunction);
          if (funcReplacements) {
            replacements.push(...funcReplacements);
            appliedDerivedFuncs.add(containingFunction);
          }
        }
        return;
      }

      // Render closures that the compiler couldn't turn into a DOM block (e.g.
      // Router.tsx with multiple early returns) must not be recursed into as if
      // they were standalone component functions. Their per-render locals are not
      // component setup state, so deriving them would wrap reads in getters that
      // are never called and break destructuring.
      const expr = node.expression;
      if (
        expr &&
        (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr))
      ) {
        ts.forEachChild(expr, (child) => visit(child, containingFunction, derivedCtx, activeSelfName, activeLocals, inWrappedAsyncSelfName));
        return;
      }
    }

    ts.forEachChild(node, (child) => visit(child, containingFunction, derivedCtx, activeSelfName, activeLocals, inWrappedAsyncSelfName));
  }

  visit(source, null, null, null, null, null);
  return replacements;
}

function findComponentSelfName(statements: ts.Statement[]): string | null {
  for (const stmt of statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (
        decl.initializer &&
        ts.isCallExpression(decl.initializer) &&
        ts.isIdentifier(decl.initializer.expression) &&
        decl.initializer.expression.text === 'component' &&
        ts.isIdentifier(decl.name)
      ) {
        return decl.name.text;
      }
    }
  }
  return null;
}

function mutatesLocals(body: ts.Node, locals: Set<string>): boolean {
  let mutates = false;
  
  const assignOps = new Set([
    ts.SyntaxKind.EqualsToken,
    ts.SyntaxKind.PlusEqualsToken,
    ts.SyntaxKind.MinusEqualsToken,
    ts.SyntaxKind.AsteriskEqualsToken,
    ts.SyntaxKind.SlashEqualsToken,
    ts.SyntaxKind.PercentEqualsToken,
    ts.SyntaxKind.AmpersandEqualsToken,
    ts.SyntaxKind.BarEqualsToken,
    ts.SyntaxKind.CaretEqualsToken,
    ts.SyntaxKind.LessThanLessThanEqualsToken,
    ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
    ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
    ts.SyntaxKind.AsteriskAsteriskEqualsToken,
    ts.SyntaxKind.BarBarEqualsToken,
    ts.SyntaxKind.AmpersandAmpersandEqualsToken,
    ts.SyntaxKind.QuestionQuestionEqualsToken,
  ]);

  const shadowed = new Set<string>();

  function walk(node: ts.Node) {
    if (mutates) return;

    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      shadowed.add(node.name.text);
    }
    if (ts.isParameter(node) && ts.isIdentifier(node.name)) {
      shadowed.add(node.name.text);
    }

    if (ts.isBinaryExpression(node) && assignOps.has(node.operatorToken.kind)) {
      let root: string | null = null;
      if (ts.isIdentifier(node.left)) {
        root = node.left.text;
      } else if (ts.isPropertyAccessExpression(node.left) && ts.isIdentifier(node.left.expression)) {
        root = node.left.expression.text;
      }
      if (root && locals.has(root) && !shadowed.has(root)) {
        mutates = true;
        return;
      }
    }

    if (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) {
      if (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken) {
        let root: string | null = null;
        if (ts.isIdentifier(node.operand)) {
          root = node.operand.text;
        } else if (ts.isPropertyAccessExpression(node.operand) && ts.isIdentifier(node.operand.expression)) {
          root = node.operand.expression.text;
        }
        if (root && locals.has(root) && !shadowed.has(root)) {
          mutates = true;
          return;
        }
      }
    }

    ts.forEachChild(node, walk);
  }

  walk(body);
  return mutates;
}

function hasCommitCall(body: ts.Node, selfName: string): boolean {
  let hasCall = false;

  function walk(node: ts.Node) {
    if (hasCall) return;

    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      (node.expression.text === 'commit' || node.expression.text === '__commit') &&
      node.arguments.length > 0 &&
      ts.isIdentifier(node.arguments[0]!) &&
      node.arguments[0]!.text === selfName
    ) {
      hasCall = true;
      return;
    }

    ts.forEachChild(node, walk);
  }

  walk(body);
  return hasCall;
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
  const source1 = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const { definedComponents, nonInlinable, skipCompile } = analyzeComponentSkips(source1);

  // Pass 1: Inject __auwlaSite into Component tags that can be inlined/compiled.
  let siteCounter = 0;
  const siteReplacements: Array<{ start: number; end: number; text: string }> = [];

  function isComponentTag(tagName: ts.JsxTagNameExpression): boolean {
    if (!ts.isIdentifier(tagName)) return false;
    const name = tagName.text;
    // Only treat uppercase identifiers as component tags when they correspond to
    // a component definition in this file. Dynamic tags (e.g. <Tag>) are left
    // for the runtime and must not receive __auwlaSite.
    return /^[A-Z]/.test(name) && definedComponents.has(name);
  }

  function shouldTagComponent(name: string): boolean {
    // Components that cannot be inlined or reference children are left untouched.
    return !nonInlinable.has(name) && !skipCompile.has(name);
  }

  function visitSite(node: ts.Node) {
    if (ts.isJsxElement(node) && ts.isIdentifier(node.openingElement.tagName)) {
      const name = node.openingElement.tagName.text;
      if (isComponentTag(node.openingElement.tagName) && shouldTagComponent(name)) {
        siteReplacements.push({
          start: node.openingElement.tagName.getEnd(),
          end: node.openingElement.tagName.getEnd(),
          text: ` __auwlaSite="${siteCounter++}"`
        });
      }
    } else if (ts.isJsxSelfClosingElement(node) && ts.isIdentifier(node.tagName)) {
      const name = node.tagName.text;
      if (isComponentTag(node.tagName) && shouldTagComponent(name)) {
        siteReplacements.push({
          start: node.tagName.getEnd(),
          end: node.tagName.getEnd(),
          text: ` __auwlaSite="${siteCounter++}"`
        });
      }
    }
    ts.forEachChild(node, visitSite);
  }
  visitSite(source1);

  const textWithSites = siteReplacements.length > 0
    ? applyReplacements(sourceText, siteReplacements)
    : sourceText;

  // Pass 2: Compile Auwla DOM blocks
  const source2 = ts.createSourceFile(fileName, textWithSites, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const replacements = findReplacements(source2, skipCompile, options);

  if (replacements.length === 0 && siteReplacements.length === 0) return sourceText;

  const finalCode = replacements.length > 0 ? applyReplacements(textWithSites, replacements) : textWithSites;
  return addCompilerImport(finalCode, replacements.length > 0);
}
