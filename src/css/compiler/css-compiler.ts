/**
 * @file css-compiler.ts
 * @description
 * AST compiler for Auwla CSS styles using the TypeScript Compiler API.
 *
 * Walks the AST to find `css(...)` and `css.define(...)` calls.
 * Evaluates static properties (including units like css.px and layout descriptors),
 * extracts them into CSS rules, and rewrites the source code to replace style calls
 * with static atomic class name strings. Dynamic properties are kept as inline styles.
 */

import ts from 'typescript';
import { compileStyle } from './index';

export interface CSSRuleCallback {
  (className: string, declaration: string, mediaQuery?: string): void;
}

interface EvaluatedNode {
  isStatic: boolean;
  value: any;
  dynamicProps?: ts.ObjectLiteralElementLike[];
}

/**
 * Statically evaluates a TypeScript AST expression node.
 * Supports primitives, object literals, arrays, and standard `css.*` helper calls.
 */
function evalNode(node: ts.Expression, source: ts.SourceFile): EvaluatedNode {
  // 1. String Literals
  if (ts.isStringLiteral(node)) {
    return { isStatic: true, value: node.text };
  }

  // 2. Numeric Literals
  if (ts.isNumericLiteral(node)) {
    return { isStatic: true, value: Number(node.text) };
  }

  // 3. Boolean and Null Keywords
  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return { isStatic: true, value: true };
  }
  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return { isStatic: true, value: false };
  }
  if (node.kind === ts.SyntaxKind.NullKeyword) {
    return { isStatic: true, value: null };
  }

  // 4. Negative numbers (Prefix Unary minus)
  if (ts.isPrefixUnaryExpression(node)) {
    if (node.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(node.operand)) {
      return { isStatic: true, value: -Number(node.operand.text) };
    }
  }

  // 5. Object Literals
  if (ts.isObjectLiteralExpression(node)) {
    const staticObj: Record<string, any> = {};
    const dynamicProps: ts.ObjectLiteralElementLike[] = [];
    let hasDynamic = false;

    for (const prop of node.properties) {
      if (ts.isPropertyAssignment(prop)) {
        const key = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)
          ? prop.name.text
          : prop.name.getText(source);

        const valRes = evalNode(prop.initializer, source);
        if (valRes.isStatic) {
          staticObj[key] = valRes.value;
        } else {
          dynamicProps.push(prop);
          hasDynamic = true;
        }
      } else {
        // Shorthand properties or spread elements are always dynamic in this context
        dynamicProps.push(prop);
        hasDynamic = true;
      }
    }

    return {
      isStatic: !hasDynamic,
      value: staticObj,
      dynamicProps,
    };
  }

  // 6. Array Literals
  if (ts.isArrayLiteralExpression(node)) {
    const elements: any[] = [];
    let hasDynamic = false;

    for (const elem of node.elements) {
      const elemRes = evalNode(elem, source);
      if (elemRes.isStatic) {
        elements.push(elemRes.value);
      } else {
        hasDynamic = true;
        break;
      }
    }

    if (!hasDynamic) {
      return { isStatic: true, value: elements };
    }
  }

  // 7. Auwla Helper Call Expressions (e.g. css.px(16))
  if (ts.isCallExpression(node)) {
    const funcName = node.expression.getText(source).trim();
    
    // Evaluate arguments first
    const argResults = node.arguments.map((arg) => evalNode(arg, source));
    const argsAllStatic = argResults.every((r) => r.isStatic);

    if (argsAllStatic) {
      const staticArgs = argResults.map((r) => r.value);

      // Unit conversions
      if (funcName === 'css.px') return { isStatic: true, value: `${staticArgs[0]}px` };
      if (funcName === 'css.rem') return { isStatic: true, value: `${staticArgs[0]}rem` };
      if (funcName === 'css.em') return { isStatic: true, value: `${staticArgs[0]}em` };
      if (funcName === 'css.vw') return { isStatic: true, value: `${staticArgs[0]}vw` };
      if (funcName === 'css.vh') return { isStatic: true, value: `${staticArgs[0]}vh` };
      if (funcName === 'css.ch') return { isStatic: true, value: `${staticArgs[0]}ch` };
      if (funcName === 'css.pct') return { isStatic: true, value: `${staticArgs[0]}%` };
      if (funcName === 'css.color') return { isStatic: true, value: staticArgs[0] };
      if (funcName === 'css.ms') return { isStatic: true, value: `${staticArgs[0]}ms` };
      if (funcName === 'css.s') return { isStatic: true, value: `${staticArgs[0]}s` };
      if (funcName === 'css.deg') return { isStatic: true, value: `${staticArgs[0]}deg` };

      // Nesting selector helpers
      if (funcName === 'css.children') return { isStatic: true, value: `& > ${staticArgs[0]}` };
      if (funcName === 'css.pseudo') return { isStatic: true, value: `&:${staticArgs[0]}` };

      // Flex Layout Descriptor Mock
      if (funcName === 'css.flex') {
        const opts = staticArgs[0] || {};
        const props: Record<string, string> = { display: 'flex' };
        if (opts.direction) props.flexDirection = opts.direction;
        if (opts.wrap !== undefined) {
          if (opts.wrap === true) props.flexWrap = 'wrap';
          else if (opts.wrap === 'reverse') props.flexWrap = 'wrap-reverse';
          else props.flexWrap = 'nowrap';
        }
        if (opts.gap) props.gap = String(opts.gap);
        if (opts.align) props.alignItems = opts.align;
        if (opts.justify) props.justifyContent = opts.justify;

        return {
          isStatic: true,
          value: {
            _tag: 'Flex',
            toProperties: () => props,
          },
        };
      }

      // Grid Layout Descriptor Mock
      if (funcName === 'css.grid') {
        const opts = staticArgs[0] || {};
        const props: Record<string, string> = { display: 'grid' };
        if (opts.columns && Array.isArray(opts.columns))
          props.gridTemplateColumns = opts.columns.map(String).join(' ');
        if (opts.rows && Array.isArray(opts.rows))
          props.gridTemplateRows = opts.rows.map(String).join(' ');
        if (opts.areas && Array.isArray(opts.areas))
          props.gridTemplateAreas = opts.areas.map((row: any) => `"${row.join(' ')}"`).join(' ');
        if (opts.gap) props.gap = String(opts.gap);
        if (opts.columnGap) props.columnGap = String(opts.columnGap);
        if (opts.rowGap) props.rowGap = String(opts.rowGap);

        return {
          isStatic: true,
          value: {
            _tag: 'Grid',
            toProperties: () => props,
          },
        };
      }

      // Outline Mock
      if (funcName === 'css.outline') {
        const opts = staticArgs[0] || {};
        const width = opts.width !== undefined ? String(opts.width) : '1px';
        const style = opts.style || 'solid';
        const color = opts.color || '';
        const outlineVal = `${width} ${style} ${color}`.trim();
        const outlineOffset = opts.offset !== undefined ? String(opts.offset) : undefined;
        return {
          isStatic: true,
          value: {
            outline: outlineVal,
            outlineOffset,
            toString() { return this.outline; },
          },
        };
      }

      // Border Mock
      if (funcName === 'css.border') {
        const opts = staticArgs[0] || {};
        return {
          isStatic: true,
          value: {
            _tag: 'Border',
            width: opts.width,
            style: opts.style,
            color: opts.color,
            toString() {
              const parts = [opts.width, opts.style, opts.color].filter(Boolean);
              return parts.join(' ');
            },
          },
        };
      }
    }
  }

  // Not statically evaluable
  return { isStatic: false, value: null };
}

interface Replacement {
  start: number;
  end: number;
  text: string;
}

interface SiblingClassAttr {
  node: ts.JsxAttribute;
  isExpression: boolean;
  text: string;
}

/**
 * Helper to scan a JSX element's sibling attributes to find a class/className attribute.
 */
function findExistingClassAttr(node: ts.JsxAttribute, source: ts.SourceFile): SiblingClassAttr | null {
  const parent = node.parent;
  if (!parent || !ts.isJsxAttributes(parent)) return null;

  for (const prop of parent.properties) {
    if (ts.isJsxAttribute(prop) && ts.isIdentifier(prop.name)) {
      const name = prop.name.text;
      if (name === 'className' || name === 'class') {
        const init = prop.initializer;
        if (!init) {
          return { node: prop, isExpression: false, text: '' };
        }
        if (ts.isStringLiteral(init)) {
          return { node: prop, isExpression: false, text: init.text };
        }
        if (ts.isJsxExpression(init) && init.expression) {
          return { node: prop, isExpression: true, text: init.expression.getText(source) };
        }
      }
    }
  }
  return null;
}

/**
 * Searches the AST for css transformation opportunities and builds replacements.
 */
function findCSSReplacements(
  source: ts.SourceFile,
  onCssRule: CSSRuleCallback
): Replacement[] {
  const replacements: Replacement[] = [];

  function visit(node: ts.Node) {
    // 1. Check for JSX style Attribute style={css({...})}
    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name) && node.name.text === 'style') {
      const init = node.initializer;
      if (init && ts.isJsxExpression(init) && init.expression) {
        const expr = init.expression;

        // Matches style={css({...})}
        if (ts.isCallExpression(expr) && expr.expression.getText(source).trim() === 'css') {
          const arg = expr.arguments[0];
          if (arg) {
            const evalRes = evalNode(arg, source);

            if (evalRes.isStatic) {
              // Case 1: 100% Static
              const compiled = compileStyle(evalRes.value);
              compiled.rules.forEach((r) => onCssRule(r.className, r.declaration, r.mediaQuery));

              const existing = findExistingClassAttr(node, source);
              if (existing) {
                // 1. Remove style={css({...})}
                replacements.push({
                  start: node.getStart(source),
                  end: node.getEnd(),
                  text: '',
                });

                // 2. Modify existing class/className attribute
                const newClasses = compiled.classes.join(' ');
                let replacementText = '';
                if (existing.isExpression) {
                  replacementText = `className={\`${newClasses} \${${existing.text}}\`}`;
                } else {
                  const merged = existing.text ? `${existing.text} ${newClasses}` : newClasses;
                  replacementText = `className="${merged}"`;
                }

                replacements.push({
                  start: existing.node.getStart(source),
                  end: existing.node.getEnd(),
                  text: replacementText,
                });
              } else {
                replacements.push({
                  start: node.getStart(source),
                  end: node.getEnd(),
                  text: `className="${compiled.classes.join(' ')}"`,
                });
              }
            } else if (evalRes.dynamicProps && evalRes.dynamicProps.length > 0) {
              // Case 2: Partially Dynamic
              const staticStyles = evalRes.value || {};
              const compiled = compileStyle(staticStyles);
              compiled.rules.forEach((r) => onCssRule(r.className, r.declaration, r.mediaQuery));

              const dynamicPropsText = evalRes.dynamicProps
                .map((prop) => prop.getText(source))
                .join(', ');

              const existing = findExistingClassAttr(node, source);
              const newClasses = compiled.classes.join(' ');

              if (existing) {
                // 1. Replace style={css({...})} with style={{ dynamicProps }}
                replacements.push({
                  start: node.getStart(source),
                  end: node.getEnd(),
                  text: `style={{ ${dynamicPropsText} }}`,
                });

                // 2. Modify existing class/className attribute (if static styles exist)
                if (newClasses) {
                  let replacementText = '';
                  if (existing.isExpression) {
                    replacementText = `className={\`${newClasses} \${${existing.text}}\`}`;
                  } else {
                    const merged = existing.text ? `${existing.text} ${newClasses}` : newClasses;
                    replacementText = `className="${merged}"`;
                  }

                  replacements.push({
                    start: existing.node.getStart(source),
                    end: existing.node.getEnd(),
                    text: replacementText,
                  });
                }
              } else {
                const staticClassAttr = compiled.classes.length > 0
                  ? `className="${newClasses}"`
                  : '';
                const dynamicStyleAttr = `style={{ ${dynamicPropsText} }}`;
                
                const replacementText = staticClassAttr
                  ? `${staticClassAttr} ${dynamicStyleAttr}`
                  : dynamicStyleAttr;

                replacements.push({
                  start: node.getStart(source),
                  end: node.getEnd(),
                  text: replacementText,
                });
              }
            } else {
              // Case 3: 100% Dynamic - strip css wrapper, leave standard style={}
              replacements.push({
                start: node.getStart(source),
                end: node.getEnd(),
                text: `style={${arg.getText(source)}}`,
              });
            }
          }
        }
      }
    }

    // 2. Check for css.define({...}) calls
    if (ts.isCallExpression(node) && node.expression.getText(source).trim() === 'css.define') {
      const arg = node.arguments[0];
      if (arg) {
        const evalRes = evalNode(arg, source);
        if (evalRes.isStatic) {
          const compiled = compileStyle(evalRes.value);
          compiled.rules.forEach((r) => onCssRule(r.className, r.declaration, r.mediaQuery));

          replacements.push({
            start: node.getStart(source),
            end: node.getEnd(),
            text: JSON.stringify(compiled.classes.join(' ')),
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
  return replacements;
}

/**
 * Compiles and rewrites TSX code to extract static CSS styles.
 *
 * @param sourceText Raw TSX source code
 * @param fileName File name for AST builder
 * @param onCssRule Callback received for each extracted CSS rule
 */
export function compileCSS(
  sourceText: string,
  fileName: string,
  onCssRule: CSSRuleCallback
): string {
  const source = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const replacements = findCSSReplacements(source, onCssRule);

  if (replacements.length === 0) return sourceText;

  // Apply replacements in reverse order (to keep offsets valid)
  let output = sourceText;
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    output = `${output.slice(0, replacement.start)}${replacement.text}${output.slice(replacement.end)}`;
  }

  return output;
}
