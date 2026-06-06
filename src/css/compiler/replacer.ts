import ts from 'typescript';
import path from 'path';
import fs from 'fs';
import { compileStyle } from './index';
import { evalNode, cleanVarName } from './evaluator';
import { getThemeObject, resolveThemeFile } from './theme-resolver';

export interface CSSRuleCallback {
  (className: string, declaration: string, mediaQuery?: string): void;
}

export interface Replacement {
  start: number;
  end: number;
  text: string;
}

interface SiblingClassAttr {
  node: ts.JsxAttribute;
  isExpression: boolean;
  text: string;
}

function extractPropsDomain(typeNode: ts.TypeNode, source: ts.SourceFile): Record<string, any[]> {
  const domain: Record<string, any[]> = {};

  if (ts.isTypeLiteralNode(typeNode)) {
    for (const member of typeNode.members) {
      if (ts.isPropertySignature(member) && member.name) {
        const name = member.name.getText(source).trim();
        const vals: any[] = [];

        if (member.type) {
          const type = member.type;

          if (ts.isUnionTypeNode(type)) {
            for (const el of type.types) {
              if (ts.isLiteralTypeNode(el)) {
                if (ts.isStringLiteral(el.literal)) {
                  vals.push(el.literal.text);
                } else if (ts.isNumericLiteral(el.literal)) {
                  vals.push(Number(el.literal.text));
                } else if (el.literal.kind === ts.SyntaxKind.TrueKeyword) {
                  vals.push(true);
                } else if (el.literal.kind === ts.SyntaxKind.FalseKeyword) {
                  vals.push(false);
                }
              } else if (el.kind === ts.SyntaxKind.BooleanKeyword) {
                vals.push(true, false);
              }
            }
          } else if (ts.isLiteralTypeNode(type)) {
            if (ts.isStringLiteral(type.literal)) {
              vals.push(type.literal.text);
            } else if (ts.isNumericLiteral(type.literal)) {
              vals.push(Number(type.literal.text));
            } else if (type.literal.kind === ts.SyntaxKind.TrueKeyword) {
              vals.push(true);
            } else if (type.literal.kind === ts.SyntaxKind.FalseKeyword) {
              vals.push(false);
            }
          } else if (type.kind === ts.SyntaxKind.BooleanKeyword) {
            vals.push(true, false);
          }
        } else if (member.questionToken) {
          vals.push(true, false);
        }

        if (vals.length > 0) {
          domain[name] = Array.from(new Set(vals));
        }
      }
    }
  }

  return domain;
}

function getCartesianProduct(domains: Record<string, any[]>): Record<string, any>[] {
  const keys = Object.keys(domains);
  if (keys.length === 0) return [{}];

  let combos: Record<string, any>[] = [{}];

  for (const key of keys) {
    const nextCombos: Record<string, any>[] = [];
    const values = domains[key] || [];
    for (const combo of combos) {
      for (const val of values) {
        nextCombos.push({
          ...combo,
          [key]: val,
        });
      }
    }
    combos = nextCombos;
  }

  return combos;
}

function isElementGroupStyle(evaluatedValue: any): boolean {
  if (typeof evaluatedValue !== 'object' || evaluatedValue === null) return false;
  
  const keys = Object.keys(evaluatedValue);
  if (keys.length === 0) return false;

  return keys.every(key => {
    const val = evaluatedValue[key];
    return (
      typeof val === 'object' &&
      val !== null &&
      !('_tag' in val) &&
      !Array.isArray(val) &&
      !key.startsWith(':') &&
      !key.startsWith('&') &&
      !key.startsWith('@')
    );
  });
}

function findStyleFactoriesInImports(
  source: ts.SourceFile,
  fileName: string
): Set<string> {
  const factories = new Set<string>();
  const dir = path.dirname(fileName);

  for (const stmt of source.statements) {
    if (ts.isImportDeclaration(stmt) && stmt.importClause) {
      const moduleSpecifier = (stmt.moduleSpecifier as ts.StringLiteral).text;
      
      const resolvedPath = resolveThemeFile(dir, moduleSpecifier);
      if (resolvedPath) {
        try {
          const content = fs.readFileSync(resolvedPath, 'utf8');
          const importedSource = ts.createSourceFile(
            resolvedPath,
            content,
            ts.ScriptTarget.Latest,
            true,
            ts.ScriptKind.TSX
          );

          const exportedDefines = new Set<string>();
          for (const s of importedSource.statements) {
            if (ts.isVariableStatement(s)) {
              const isExported = s.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
              if (isExported) {
                for (const decl of s.declarationList.declarations) {
                  if (ts.isIdentifier(decl.name) && decl.initializer) {
                    let init = decl.initializer;
                    if (ts.isAsExpression(init)) {
                      init = init.expression;
                    }
                    if (ts.isCallExpression(init)) {
                      const initText = init.expression.getText(importedSource).trim();
                      if (initText === 'css.define' || initText === 'define') {
                        exportedDefines.add(decl.name.text);
                      }
                    }
                  }
                }
              }
            }
          }

          const clause = stmt.importClause;
          if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
            for (const element of clause.namedBindings.elements) {
              const localName = element.name.text;
              const propertyName = element.propertyName ? element.propertyName.text : localName;
              if (exportedDefines.has(propertyName)) {
                factories.add(localName);
              }
            }
          }
        } catch (e) {
          // Ignore resolution/read errors
        }
      }
    }
  }

  // Also check same-file definitions
  for (const s of source.statements) {
    if (ts.isVariableStatement(s)) {
      for (const decl of s.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.initializer) {
          let init = decl.initializer;
          if (ts.isAsExpression(init)) {
            init = init.expression;
          }
          if (ts.isCallExpression(init)) {
            const initText = init.expression.getText(source).trim();
            if (initText === 'css.define' || initText === 'define') {
              factories.add(decl.name.text);
            }
          }
        }
      }
    }
  }

  return factories;
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

/**
 * Searches the AST for css transformation opportunities and builds replacements.
 */
export function findCSSReplacements(
  source: ts.SourceFile,
  fileName: string,
  onCssRule: CSSRuleCallback
): Replacement[] {
  const replacements: Replacement[] = [];
  const themeValues = new Map<string, any>();
  const dir = path.dirname(fileName);

  // Register all imported and local css.define style factories
  const factories = findStyleFactoriesInImports(source, fileName);

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
    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name)) {
      const attrName = node.name.text;
      if (attrName === 'style' || attrName === 'className') {
        const init = node.initializer;
        if (init && ts.isJsxExpression(init) && init.expression) {
          const expr = init.expression;

          let isFactoryCall = false;
          if (ts.isCallExpression(expr)) {
            const baseExpr = expr.expression;
            if (ts.isIdentifier(baseExpr) && factories.has(baseExpr.text)) {
              isFactoryCall = true;
            } else if (ts.isPropertyAccessExpression(baseExpr)) {
              const baseObj = baseExpr.expression;
              if (ts.isIdentifier(baseObj) && factories.has(baseObj.text)) {
                isFactoryCall = true;
              }
            }
          }

          if (isFactoryCall) {
            const factoryExprText = expr.getText(source);
            if (attrName === 'style') {
              const existing = findExistingClassAttr(node, source);
              if (existing) {
                // Remove style={factory(...)}
                replacements.push({
                  start: node.getStart(source),
                  end: node.getEnd(),
                  text: '',
                });

                let replacementText = '';
                if (existing.isExpression) {
                  replacementText = `className={\`\${${existing.text}} \${${factoryExprText}}\`}`;
                } else {
                  const merged = existing.text ? `${existing.text} \${${factoryExprText}}` : `\${${factoryExprText}}`;
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
                  text: `className={${factoryExprText}}`,
                });
              }
            }
            // Skip processing children of this factory call
            return;
          }

          if (ts.isCallExpression(expr)) {
            const funcName = expr.expression.getText(source).trim();

            if (funcName === 'css.when' || funcName === 'when') {
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
                    if (existing) {
                      // Remove style={css.when(...)}
                      replacements.push({
                        start: node.getStart(source),
                        end: node.getEnd(),
                        text: '',
                      });

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
            } else if (funcName === 'css.match' || funcName === 'match') {
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
                    if (existing) {
                      // Remove style={css.match(...)}
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

    // 2. Check for css.define({...}) or define({...}) calls
    const nodeFuncName = ts.isCallExpression(node) ? node.expression.getText(source).trim() : '';
    if (ts.isCallExpression(node) && (nodeFuncName === 'css.define' || nodeFuncName === 'define')) {
      const arg = node.arguments[0];
      if (arg) {
        if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) {
          const param = arg.parameters[0];
          const paramName = param && ts.isIdentifier(param.name) ? param.name.text : 'props';
          const typeNode = param ? param.type : undefined;

          const domains = typeNode ? extractPropsDomain(typeNode, source) : {};
          const combos = getCartesianProduct(domains);

          let bodyExpr: ts.Expression | undefined;
          if (ts.isBlock(arg.body)) {
            for (const stmt of arg.body.statements) {
              if (ts.isReturnStatement(stmt) && stmt.expression) {
                bodyExpr = stmt.expression;
                break;
              }
            }
          } else {
            bodyExpr = arg.body;
          }

          if (bodyExpr) {
            const compiledCombos: { combo: Record<string, any>; value: any }[] = [];
            let allStatic = true;

            for (const combo of combos) {
              const localScope = new Map<string, any>();
              localScope.set(paramName, combo);
              const evalRes = evalNode(bodyExpr, source, themeValues, undefined, localScope);
              if (evalRes.isStatic) {
                compiledCombos.push({ combo, value: evalRes.value });
              } else {
                allStatic = false;
                break;
              }
            }

            if (allStatic && compiledCombos.length > 0) {
              const firstVal = compiledCombos[0]!.value;
              const isGroup = isElementGroupStyle(firstVal);
              const sortedKeys = Object.keys(domains).sort();

              if (isGroup) {
                const groupKeys = Object.keys(firstVal);
                const groupLookupMaps: Record<string, Record<string, string>> = {};
                for (const gk of groupKeys) {
                  groupLookupMaps[gk] = {};
                }

                for (const { combo, value } of compiledCombos) {
                  const comboKey = sortedKeys.map(k => `${k}=${combo[k]}`).join('|');
                  for (const gk of groupKeys) {
                    const groupStyle = value[gk] || {};
                    const compiled = compileStyle(groupStyle);
                    compiled.rules.forEach((r) => onCssRule(r.className, r.declaration, r.mediaQuery));
                    groupLookupMaps[gk]![comboKey] = compiled.classes.join(' ');
                  }
                }

                const propAccessExpr = sortedKeys.map(k => `"${k}=" + p.${k}`).join(' + "|" + ');
                const keyExpr = propAccessExpr ? propAccessExpr : '""';

                const groupPropsText = groupKeys.map(gk => {
                  const mapText = JSON.stringify(groupLookupMaps[gk], null, 2);
                  return `${gk}: (props: any) => {
                    const p = props || {};
                    const key = ${keyExpr};
                    return (${mapText})[key] || "";
                  }`;
                }).join(',\n');

                replacements.push({
                  start: node.getStart(source),
                  end: node.getEnd(),
                  text: `{\n${groupPropsText}\n}`,
                });
              } else {
                const lookupMap: Record<string, string> = {};
                for (const { combo, value } of compiledCombos) {
                  const comboKey = sortedKeys.map(k => `${k}=${combo[k]}`).join('|');
                  const compiled = compileStyle(value);
                  compiled.rules.forEach((r) => onCssRule(r.className, r.declaration, r.mediaQuery));
                  lookupMap[comboKey] = compiled.classes.join(' ');
                }

                const propAccessExpr = sortedKeys.map(k => `"${k}=" + p.${k}`).join(' + "|" + ');
                const keyExpr = propAccessExpr ? propAccessExpr : '""';
                const mapText = JSON.stringify(lookupMap, null, 2);

                replacements.push({
                  start: node.getStart(source),
                  end: node.getEnd(),
                  text: `(props: any) => {
                    const p = props || {};
                    const key = ${keyExpr};
                    return (${mapText})[key] || "";
                  }`,
                });
              }
            }
          }
        } else {
          // Static parameterless css.define
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
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
  return replacements;
}
