/**
 * @fileoverview Template cloning compilation path for the Auwla compiler.
 */

import ts from 'typescript';
import { componentNameFromFunction, detectComponentReactivity, extractPropsExpression, isLayoutComponent, CompileOptions } from './index';

import { TemplateContext, isSvgTag } from './types';
import { compileTemplateAttribute, jsxAttributeName } from './attributes';
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
  containsMapCall,
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
      if (!ctx.ssr && hasDynamicText) return null;
      html += escapeHtml(decodeJsxText(child.text));
      if (!ctx.ssr) childIndex++;
      continue;
    }

    if (ts.isJsxExpression(child)) {
      const expression = childExpression(child);
      if (!expression) continue;
      if (isMapCall(expression)) {
        if (ctx.ssr) {
          let jsxCode = expressionText(ctx.source, expression);
          if (ctx.derivedCtx) jsxCode = ctx.derivedCtx.expand(jsxCode);
          html += `<!--auwla:keyed-map-->\${__ssrNode(${jsxCode})}<!--/auwla:keyed-map-->`;
          continue;
        }
        return null;
      }

      if (needsChildPatch(expression)) {
        if (ctx.ssr) {
          let jsxCode = expressionText(ctx.source, expression);
          if (ctx.derivedCtx) jsxCode = ctx.derivedCtx.expand(jsxCode);
          html += `<!--auwla:child-->\${__ssrNode(${jsxCode})}<!--/auwla:child-->`;
          continue;
        }
        return null;
      }

      let value = expressionText(ctx.source, expression);
      if (ctx.ssr) {
        if (ctx.derivedCtx) value = ctx.derivedCtx.expand(value);
        html += `<!--auwla:child-->\${__escapeHtml(${value})}<!--/auwla:child-->`;
        continue;
      }

      const parentVar = templateElementVar(ctx, parentPath);
      const textVar = `text${ctx.textId++}`;
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
      if (!ctx.ssr && hasDynamicText) return null;
      const childHtml = compileTemplateNode(ctx, child, [...parentPath, childIndex]);
      if (childHtml === null) {
        if (ctx.ssr) {
          let jsxCode = child.getText(ctx.source);
          if (ctx.derivedCtx) jsxCode = ctx.derivedCtx.expand(jsxCode);
          html += `<!--auwla:child-->\${__ssrNode(${jsxCode})}<!--/auwla:child-->`;
          continue;
        }
        return null;
      }
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

  const elementVar = ctx.ssr ? '' : templateElementVar(ctx, path);
  let attrs = '';
  let dangerouslySetInnerHTMLValue: string | null = null;
  for (const attribute of opening.attributes.properties) {
    if (ts.isJsxAttribute(attribute)) {
      const name = jsxAttributeName(attribute.name);
      if (name === 'dangerouslySetInnerHTML') {
        if (attribute.initializer && ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression) {
          dangerouslySetInnerHTMLValue = expressionText(ctx.source, attribute.initializer.expression);
        }
      }
    }
    const attr = compileTemplateAttribute(ctx, attribute, elementVar);
    if (attr === null) return null;
    attrs += attr;
  }

  if (dangerouslySetInnerHTMLValue !== null && ctx.ssr) {
    let value = dangerouslySetInnerHTMLValue;
    if (ctx.derivedCtx) value = ctx.derivedCtx.expand(value);
    return `<${tag}${attrs}>\${(${value})?.__html ?? ''}</${tag}>`;
  }

  if (ts.isJsxSelfClosingElement(node)) return `<${tag}${attrs}></${tag}>`;

  const closingTag = intrinsicName(node.closingElement.tagName);
  if (closingTag !== tag) return null;

  const textOnly = singleDynamicTextChild(ctx, node, path);
  if (textOnly !== null) {
    if (ctx.ssr) return `<${tag}${attrs}>${textOnly}</${tag}>`;
    return `<${tag}${attrs}></${tag}>`;
  }

  const children = compileTemplateChildren(ctx, node.children, path);
  if (children === null) return null;

  return `<${tag}${attrs}>${children}</${tag}>`;
}

function singleDynamicTextChild(ctx: TemplateContext, node: ts.JsxElement, path: number[]): string | boolean | null {
  const meaningful = node.children.filter((child) => {
    return !ts.isJsxText(child) || !isWhitespaceJsxText(child);
  });
  if (meaningful.length !== 1) return null;

  const only = meaningful[0]!;
  if (!ts.isJsxExpression(only)) return null;

  const expression = childExpression(only);
  if (!expression || isMapCall(expression) || needsChildPatch(expression)) return null;

  let value = expressionText(ctx.source, expression);
  if (ctx.ssr) {
    if (ctx.derivedCtx) value = ctx.derivedCtx.expand(value);
    return `<!--auwla:child-->\${__escapeHtml(${value})}<!--/auwla:child-->`;
  }

  const elementVar = templateElementVar(ctx, path);
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
  ssr = false,
  preUpdateStatements: readonly string[] = [],
  sourceArrayName?: string,
  syntheticPreUpdateStatements: readonly string[] = [],
): { block: string; deps: string[]; forceUpdate?: boolean } | null {
  const rowDerivedCtx = derivedCtx && sourceArrayName
    ? { ...derivedCtx, mapItemSource: { itemName, sourceName: sourceArrayName } }
    : derivedCtx;
  const ctx: TemplateContext = {
    source,
    itemName,
    keyText,
    elementId: 1,
    textId: 0,
    elementSetup: [],
    textSetup: [],
    refSetup: [],
    patches: [],
    deps: [],
    elementVars: new Map(),
    derivedCtx: rowDerivedCtx,
    ssr,
  };

  const html = compileTemplateNode(ctx, row, []);
  if (html === null) return null;

  const patches = derivedCtx
    ? ctx.patches.map((p) => ({ ...p, code: derivedCtx.expand(p.code) }))
    : ctx.patches;
  const dirtyAware = usesDirtyTracking(ctx.elementSetup, patches);
  const updatePatches = patches.filter((p) => p.deps.length > 0 && !p.initOnly);

  const init = patches.length
    ? patches.map((patch) => `            ${patch.code}`).join('\n')
    : '';
  const preUpdateLines = preUpdateStatements.map((line) => `              ${line}`).join('\n');
  const syntheticPreUpdateLines = syntheticPreUpdateStatements.map((line) => `              ${line}`).join('\n');
  const update = renderUpdateBody(updatePatches, derivedCtx, '              ', dirtyAware);

  const allPreUpdateStatements = [...syntheticPreUpdateStatements, ...preUpdateStatements];

  const hasNestedMap = containsMapCall(row);

  const refInit = ctx.refSetup.length
    ? `\n            ${ctx.refSetup.map((r) => `            ${r}`).join('\n')}`
    : '';

  return {
    deps: preUpdateStatements.length > 0 ? [] : rowDependencies(ctx.deps, itemName),
    forceUpdate: preUpdateStatements.length > 0 || hasNestedMap,
    block: `__createBlock(() => {
            ${allPreUpdateStatements.map((line) => `            ${line}`).join('\n')}
            ${dirtySetupLine(ctx.elementSetup, patches, derivedCtx).join('\n            ')}
            ${sourceTrackingLines(patches, derivedCtx).join('\n            ')}
            const el0 = __cloneTemplate(${stringLiteral(html)});
            ${ctx.elementSetup.join('\n            ')}
            ${ctx.textSetup.join('\n            ')}
${init ? `\n${init}\n` : ''}${refInit}

            return {
              node: el0,
              update(${itemName}, ${indexName}) {
${syntheticPreUpdateLines ? `${syntheticPreUpdateLines}\n` : ''}${preUpdateLines ? `${preUpdateLines}\n` : ''}${update}
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
  ssr = false,
  options?: CompileOptions,
  containingFunction?: ts.Node | null,
): string | null {
  const ctx: TemplateContext = {
    source,
    itemName: '',
    keyText: '',
    elementId: 1,
    textId: 0,
    elementSetup: [],
    textSetup: [],
    refSetup: [],
    patches: [],
    deps: [],
    elementVars: new Map(),
    derivedCtx,
    ssr,
  };

  const html = compileTemplateNode(ctx, node, []);
  if (html === null) return null;

  if (ssr) {
    const preLines = preUpdateStatements.map((line) => `          ${line}`).join('\n');

    // Island-reactive components are client-only. Their SSR role is solely to
    // emit the `data-auwla-island` boundary marker so the client knows where
    // to hydrate. We must NOT embed the inner `html` here because it may
    // contain raw `.map()` JSX source text (pulled via `expressionText`) that
    // the OXC transform will never see again (the plugin returns `moduleType:
    // 'js'`), causing runtime evaluation to produce `[object Object]`.
    //
    // Layout components (e.g. DocsLayout(Child)) are explicitly excluded:
    // their `Child` parameter is a function reference that cannot be serialized
    // to JSON props. hydrateIslands would call Layout({}) which gives Child={}.
    // rendering `<Child />` as `createElement('[object Object]')` and crashing.
    if (options?.islands && containingFunction && detectComponentReactivity(containingFunction, derivedCtx) && !isLayoutComponent(containingFunction)) {
      const componentName = componentNameFromFunction(containingFunction) || 'default';
      const propsExpr = extractPropsExpression((containingFunction as any).parameters || []);
      // Empty shell — the client will mount fresh DOM inside this boundary.
      const shellHtml = `<div data-auwla-island="${componentName}" data-props="\${__escapeHtml(JSON.stringify(${propsExpr}))}"></div>`;
      return `__ssrBlock(() => {
${preLines}${preLines ? '\n' : ''}          return \`${shellHtml}\`;
        })`;
    }

    return `__ssrBlock(() => {
${preLines}${preLines ? '\n' : ''}          return \`${html}\`;
        })`;
  }

  const patches = derivedCtx
    ? ctx.patches.map((p) => ({ ...p, code: derivedCtx.expand(p.code) }))
    : ctx.patches;
  const dirtyAware = usesDirtyTracking(ctx.elementSetup, patches);

  const dynamicPatches = patches.filter((p) => p.deps.length > 0 && !p.initOnly);
  const staticPatches = patches.filter((p) => p.deps.length === 0 || p.initOnly);

  const patchUpdate = renderUpdateBody(dynamicPatches, derivedCtx, '          ', dirtyAware, forceAllUpdate);
  const update = [
    ...preUpdateStatements.map((line) => `          ${line}`),
    patchUpdate,
  ].filter(Boolean).join('\n');

  const refSetupLines = ctx.refSetup.length
    ? ctx.refSetup.map((r) => `        ${r}`).join('\n')
    : '';

  const setupLines = [
    ...dirtySetupLine(ctx.elementSetup, patches, derivedCtx),
    ...sourceTrackingLines(patches, derivedCtx),
    `const el0 = __cloneTemplate(${stringLiteral(html)});`,
    ...ctx.elementSetup,
    ...ctx.textSetup,
  ];

  return `__componentBlock(() => {
${setupLines.map((line) => `        ${line}`).join('\n')}
${refSetupLines ? `\n${refSetupLines}\n` : ''}
        let _init = false;
        return __createBlock(() => ({
          node: el0,
          update() {
            if (!_init) {
${staticPatches.map((p) => `              ${p.code}`).join('\n')}
              _init = true;
            }
${update}
          },
        }));
      })`;
}
