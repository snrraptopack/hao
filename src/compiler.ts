import ts from 'typescript';

type DynamicPatch = {
  code: string;
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

const COMPILER_IMPORT = [
  '__componentBlock',
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

function expressionText(source: ts.SourceFile, expression: ts.Expression): string {
  return expression.getText(source);
}

function stringLiteral(value: string): string {
  return JSON.stringify(value);
}

function decodeJsxText(value: string): string {
  return value.replace(/&(#x[\da-fA-F]+|#\d+|amp|lt|gt|quot|apos|nbsp);/g, (entity, body: string) => {
    switch (body) {
      case 'amp': return '&';
      case 'lt': return '<';
      case 'gt': return '>';
      case 'quot': return '"';
      case 'apos': return "'";
      case 'nbsp': return '\u00a0';
      default: {
        const code = body.startsWith('#x')
          ? Number.parseInt(body.slice(2), 16)
          : body.startsWith('#')
            ? Number.parseInt(body.slice(1), 10)
            : NaN;
        return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
      }
    }
  });
}

function rowDependencies(expressions: string[], itemName: string): string[] {
  const deps: string[] = [];
  const seen = new Set<string>();
  const propertyPattern = new RegExp(`\\b${itemName}\\.[A-Za-z_$][\\w$]*`, 'g');

  for (const expression of expressions) {
    const matches = expression.match(propertyPattern);
    const nextDeps = matches && matches.length > 0 ? matches : [expression];

    for (const dep of nextDeps) {
      if (seen.has(dep)) continue;
      seen.add(dep);
      deps.push(dep);
    }
  }

  return deps;
}

function isWhitespaceJsxText(node: ts.JsxText): boolean {
  return node.getFullText().trim() === '';
}

function intrinsicName(name: ts.JsxTagNameExpression): string | null {
  if (!ts.isIdentifier(name)) return null;
  return /^[a-z]/.test(name.text) ? name.text : null;
}

function childExpression(child: ts.JsxExpression): ts.Expression | null {
  return child.expression ?? null;
}

function unwrapJsxExpression(expression: ts.Expression): ts.JsxElement | ts.JsxSelfClosingElement | null {
  if (ts.isJsxElement(expression) || ts.isJsxSelfClosingElement(expression)) return expression;
  if (ts.isParenthesizedExpression(expression)) return unwrapJsxExpression(expression.expression);
  return null;
}

function containsJsx(node: ts.Node): boolean {
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) return true;
  return node.getChildren().some(containsJsx);
}

function needsChildPatch(expression: ts.Expression): boolean {
  if (containsJsx(expression) || ts.isArrayLiteralExpression(expression)) return true;
  if (ts.isConditionalExpression(expression)) return true;
  if (ts.isBinaryExpression(expression)) {
    return expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
      || expression.operatorToken.kind === ts.SyntaxKind.BarBarToken
      || containsJsx(expression);
  }
  return false;
}

function isMapCall(expression: ts.Expression): boolean {
  return ts.isCallExpression(expression)
    && ts.isPropertyAccessExpression(expression.expression)
    && expression.expression.name.text === 'map';
}

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
      ctx.patches.push({ code: `${childVar} = __setChild(${parentVar}, ${childVar}, ${value});` });
      return true;
    }

    const textVar = `text${ctx.textId++}`;
    ctx.setup.push(`const ${textVar} = document.createTextNode("");`);
    ctx.setup.push(`${parentVar}.append(${textVar});`);
    ctx.patches.push({ code: `__setText(${textVar}, ${value});` });
    return true;
  }

  if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
    const compiled = compileJsxNode(ctx, child);
    if (!compiled) return false;
    ctx.setup.push(`${parentVar}.append(${compiled.root});`);
    return true;
  }

  if (ts.isJsxFragment(child)) return false;
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
    ctx.deps.push(value);
    ctx.patches.push({ code: `__setStyle(${elementVar}, ${value});` });
    return true;
  }

  if (name === 'class' || name === 'className') {
    ctx.deps.push(value);
    ctx.patches.push({ code: `__setClass(${elementVar}, ${value});` });
    return true;
  }

  if (name.startsWith('on') && name.length > 2) {
    const eventName = name.slice(2).toLowerCase();
    ctx.setup.push(`${elementVar}.addEventListener(${stringLiteral(eventName)}, __event(${value}));`);
    return true;
  }

  const setter = PROPERTY_PROPS.has(name) ? '__setProperty' : '__setAttribute';
  ctx.deps.push(value);
  ctx.patches.push({ code: `${setter}(${elementVar}, ${stringLiteral(name)}, ${value});` });
  return true;
}

function keyAttribute(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
): ts.Expression | null {
  const opening = ts.isJsxElement(node) ? node.openingElement : node;
  for (const attribute of opening.attributes.properties) {
    if (ts.isJsxSpreadAttribute(attribute)) continue;
    if (!ts.isIdentifier(attribute.name) || attribute.name.text !== 'key') continue;
    if (!attribute.initializer || !ts.isJsxExpression(attribute.initializer)) return null;
    return childExpression(attribute.initializer);
  }
  return null;
}

function compileRowBlock(
  source: ts.SourceFile,
  row: ts.JsxElement | ts.JsxSelfClosingElement,
  itemName: string,
  indexName: string,
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

  const update = ctx.patches.length
    ? ctx.patches.map((patch) => `              ${patch.code}`).join('\n')
    : '              // Static row; no dynamic fields to patch.';

  return {
    deps: rowDependencies(ctx.deps, itemName),
    block: `__createBlock(() => {
            ${ctx.setup.join('\n            ')}

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

  const rowBlock = compileRowBlock(ctx.source, row, itemParam.name.text, indexName);
  if (!rowBlock) return null;

  const mapVar = `map${ctx.mapId++}`;
  const items = expressionText(ctx.source, expression.expression.expression);
  const itemName = itemParam.name.text;
  const keyText = expressionText(ctx.source, key);
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
        );`);
  ctx.patches.push({ code: `${mapVar}.update(${items});` });
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

function compileRenderClosure(source: ts.SourceFile, jsx: ts.JsxElement | ts.JsxSelfClosingElement): string | null {
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

function unwrapJsxBody(body: ts.ConciseBody): ts.JsxElement | ts.JsxSelfClosingElement | null {
  if (ts.isJsxElement(body) || ts.isJsxSelfClosingElement(body)) return body;
  if (ts.isParenthesizedExpression(body)) {
    const expression = body.expression;
    if (ts.isJsxElement(expression) || ts.isJsxSelfClosingElement(expression)) return expression;
  }
  return null;
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

export function compileAuwla(sourceText: string, fileName = 'input.tsx'): string {
  const source = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const replacements = findReplacements(source);
  if (replacements.length === 0) return sourceText;
  return addCompilerImport(applyReplacements(sourceText, replacements));
}
