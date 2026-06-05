/**
 * @file css-compiler.ts
 * @description
 * AST compiler for Auwla CSS styles using the TypeScript Compiler API.
 *
 * Walks the AST to find `css(...)` and `css.define(...)` calls.
 * Evaluates static properties (including theme design tokens, unit math, and color functions),
 * extracts them into CSS rules, and rewrites the source code to replace style calls
 * with static atomic class name strings.
 */

import ts from 'typescript';
import path from 'path';
import fs from 'fs';
import { compileStyle } from './index';
import { color } from '../color';

export interface CSSRuleCallback {
  (className: string, declaration: string, mediaQuery?: string): void;
}

interface EvaluatedNode {
  isStatic: boolean;
  value: any;
  dynamicProps?: ts.ObjectLiteralElementLike[];
  extractedVars?: { name: string; expr: ts.Expression }[];
}

const themeCache = new Map<string, any>();

export function clearThemeCache(): void {
  themeCache.clear();
}

function parseLength(val: any): { value: number; unit: string } {
  if (typeof val === 'number') return { value: val, unit: 'px' };
  const str = String(val);
  const match = str.match(/^([\d.-]+)([a-zA-Z%]*)$/);
  if (match) {
    return { value: parseFloat(match[1] || '0'), unit: match[2] || 'px' };
  }
  return { value: 0, unit: 'px' };
}

function computeSpring(stiffness = 300, damping = 25, mass = 1): string {
  const omega0 = Math.sqrt(stiffness / mass);
  const zeta   = damping / (2 * Math.sqrt(stiffness * mass));
  let duration: number;
  if (zeta >= 1) {
    duration = 6 / (zeta * omega0);
  } else {
    const settling = Math.log(0.001) / (-zeta * omega0);
    const omegaD   = omega0 * Math.sqrt(1 - zeta * zeta);
    const period   = (2 * Math.PI) / omegaD;
    duration = Math.max(settling, period * 1.5);
  }
  const SAMPLES = 30;
  const points: string[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = (i / SAMPLES) * duration;
    let x: number;
    if (zeta < 1) {
      const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
      x = 1 - Math.exp(-zeta * omega0 * t) * (
        Math.cos(omegaD * t) + (zeta / omegaD) * Math.sin(omegaD * t)
      );
    } else if (zeta === 1) {
      x = 1 - (1 + omega0 * t) * Math.exp(-omega0 * t);
    } else {
      const sqrtTerm = Math.sqrt(zeta * zeta - 1);
      const r1 = omega0 * (-zeta + sqrtTerm);
      const r2 = omega0 * (-zeta - sqrtTerm);
      x = 1 + (r2 / (r1 - r2)) * Math.exp(r1 * t) - (r1 / (r1 - r2)) * Math.exp(r2 * t);
    }
    x = Math.max(-0.5, Math.min(1.5, x));
    const inputPct = ((i / SAMPLES) * 100).toFixed(1);
    points.push(`${x.toFixed(4)} ${inputPct}%`);
  }
  return `linear(${points.join(', ')})`;
}

/**
 * Statically evaluates a TypeScript AST expression node.
 * Supports primitives, object literals, arrays, design tokens, and standard `css.*` helpers.
 */
function cleanVarName(selector: string, prop: string): string {
  const cleanSel = selector
    .replace(/^&+/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const cleanProp = prop.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  return `--${cleanSel}-${cleanProp}`;
}

/**
 * Statically evaluates a TypeScript AST expression node.
 * Supports primitives, object literals, arrays, design tokens, and standard `css.*` helpers.
 */
function evalNode(
  node: ts.Expression,
  source: ts.SourceFile,
  themeValues?: Map<string, any>,
  selectorContext?: string
): EvaluatedNode {
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
    const extractedVars: EvaluatedNode['extractedVars'] = [];
    let hasDynamic = false;

    for (const prop of node.properties) {
      if (ts.isPropertyAssignment(prop)) {
        const key = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)
          ? prop.name.text
          : prop.name.getText(source);

        const isNestedKey = key.startsWith(':') || key.startsWith('&') || key.startsWith('@');
        const nextContext = isNestedKey ? key : selectorContext;

        const valRes = evalNode(prop.initializer, source, themeValues, nextContext);

        if (valRes.extractedVars) {
          extractedVars.push(...valRes.extractedVars);
        }

        if (valRes.isStatic) {
          staticObj[key] = valRes.value;
        } else {
          // If we are inside a selector block context (like a pseudo-class or media query),
          // convert this dynamic property assignment to a static property with var(--...) reference
          if (selectorContext && !isNestedKey) {
            const varName = cleanVarName(selectorContext, key);
            staticObj[key] = `var(${varName})`;
            extractedVars.push({ name: varName, expr: prop.initializer });
          } else {
            dynamicProps.push(prop);
            hasDynamic = true;
          }
        }
      } else {
        dynamicProps.push(prop);
        hasDynamic = true;
      }
    }

    return {
      isStatic: !hasDynamic,
      value: staticObj,
      dynamicProps,
      extractedVars: extractedVars.length > 0 ? extractedVars : undefined,
    };
  }

  // 6. Array Literals
  if (ts.isArrayLiteralExpression(node)) {
    const elements: any[] = [];
    let hasDynamic = false;

    for (const elem of node.elements) {
      const elemRes = evalNode(elem, source, themeValues, selectorContext);
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

  // 7. Property Access (theme.spacing.md)
  if (ts.isPropertyAccessExpression(node)) {
    const objRes = evalNode(node.expression, source, themeValues, selectorContext);
    if (objRes.isStatic && objRes.value && typeof objRes.value === 'object') {
      const propName = node.name.text;
      if (propName in objRes.value) {
        return { isStatic: true, value: objRes.value[propName] };
      }
    }
  }

  // 8. Element Access (theme.colors.primary[500])
  if (ts.isElementAccessExpression(node)) {
    const objRes = evalNode(node.expression, source, themeValues, selectorContext);
    if (objRes.isStatic && objRes.value && typeof objRes.value === 'object') {
      const argRes = evalNode(node.argumentExpression, source, themeValues, selectorContext);
      if (argRes.isStatic) {
        const key = argRes.value;
        if (key !== null && key !== undefined && key in objRes.value) {
          return { isStatic: true, value: objRes.value[key] };
        }
      }
    }
  }

  // 9. Identifiers (e.g. theme)
  if (ts.isIdentifier(node)) {
    const text = node.text;
    if (themeValues && themeValues.has(text)) {
      return { isStatic: true, value: themeValues.get(text) };
    }
  }

  // 10. Call Expressions (e.g. css.px(16), theme.spacing.md.add(4))
  if (ts.isCallExpression(node)) {
    const funcName = node.expression.getText(source).trim();

    // Check for length arithmetic methods: add, subtract, multiply, divide
    if (ts.isPropertyAccessExpression(node.expression)) {
      const callerNode = node.expression.expression;
      const methodName = node.expression.name.text;

      if (['add', 'subtract', 'multiply', 'divide'].includes(methodName)) {
        const callerRes = evalNode(callerNode, source, themeValues, selectorContext);
        if (callerRes.isStatic) {
          const baseLen = parseLength(callerRes.value);
          const argResults = node.arguments.map((arg) => evalNode(arg, source, themeValues, selectorContext));
          if (argResults.every((r) => r.isStatic)) {
            if (methodName === 'multiply') {
              const multiplier = Number(argResults[0]?.value) || 1;
              return { isStatic: true, value: `${Number((baseLen.value * multiplier).toFixed(3))}${baseLen.unit}` };
            }
            if (methodName === 'divide') {
              const divisor = Number(argResults[0]?.value) || 1;
              return { isStatic: true, value: `${Number((baseLen.value / divisor).toFixed(3))}${baseLen.unit}` };
            }

            const argLen = parseLength(argResults[0]?.value);
            if (baseLen.unit === argLen.unit) {
              const newVal = methodName === 'add' ? baseLen.value + argLen.value : baseLen.value - argLen.value;
              return { isStatic: true, value: `${Number(newVal.toFixed(3))}${baseLen.unit}` };
            } else {
              const op = methodName === 'add' ? '+' : '-';
              return { isStatic: true, value: `calc(${baseLen.value}${baseLen.unit} ${op} ${argLen.value}${argLen.unit})` };
            }
          }
        }
      }

      // Check for method calls on static objects (e.g. Color methods: .lighten, .contrast)
      const callerRes = evalNode(callerNode, source, themeValues, selectorContext);
      if (callerRes.isStatic && callerRes.value && typeof callerRes.value === 'object') {
        const argResults = node.arguments.map((arg) => evalNode(arg, source, themeValues, selectorContext));
        if (argResults.every((r) => r.isStatic)) {
          const args = argResults.map((r) => r.value);
          const obj = callerRes.value;
          if (typeof obj[methodName] === 'function') {
            const resultVal = obj[methodName](...args);
            return { isStatic: true, value: resultVal };
          }
        }
      }
    }

    // Evaluate arguments first
    const argResults = node.arguments.map((arg) => evalNode(arg, source, themeValues, selectorContext));
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
      if (funcName === 'css.color') return { isStatic: true, value: color(staticArgs[0]) };
      if (funcName === 'css.color.scale') return { isStatic: true, value: color.scale(staticArgs[0], staticArgs[1]) };
      if (funcName === 'css.color.group') return { isStatic: true, value: color.group(staticArgs[0]) };
      if (funcName === 'css.ms') return { isStatic: true, value: `${staticArgs[0]}ms` };
      if (funcName === 'css.s') return { isStatic: true, value: `${staticArgs[0]}s` };
      if (funcName === 'css.deg') return { isStatic: true, value: `${staticArgs[0]}deg` };

      // Design token & scale builders
      if (funcName === 'css.scale') {
        const opts = staticArgs[0] || {};
        const baseLen = parseLength(opts.base);
        const ratio = Number(opts.ratio) || 1.333;
        const steps = opts.steps || {};
        const scaleObj: Record<string, string> = {};
        for (const [name, index] of Object.entries(steps)) {
          const factor = Math.pow(ratio, Number(index));
          const computedVal = baseLen.value * factor;
          scaleObj[name] = `${Number(computedVal.toFixed(3))}${baseLen.unit}`;
        }
        return { isStatic: true, value: scaleObj };
      }
      if (funcName === 'css.typeScale') {
        const opts = staticArgs[0] || {};
        const baseLen = parseLength(opts.base);
        const ratio = Number(opts.ratio) || 1.25;
        const steps = opts.steps || {};
        const scaleObj: Record<string, string> = {};
        for (const [name, index] of Object.entries(steps)) {
          const factor = Math.pow(ratio, Number(index));
          const computedVal = baseLen.value * factor;
          scaleObj[name] = `${Number(computedVal.toFixed(3))}${baseLen.unit}`;
        }
        return { isStatic: true, value: scaleObj };
      }
      if (funcName === 'css.fontStack') {
        const fonts = staticArgs[0] || [];
        const stack = fonts.map((f: string) => f.includes(' ') ? `"${f}"` : f).join(', ');
        return { isStatic: true, value: stack };
      }
      if (funcName === 'css.elevation') {
        const opts = staticArgs[0] || {};
        const baseColor = opts.base || 'rgba(0,0,0,0.08)';
        const levels = opts.levels || [];
        const shadows = levels.map((lvl: any) => {
          const x = lvl.x !== undefined ? `${lvl.x}px` : '0px';
          const y = lvl.y !== undefined ? `${lvl.y}px` : '0px';
          const blur = lvl.blur !== undefined ? `${lvl.blur}px` : '0px';
          const spread = lvl.spread !== undefined ? `${lvl.spread}px` : '0px';
          return `${x} ${y} ${blur} ${spread} ${baseColor}`.trim();
        });
        return { isStatic: true, value: shadows };
      }
      if (funcName === 'css.spring') {
        const opts = staticArgs[0] || {};
        return { isStatic: true, value: computeSpring(opts.stiffness, opts.damping, opts.mass) };
      }
      if (funcName === 'css.tokens') {
        return { isStatic: true, value: staticArgs[0] };
      }

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

function findExistingClassAttr(node: ts.JsxAttribute, source: ts.SourceFile): SiblingClassAttr | null {
  const parent = node.parent;
  if (!parent || !ts.isJsxAttributes(parent)) return null;

  for (const prop of parent.properties) {
    if (ts.isJsxAttribute(prop) && ts.isIdentifier(prop.name)) {
      if (prop === node) continue;
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

function resolveThemeFile(dir: string, moduleSpecifier: string): string | null {
  const base = path.resolve(dir, moduleSpecifier);
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];
  if (fs.existsSync(base) && fs.statSync(base).isFile()) {
    return base;
  }
  for (const ext of extensions) {
    const p = base + ext;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      return p;
    }
  }
  for (const ext of extensions) {
    const p = path.join(base, 'index' + ext);
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      return p;
    }
  }
  return null;
}

function getThemeObject(themePath: string): any {
  if (themeCache.has(themePath)) {
    return themeCache.get(themePath);
  }

  try {
    const content = fs.readFileSync(themePath, 'utf8');
    const source = ts.createSourceFile(themePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    let themeValue: any = null;

    const localScope = new Map<string, any>();

    // Pass 1: Build local scope from variable statements in declaration order
    for (const stmt of source.statements) {
      if (ts.isVariableStatement(stmt)) {
        for (const decl of stmt.declarationList.declarations) {
          if (ts.isIdentifier(decl.name) && decl.initializer) {
            const evalRes = evalNode(decl.initializer, source, localScope);
            if (evalRes.isStatic) {
              localScope.set(decl.name.text, evalRes.value);
            }
          }
        }
      }
    }

    // Pass 2: Find and evaluate the exported 'theme' declaration using localScope
    for (const stmt of source.statements) {
      if (ts.isVariableStatement(stmt)) {
        const isExported = stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
        if (isExported) {
          for (const decl of stmt.declarationList.declarations) {
            if (ts.isIdentifier(decl.name) && decl.name.text === 'theme') {
              if (decl.initializer) {
                const evalRes = evalNode(decl.initializer, source, localScope);
                if (evalRes.isStatic) {
                  themeValue = evalRes.value;
                }
              }
            }
          }
        }
      }
    }

    themeCache.set(themePath, themeValue);
    return themeValue;
  } catch (err) {
    console.error(`Error loading theme from ${themePath}:`, err);
    return null;
  }
}

/**
 * Searches the AST for css transformation opportunities and builds replacements.
 */
function findCSSReplacements(
  source: ts.SourceFile,
  fileName: string,
  onCssRule: CSSRuleCallback
): Replacement[] {
  const replacements: Replacement[] = [];
  const themeValues = new Map<string, any>();
  const dir = path.dirname(fileName);

  // Scan import statements for theme imports
  for (const stmt of source.statements) {
    if (ts.isImportDeclaration(stmt) && stmt.importClause) {
      const moduleSpecifier = (stmt.moduleSpecifier as ts.StringLiteral).text;
      const clause = stmt.importClause;

      if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const element of clause.namedBindings.elements) {
          const localName = element.name.text;
          const propertyName = element.propertyName ? element.propertyName.text : localName;

          if (propertyName === 'theme') {
            const resolvedPath = resolveThemeFile(dir, moduleSpecifier);
            if (resolvedPath) {
              const themeObj = getThemeObject(resolvedPath);
              if (themeObj) {
                themeValues.set(localName, themeObj);
              }
            }
          }
        }
      }

      if (clause.name) {
        const localName = clause.name.text;
        if (localName === 'theme') {
          const resolvedPath = resolveThemeFile(dir, moduleSpecifier);
          if (resolvedPath) {
            const themeObj = getThemeObject(resolvedPath);
            if (themeObj) {
              themeValues.set(localName, themeObj);
            }
          }
        }
      }
    }
  }

  function visit(node: ts.Node) {
    // 1. Check for JSX style Attribute style={css({...})}
    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name)) {
      const attrName = node.name.text;
      if (attrName === 'style' || attrName === 'className') {
        const init = node.initializer;
        if (init && ts.isJsxExpression(init) && init.expression) {
          const expr = init.expression;

          if (ts.isCallExpression(expr)) {
            const funcName = expr.expression.getText(source).trim();

            if (funcName === 'css.when') {
              const condArg = expr.arguments[0];
              const branchesArg = expr.arguments[1];
              if (condArg && branchesArg && ts.isObjectLiteralExpression(branchesArg)) {
                let trueExpr: ts.Expression | undefined;
                let falseExpr: ts.Expression | undefined;
                for (const prop of branchesArg.properties) {
                  if (ts.isPropertyAssignment(prop) && (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name))) {
                    const propName = prop.name.text;
                    if (propName === 'true') trueExpr = prop.initializer;
                    if (propName === 'false') falseExpr = prop.initializer;
                  }
                }

                const trueRes = trueExpr ? evalNode(trueExpr, source, themeValues) : null;
                const falseRes = falseExpr ? evalNode(falseExpr, source, themeValues) : null;

                const trueStatic = !trueRes || trueRes.isStatic;
                const falseStatic = !falseRes || falseRes.isStatic;

                if (trueStatic && falseStatic) {
                  const trueVal = trueRes ? trueRes.value : {};
                  const falseVal = falseRes ? falseRes.value : {};

                  const trueCompiled = compileStyle(trueVal);
                  const falseCompiled = compileStyle(falseVal);

                  trueCompiled.rules.forEach((r) => onCssRule(r.className, r.declaration, r.mediaQuery));
                  falseCompiled.rules.forEach((r) => onCssRule(r.className, r.declaration, r.mediaQuery));

                  const trueClasses = trueCompiled.classes.join(' ');
                  const falseClasses = falseCompiled.classes.join(' ');
                  const condText = condArg.getText(source);
                  const ternaryExpr = `${condText} ? ${JSON.stringify(trueClasses)} : ${JSON.stringify(falseClasses)}`;

                  const existing = findExistingClassAttr(node, source);
                  if (attrName === 'style') {
                    // Remove style={css.when(...)}
                    replacements.push({
                      start: node.getStart(source),
                      end: node.getEnd(),
                      text: '',
                    });

                    if (existing) {
                      let replacementText = '';
                      if (existing.isExpression) {
                        replacementText = `className={\`\${${existing.text}} \${${ternaryExpr}}\`}`;
                      } else {
                        const merged = existing.text ? `${existing.text} \${${ternaryExpr}}` : `\${${ternaryExpr}}`;
                        replacementText = `className={\`${merged}\`}`;
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
                        text: `className={${ternaryExpr}}`,
                      });
                    }
                  } else {
                    // Original was className={css.when(...)}
                    if (existing) {
                      // Remove the original className={css.when(...)}
                      replacements.push({
                        start: node.getStart(source),
                        end: node.getEnd(),
                        text: '',
                      });

                      // Merge with the other existing one
                      let replacementText = '';
                      if (existing.isExpression) {
                        replacementText = `className={\`\${${existing.text}} \${${ternaryExpr}}\`}`;
                      } else {
                        const merged = existing.text ? `${existing.text} \${${ternaryExpr}}` : `\${${ternaryExpr}}`;
                        replacementText = `className={\`${merged}\`}`;
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
                        text: `className={${ternaryExpr}}`,
                      });
                    }
                  }
                }
              }
            } else if (funcName === 'css.match') {
              const discArg = expr.arguments[0];
              const casesArg = expr.arguments[1];
              if (discArg && casesArg && ts.isObjectLiteralExpression(casesArg)) {
                const caseEntries: { key: string; classes: string; rules: any[] }[] = [];
                let allStatic = true;

                for (const prop of casesArg.properties) {
                  if (ts.isPropertyAssignment(prop)) {
                    const key = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)
                      ? prop.name.text
                      : prop.name.getText(source);
                    const valRes = evalNode(prop.initializer, source, themeValues);
                    if (valRes.isStatic) {
                      const compiled = compileStyle(valRes.value);
                      caseEntries.push({ key, classes: compiled.classes.join(' '), rules: compiled.rules });
                    } else {
                      allStatic = false;
                      break;
                    }
                  } else {
                    allStatic = false;
                    break;
                  }
                }

                if (allStatic) {
                  caseEntries.forEach((entry) => {
                    entry.rules.forEach((r) => onCssRule(r.className, r.declaration, r.mediaQuery));
                  });

                  const mapObjectText = `{ ${caseEntries.map((e) => `${JSON.stringify(e.key)}: ${JSON.stringify(e.classes)}`).join(', ')} }`;
                  const discText = discArg.getText(source);
                  const lookupExpr = `(${mapObjectText})[${discText}]`;

                  const existing = findExistingClassAttr(node, source);
                  if (attrName === 'style') {
                    // Remove style={css.match(...)}
                    replacements.push({
                      start: node.getStart(source),
                      end: node.getEnd(),
                      text: '',
                    });

                    if (existing) {
                      let replacementText = '';
                      if (existing.isExpression) {
                        replacementText = `className={\`\${${existing.text}} \${${lookupExpr}}\`}`;
                      } else {
                        const merged = existing.text ? `${existing.text} \${${lookupExpr}}` : `\${${lookupExpr}}`;
                        replacementText = `className={\`${merged}\`}`;
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
                        text: `className={${lookupExpr}}`,
                      });
                    }
                  } else {
                    // Original was className={css.match(...)}
                    if (existing) {
                      // Remove original className={css.match(...)}
                      replacements.push({
                        start: node.getStart(source),
                        end: node.getEnd(),
                        text: '',
                      });

                      let replacementText = '';
                      if (existing.isExpression) {
                        replacementText = `className={\`\${${existing.text}} \${${lookupExpr}}\`}`;
                      } else {
                        const merged = existing.text ? `${existing.text} \${${lookupExpr}}` : `\${${lookupExpr}}`;
                        replacementText = `className={\`${merged}\`}`;
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
                        text: `className={${lookupExpr}}`,
                      });
                    }
                  }
                }
              }
            } else if (attrName === 'style' && funcName === 'css') {
              const arg = expr.arguments[0];
              if (arg) {
                const evalRes = evalNode(arg, source, themeValues);

                const hasDynamicProps = !!evalRes.dynamicProps && evalRes.dynamicProps.length > 0;
                const hasExtracted = !!evalRes.extractedVars && evalRes.extractedVars.length > 0;

                if (!hasDynamicProps && !hasExtracted) {
                  // Case 1: 100% Static
                  const compiled = compileStyle(evalRes.value);
                  compiled.rules.forEach((r) => onCssRule(r.className, r.declaration, r.mediaQuery));

                  const existing = findExistingClassAttr(node, source);
                  if (existing) {
                    replacements.push({
                      start: node.getStart(source),
                      end: node.getEnd(),
                      text: '',
                    });

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
                } else if (evalRes.value || hasExtracted) {
                  // Case 2: Partially Dynamic (or static with inline CSS variables)
                  const staticStyles = evalRes.value || {};
                  const compiled = compileStyle(staticStyles);
                  compiled.rules.forEach((r) => onCssRule(r.className, r.declaration, r.mediaQuery));

                  const dynamicPropsText = [
                    ...(evalRes.dynamicProps || []).map((prop) => prop.getText(source)),
                    ...(evalRes.extractedVars || []).map((v) => `${JSON.stringify(v.name)}: ${v.expr.getText(source)}`)
                  ].join(', ');

                  const existing = findExistingClassAttr(node, source);
                  const newClasses = compiled.classes.join(' ');

                  if (existing) {
                    replacements.push({
                      start: node.getStart(source),
                      end: node.getEnd(),
                      text: `style={{ ${dynamicPropsText} }}`,
                    });

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
                    const staticClassAttr = newClasses
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
      }
    }

    // 2. Check for css.define({...}) calls
    if (ts.isCallExpression(node) && node.expression.getText(source).trim() === 'css.define') {
      const arg = node.arguments[0];
      if (arg) {
        const evalRes = evalNode(arg, source, themeValues);
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
  const replacements = findCSSReplacements(source, fileName, onCssRule);

  if (replacements.length === 0) return sourceText;

  // Apply replacements in reverse order (to keep offsets valid)
  let output = sourceText;
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    output = `${output.slice(0, replacement.start)}${replacement.text}${output.slice(replacement.end)}`;
  }

  return output;
}
