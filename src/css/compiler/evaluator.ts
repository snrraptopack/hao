import ts from 'typescript';
import { color } from '../color';
import { child, descendant, sibling } from '../compose';
import { BREAKPOINTS } from './index';
import { flexProperties, gridProperties } from '../layout';

export interface EvaluatedNode {
  isStatic: boolean;
  value: any;
  dynamicProps?: ts.ObjectLiteralElementLike[];
  extractedVars?: { name: string; expr: ts.Expression }[];
}

export function cleanVarName(selector: string, prop: string): string {
  const cleanSel = selector
    .replace(/^&+/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const cleanProp = prop.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  return `--${cleanSel}-${cleanProp}`;
}

export function parseLength(val: any): { value: number; unit: string } {
  if (typeof val === 'number') return { value: val, unit: 'px' };
  const str = String(val);
  const match = str.match(/^([\d.-]+)([a-zA-Z%]*)$/);
  if (match) {
    return { value: parseFloat(match[1] || '0'), unit: match[2] || 'px' };
  }
  return { value: 0, unit: 'px' };
}

export function computeSpring(stiffness = 300, damping = 25, mass = 1): string {
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
export function evalNode(
  node: ts.Expression,
  source: ts.SourceFile,
  themeValues?: Map<string, any>,
  selectorContext?: string,
  localScope?: Map<string, any>
): EvaluatedNode {
  // Unwrap parenthesized expressions and type assertions
  if (ts.isParenthesizedExpression(node)) {
    return evalNode(node.expression, source, themeValues, selectorContext, localScope);
  }
  if (ts.isAsExpression(node)) {
    return evalNode(node.expression, source, themeValues, selectorContext, localScope);
  }
  if (ts.isTypeAssertionExpression(node)) {
    return evalNode(node.expression, source, themeValues, selectorContext, localScope);
  }

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
        let key: string;
        if (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) || ts.isNumericLiteral(prop.name)) {
          key = prop.name.text;
        } else if (ts.isComputedPropertyName(prop.name)) {
          const evalKey = evalNode(prop.name.expression, source, themeValues, selectorContext, localScope);
          if (evalKey.isStatic) {
            key = String(evalKey.value);
          } else {
            dynamicProps.push(prop);
            hasDynamic = true;
            continue;
          }
        } else {
          key = prop.name.getText(source);
        }

        const isNestedKey = key.startsWith(':') || key.startsWith('&') || key.startsWith('@');
        const nextContext = isNestedKey ? key : selectorContext;

        const valRes = evalNode(prop.initializer, source, themeValues, nextContext, localScope);

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
      } else if (ts.isSpreadAssignment(prop)) {
        const spreadRes = evalNode(prop.expression, source, themeValues, selectorContext, localScope);
        if (spreadRes.isStatic && spreadRes.value && typeof spreadRes.value === 'object') {
          Object.assign(staticObj, spreadRes.value);
          if (spreadRes.extractedVars) {
            extractedVars.push(...spreadRes.extractedVars);
          }
        } else {
          dynamicProps.push(prop);
          hasDynamic = true;
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
      const elemRes = evalNode(elem, source, themeValues, selectorContext, localScope);
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

  // 7. Property Access (theme.spacing.md or props.size)
  if (ts.isPropertyAccessExpression(node)) {
    const text = node.getText(source).trim();
    if (text === 'css.color.transparent' || text === 'color.transparent') {
      const c = color('rgba(0,0,0,0)');
      return { isStatic: true, value: { ...c, toString() { return 'transparent'; } } };
    }
    if (text === 'css.color.black' || text === 'color.black') {
      return { isStatic: true, value: color('#000000') };
    }
    if (text === 'css.color.white' || text === 'color.white') {
      return { isStatic: true, value: color('#ffffff') };
    }

    const objRes = evalNode(node.expression, source, themeValues, selectorContext, localScope);
    if (objRes.isStatic && objRes.value && typeof objRes.value === 'object') {
      const propName = node.name.text;
      if (propName in objRes.value) {
        return { isStatic: true, value: objRes.value[propName] };
      }
    }
  }

  // 8. Element Access (theme.colors.primary[500])
  if (ts.isElementAccessExpression(node)) {
    const objRes = evalNode(node.expression, source, themeValues, selectorContext, localScope);
    if (objRes.isStatic && objRes.value && typeof objRes.value === 'object') {
      const argRes = evalNode(node.argumentExpression, source, themeValues, selectorContext, localScope);
      if (argRes.isStatic) {
        const key = argRes.value;
        if (key !== null && key !== undefined && key in objRes.value) {
          return { isStatic: true, value: objRes.value[key] };
        }
      }
    }
  }

  // 9. Identifiers (e.g. theme, props)
  if (ts.isIdentifier(node)) {
    const text = node.text;
    if (localScope && localScope.has(text)) {
      return { isStatic: true, value: localScope.get(text) };
    }
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
        const callerRes = evalNode(callerNode, source, themeValues, selectorContext, localScope);
        if (callerRes.isStatic) {
          const baseLen = parseLength(callerRes.value);
          const argResults = node.arguments.map((arg) => evalNode(arg, source, themeValues, selectorContext, localScope));
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
      const callerRes = evalNode(callerNode, source, themeValues, selectorContext, localScope);
      if (callerRes.isStatic && callerRes.value && typeof callerRes.value === 'object') {
        const argResults = node.arguments.map((arg) => evalNode(arg, source, themeValues, selectorContext, localScope));
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
    const argResults = node.arguments.map((arg) => evalNode(arg, source, themeValues, selectorContext, localScope));
    const argsAllStatic = argResults.every((r) => r.isStatic);

    if (argsAllStatic) {
      const staticArgs = argResults.map((r) => r.value);

      // Branch evaluations
      if (funcName === 'css.match' || funcName === 'match') {
        const discriminator = staticArgs[0];
        const cases = staticArgs[1] || {};
        if (typeof cases === 'object' && cases !== null) {
          if (discriminator in cases) {
            return { isStatic: true, value: cases[discriminator] };
          }
          if ('default' in cases) {
            return { isStatic: true, value: cases['default'] };
          }
        }
        return { isStatic: true, value: {} };
      }

      if (funcName === 'css.when' || funcName === 'when') {
        const condition = !!staticArgs[0];
        const cases = staticArgs[1] || {};
        const lookupKey = String(condition);
        if (typeof cases === 'object' && cases !== null) {
          if (lookupKey in cases) {
            return { isStatic: true, value: cases[lookupKey] };
          }
          if ('default' in cases) {
            return { isStatic: true, value: cases['default'] };
          }
        }
        return { isStatic: true, value: {} };
      }

      // Merge & Extend evaluations
      if (funcName === 'css.merge' || funcName === 'merge' || funcName === 'css.extend' || funcName === 'extend') {
        const mergedObj: Record<string, any> = {};
        const extractedVars: EvaluatedNode['extractedVars'] = [];
        for (const argRes of argResults) {
          if (argRes.value && typeof argRes.value === 'object') {
            Object.assign(mergedObj, argRes.value);
            if (argRes.extractedVars) {
              extractedVars.push(...argRes.extractedVars);
            }
          }
        }
        return {
          isStatic: true,
          value: mergedObj,
          extractedVars: extractedVars.length > 0 ? extractedVars : undefined,
        };
      }

      // Unit conversions
      if (funcName === 'css.px' || funcName === 'px') return { isStatic: true, value: `${staticArgs[0]}px` };
      if (funcName === 'css.rem' || funcName === 'rem') return { isStatic: true, value: `${staticArgs[0]}rem` };
      if (funcName === 'css.em' || funcName === 'em') return { isStatic: true, value: `${staticArgs[0]}em` };
      if (funcName === 'css.vw' || funcName === 'vw') return { isStatic: true, value: `${staticArgs[0]}vw` };
      if (funcName === 'css.vh' || funcName === 'vh') return { isStatic: true, value: `${staticArgs[0]}vh` };
      if (funcName === 'css.ch' || funcName === 'ch') return { isStatic: true, value: `${staticArgs[0]}ch` };
      if (funcName === 'css.pct' || funcName === 'pct') return { isStatic: true, value: `${staticArgs[0]}%` };
      if (funcName === 'css.vmin' || funcName === 'vmin') return { isStatic: true, value: `${staticArgs[0]}vmin` };
      if (funcName === 'css.vmax' || funcName === 'vmax') return { isStatic: true, value: `${staticArgs[0]}vmax` };
      if (funcName === 'css.fr' || funcName === 'fr') return { isStatic: true, value: `${staticArgs[0]}fr` };
      if (funcName === 'css.zero' || funcName === 'zero') return { isStatic: true, value: '0' };
      if (funcName === 'css.clamp' || funcName === 'clamp') return { isStatic: true, value: `clamp(${staticArgs[0]}, ${staticArgs[1]}, ${staticArgs[2]})` };
      if (funcName === 'css.color' || funcName === 'color') return { isStatic: true, value: color(staticArgs[0]) };
      if (funcName === 'css.color.scale' || funcName === 'color.scale') return { isStatic: true, value: color.scale(staticArgs[0], staticArgs[1]) };
      if (funcName === 'css.color.group' || funcName === 'color.group') return { isStatic: true, value: color.group(staticArgs[0]) };
      if (funcName === 'css.color.palette' || funcName === 'color.palette') return { isStatic: true, value: color.palette(staticArgs[0]) };
      if (funcName === 'css.ms' || funcName === 'ms') return { isStatic: true, value: `${staticArgs[0]}ms` };
      if (funcName === 'css.s' || funcName === 's') return { isStatic: true, value: `${staticArgs[0]}s` };
      if (funcName === 'css.deg' || funcName === 'deg') return { isStatic: true, value: `${staticArgs[0]}deg` };
      if (funcName === 'css.rad' || funcName === 'rad') return { isStatic: true, value: `${staticArgs[0]}rad` };
      if (funcName === 'css.turn' || funcName === 'turn') return { isStatic: true, value: `${staticArgs[0]}turn` };

      // Design token & scale builders
      if (funcName === 'css.scale' || funcName === 'scale') {
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
      if (funcName === 'css.typeScale' || funcName === 'typeScale') {
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
      if (funcName === 'css.fontStack' || funcName === 'fontStack') {
        const fonts = staticArgs[0] || [];
        const stack = fonts.map((f: string) => f.includes(' ') ? `"${f}"` : f).join(', ');
        return { isStatic: true, value: stack };
      }
      if (funcName === 'css.elevation' || funcName === 'elevation') {
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
      if (funcName === 'css.spring' || funcName === 'spring') {
        const opts = staticArgs[0] || {};
        return { isStatic: true, value: computeSpring(opts.stiffness, opts.damping, opts.mass) };
      }
      if (funcName === 'css.tokens' || funcName === 'tokens') {
        return { isStatic: true, value: staticArgs[0] };
      }
      if (funcName === 'css.define' || funcName === 'define') {
        return { isStatic: true, value: staticArgs[0] };
      }
      if (funcName === 'css.border.none' || funcName === 'border.none') {
        return {
          isStatic: true,
          value: {
            _tag: 'Border',
            toString() { return 'none'; }
          }
        };
      }
      if (funcName === 'css.shadow' || funcName === 'shadow') {
        const opts = staticArgs[0] || {};
        const x = opts.x !== undefined ? String(opts.x) : '0px';
        const y = opts.y !== undefined ? String(opts.y) : '0px';
        const blur = opts.blur !== undefined ? String(opts.blur) : '0px';
        const spread = opts.spread !== undefined ? String(opts.spread) : '0px';
        const colorVal = opts.color !== undefined ? String(opts.color) : '';
        const inset = !!opts.inset;
        return {
          isStatic: true,
          value: {
            _tag: 'Shadow',
            toString() {
              const parts = [x, y, blur, spread, colorVal].filter(Boolean);
              if (inset) parts.unshift('inset');
              return parts.join(' ');
            }
          }
        };
      }
      if (funcName === 'css.transform' || funcName === 'transform') {
        const opts = staticArgs[0] || {};
        const functions: string[] = [];
        if (opts.translateX !== undefined) functions.push(`translateX(${String(opts.translateX)})`);
        if (opts.translateY !== undefined) functions.push(`translateY(${String(opts.translateY)})`);
        if (opts.translateZ !== undefined) functions.push(`translateZ(${String(opts.translateZ)})`);
        if (opts.scale !== undefined) functions.push(`scale(${opts.scale})`);
        if (opts.scaleX !== undefined) functions.push(`scaleX(${opts.scaleX})`);
        if (opts.scaleY !== undefined) functions.push(`scaleY(${opts.scaleY})`);
        if (opts.rotate !== undefined) {
          const r = typeof opts.rotate === 'number' ? `${opts.rotate}deg` : String(opts.rotate);
          functions.push(`rotate(${r})`);
        }
        if (opts.skewX !== undefined) {
          const s = typeof opts.skewX === 'number' ? `${opts.skewX}deg` : String(opts.skewX);
          functions.push(`skewX(${s})`);
        }
        if (opts.skewY !== undefined) {
          const s = typeof opts.skewY === 'number' ? `${opts.skewY}deg` : String(opts.skewY);
          functions.push(`skewY(${s})`);
        }
        return {
          isStatic: true,
          value: {
            _tag: 'Transform',
            toString() {
              return functions.length > 0 ? functions.join(' ') : 'none';
            }
          }
        };
      }
      if (funcName === 'css.transition' || funcName === 'transition') {
        const map = staticArgs[0] || {};
        const entries = Object.entries(map).map(([property, opts]: [string, any]) => {
          const duration = opts.duration;
          const easing = opts.easing;
          const delay = opts.delay;
          return { property, duration, easing, delay };
        });
        return {
          isStatic: true,
          value: {
            _tag: 'Transition',
            toString() {
              return entries
                .map((e) => {
                  const parts = [e.property, String(e.duration)];
                  if (e.easing) parts.push(String(e.easing));
                  if (e.delay) parts.push(String(e.delay));
                  return parts.join(' ');
                })
                .join(', ');
            }
          }
        };
      }
      if (funcName === 'css.ease' || funcName === 'ease') {
        const name = staticArgs[0];
        const map: Record<string, string> = {
          in:       'ease-in',
          out:      'ease-out',
          'in-out': 'ease-in-out',
          linear:   'linear',
          spring:   'cubic-bezier(0.34, 1.56, 0.64, 1)',
          bounce:   'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        };
        return { isStatic: true, value: map[name] ?? 'ease' };
      }
      if (funcName === 'css.gradient' || funcName === 'gradient') {
        const opts = staticArgs[0] || {};
        const angle = opts.angle;
        const stops = opts.stops || [];
        return {
          isStatic: true,
          value: {
            _tag: 'Gradient',
            toString() {
              const stopStr = stops
                .map(([c, pos]: [any, number]) => `${String(c)} ${pos}%`)
                .join(', ');
              return `linear-gradient(${angle}deg, ${stopStr})`;
            }
          }
        };
      }

      // Nesting selector helpers
      if (funcName === 'css.children' || funcName === 'children') return { isStatic: true, value: `& > ${staticArgs[0]}` };
      if (funcName === 'css.pseudo' || funcName === 'pseudo') return { isStatic: true, value: `&:${staticArgs[0]}` };
      if (funcName === 'css.child' || funcName === 'child') return { isStatic: true, value: child(staticArgs[0]) };
      if (funcName === 'css.descendant' || funcName === 'descendant') return { isStatic: true, value: descendant(staticArgs[0]) };
      if (funcName === 'css.sibling' || funcName === 'sibling') return { isStatic: true, value: sibling(staticArgs[0]) };

      // Responsive media range helpers
      if (funcName === 'css.above' || funcName === 'above') {
        const bp = staticArgs[0];
        const raw = BREAKPOINTS[bp] || bp;
        const match = raw.match(/^([\d.]+)([a-zA-Z%]+)$/);
        const val = match && match[1] !== undefined && match[2] !== undefined
          ? `${parseFloat(match[1])}${match[2]}`
          : bp;
        return { isStatic: true, value: `@media (min-width: ${val})` };
      }
      if (funcName === 'css.below' || funcName === 'below') {
        const bp = staticArgs[0];
        const raw = BREAKPOINTS[bp] || bp;
        const match = raw.match(/^([\d.]+)([a-zA-Z%]+)$/);
        if (match && match[1] !== undefined && match[2] !== undefined) {
          const unit = match[2];
          const val = parseFloat(match[1]);
          const sub = unit === 'px' ? 0.02 : 0.01;
          const maxVal = (val - sub).toFixed(3).replace(/\.?0+$/, '');
          return { isStatic: true, value: `@media (max-width: ${maxVal}${unit})` };
        }
        return { isStatic: true, value: `@media (max-width: ${bp})` };
      }
      if (funcName === 'css.matchBreakpoint' || funcName === 'matchBreakpoint') {
        const bp = staticArgs[0];
        const rawMin = BREAKPOINTS[bp] || bp;
        const matchMin = rawMin.match(/^([\d.]+)([a-zA-Z%]+)$/);
        const minVal = matchMin && matchMin[1] !== undefined && matchMin[2] !== undefined
          ? `${parseFloat(matchMin[1])}${matchMin[2]}`
          : bp;
        
        const keys = Object.keys(BREAKPOINTS);
        const idx = keys.indexOf(bp);
        if (idx !== -1 && idx < keys.length - 1) {
          const nextBp = keys[idx + 1];
          const rawMax = nextBp ? BREAKPOINTS[nextBp] : undefined;
          if (rawMax) {
            const matchMax = rawMax.match(/^([\d.]+)([a-zA-Z%]+)$/);
            if (matchMax && matchMax[1] !== undefined && matchMax[2] !== undefined) {
              const unit = matchMax[2];
              const val = parseFloat(matchMax[1]);
              const sub = unit === 'px' ? 0.02 : 0.01;
              const maxVal = (val - sub).toFixed(3).replace(/\.?0+$/, '');
              return { isStatic: true, value: `@media (min-width: ${minVal}) and (max-width: ${maxVal}${unit})` };
            }
          }
        }
        return { isStatic: true, value: `@media (min-width: ${minVal})` };
      }
      if (funcName === 'css.between' || funcName === 'between') {
        const minBp = staticArgs[0];
        const maxBp = staticArgs[1];
        
        const rawMin = BREAKPOINTS[minBp] || minBp;
        const matchMin = rawMin.match(/^([\d.]+)([a-zA-Z%]+)$/);
        const minStr = matchMin && matchMin[1] !== undefined && matchMin[2] !== undefined
          ? `${parseFloat(matchMin[1])}${matchMin[2]}`
          : minBp;

        const rawMax = BREAKPOINTS[maxBp] || maxBp;
        const matchMax = rawMax.match(/^([\d.]+)([a-zA-Z%]+)$/);
        if (matchMax && matchMax[1] !== undefined && matchMax[2] !== undefined) {
          const unit = matchMax[2];
          const val = parseFloat(matchMax[1]);
          const sub = unit === 'px' ? 0.02 : 0.01;
          const maxVal = (val - sub).toFixed(3).replace(/\.?0+$/, '');
          return { isStatic: true, value: `@media (min-width: ${minStr}) and (max-width: ${maxVal}${unit})` };
        }
        return { isStatic: true, value: `@media (min-width: ${minStr}) and (max-width: ${maxBp})` };
      }

      // Flex Layout Descriptor Mock
      if (funcName === 'css.flex' || funcName === 'flex') {
        const opts = staticArgs[0] || {};
        const props = flexProperties(opts);
        return {
          isStatic: true,
          value: {
            _tag: 'Flex',
            toProperties: () => props,
          },
        };
      }

      // Grid Layout Descriptor Mock
      if (funcName === 'css.grid' || funcName === 'grid') {
        const opts = staticArgs[0] || {};
        const props = gridProperties(opts);
        return {
          isStatic: true,
          value: {
            _tag: 'Grid',
            toProperties: () => props,
          },
        };
      }

      // Outline Mock
      if (funcName === 'css.outline' || funcName === 'outline') {
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
      if (funcName === 'css.border' || funcName === 'border') {
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
