/**
 * @fileoverview Non-template JSX compilation for the Auwla compiler.
 */

import ts from 'typescript';
import { CompileContext, CompileResult, isSvgTag } from './types';
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
  unwrapJsxReturn,
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

    const map = compileKeyedMap(ctx, expression);
    if (map) {
      ctx.setup.push(`${parentVar}.append(${map}.node);`);
      return true;
    }
    if (isMapCall(expression)) return false;

    const value = expressionText(ctx.source, expression);
    ctx.deps.push(value);

    if (compileConditionalJsx(ctx, expression, parentVar)) return true;

    if (needsChildPatch(expression)) {
      const childVar = `child${ctx.textId++}`;
      ctx.setup.push(`let ${childVar} = document.createComment("auwla:child");`);
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
    ctx.setup.push(`let ${childVar} = document.createComment("auwla:child");`);
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

/**
 * Compile a conditional JSX expression (ternary or &&) into direct DOM blocks.
 *
 * Instead of falling back to `__setChild` with the raw expression, each JSX branch
 * is compiled inline. An `activeBranch` tracker avoids unnecessary DOM swaps when
 * the condition value doesn't change.
 */
function compileConditionalJsx(ctx: CompileContext, expression: ts.Expression, parentVar: string): boolean {
  type Branch = {
    condition: string | null; // null means "else" (last branch)
    jsx: ts.JsxElement | ts.JsxSelfClosingElement | null;
  };

  const branches: Branch[] = [];
  let conditionSource: ts.Expression | null = null;

  if (ts.isConditionalExpression(expression)) {
    conditionSource = expression.condition;
    const trueJsx = unwrapJsxExpression(expression.whenTrue);
    const falseJsx = unwrapJsxExpression(expression.whenFalse);

    // Only handle when at least one branch is JSX
    if (!trueJsx && !falseJsx) return false;

    // If a non-JSX branch isn't nullish, fall back to runtime __setChild
    if (trueJsx && !isNullishBranch(expression.whenFalse) && !falseJsx) return false;
    if (falseJsx && !isNullishBranch(expression.whenTrue) && !trueJsx) return false;

    branches.push({ condition: null, jsx: trueJsx });
    branches.push({ condition: null, jsx: falseJsx });
  } else if (
    ts.isBinaryExpression(expression) &&
    expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
  ) {
    conditionSource = expression.left;
    const rightJsx = unwrapJsxExpression(expression.right);
    if (!rightJsx) return false;

    branches.push({ condition: null, jsx: rightJsx });
    branches.push({ condition: null, jsx: null });
  } else {
    return false;
  }

  const conditionText = expressionText(ctx.source, conditionSource);

  // Compile each JSX branch into a fresh context.
  const compiledBranches: {
    root: string;
    setup: string[];
    patches: { code: string; deps: string[] }[];
    deps: string[];
    elOffset: number;
    textOffset: number;
    mapOffset: number;
  }[] = [];

  for (const branch of branches) {
    if (!branch.jsx) {
      compiledBranches.push({ root: '', setup: [], patches: [], deps: [], elOffset: 0, textOffset: 0, mapOffset: 0 });
      continue;
    }

    const branchCtx: CompileContext = {
      source: ctx.source,
      elementId: 0,
      mapId: 0,
      textId: 0,
      patches: [],
      deps: [],
      setup: [],
    };

    const result = compileJsxNode(branchCtx, branch.jsx);
    if (!result) return false;

    compiledBranches.push({
      root: result.root,
      setup: branchCtx.setup,
      patches: branchCtx.patches,
      deps: branchCtx.deps,
      elOffset: ctx.elementId,
      textOffset: ctx.textId,
      mapOffset: ctx.mapId,
    });

    ctx.elementId += branchCtx.elementId;
    ctx.textId += branchCtx.textId;
    ctx.mapId += branchCtx.mapId;
  }

  // Allocate marker and active-branch tracker.
  const childVar = `child${ctx.textId++}`;
  const activeVar = `activeBranch${ctx.textId++}`;
  ctx.setup.push(`let ${childVar} = document.createComment("auwla:child");`);
  ctx.setup.push(`${parentVar}.append(${childVar});`);
  ctx.setup.push(`let ${activeVar}: number | null = null;`);

  // Merge branch setup / patches / deps into parent with remapped IDs.
  for (const cb of compiledBranches) {
    if (!cb.setup.length) continue;
    const remap = (code: string) => remapIds(code, cb.elOffset, cb.textOffset, cb.mapOffset);
    for (const line of cb.setup) ctx.setup.push(remap(line));
    // Branch patches run inside the active branch guard below. Emitting them
    // at the parent level would also patch detached/inactive branch nodes.
    for (const dep of cb.deps) ctx.deps.push(dep);
  }

  // Build conditional update code.
  const allDeps = new Set<string>([conditionText]);
  const lines: string[] = [];

  for (let i = 0; i < branches.length; i++) {
    const isFirst = i === 0;
    const branch = branches[i]!;
    const cb = compiledBranches[i]!;
    const isJsx = !!cb.root;

    if (isFirst) {
      lines.push(`if (${conditionText}) {`);
    } else if (i === branches.length - 1 && !branch.condition) {
      lines.push(`} else {`);
    } else {
      lines.push(`} else if (${branch.condition}) {`);
    }

    if (isJsx) {
      const root = remapIds(cb.root, cb.elOffset, cb.textOffset, cb.mapOffset);
      lines.push(`  if (${activeVar} !== ${i}) { ${childVar} = __setChild(${parentVar}, ${childVar}, ${root}); ${activeVar} = ${i}; }`);
      for (const patch of cb.patches) {
        lines.push(`  ${remapIds(patch.code, cb.elOffset, cb.textOffset, cb.mapOffset)}`);
        for (const dep of patch.deps) allDeps.add(dep);
      }
    } else {
      lines.push(`  if (${activeVar} !== null) { ${childVar} = __setChild(${parentVar}, ${childVar}, null); ${activeVar} = null; }`);
    }
  }
  lines.push('}');

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
  if (isSvgTag(tag)) {
    ctx.setup.push(`const ${elementVar} = document.createElementNS("http://www.w3.org/2000/svg", ${stringLiteral(tag)});`);
  } else {
    ctx.setup.push(`const ${elementVar} = document.createElement(${stringLiteral(tag)});`);
  }

  for (const attribute of opening.attributes.properties) {
    if (!compileAttribute(ctx, elementVar, attribute)) return null;
  }

  if (ts.isJsxElement(node)) {
    const closingTag = intrinsicName(node.closingElement.tagName);
    if (closingTag !== tag) return null;

    for (const child of node.children) {
      if (!compileJsxChild(ctx, child, elementVar)) return null;
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
): { block: string; deps: string[] } | null {
  const ctx: CompileContext = {
    source,
    elementId: 0,
    mapId: 0,
    textId: 0,
    patches: [],
    deps: [],
    setup: [],
  };
  const result = compileJsxNode(ctx, row);
  if (!result) return null;

  const updatePatches = ctx.patches.filter((patch) => {
    const deps = patch.deps.flatMap((dep) => expressionDependencies(dep, itemName));
    return deps.length !== 1 || deps[0] !== keyText;
  });

  const init = ctx.patches.length
    ? ctx.patches.map((patch) => `            ${patch.code}`).join('\n')
    : '';
  const update = updatePatches.length
    ? updatePatches.map((patch) => `              ${patch.code}`).join('\n')
    : '              // Static row; no dynamic fields to patch.';

  return {
    deps: rowDependencies(ctx.deps, itemName),
    block: `__createBlock(() => {
            ${ctx.setup.join('\n            ')}
${init ? `\n${init}\n` : ''}

            return {
              node: ${result.root},
              update(${itemName}, ${indexName}) {
${update}
              },
            };
          })`,
  };
}

export function compileKeyedMap(ctx: CompileContext, expression: ts.Expression): string | null {
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

  const row = ts.isBlock(callback.body)
    ? unwrapJsxReturn(callback.body)
    : unwrapJsxExpression(callback.body);
  if (!row) return null;

  const key = keyAttribute(row);
  const isUnkeyed = !key;
  const keyText = key ? expressionText(ctx.source, key) : indexName;
  const rowBlock = compileTemplateRowBlock(ctx.source, row, itemParam.name.text, indexName, keyText)
    ?? compileRowBlock(ctx.source, row, itemParam.name.text, indexName, keyText);
  if (!rowBlock) return null;

  const mapVar = `map${ctx.mapId++}`;
  const items = expressionText(ctx.source, expression.expression.expression);
  const itemName = itemParam.name.text;
  const rowDeps = rowBlock.deps.filter((dep) => dep !== keyText);
  const deps = rowDeps.length === 0
    ? 'null'
    : rowDeps.length === 1
      ? rowDeps[0]!
      : `[${rowDeps.join(', ')}]`;

  const keyOf = isUnkeyed
    ? `(${itemName}, ${indexName}) => ${indexName}`
    : `(${itemName}) => ${keyText}`;

  ctx.setup.push(`const ${mapVar} = __keyedMap(
          ${items},
          ${keyOf},
          (${itemName}, ${indexName}) => ${rowBlock.block},
          (block, ${itemName}, index) => block.update(${itemName}, index),
          (${itemName}) => ${deps},
          false,
        );`);
  ctx.patches.push({ code: `${mapVar}.update(${items});`, deps: [items] });
  return mapVar;
}

export function remapIds(code: string, elementOffset: number, textOffset: number, mapOffset: number): string {
  return code
    .replace(/\bel(\d+)\b/g, (_, n) => `el${Number(n) + elementOffset}`)
    .replace(/\btext(\d+)\b/g, (_, n) => `text${Number(n) + textOffset}`)
    .replace(/\bmap(\d+)\b/g, (_, n) => `map${Number(n) + mapOffset}`)
    .replace(/\bchild(\d+)\b/g, (_, n) => `child${Number(n) + textOffset}`);
}

export function substituteProps(code: string, props: Map<string, string>): string {
  return code.replace(/\bprops\.([A-Za-z_$][\w$]*)\b/g, (match, name) => {
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
    elementId: 0,
    mapId: 0,
    textId: 0,
    patches: [],
    deps: [],
    setup: [],
  };

  const result = compileJsxNode(childCtx, componentJsx);
  if (!result) return null;

  const elOffset = ctx.elementId;
  const textOffset = ctx.textId;
  const mapOffset = ctx.mapId;

  const remap = (code: string) => substituteProps(remapIds(code, elOffset, textOffset, mapOffset), props);

  for (const line of childCtx.setup) {
    ctx.setup.push(remap(line));
  }
  for (const patch of childCtx.patches) {
    ctx.patches.push({ code: remap(patch.code), deps: [...patch.deps] });
  }
  for (const dep of childCtx.deps) {
    ctx.deps.push(remap(dep));
  }

  ctx.elementId += childCtx.elementId;
  ctx.textId += childCtx.textId;
  ctx.mapId += childCtx.mapId;

  return { code: '', root: remap(result.root) };
}
