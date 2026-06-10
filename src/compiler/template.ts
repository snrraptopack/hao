/**
 * @fileoverview Template cloning compilation path for the Auwla compiler.
 */

import ts from 'typescript';
import { TemplateContext, isSvgTag } from './types';
import { compileTemplateAttribute } from './attributes';
import type { DerivedContext } from './derived';
import { dirtySetupLine, renderUpdateBody, sourceTrackingLines, usesDirtyTracking } from './dirty';
import {
  expressionText,
  stringLiteral,
  escapeHtml,
  decodeJsxText,
  isWhitespaceJsxText,
  pathExpression,
  childExpression,
  isMapCall,
  needsChildPatch,
  intrinsicName,
  expressionDependencies,
  rowDependencies,
} from './utils';

export function templateElementVar(ctx: TemplateContext, path: number[]): string {
  if (path.length === 0) return 'el0';

  const key = path.join('.');
  const existing = ctx.elementVars.get(key);
  if (existing) return existing;

  const name = `el${ctx.elementId++}`;
  ctx.elementVars.set(key, name);
  ctx.elementSetup.push(`const ${name} = ${pathExpression('el0', path)} as HTMLElement;`);
  return name;
}

export function compileTemplateChildren(ctx: TemplateContext, children: readonly ts.JsxChild[], parentPath: number[]): string | null {
  let html = '';
  let childIndex = 0;
  let hasDynamicText = false;

  for (const child of children) {
    if (ts.isJsxText(child)) {
      if (isWhitespaceJsxText(child)) continue;
      if (hasDynamicText) return null;
      html += escapeHtml(decodeJsxText(child.text));
      childIndex++;
      continue;
    }

    if (ts.isJsxExpression(child)) {
      const expression = childExpression(child);
      if (!expression) continue;
      if (isMapCall(expression) || needsChildPatch(expression)) return null;

      const parentVar = templateElementVar(ctx, parentPath);
      const textVar = `text${ctx.textId++}`;
      const value = expressionText(ctx.source, expression);
      const deps = expressionDependencies(value, ctx.itemName);
      const initOnly = deps.length === 1 && deps[0] === ctx.keyText;
      ctx.textSetup.push(`const ${textVar} = document.createTextNode("");`);
      ctx.textSetup.push(`${parentVar}.append(${textVar});`);
      ctx.deps.push(value);
      ctx.patches.push({ code: `__setText(${textVar}, ${value});`, deps: [value], initOnly });
      hasDynamicText = true;
      continue;
    }

    if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
      if (hasDynamicText) return null;
      const childHtml = compileTemplateNode(ctx, child, [...parentPath, childIndex]);
      if (childHtml === null) return null;
      html += childHtml;
      childIndex++;
      continue;
    }

    if (ts.isJsxFragment(child)) {
      const fragmentHtml = compileTemplateChildren(ctx, child.children, parentPath);
      if (fragmentHtml === null) return null;
      html += fragmentHtml;
      continue;
    }

    return null;
  }

  return html;
}

export function compileTemplateNode(
  ctx: TemplateContext,
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  path: number[],
): string | null {
  const opening = ts.isJsxElement(node) ? node.openingElement : node;
  const tag = intrinsicName(opening.tagName);
  if (!tag) return null;

  // Standalone SVG roots (other than <svg>) cannot be correctly created via innerHTML
  // without an SVG parent context. Bail out to the non-template path.
  if (path.length === 0 && tag !== 'svg' && isSvgTag(tag)) return null;

  // Tables with direct <tr>, <td>, <th>, or <col> children cause the browser to
  // implicitly insert <tbody> or <colgroup> wrappers, breaking childNodes paths.
  if (tag === 'table' && ts.isJsxElement(node)) {
    for (const child of node.children) {
      if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
        const childOpening = ts.isJsxElement(child) ? child.openingElement : child;
        const childTag = intrinsicName(childOpening.tagName);
        if (childTag === 'tr' || childTag === 'td' || childTag === 'th' || childTag === 'col') {
          return null;
        }
      }
    }
  }

  const elementVar = templateElementVar(ctx, path);
  let attrs = '';
  for (const attribute of opening.attributes.properties) {
    const attr = compileTemplateAttribute(ctx, attribute, elementVar);
    if (attr === null) return null;
    attrs += attr;
  }

  if (ts.isJsxSelfClosingElement(node)) return `<${tag}${attrs}></${tag}>`;

  const closingTag = intrinsicName(node.closingElement.tagName);
  if (closingTag !== tag) return null;

  const textOnly = singleDynamicTextChild(ctx, node, path);
  if (textOnly) {
    return `<${tag}${attrs}></${tag}>`;
  }

  const children = compileTemplateChildren(ctx, node.children, path);
  if (children === null) return null;

  return `<${tag}${attrs}>${children}</${tag}>`;
}

function singleDynamicTextChild(ctx: TemplateContext, node: ts.JsxElement, path: number[]): boolean {
  const meaningful = node.children.filter((child) => {
    return !ts.isJsxText(child) || !isWhitespaceJsxText(child);
  });
  if (meaningful.length !== 1) return false;

  const only = meaningful[0]!;
  if (!ts.isJsxExpression(only)) return false;

  const expression = childExpression(only);
  if (!expression || isMapCall(expression) || needsChildPatch(expression)) return false;

  const elementVar = templateElementVar(ctx, path);
  const value = expressionText(ctx.source, expression);
  const deps = expressionDependencies(value, ctx.itemName);
  const initOnly = deps.length === 1 && deps[0] === ctx.keyText;
  ctx.deps.push(value);
  ctx.patches.push({ code: `__setElementText(${elementVar}, ${value});`, deps: [value], initOnly });
  return true;
}

export function compileTemplateRowBlock(
  source: ts.SourceFile,
  row: ts.JsxElement | ts.JsxSelfClosingElement,
  itemName: string,
  indexName: string,
  keyText: string,
  derivedCtx: DerivedContext | null = null,
): { block: string; deps: string[] } | null {
  const ctx: TemplateContext = {
    source,
    itemName,
    keyText,
    elementId: 1,
    textId: 0,
    elementSetup: [],
    textSetup: [],
    patches: [],
    deps: [],
    elementVars: new Map(),
    derivedCtx,
  };

  const html = compileTemplateNode(ctx, row, []);
  if (html === null) return null;

  const patches = derivedCtx
    ? ctx.patches.map((p) => ({ ...p, code: derivedCtx.expand(p.code) }))
    : ctx.patches;
  const dirtyAware = usesDirtyTracking(ctx.elementSetup, patches);
  const updatePatches = patches.filter((patch) => !patch.initOnly);
  const init = patches.length
    ? patches.map((patch) => `            ${patch.code}`).join('\n')
    : '';
  const update = renderUpdateBody(updatePatches, derivedCtx, '              ', dirtyAware);

  return {
    deps: rowDependencies(ctx.deps, itemName),
    block: `__createBlock(() => {
            ${dirtySetupLine(ctx.elementSetup, patches).join('\n            ')}
            ${sourceTrackingLines(patches, derivedCtx).join('\n            ')}
            const el0 = __cloneTemplate(${stringLiteral(html)});
            ${ctx.elementSetup.join('\n            ')}
            ${ctx.textSetup.join('\n            ')}
${init ? `\n${init}\n` : ''}

            return {
              node: el0,
              update(${itemName}, ${indexName}) {
${update}
              },
            };
          })`,
  };
}

export function compileTemplateRootBlock(
  source: ts.SourceFile,
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  derivedCtx: DerivedContext | null = null,
  forceAllUpdate = false,
  preUpdateStatements: readonly string[] = [],
): string | null {
  const ctx: TemplateContext = {
    source,
    itemName: '',
    keyText: '',
    elementId: 1,
    textId: 0,
    elementSetup: [],
    textSetup: [],
    patches: [],
    deps: [],
    elementVars: new Map(),
    derivedCtx,
  };

  const html = compileTemplateNode(ctx, node, []);
  if (html === null) return null;

  const patches = derivedCtx
    ? ctx.patches.map((p) => ({ ...p, code: derivedCtx.expand(p.code) }))
    : ctx.patches;
  const dirtyAware = usesDirtyTracking(ctx.elementSetup, patches);

  const patchUpdate = renderUpdateBody(patches, derivedCtx, '          ', dirtyAware, forceAllUpdate);
  const update = [
    ...preUpdateStatements.map((line) => `          ${line}`),
    patchUpdate,
  ].filter(Boolean).join('\n');

  const setupLines = [
    ...dirtySetupLine(ctx.elementSetup, patches),
    ...sourceTrackingLines(patches, derivedCtx),
    `const el0 = __cloneTemplate(${stringLiteral(html)});`,
    ...ctx.elementSetup,
    ...ctx.textSetup,
  ];

  return `__componentBlock(() => {
${setupLines.map((line) => `        ${line}`).join('\n')}

        return __createBlock(() => ({
          node: el0,
          update() {
${update}
          },
        }));
      })`;
}
