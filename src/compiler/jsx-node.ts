/**
 * @fileoverview Non-template JSX compilation for the Auwla compiler.
 */

import ts from 'typescript';
import { CompileContext, CompileResult, isSvgTag } from './types';
import type { DerivedContext } from './derived';
import { dirtySetupLine, renderUpdateBody, sourceTrackingLines, usesDirtyTracking } from './dirty';
import { compileAttribute } from './attributes';
import { compileTemplateRowBlock } from './template';
import {
  childExpression,
  decodeJsxText,
  expressionText,
  expressionDependencies,
  isMapCall,
  isWhitespaceJsxText,
  keyAttribute,
  needsChildPatch,
  referencesChildren,
  rowDependencies,
  stringLiteral,
  unwrapJsxExpression,
  unwrapJsxReturnWithStatements,
  unwrapMapCall,
  findComponentDefinition,
  isInlinableComponent,
  extractComponentJsx,
  intrinsicName,
} from './utils';

export function compileJsxChild(ctx: CompileContext, child: ts.JsxChild, parentVar: string): boolean {
  if (ts.isJsxText(child)) {
    if (isWhitespaceJsxText(child)) return true;
    ctx.setup.push(`${parentVar}.append(${stringLiteral(decodeJsxText(child.text))});`);
    return true;
  }

  if (ts.isJsxExpression(child)) {
    const expression = childExpression(child);
    if (!expression) return true;

    if (ctx.renderScoped && compileDeferredKeyedMap(ctx, expression, parentVar)) return true;

    const map = compileKeyedMap(ctx, expression);
    if (map) {
      ctx.setup.push(`${parentVar}.append(${map}.node);`);
      return true;
    }
    if (isMapCall(expression)) return false;

    const value = expressionText(ctx.source, expression);
    ctx.deps.push(value);

    if (compileConditionalJsx(ctx, expression, parentVar)) return true;

    if (needsChildPatch(expression) || isPropsChildrenExpression(expression)) {
      const childVar = `child${ctx.textId++}`;
      ctx.setup.push(`let ${childVar} = __hydrateComment("auwla:child");`);
      ctx.setup.push(`${parentVar}.append(${childVar});`);
      ctx.patches.push({ code: `${childVar} = __setChild(${parentVar}, ${childVar}, ${value});`, deps: [value] });
      return true;
    }

    const textVar = `text${ctx.textId++}`;
    ctx.setup.push(`const ${textVar} = document.createTextNode("");`);
    ctx.setup.push(`${parentVar}.append(${textVar});`);
    ctx.patches.push({ code: `__setText(${textVar}, ${value});`, deps: [value] });
    return true;
  }

  if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
    const compiled = compileJsxNode(ctx, child);
    if (compiled) {
      ctx.setup.push(`${parentVar}.append(${compiled.root});`);
      return true;
    }

    // Component could not be inlined — fall back to runtime JSX for this child only.
    const childVar = `child${ctx.textId++}`;
    const jsxCode = child.getText(ctx.source);
    ctx.setup.push(`let ${childVar} = __hydrateComment("auwla:child");`);
    ctx.setup.push(`${parentVar}.append(${childVar});`);
    ctx.patches.push({ code: `${childVar} = __setChild(${parentVar}, ${childVar}, ${jsxCode});`, deps: [] });
    return true;
  }

  if (ts.isJsxFragment(child)) {
    for (const fragmentChild of child.children) {
      if (!compileJsxChild(ctx, fragmentChild, parentVar)) return false;
    }
    return true;
  }

  return false;
}

function singleDynamicTextChild(
  source: ts.SourceFile,
  node: ts.JsxElement,
): { expression: ts.Expression; value: string } | null {
  const meaningful = node.children.filter((child) => {
    return !ts.isJsxText(child) || !isWhitespaceJsxText(child);
  });
  if (meaningful.length !== 1) return null;

  const only = meaningful[0]!;
  if (!ts.isJsxExpression(only)) return null;

  const expression = childExpression(only);
  if (!expression || isMapCall(expression) || needsChildPatch(expression)) return null;

  // props.children is typed as MemoChild | MemoChild[]; it may be an element,
  // an array of elements, or a string. __setElementText would stringify an
  // element into "[object Object]", so we must route it through __setChild.
  if (isPropsChildrenExpression(expression)) return null;

  return { expression, value: expressionText(source, expression) };
}

function isPropsChildrenExpression(expression: ts.Expression): boolean {
  // props.children
  if (ts.isPropertyAccessExpression(expression)) {
    return ts.isIdentifier(expression.expression) && expression.expression.text === 'props' && expression.name.text === 'children';
  }
  // props['children'] or props["children"]
  if (ts.isElementAccessExpression(expression)) {
    if (!ts.isIdentifier(expression.expression) || expression.expression.text !== 'props') return false;
    const arg = expression.argumentExpression;
    return ts.isStringLiteral(arg) && arg.text === 'children';
  }
  return false;
}

/**
 * Compile a conditional JSX expression (ternary or &&) into direct DOM blocks.
 *
 * Instead of falling back to `__setChild` with the raw expression, each JSX branch
 * is compiled inline. An `activeBranch` tracker avoids unnecessary DOM swaps when
 * the condition value doesn't change.
 *
 * Nested ternaries like `a ? <A/> : b ? <B/> : <C/>` are flattened into an
 * `if / else if / else` chain so every branch compiles individually.
 */
function compileConditionalJsx(ctx: CompileContext, expression: ts.Expression, parentVar: string): boolean {
  type Branch = {
    condition: string | null; // null means "else" (last branch)
    jsx: ts.JsxElement | ts.JsxSelfClosingElement | null;
    map: ts.CallExpression | null;
    fragment: ts.JsxFragment | null;
    raw: ts.Expression;
  };

  function isBooleanLikeExpression(expression: ts.Expression): boolean {
    if (
      expression.kind === ts.SyntaxKind.TrueKeyword ||
      expression.kind === ts.SyntaxKind.FalseKeyword ||
      expression.kind === ts.SyntaxKind.NullKeyword ||
      expression.kind === ts.SyntaxKind.UndefinedKeyword
    ) {
      return true;
    }
    if (ts.isIdentifier(expression)) {
      return true;
    }
    if (ts.isBinaryExpression(expression)) {
      const op = expression.operatorToken.kind;
      if (
        op === ts.SyntaxKind.EqualsEqualsToken ||
        op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
        op === ts.SyntaxKind.ExclamationEqualsToken ||
        op === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
        op === ts.SyntaxKind.GreaterThanToken ||
        op === ts.SyntaxKind.GreaterThanEqualsToken ||
        op === ts.SyntaxKind.LessThanToken ||
        op === ts.SyntaxKind.LessThanEqualsToken ||
        op === ts.SyntaxKind.InstanceOfKeyword ||
        op === ts.SyntaxKind.InKeyword
      ) {
        return true;
      }
    }
    if (ts.isPrefixUnaryExpression(expression) && expression.operator === ts.SyntaxKind.ExclamationToken) {
      return true;
    }
    return false;
  }

  function flattenConditional(expr: ts.Expression): Branch[] | null {
    if (ts.isConditionalExpression(expr)) {
      const trueJsx = unwrapJsxExpression(expr.whenTrue);
      const trueMap = unwrapMapCall(expr.whenTrue);
      const trueFrag = ts.isJsxFragment(expr.whenTrue) ? expr.whenTrue : null;
      const branches: Branch[] = [];
      branches.push({ condition: expressionText(ctx.source, expr.condition), jsx: trueJsx, map: trueMap, fragment: trueFrag, raw: expr.whenTrue });

      const nested = flattenConditional(expr.whenFalse);
      if (nested) {
        branches.push(...nested);
      } else {
        const falseJsx = unwrapJsxExpression(expr.whenFalse);
        const falseMap = unwrapMapCall(expr.whenFalse);
        const falseFrag = ts.isJsxFragment(expr.whenFalse) ? expr.whenFalse : null;
        branches.push({ condition: null, jsx: falseJsx, map: falseMap, fragment: falseFrag, raw: expr.whenFalse });
      }

      const hasContent = branches.some((b) => b.jsx !== null || b.map !== null || b.fragment !== null);
      if (!hasContent) return null;
      for (const branch of branches) {
        if (!branch.jsx && !branch.map && !branch.fragment && !isNullishBranch(branch.raw)) return null;
      }
      return branches;
    }

    if (
      ts.isBinaryExpression(expr) &&
      expr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
    ) {
      const rightJsx = unwrapJsxExpression(expr.right);
      const rightMap = unwrapMapCall(expr.right);
      const rightFrag = ts.isJsxFragment(expr.right) ? expr.right : null;
      if (!rightJsx && !rightMap && !rightFrag) return null;
      return [
        { condition: expressionText(ctx.source, expr.left), jsx: rightJsx, map: rightMap, fragment: rightFrag, raw: expr.right },
        { condition: null, jsx: null, map: null, fragment: null, raw: expr.left },
      ];
    }

    if (
      ts.isBinaryExpression(expr) &&
      expr.operatorToken.kind === ts.SyntaxKind.BarBarToken
    ) {
      const rightJsx = unwrapJsxExpression(expr.right);
      const rightMap = unwrapMapCall(expr.right);
      const rightFrag = ts.isJsxFragment(expr.right) ? expr.right : null;
      if (!rightJsx && !rightMap && !rightFrag) return null;
      // Only compile || when the left side renders as empty text when truthy.
      // This covers booleans, null, undefined, and comparisons.
      if (!isBooleanLikeExpression(expr.left)) return null;
      return [
        { condition: `!(${expressionText(ctx.source, expr.left)})`, jsx: rightJsx, map: rightMap, fragment: rightFrag, raw: expr.right },
        { condition: null, jsx: null, map: null, fragment: null, raw: expr.left },
      ];
    }

    return null;
  }

  const branches = flattenConditional(expression);
  if (!branches) return false;

  // Compile each JSX branch into a fresh context.
  const compiledBranches: {
    root: string;
    setup: string[];
    patches: { code: string; deps: string[] }[];
    deps: string[];
  }[] = [];

  for (const branch of branches) {
    const hasContent = branch.jsx || branch.map || branch.fragment;
    if (!hasContent) {
      compiledBranches.push({ root: '', setup: [], patches: [], deps: [] });
      continue;
    }

    const branchCtx: CompileContext = {
      source: ctx.source,
      elementId: ctx.elementId,
      mapId: ctx.mapId,
      textId: ctx.textId,
      patches: [],
      deps: [],
      setup: [],
      derivedCtx: ctx.derivedCtx,
      renderScoped: ctx.renderScoped,
    };

    let root: string;
    if (branch.jsx) {
      const result = compileJsxNode(branchCtx, branch.jsx);
      if (!result) return false;
      root = result.root;
    } else if (branch.map) {
      const mapVar = compileKeyedMap(branchCtx, branch.map);
      if (!mapVar) return false;
      root = `${mapVar}.node`;
    } else if (branch.fragment) {
      root = `el${branchCtx.elementId++}`;
      branchCtx.setup.push(`const ${root} = __hydrateElement("span");`);
      for (const fragmentChild of branch.fragment.children) {
        if (!compileJsxChild(branchCtx, fragmentChild, root)) return false;
      }
    } else {
      return false;
    }
    compiledBranches.push({
      root,
      setup: branchCtx.setup,
      patches: branchCtx.patches,
      deps: branchCtx.deps,
    });

    ctx.elementId = branchCtx.elementId;
    ctx.textId = branchCtx.textId;
    ctx.mapId = branchCtx.mapId;
  }

  // Allocate marker and active-branch tracker.
  const childVar = `child${ctx.textId++}`;
  const activeVar = `activeBranch${ctx.textId++}`;
  ctx.setup.push(`let ${childVar} = __hydrateComment("auwla:child");`);
  ctx.setup.push(`${parentVar}.append(${childVar});`);
  ctx.setup.push(`let ${activeVar}: number | null = null;`);

  // Merge branch setup / patches / deps into parent.
  for (const cb of compiledBranches) {
    for (const line of cb.setup) ctx.setup.push(line);
    // Branch patches run inside the active branch guard below. Emitting them
    // at the parent level would also patch detached/inactive branch nodes.
    for (const dep of cb.deps) ctx.deps.push(dep);
  }

  // Build conditional update code.
  const allDeps = new Set<string>();
  const lines: string[] = [];

  for (let i = 0; i < branches.length; i++) {
    const isFirst = i === 0;
    const branch = branches[i]!;
    const cb = compiledBranches[i]!;
    const isJsx = !!cb.root;

    if (isFirst) {
      lines.push(`if (${branch.condition}) {`);
    } else if (i === branches.length - 1 && !branch.condition) {
      lines.push(`} else {`);
    } else {
      lines.push(`} else if (${branch.condition}) {`);
    }

    if (isJsx) {
      lines.push(`  if (${activeVar} !== ${i}) { ${childVar} = __setChild(${parentVar}, ${childVar}, ${cb.root}); ${activeVar} = ${i}; }`);
      for (const patch of cb.patches) {
        lines.push(`  ${patch.code}`);
        for (const dep of patch.deps) allDeps.add(dep);
      }
    } else {
      lines.push(`  if (${activeVar} !== null) { ${childVar} = __setChild(${parentVar}, ${childVar}, null); ${activeVar} = null; }`);
    }
  }
  lines.push('}');

  for (const branch of branches) {
    if (branch.condition) allDeps.add(branch.condition);
  }

  ctx.patches.push({ code: lines.join('\n'), deps: Array.from(allDeps) });
  return true;
}

function isNullishBranch(expression: ts.Expression): boolean {
  return expression.kind === ts.SyntaxKind.NullKeyword
    || expression.kind === ts.SyntaxKind.UndefinedKeyword
    || expression.kind === ts.SyntaxKind.FalseKeyword;
}

export function compileJsxNode(
  ctx: CompileContext,
  node: ts.JsxElement | ts.JsxSelfClosingElement,
): CompileResult | null {
  const opening = ts.isJsxElement(node) ? node.openingElement : node;
  const tag = intrinsicName(opening.tagName);
  if (!tag) {
    return tryInlineComponent(ctx, node);
  }

  const elementVar = `el${ctx.elementId++}`;
  const isSvg = isSvgTag(tag);
  if (isSvg) {
    ctx.setup.push(`const ${elementVar} = __hydrateElement(${stringLiteral(tag)}, true);`);
  } else {
    ctx.setup.push(`const ${elementVar} = __hydrateElement(${stringLiteral(tag)});`);
  }

  for (const attribute of opening.attributes.properties) {
    if (!compileAttribute(ctx, elementVar, attribute, isSvg)) return null;
  }

  if (ts.isJsxElement(node)) {
    const closingTag = intrinsicName(node.closingElement.tagName);
    if (closingTag !== tag) return null;

    const textOnly = singleDynamicTextChild(ctx.source, node);
    if (textOnly) {
      ctx.deps.push(textOnly.value);
      ctx.patches.push({ code: `__setElementText(${elementVar}, ${textOnly.value});`, deps: [textOnly.value] });
    } else {
      // 1. Take a snapshot of the context state
      const snapshotSetup = ctx.setup.length;
      const snapshotPatches = ctx.patches.length;
      const snapshotDeps = ctx.deps.length;

      for (const child of node.children) {
        if (!compileJsxChild(ctx, child, elementVar)) {
          // 2. If it fails, restore the arrays before returning null!
          ctx.setup.length = snapshotSetup;
          ctx.patches.length = snapshotPatches;
          ctx.deps.length = snapshotDeps;
          return null;
        }
      }
    }
  }

  return { code: '', root: elementVar };
}

export function compileRowBlock(
  source: ts.SourceFile,
  row: ts.JsxElement | ts.JsxSelfClosingElement,
  itemName: string,
  indexName: string,
  keyText: string,
  derivedCtx: DerivedContext | null = null,
  preUpdateStatements: readonly string[] = [],
  sourceArrayName?: string,
): { block: string; deps: string[]; forceUpdate?: boolean } | null {
  const rowDerivedCtx = derivedCtx && sourceArrayName
    ? { ...derivedCtx, mapItemSource: { itemName, sourceName: sourceArrayName } }
    : derivedCtx;
  const ctx: CompileContext = {
    source,
    elementId: 0,
    mapId: 0,
    textId: 0,
    patches: [],
    deps: [],
    setup: [],
    derivedCtx: rowDerivedCtx,
  };
  const result = compileJsxNode(ctx, row);
  if (!result) return null;

  const patches = derivedCtx
    ? ctx.patches.map((p) => ({ ...p, code: derivedCtx.expand(p.code) }))
    : ctx.patches;
  const dirtyAware = usesDirtyTracking(ctx.setup, patches);
  const updatePatches = patches.filter((patch) => {
    const deps = patch.deps.flatMap((dep) => expressionDependencies(dep, itemName));
    if (deps.length === 0) return false;
    return deps.length !== 1 || deps[0] !== keyText;
  });

  const init = patches.length
    ? patches.map((patch) => `            ${patch.code}`).join('\n')
    : '';
  const preUpdateLines = preUpdateStatements.map((line) => `              ${line}`).join('\n');
  const update = renderUpdateBody(updatePatches, derivedCtx, '              ', dirtyAware);

  return {
    deps: preUpdateStatements.length > 0 ? [] : rowDependencies(ctx.deps, itemName),
    forceUpdate: preUpdateStatements.length > 0,
    block: `__createBlock(() => {
            ${preUpdateStatements.map((line) => `            ${line}`).join('\n')}
            ${dirtySetupLine(ctx.setup, patches).join('\n            ')}
            ${sourceTrackingLines(patches, derivedCtx).join('\n            ')}
            ${ctx.setup.join('\n            ')}
${init ? `\n${init}\n` : ''}

            return {
              node: ${result.root},
              update(${itemName}, ${indexName}) {
${preUpdateLines ? `${preUpdateLines}\n` : ''}${update}
              },
            };
          })`,
  };
}

export function compileDeferredKeyedMap(ctx: CompileContext, expression: ts.Expression, parentVar: string): boolean {
  while (ts.isParenthesizedExpression(expression)) {
    expression = expression.expression;
  }
  if (!ts.isCallExpression(expression)) return false;
  if (!ts.isPropertyAccessExpression(expression.expression)) return false;
  if (expression.expression.name.text !== 'map') return false;
  if (expression.arguments.length !== 1) return false;

  const callback = expression.arguments[0]!;
  if (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback)) return false;
  const itemParam = callback.parameters[0];
  if (!itemParam || !ts.isIdentifier(itemParam.name)) return false;
  const indexParam = callback.parameters[1];
  const indexName = indexParam && ts.isIdentifier(indexParam.name) ? indexParam.name.text : 'index';

  const unwrapped = ts.isBlock(callback.body)
    ? unwrapJsxReturnWithStatements(ctx.source, callback.body)
    : { row: unwrapJsxExpression(callback.body), leadingStatements: [] as string[] };
  if (!unwrapped || !unwrapped.row) return false;
  const { row, leadingStatements } = unwrapped;

  const key = keyAttribute(row);
  const isUnkeyed = !key;
  const keyText = key ? expressionText(ctx.source, key) : indexName;
  const items = expressionText(ctx.source, expression.expression.expression);
  const rowBlock = compileTemplateRowBlock(ctx.source, row, itemParam.name.text, indexName, keyText, ctx.derivedCtx, false, leadingStatements, items)
    ?? compileRowBlock(ctx.source, row, itemParam.name.text, indexName, keyText, ctx.derivedCtx, leadingStatements, items);

  const mapVar = `map${ctx.mapId++}`;
  const childVar = `child${ctx.textId++}`;
  const itemName = itemParam.name.text;

  let rowBlockCode: string;
  let rowDeps: string[];
  let forceUpdate = false;

  if (rowBlock) {
    rowBlockCode = rowBlock.block;
    rowDeps = rowBlock.deps;
    forceUpdate = rowBlock.forceUpdate ?? false;
  } else {
    // Fallback row block for custom components inside map loops
    const jsxCode = row.getText(ctx.source);
    const expandedJsxCode = ctx.derivedCtx ? ctx.derivedCtx.expand(jsxCode) : jsxCode;
    const allIdentifiers = rowDependencies([expandedJsxCode], itemName);
    rowDeps = allIdentifiers.filter((dep) => dep !== keyText);

    rowBlockCode = `__createBlock(() => {
            let node = toNode(${expandedJsxCode});
            return {
              node,
              update(${itemName}, ${indexName}) {
                node = patchNode(node.parentNode!, node, ${expandedJsxCode});
              },
            };
          })`;
  }

  const filteredRowDeps = rowDeps.filter((dep) => dep !== keyText);
  const deps = forceUpdate
    ? 'undefined'
    : filteredRowDeps.length === 0
      ? `(${itemName}) => null`
      : filteredRowDeps.length === 1
        ? `(${itemName}) => ${filteredRowDeps[0]!}`
        : `(${itemName}) => [${filteredRowDeps.join(', ')}]`;

  const keyOf = isUnkeyed
    ? `(${itemName}, ${indexName}) => (typeof ${itemName} === 'object' && ${itemName} !== null ? ${itemName} : ${indexName})`
    : `(${itemName}) => ${keyText}`;

  ctx.setup.push(`let ${mapVar}: any = null;`);
  ctx.setup.push(`let ${childVar} = __hydrateComment("auwla:keyed-map");`);
  ctx.setup.push(`${parentVar}.append(${childVar});`);
  ctx.patches.push({
    code: `if (!${mapVar}) {
            ${mapVar} = __keyedMap(
              ${items},
              ${keyOf},
              (${itemName}, ${indexName}) => ${rowBlockCode},
              (block, ${itemName}, index) => block.update(${itemName}, index),
              ${deps},
              false,
            );
            ${childVar} = __setChild(${parentVar}, ${childVar}, ${mapVar}.node);
          } else {
            ${mapVar}.update(${items});
          }`,
    deps: [items],
  });
  return true;
}

export function compileKeyedMap(ctx: CompileContext, expression: ts.Expression): string | null {
  while (ts.isParenthesizedExpression(expression)) {
    expression = expression.expression;
  }
  if (!ts.isCallExpression(expression)) return null;
  if (!ts.isPropertyAccessExpression(expression.expression)) return null;
  if (expression.expression.name.text !== 'map') return null;
  if (expression.arguments.length !== 1) return null;

  const callback = expression.arguments[0]!;
  if (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback)) return null;
  const itemParam = callback.parameters[0];
  if (!itemParam || !ts.isIdentifier(itemParam.name)) return null;
  const indexParam = callback.parameters[1];
  const indexName = indexParam && ts.isIdentifier(indexParam.name) ? indexParam.name.text : 'index';

  const unwrapped = ts.isBlock(callback.body)
    ? unwrapJsxReturnWithStatements(ctx.source, callback.body)
    : { row: unwrapJsxExpression(callback.body), leadingStatements: [] as string[] };
  if (!unwrapped || !unwrapped.row) return null;
  const { row, leadingStatements } = unwrapped;

  const key = keyAttribute(row);
  const isUnkeyed = !key;
  const keyText = key ? expressionText(ctx.source, key) : indexName;
  const items = expressionText(ctx.source, expression.expression.expression);
  const rowBlock = compileTemplateRowBlock(ctx.source, row, itemParam.name.text, indexName, keyText, ctx.derivedCtx, false, leadingStatements, items)
    ?? compileRowBlock(ctx.source, row, itemParam.name.text, indexName, keyText, ctx.derivedCtx, leadingStatements, items);

  const mapVar = `map${ctx.mapId++}`;
  const itemName = itemParam.name.text;

  let rowBlockCode: string;
  let rowDeps: string[];
  let forceUpdate = false;

  if (rowBlock) {
    rowBlockCode = rowBlock.block;
    rowDeps = rowBlock.deps;
    forceUpdate = rowBlock.forceUpdate ?? false;
  } else {
    // Fallback row block for custom components inside map loops
    const jsxCode = row.getText(ctx.source);
    const expandedJsxCode = ctx.derivedCtx ? ctx.derivedCtx.expand(jsxCode) : jsxCode;
    const allIdentifiers = rowDependencies([expandedJsxCode], itemName);
    rowDeps = allIdentifiers.filter((dep) => dep !== keyText);

    rowBlockCode = `__createBlock(() => {
            let node = toNode(${expandedJsxCode});
            return {
              node,
              update(${itemName}, ${indexName}) {
                node = patchNode(node.parentNode!, node, ${expandedJsxCode});
              },
            };
          })`;
  }

  const filteredRowDeps = rowDeps.filter((dep) => dep !== keyText);
  const deps = forceUpdate
    ? 'undefined'
    : filteredRowDeps.length === 0
      ? `(${itemName}) => null`
      : filteredRowDeps.length === 1
        ? `(${itemName}) => ${filteredRowDeps[0]!}`
        : `(${itemName}) => [${filteredRowDeps.join(', ')}]`;

  const keyOf = isUnkeyed
    ? `(${itemName}, ${indexName}) => (typeof ${itemName} === 'object' && ${itemName} !== null ? ${itemName} : ${indexName})`
    : `(${itemName}) => ${keyText}`;

  ctx.setup.push(`const ${mapVar} = __keyedMap(
          ${items},
          ${keyOf},
          (${itemName}, ${indexName}) => ${rowBlockCode},
          (block, ${itemName}, index) => block.update(${itemName}, index),
          ${deps},
          false,
        );`);
  ctx.patches.push({ code: `${mapVar}.update(${items});`, deps: [items] });
  return mapVar;
}

export function substituteProps(code: string, props: Map<string, string>): string {
  return code.replace(/\bprops\.([A-Za-z_$][\w$]*)\b/g, (_, name) => {
    return props.get(name) ?? 'undefined';
  });
}

export function tryInlineComponent(
  ctx: CompileContext,
  node: ts.JsxElement | ts.JsxSelfClosingElement,
): CompileResult | null {
  const opening = ts.isJsxElement(node) ? node.openingElement : node;
  if (!ts.isIdentifier(opening.tagName)) return null;

  const tagName = opening.tagName.text;
  const def = findComponentDefinition(ctx.source, tagName);
  if (!def || !isInlinableComponent(def)) return null;

  const componentJsx = extractComponentJsx(def);
  if (!componentJsx) return null;

  const hasCallSiteChildren = ts.isJsxElement(node) && node.children.some((c) => {
    if (ts.isJsxText(c)) return !isWhitespaceJsxText(c);
    return true;
  });
  if (hasCallSiteChildren && referencesChildren(componentJsx)) return null;

  const props = new Map<string, string>();
  for (const attribute of opening.attributes.properties) {
    if (ts.isJsxSpreadAttribute(attribute)) return null;
    if (!ts.isIdentifier(attribute.name)) continue;
    const name = attribute.name.text;
    if (name === 'key') continue;
    if (!attribute.initializer) {
      props.set(name, 'true');
      continue;
    }
    if (ts.isStringLiteral(attribute.initializer)) {
      props.set(name, stringLiteral(attribute.initializer.text));
      continue;
    }
    if (ts.isJsxExpression(attribute.initializer)) {
      const expression = childExpression(attribute.initializer);
      if (expression) {
        props.set(name, expressionText(ctx.source, expression));
      }
      continue;
    }
    return null;
  }

  const childCtx: CompileContext = {
    source: ctx.source,
    elementId: ctx.elementId,
    mapId: ctx.mapId,
    textId: ctx.textId,
    patches: [],
    deps: [],
    setup: [],
    derivedCtx: ctx.derivedCtx,
    renderScoped: ctx.renderScoped,
  };

  const result = compileJsxNode(childCtx, componentJsx);
  if (!result) return null;

  const remap = (code: string) => substituteProps(code, props);

  for (const line of childCtx.setup) {
    ctx.setup.push(remap(line));
  }
  for (const patch of childCtx.patches) {
    ctx.patches.push({ code: remap(patch.code), deps: [...patch.deps] });
  }
  for (const dep of childCtx.deps) {
    ctx.deps.push(remap(dep));
  }

  ctx.elementId = childCtx.elementId;
  ctx.textId = childCtx.textId;
  ctx.mapId = childCtx.mapId;

  return { code: '', root: remap(result.root) };
}
