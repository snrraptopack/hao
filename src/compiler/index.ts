/**
 * @fileoverview Auwla TSX compiler transform.
 *
 * Parses TypeScript/TSX source and lowers component render closures into
 * imperative DOM blocks that call into `compiler-runtime` helpers.
 */

import ts from 'typescript';
import {
  childExpression,
  decodeJsxText,
  escapeHtml,
  expressionDependencies,
  expressionText,
  intrinsicName,
  isMapCall,
  isStaticExpression,
  isWhitespaceJsxText,
  keyAttribute,
  needsChildPatch,
  pathExpression,
  rowDependencies,
  stringLiteral,
  unwrapJsxBody,
  unwrapJsxExpression,
} from './utils';

type DynamicPatch = {
  code: string;
  deps: string[];
};

type CompileContext = {
  source: ts.SourceFile;
  elementId: number;
  mapId: number;
  textId: number;
  patches: DynamicPatch[];
  deps: string[];
  setup: string[];
};

type CompileResult = {
  code: string;
  root: string;
};

type TemplatePatch = DynamicPatch & {
  initOnly?: boolean;
};

type TemplateContext = {
  source: ts.SourceFile;
  itemName: string;
  keyText: string;
  elementId: number;
  textId: number;
  elementSetup: string[];
  textSetup: string[];
  patches: TemplatePatch[];
  deps: string[];
  elementVars: Map<string, string>;
};

const COMPILER_IMPORT = [
  '__componentBlock',
  '__cloneTemplate',
  '__createBlock',
  '__event',
  '__keyedMap',
  '__setAttribute',
  '__setChild',
  '__setClass',
  '__setProperty',
  '__setStyle',
  '__setText',
].join(', ');

const PROPERTY_PROPS = new Set([
  'checked',
  'disabled',
  'hidden',
  'multiple',
  'selected',
  'value',
]);

function compileJsxChild(ctx: CompileContext, child: ts.JsxChild, parentVar: string): boolean {
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
    if (!compiled) return false;
    ctx.setup.push(`${parentVar}.append(${compiled.root});`);
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

function compileAttribute(
  ctx: CompileContext,
  elementVar: string,
  attribute: ts.JsxAttributeLike,
): boolean {
  if (ts.isJsxSpreadAttribute(attribute)) return false;

  if (!ts.isIdentifier(attribute.name)) return false;
  const name = attribute.name.text;
  const initializer = attribute.initializer;

  if (name === 'key') return true;

  if (name === 'ref') {
    if (!initializer) return true;
    if (!ts.isJsxExpression(initializer)) return false;
    const expression = childExpression(initializer);
    if (!expression) return true;
    const value = expressionText(ctx.source, expression);
    ctx.setup.push(`(${value})(${elementVar});`);
    return true;
  }

  if (!initializer) {
    ctx.setup.push(`__setAttribute(${elementVar}, ${stringLiteral(name)}, true);`);
    return true;
  }

  if (ts.isStringLiteral(initializer)) {
    if (name === 'class' || name === 'className') {
      ctx.setup.push(`${elementVar}.className = ${stringLiteral(initializer.text)};`);
      return true;
    }

    ctx.setup.push(`${elementVar}.setAttribute(${stringLiteral(name)}, ${stringLiteral(initializer.text)});`);
    return true;
  }

  if (!ts.isJsxExpression(initializer)) return false;
  const expression = childExpression(initializer);
  if (!expression) return true;

  const value = expressionText(ctx.source, expression);
  if (name === 'style') {
    if (ts.isObjectLiteralExpression(expression)) {
      for (const property of expression.properties) {
        const propertyName = ts.isShorthandPropertyAssignment(property)
          ? property.name.text
          : ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
            ? property.name.text
            : null;
        if (!propertyName) return false;

        const initializer = ts.isPropertyAssignment(property) ? property.initializer : null;
        const propertyValue = ts.isShorthandPropertyAssignment(property)
          ? property.name.text
          : initializer
            ? expressionText(ctx.source, initializer)
            : null;
        if (!propertyValue) return false;

        if (initializer && isStaticExpression(initializer)) {
          ctx.setup.push(`__setStyle(${elementVar}, ${stringLiteral(propertyName)}, ${propertyValue});`);
        } else {
          ctx.deps.push(propertyValue);
          ctx.patches.push({
            code: `__setStyle(${elementVar}, ${stringLiteral(propertyName)}, ${propertyValue});`,
            deps: [propertyValue],
          });
        }
      }
      return true;
    }

    ctx.deps.push(value);
    ctx.patches.push({ code: `__setStyle(${elementVar}, ${value});`, deps: [value] });
    return true;
  }

  if (name === 'class' || name === 'className') {
    ctx.deps.push(value);
    ctx.patches.push({ code: `__setClass(${elementVar}, ${value});`, deps: [value] });
    return true;
  }

  if (name.startsWith('on') && name.length > 2) {
    const eventName = name.slice(2).toLowerCase();
    ctx.setup.push(`${elementVar}.addEventListener(${stringLiteral(eventName)}, __event(${value}));`);
    return true;
  }

  const setter = PROPERTY_PROPS.has(name) ? '__setProperty' : '__setAttribute';
  ctx.deps.push(value);
  ctx.patches.push({ code: `${setter}(${elementVar}, ${stringLiteral(name)}, ${value});`, deps: [value] });
  return true;
}

function templateElementVar(ctx: TemplateContext, path: number[]): string {
  if (path.length === 0) return 'el0';

  const key = path.join('.');
  const existing = ctx.elementVars.get(key);
  if (existing) return existing;

  const name = `el${ctx.elementId++}`;
  ctx.elementVars.set(key, name);
  ctx.elementSetup.push(`const ${name} = ${pathExpression('el0', path)} as HTMLElement;`);
  return name;
}

function compileTemplateAttribute(
  ctx: TemplateContext,
  attribute: ts.JsxAttributeLike,
  elementVar: string,
): string | null {
  if (ts.isJsxSpreadAttribute(attribute)) return null;
  if (!ts.isIdentifier(attribute.name)) return null;

  const name = attribute.name.text;
  const initializer = attribute.initializer;
  if (name === 'key') return '';

  if (name === 'ref') {
    if (!initializer) return '';
    if (!ts.isJsxExpression(initializer)) return null;
    const expression = childExpression(initializer);
    if (!expression) return '';
    const value = expressionText(ctx.source, expression);
    ctx.elementSetup.push(`(${value})(${elementVar});`);
    return '';
  }
  if (!initializer) return ` ${name}`;

  if (ts.isStringLiteral(initializer)) {
    return name === 'className'
      ? ` class="${escapeHtml(initializer.text)}"`
      : ` ${name}="${escapeHtml(initializer.text)}"`;
  }

  if (!ts.isJsxExpression(initializer)) return null;
  const expression = childExpression(initializer);
  if (!expression) return '';

  const value = expressionText(ctx.source, expression);
  if (name === 'style') return null;

  if (name === 'class' || name === 'className') {
    ctx.deps.push(value);
    ctx.patches.push({ code: `__setClass(${elementVar}, ${value});`, deps: [value] });
    return '';
  }

  if (name.startsWith('on') && name.length > 2) {
    const eventName = name.slice(2).toLowerCase();
    ctx.elementSetup.push(`${elementVar}.addEventListener(${stringLiteral(eventName)}, __event(${value}));`);
    return '';
  }

  const setter = PROPERTY_PROPS.has(name) ? '__setProperty' : '__setAttribute';
  ctx.deps.push(value);
  ctx.patches.push({ code: `${setter}(${elementVar}, ${stringLiteral(name)}, ${value});`, deps: [value] });
  return '';
}

function compileTemplateChildren(ctx: TemplateContext, children: readonly ts.JsxChild[], parentPath: number[]): string | null {
  let html = '';
  let childIndex = 0;

  for (const child of children) {
    if (ts.isJsxText(child)) {
      if (isWhitespaceJsxText(child)) continue;
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
      continue;
    }

    if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
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

function compileTemplateNode(
  ctx: TemplateContext,
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  path: number[],
): string | null {
  const opening = ts.isJsxElement(node) ? node.openingElement : node;
  const tag = intrinsicName(opening.tagName);
  if (!tag) return null;

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
  const children = compileTemplateChildren(ctx, node.children, path);
  if (children === null) return null;

  return `<${tag}${attrs}>${children}</${tag}>`;
}

function compileTemplateRowBlock(
  source: ts.SourceFile,
  row: ts.JsxElement | ts.JsxSelfClosingElement,
  itemName: string,
  indexName: string,
  keyText: string,
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
  };

  const html = compileTemplateNode(ctx, row, []);
  if (html === null) return null;

  const updatePatches = ctx.patches.filter((patch) => !patch.initOnly);
  const init = ctx.patches.length
    ? ctx.patches.map((patch) => `            ${patch.code}`).join('\n')
    : '';
  const update = updatePatches.length
    ? updatePatches.map((patch) => `              ${patch.code}`).join('\n')
    : '              // Static row; no dynamic fields to patch.';

  return {
    deps: rowDependencies(ctx.deps, itemName),
    block: `__createBlock(() => {
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

function compileRowBlock(
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

function compileKeyedMap(ctx: CompileContext, expression: ts.Expression): string | null {
  if (!ts.isCallExpression(expression)) return null;
  if (!ts.isPropertyAccessExpression(expression.expression)) return null;
  if (expression.expression.name.text !== 'map') return null;
  if (expression.arguments.length !== 1) return null;

  const callback = expression.arguments[0]!;
  if (!ts.isArrowFunction(callback)) return null;
  const itemParam = callback.parameters[0];
  if (!itemParam || !ts.isIdentifier(itemParam.name)) return null;
  const indexParam = callback.parameters[1];
  const indexName = indexParam && ts.isIdentifier(indexParam.name) ? indexParam.name.text : 'index';

  if (ts.isBlock(callback.body)) return null;
  const row = unwrapJsxExpression(callback.body);
  if (!row) return null;

  const key = keyAttribute(row);
  if (!key) return null;

  const keyText = expressionText(ctx.source, key);
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

  ctx.setup.push(`const ${mapVar} = __keyedMap(
          ${items},
          (${itemName}) => ${keyText},
          (${itemName}, ${indexName}) => ${rowBlock.block},
          (block, ${itemName}, index) => block.update(${itemName}, index),
          (${itemName}) => ${deps},
          false,
        );`);
  ctx.patches.push({ code: `${mapVar}.update(${items});`, deps: [items] });
  return mapVar;
}

function compileJsxNode(
  ctx: CompileContext,
  node: ts.JsxElement | ts.JsxSelfClosingElement,
): CompileResult | null {
  const opening = ts.isJsxElement(node) ? node.openingElement : node;
  const tag = intrinsicName(opening.tagName);
  if (!tag) return null;

  const elementVar = `el${ctx.elementId++}`;
  ctx.setup.push(`const ${elementVar} = document.createElement(${stringLiteral(tag)});`);

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

function compileTemplateRootBlock(
  source: ts.SourceFile,
  node: ts.JsxElement | ts.JsxSelfClosingElement,
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
  };

  const html = compileTemplateNode(ctx, node, []);
  if (html === null) return null;

  const update = ctx.patches.length
    ? ctx.patches.map((patch) => `          ${patch.code}`).join('\n')
    : '          // Static block; no dynamic fields to patch.';

  const setupLines = [
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

  const body = unwrapJsxBody(expression.body);
  if (!body) return null;

  const compiled = compileRenderClosure(source, body);
  return compiled ? `return ${compiled};` : null;
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

function addCompilerImport(code: string): string {
  if (code.includes('__componentBlock') && !code.includes(COMPILER_IMPORT)) {
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
  return addCompilerImport(applyReplacements(sourceText, replacements));
}
