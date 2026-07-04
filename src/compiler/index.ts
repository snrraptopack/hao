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
import { buildDerivedContext, DerivedContext, extractIdentifiers } from './derived';
import { dirtySetupLine, renderUpdateBody, sourceTrackingLines, usesDirtyTracking } from './dirty';

export type CompileOptions = {
  ssr?: boolean;
};

const EVENT_ATTR_PATTERN = /^on[A-Z]/;

/**
 * Collect function identifiers that are used directly as JSX event handlers.
 * These functions do not need __commit() wrapping because the event path
 * already invalidates the component.
 */
function collectEventHandlerIdentifiers(source: ts.SourceFile): Set<string> {
  const identifiers = new Set<string>();
  function visit(node: ts.Node) {
    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name) && EVENT_ATTR_PATTERN.test(node.name.text)) {
      if (node.initializer) {
        const expr = ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer;
        if (expr && ts.isIdentifier(expr)) {
          identifiers.add(expr.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  ts.forEachChild(source, visit);
  return identifiers;
}

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
  const dirtyAware = usesDirtyTracking(ctx.setup, patches, derivedCtx);
  const setupLines = [
    ...dirtySetupLine(ctx.setup, patches, derivedCtx),
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
    if (!stmt || !ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name)) continue;
      const name = decl.name.text;
      if (!derivedCtx.derived.has(name)) continue;
      if (!decl.initializer) continue;
      const init = decl.initializer.getText(source);
      const deps = derivedCtx.allSourceDeps(init);
      const depsStr = deps.length > 0 ? `, [${deps.map((d) => `'${d}'`).join(', ')}]` : '';
      replacements.push({
        start: decl.initializer.getStart(source),
        end: decl.initializer.getEnd(),
        text: `__computed(() => ${derivedCtx.expand(init)}${depsStr})`,
      });
    }
  }
}

function addConditionalAssignmentReplacements(
  derivedCtx: DerivedContext,
  replacements: Array<{ start: number; end: number; text: string }>,
): void {
  for (const [name, info] of derivedCtx.conditionalAssignments) {
    const deps = derivedCtx.allSourceDeps(info.init);
    const depsStr = deps.length > 0 ? `, [${deps.map((d) => `'${d}'`).join(', ')}]` : '';
    replacements.push({
      start: info.start,
      end: info.end,
      text: `let ${name} = __computed(() => ${derivedCtx.expand(info.init)}${depsStr});`,
    });
  }
}

function addLoopReplacements(
  derivedCtx: DerivedContext,
  replacements: Array<{ start: number; end: number; text: string }>,
): void {
  for (const [name, info] of derivedCtx.loopReplacements) {
    const deps = derivedCtx.allSourceDeps(info.body);
    const depsStr = deps.length > 0 ? `, [${deps.map((d) => `'${d}'`).join(', ')}]` : '';
    replacements.push({
      start: info.start,
      end: info.end,
      text: `let ${name} = __computed(() => {\n${derivedCtx.expand(info.body)}\n}${depsStr});`,
    });
  }
}

function containsReturn(node: ts.Node): boolean {
  let found = false;
  function walk(n: ts.Node) {
    if (found) return;
    if (ts.isReturnStatement(n)) {
      found = true;
      return;
    }
    ts.forEachChild(n, walk);
  }
  walk(node);
  return found;
}

function hasSideEffects(node: ts.Node): boolean {
  let sideEffect = false;
  function walk(n: ts.Node) {
    if (sideEffect) return;
    if (
      ts.isCallExpression(n) ||
      ts.isNewExpression(n) ||
      ts.isReturnStatement(n) ||
      ts.isThrowStatement(n) ||
      ts.isDeleteExpression(n)
    ) {
      sideEffect = true;
      return;
    }
    if (ts.isBinaryExpression(n)) {
      const op = n.operatorToken.kind;
      if (
        op === ts.SyntaxKind.EqualsToken ||
        op === ts.SyntaxKind.PlusEqualsToken ||
        op === ts.SyntaxKind.MinusEqualsToken ||
        op === ts.SyntaxKind.AsteriskEqualsToken ||
        op === ts.SyntaxKind.SlashEqualsToken ||
        op === ts.SyntaxKind.PercentEqualsToken ||
        op === ts.SyntaxKind.AmpersandEqualsToken ||
        op === ts.SyntaxKind.BarEqualsToken ||
        op === ts.SyntaxKind.CaretEqualsToken ||
        op === ts.SyntaxKind.LessThanLessThanEqualsToken ||
        op === ts.SyntaxKind.GreaterThanGreaterThanEqualsToken ||
        op === ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken ||
        op === ts.SyntaxKind.AsteriskAsteriskEqualsToken ||
        op === ts.SyntaxKind.BarBarEqualsToken ||
        op === ts.SyntaxKind.AmpersandAmpersandEqualsToken ||
        op === ts.SyntaxKind.QuestionQuestionEqualsToken
      ) {
        sideEffect = true;
        return;
      }
    }
    if (
      (ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) &&
      (n.operator === ts.SyntaxKind.PlusPlusToken || n.operator === ts.SyntaxKind.MinusMinusToken)
    ) {
      sideEffect = true;
      return;
    }
    ts.forEachChild(n, walk);
  }
  walk(node);
  return sideEffect;
}

function addReactiveEffectReplacements(
  source: ts.SourceFile,
  setupStatements: ts.Statement[],
  derivedCtx: DerivedContext,
  replacements: Array<{ start: number; end: number; text: string }>,
): void {
  const handledRanges = new Set(
    Array.from(derivedCtx.conditionalAssignments.values()).map((info) => `${info.ifStart}:${info.ifEnd}`),
  );

  for (const stmt of setupStatements) {
    if (!stmt || !ts.isIfStatement(stmt)) continue;
    if (containsReturn(stmt)) continue;

    const rangeKey = `${stmt.getStart(source)}:${stmt.getEnd()}`;
    if (handledRanges.has(rangeKey)) continue;

    const stmtText = stmt.getText(source);
    const refs = extractIdentifiers(stmtText).filter((id) => derivedCtx.locals.has(id));
    if (refs.length === 0) continue;

    if (!hasSideEffects(stmt)) continue;

    const deps = derivedCtx.allSourceDeps(stmtText);
    const refChecks = deps.map((ref) => `__dirty.has('${ref}')`).join(' || ');
    const body = refChecks
      ? `if (__dirty.size === 0 || ${refChecks}) {\n  ${stmtText}\n}`
      : stmtText;
    const wrapped = `__effect(() => {\n  ${body}\n});`;
    replacements.push({
      start: stmt.getStart(source),
      end: stmt.getEnd(),
      text: wrapped,
    });
  }
}

function findReplacements(
  source: ts.SourceFile,
  skipCompile: Set<string>,
  eventHandlerNames: Set<string>,
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

      // Wrap helper functions inside component setups that perform local mutations.
      // Skip functions that are used directly as JSX event handlers — the event
      // path already invalidates the component, so __commit would be redundant.
      const isEventHandler =
        ts.isFunctionDeclaration(node) && node.name && eventHandlerNames.has(node.name.text);
      const isAsyncEventHandler = isEventHandler && isAsync;
      const shouldWrap = !isEventHandler || isAsyncEventHandler;

      if (activeSelfName && activeLocals && node.body && ts.isBlock(node.body) && shouldWrap) {
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

      if (childDerivedCtx && node.body) {
        replacements.push({
          start: node.body.getStart(source) + 1,
          end: node.body.getStart(source) + 1,
          text: `\n  const __dirty = new Set();\n`,
        });
      }
      const handledIfRanges = childDerivedCtx
        ? new Set(Array.from(childDerivedCtx.conditionalAssignments.values()).map((info) => `${info.ifStart}:${info.ifEnd}`))
        : new Set<string>();

      const hasReactiveSetup = !!(childDerivedCtx && (
        childDerivedCtx.derived.size > 0 ||
        childDerivedCtx.conditionalAssignments.size > 0 ||
        childDerivedCtx.loopReplacements.size > 0
      ));
      const hasReactiveEffects = !!(childDerivedCtx && setupStatements.some((stmt) => {
        if (!ts.isIfStatement(stmt)) return false;
        if (containsReturn(stmt)) return false;
        const rangeKey = `${stmt.getStart(source)}:${stmt.getEnd()}`;
        if (handledIfRanges.has(rangeKey)) return false;
        const refs = extractIdentifiers(stmt.getText(source)).filter((id) => childDerivedCtx.locals.has(id));
        return refs.length > 0 && hasSideEffects(stmt);
      }));

      if (childDerivedCtx) {
        childDerivedCtx.hasEffects = hasReactiveEffects;
      }

      if (hasReactiveSetup || hasReactiveEffects) {
        const funcReplacements: Array<{ start: number; end: number; text: string }> = [];
        addDerivedReplacements(source, setupStatements, childDerivedCtx!, funcReplacements);
        addConditionalAssignmentReplacements(childDerivedCtx!, funcReplacements);
        addLoopReplacements(childDerivedCtx!, funcReplacements);
        addReactiveEffectReplacements(source, setupStatements, childDerivedCtx!, funcReplacements);
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
    const importsArray = COMPILER_IMPORT.split(', ').map(s => s.trim());
    const usedImports = importsArray.filter(name => {
      const aliasMatch = name.match(/ as (\w+)$/);
      const searchWord = aliasMatch ? aliasMatch[1] : name;
      return new RegExp(`\\b${searchWord}\\b`).test(code);
    });
    if (usedImports.length > 0) {
      return `import { ${usedImports.join(', ')} } from 'auwla';\n${code}`;
    }
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
  const eventHandlerNames = collectEventHandlerIdentifiers(source2);
  const replacements = findReplacements(source2, skipCompile, eventHandlerNames, options);

  if (replacements.length === 0 && siteReplacements.length === 0) return sourceText;

  const finalCode = replacements.length > 0 ? applyReplacements(textWithSites, replacements) : textWithSites;
  return addCompilerImport(finalCode, replacements.length > 0);
}
