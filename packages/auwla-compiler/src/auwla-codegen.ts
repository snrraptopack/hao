// @ts-nocheck - Babel imports don't have type definitions
// Import @babel/generator in a way that's compatible with both ESM and CJS
// consumers (Vite's temp modules sometimes change default interop). We
// normalize to a `generate(...)` function below.
import * as _babelGenerator from '@babel/generator';

// Normalize the import so `generate` is a callable function regardless of
// ESM/CJS interop differences (Vite's temp modules sometimes wrap exports).
let generate: any = (_babelGenerator as any)?.default ?? _babelGenerator;
if (typeof generate !== 'function') {
  // Try common shapes
  if (generate && typeof generate.generate === 'function') {
    generate = generate.generate;
  } else if (generate && typeof generate.default === 'function') {
    generate = generate.default;
  } else {
    // Last resort: try require (may work in some Node contexts)
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const req = require('@babel/generator');
      generate = req && (req.default ?? req);
    } catch (e) {
      // If nothing works, leave generate as-is; callers will throw a clear error
    }
  }
}
import * as t from '@babel/types';
import { JSXNode, Directive, analyzeJSX } from './jsx-analyzer';
import { AuwlaFile, ComponentFunction } from './auwla-parser';

// Module-level storage for current parsed file context
let currentParsedFile: AuwlaFile | null = null;

/**
 * Check if an identifier is declared as a ref in the helpers
 */
function isRefIdentifier(name: string): boolean {
  if (!currentParsedFile) return false;
  
  // Check helpers for patterns like: const name = ref(...) or const name = ref<...>(...)
  for (const helper of currentParsedFile.helpers) {
    // Match: const/let/var identifier = ref(...)
    const refPattern = new RegExp(`(?:const|let|var)\\s+${name}\\s*=\\s*ref[<(]`);
    if (refPattern.test(helper)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Generate complete Auwla file from parsed structure
 * Handles multiple components: exported sub-components + default main component
 */
export function generateAuwlaFile(parsed: AuwlaFile): string {
  // Store parsed file in module scope for helper functions to access
  currentParsedFile = parsed;
  
  let code = '';
  
  // Find default component and exported components
  const defaultComponent = parsed.components.find(c => c.isDefault);
  const exportedComponents = parsed.components.filter(c => c.isExported && !c.isDefault);
  const regularComponents = parsed.components.filter(c => !c.isExported);
  
  if (!defaultComponent && parsed.components.length === 0) {
    throw new Error('No component found in file');
  }
  
  // Use first component as default if no explicit default
  const mainComponent = defaultComponent || regularComponents[0] || parsed.components[0];
  
  // Collect all JSX nodes to detect needed imports
  const allJsxNodes: JSXNode[] = [];
  for (const comp of parsed.components) {
    const jsxNodes = analyzeJSX(comp.body);
    allJsxNodes.push(...jsxNodes);
  }
  
  // Generate imports
  code += generateImports(parsed, allJsxNodes);
  code += '\n';
  
  // Add types
  if (parsed.types.length > 0) {
    code += parsed.types.join('\n\n') + '\n\n';
  }
  
  // Add helpers (state, functions, etc.)
  if (parsed.helpers.length > 0) {
    code += parsed.helpers.join('\n\n') + '\n\n';
  }
  
  // Generate exported sub-components
  for (const component of exportedComponents) {
    code += generateSubComponent(component);
    code += '\n\n';
  }
  
  // Generate main component
  code += generateMainComponent(mainComponent);
  
  return code;
}

/**
 * Generate imports based on what's used in the file
 */
function generateImports(parsed: AuwlaFile, allJsxNodes: JSXNode[]): string {
  let code = '';
  
  // Filter out auwla imports (we'll add our own)
  const filteredImports = parsed.imports.filter(imp => 
    !imp.includes("from 'auwla'") && 
    !imp.includes('from "auwla') &&
    !imp.includes("from 'auwla/template'") &&
    !imp.includes('from "auwla/template')
  );
  
  // Auwla imports
  const auwlaImports = ['Component'];
  const auwlaTypeImports: string[] = [];
  
  // Check if helpers use ref()
  const usesRef = parsed.helpers.some(h => h.includes('ref(') || h.includes('ref<'));
  if (usesRef) {
    auwlaImports.push('ref');
  }
  
  // Check if we need watch
  const needsWatch = allJsxNodes.some(node => hasConditional(node)) || 
                     parsed.helpers.some(h => h.includes('ref(') || h.includes('ref<'));
  if (needsWatch) {
    auwlaImports.push('watch');
  }
  
  // Add Ref type
  if (usesRef || needsWatch) {
    auwlaTypeImports.push('Ref');
  }
  
  // Check if we need Link
  const needsLink = hasLinkElements(allJsxNodes);
  if (needsLink) {
    auwlaImports.push('Link');
  }
  
  code += `import { ${auwlaImports.join(', ')} } from 'auwla'\n`;
  
  if (auwlaTypeImports.length > 0) {
    code += `import type { ${auwlaTypeImports.join(', ')} } from 'auwla'\n`;
  }
  
  // Add other imports
  if (filteredImports.length > 0) {
    code += filteredImports.join('\n') + '\n';
  }
  
  return code;
}

/**
 * Generate an exported sub-component
 */
function generateSubComponent(component: ComponentFunction): string {
  const { analyzeJSX } = require('./jsx-analyzer');
  
  // Extract variable declarations from the component body (before JSX return)
  const bodyHelpers: string[] = [];
  const bodyStatements = component.body.body || [];
  
  for (const stmt of bodyStatements) {
    // Skip the return statement (that's the JSX we'll compile)
    if (t.isReturnStatement(stmt)) continue;
    
    // Add variable declarations and other statements
    if (t.isVariableDeclaration(stmt) || t.isExpressionStatement(stmt)) {
      const stmtCode = generate(stmt as any).code;
      bodyHelpers.push(stmtCode);
    }
  }
  
  const jsxNodes = analyzeJSX(component.body);
  
  // Extract props parameter with full type annotation
  let propsParam = '';
  if (component.params && component.params.length > 0) {
    const param = component.params[0];
    const paramName = t.isIdentifier(param) ? param.name : generate(param as any).code;
    
    // Check if parameter has type annotation
    if (t.isIdentifier(param) && param.typeAnnotation) {
      const typeAnnotation = generate(param.typeAnnotation.typeAnnotation as any).code;
      propsParam = `${paramName}: ${typeAnnotation}`;
    } else {
      propsParam = generate(param as any).code;
    }
  }
  
  let code = `export function ${component.name}(${propsParam}) {\n`;
  
  // Add component-local helpers (variables defined inside the component)
  if (bodyHelpers.length > 0) {
    code += bodyHelpers.map(h => `  ${h}`).join('\n') + '\n';
  }
  
  code += `  return Component((ui) => {\n`;
  
  for (const node of jsxNodes) {
    code += generateNode(node, 2);
  }
  
  code += `  })\n`;
  code += `}`;
  
  return code;
}

/**
 * Generate the main (default export) component
 */
function generateMainComponent(component: ComponentFunction): string {
  const jsxNodes = analyzeJSX(component.body);
  let code = `export default Component((ui) => {\n`;
  
  for (const node of jsxNodes) {
    code += generateNode(node, 1);
  }
  
  code += '})\n';
  
  return code;
}

/**
 * DEPRECATED: Old single-component generator
 * Use generateAuwlaFile instead
 */
export function generateComponent(
  componentName: string,
  jsxNodes: JSXNode[],
  imports: string[],
  helpers: string[],
  types: string[]
): string {
  let code = '';
  
  // Add imports (filter out auwla imports as we'll add our own)
  const filteredImports = imports.filter(imp => 
    !imp.includes("from 'auwla'") && 
    !imp.includes('from "auwla') &&
    !imp.includes("from 'auwla/template'") &&
    !imp.includes('from "auwla/template')
  );
  
  // Add Auwla imports
  const auwlaImports = ['Component'];
  const auwlaTypeImports: string[] = [];
  
  // Check if helpers use ref()
  const usesRef = helpers.some(h => h.includes('ref(') || h.includes('ref<'));
  if (usesRef) {
    auwlaImports.push('ref');
  }
  
  // Check if we need watch (always add if we have conditionals or reactive expressions)
  const needsWatch = jsxNodes.some(node => hasConditional(node)) || 
                     helpers.some(h => h.includes('ref(') || h.includes('ref<'));
  if (needsWatch) {
    auwlaImports.push('watch');
  }
  
  // Add Ref type for type assertions (as type import)
  if (usesRef || needsWatch) {
    auwlaTypeImports.push('Ref');
  }
  
  // Check if we need Link (for <a> tags)
  const needsLink = hasLinkElements(jsxNodes);
  if (needsLink) {
    auwlaImports.push('Link');
  }
  
  code += `import { ${auwlaImports.join(', ')} } from 'auwla'\n`;
  
  if (auwlaTypeImports.length > 0) {
    code += `import type { ${auwlaTypeImports.join(', ')} } from 'auwla'\n`;
  }
  
  // Add other imports (but skip auwla/template since those are compile-time only)
  if (filteredImports.length > 0) {
    code += filteredImports.join('\n') + '\n';
  }
  
  code += '\n';
  
  // Add types
  if (types.length > 0) {
    code += types.join('\n\n') + '\n\n';
  }
  
  // Add helpers (state, functions, etc.)
  if (helpers.length > 0) {
    code += helpers.join('\n\n') + '\n\n';
  }
  
  // Generate component
  code += `export default Component((ui) => {\n`;
  
  for (const node of jsxNodes) {
    code += generateNode(node, 1);
  }
  
  code += '})\n';
  
  return code;
}

/**
 * Check if JSX tree has conditionals
 */
function hasConditional(node: JSXNode): boolean {
  if (node.directives?.some(d => d.type === 'if')) {
    return true;
  }
  if (node.children) {
    return node.children.some(child => hasConditional(child));
  }
  return false;
}

/**
 * Check if JSX tree has <a> tags (Link components)
 */
function hasLinkElements(nodes: JSXNode[]): boolean {
  for (const node of nodes) {
    if (node.type === 'element' && node.tag === 'a' && 
        node.props && node.props.some((p: any) => p.name === 'href')) {
      return true;
    }
    if (node.children && hasLinkElements(node.children)) {
      return true;
    }
  }
  return false;
}

/**
 * Generate code for a single JSX node
 */
function generateNode(node: JSXNode, indent: number): string {
  const spaces = '  '.repeat(indent);
  
  if (node.type === 'text') {
    // Static text
    return `${spaces}ui.Text({ value: "${node.text}" })\n`;
  }
  
  if (node.type === 'expression') {
    // Check if it's a control flow expression ($if, $each, or .map())
    if ((node as any).isControlFlow) {
      const controlFlowType = (node as any).controlFlowType;
      
      if (controlFlowType === 'if') {
        return generateIfExpression(node.expression, indent);
      }
      
      if (controlFlowType === 'each') {
        return generateEachExpression(node.expression, indent);
      }
      
      if (controlFlowType === 'map') {
        return generateMapExpression(node.expression, indent);
      }
    }
    
    // Dynamic expression {someValue}
    const expr = generate(node.expression as any).code;
    return `${spaces}ui.Text({ value: () => String(${expr}) })\n`;
  }
  
  if (node.type === 'element') {
    return generateElement(node, indent);
  }
  
  return '';
}

/**
 * Generate $if(condition, () => <jsx>, () => <jsx>) expression
 * 
 * API Design Options:
 * 1. Third arg with .Else() chain - cleaner for if-else pattern
 *    $if(ref.value, () => <a>, () => <b>) -> ui.When(ref, ...).Else(...)
 * 
 * 2. Negated conditions with watch wrapper
 *    $if(!ref.value, () => <a>) -> ui.When(watch([ref], () => !ref.value), ...)
 * 
 * Strategy: If third arg exists, use .Else() chain. Otherwise handle negation.
 */
function generateIfExpression(callExpr: any, indent: number): string {
  const spaces = '  '.repeat(indent);
  
  if (!t.isCallExpression(callExpr) || callExpr.arguments.length < 2) {
    return '';
  }
  
  // First argument: condition
  const conditionArg = callExpr.arguments[0];
  const conditionCode = generate(conditionArg as any).code;
  
  // Check if the condition is accessing .value (e.g., todo.isEditing.value)
  // If so, we should pass just the ref (todo.isEditing) to When()
  let conditionForWhen = conditionCode;
  let isSimpleRefAccess = false;
  
  if (t.isMemberExpression(conditionArg) && 
      t.isIdentifier(conditionArg.property) && 
      conditionArg.property.name === 'value') {
    // Extract the ref before .value
    // e.g., todo.isEditing.value -> todo.isEditing
    conditionForWhen = generate(conditionArg.object).code;
    isSimpleRefAccess = true;
  } else if (t.isUnaryExpression(conditionArg) && conditionArg.operator === '!') {
    // Handle negation: !ref.value
    const argument = conditionArg.argument;
    if (t.isMemberExpression(argument) && 
        t.isIdentifier(argument.property) && 
        argument.property.name === 'value') {
      // !todo.isEditing.value -> wrap in watch
      const refCode = generate(argument.object).code;
      conditionForWhen = `watch([${refCode}], () => !${refCode}.value) as Ref<boolean>`;
    } else {
      // Complex negation
      const refs = extractRefsFromExpression(conditionArg);
      if (refs.length > 0) {
        conditionForWhen = `watch([${refs.join(', ')}], () => ${conditionCode}) as Ref<boolean>`;
      }
    }
  } else {
    // Complex expression, wrap in watch
    const refs = extractRefsFromExpression(conditionArg);
    if (refs.length > 0) {
      conditionForWhen = `watch([${refs.join(', ')}], () => ${conditionCode}) as Ref<boolean>`;
    }
  }
  
  // Second argument: then callback () => <jsx>
  const thenFn = callExpr.arguments[1];
  
  // Third argument (optional): else callback () => <jsx>
  const elseFn = callExpr.arguments[2];
  
  let code = '';
  code += `${spaces}ui.When(${conditionForWhen}, (ui) => {\n`;
  
  // Parse the JSX from the then function body
  if (t.isArrowFunctionExpression(thenFn) || t.isFunctionExpression(thenFn)) {
    const body = thenFn.body;
    
    if (t.isJSXElement(body)) {
      const jsxNode = analyzeJSXElementSimple(body);
      code += generateNode(jsxNode, indent + 1);
    } else if (t.isBlockStatement(body)) {
      for (const stmt of body.body) {
        if (t.isReturnStatement(stmt) && stmt.argument && t.isJSXElement(stmt.argument)) {
          const jsxNode = analyzeJSXElementSimple(stmt.argument);
          code += generateNode(jsxNode, indent + 1);
        }
      }
    }
  }
  
  code += `${spaces}})`; 
  
  // Handle else clause if present
  if (elseFn && (t.isArrowFunctionExpression(elseFn) || t.isFunctionExpression(elseFn))) {
    code += `.Else((ui) => {\n`;
    
    const body = elseFn.body;
    
    if (t.isJSXElement(body)) {
      const jsxNode = analyzeJSXElementSimple(body);
      code += generateNode(jsxNode, indent + 1);
    } else if (t.isBlockStatement(body)) {
      for (const stmt of body.body) {
        if (t.isReturnStatement(stmt) && stmt.argument && t.isJSXElement(stmt.argument)) {
          const jsxNode = analyzeJSXElementSimple(stmt.argument);
          code += generateNode(jsxNode, indent + 1);
        }
      }
    }
    
    code += `${spaces}})`;
  }
  
  code += `\n`;
  return code;
}

/**
 * Generate $each(items, (item) => <jsx>) expression
 */
function generateEachExpression(callExpr: any, indent: number): string {
  const spaces = '  '.repeat(indent);
  
  if (!t.isCallExpression(callExpr) || callExpr.arguments.length < 2) {
    return '';
  }
  
  // First argument: items array (could be ref.value, ref, or static array)
  const itemsArg = callExpr.arguments[0];
  let itemsExpr = generate(itemsArg as any).code;
  
  // Check if this is a reactive ref or static array
  // - If it has .value → it's a ref being accessed, strip .value
  // - If it's a simple identifier → check if it's declared with ref()
  // - If it's an array literal [...] → ERROR: can't use static array in $each
  let isReactiveRef = false;
  let identifierName = '';
  
  if (itemsExpr.endsWith('.value')) {
    // Strip .value for ui.List (it expects the ref itself)
    itemsExpr = itemsExpr.replace(/\.value$/, '');
    isReactiveRef = true;
  } else if (t.isIdentifier(itemsArg)) {
    // Simple identifier - check if it's a ref
    identifierName = itemsArg.name;
    isReactiveRef = isRefIdentifier(identifierName);
    
    if (!isReactiveRef) {
      throw new Error(
        `$each() requires a reactive ref. The variable '${identifierName}' is not declared with ref(). ` +
        `Change to: const ${identifierName} = ref([...]) to make it reactive.`
      );
    }
  } else if (t.isArrayExpression(itemsArg)) {
    // Static array literal - this won't work with ui.List
    throw new Error(
      `$each() requires a reactive ref, not a static array literal. ` +
      `Declare the array with ref([...]) to make it reactive, or use a regular map outside of JSX.`
    );
  }
  
  // Second argument: (item) => <jsx>
  const renderFn = callExpr.arguments[1];
  
  let itemParam = 'item';
  let keyExpr = 'item.id';
  
  if (t.isArrowFunctionExpression(renderFn) || t.isFunctionExpression(renderFn)) {
    // Get parameter name
    if (renderFn.params.length > 0 && t.isIdentifier(renderFn.params[0])) {
      itemParam = renderFn.params[0].name;
    }
    
    const body = renderFn.body;
    let jsxElement: any = null;
    
    if (t.isJSXElement(body)) {
      jsxElement = body;
    } else if (t.isBlockStatement(body)) {
      for (const stmt of body.body) {
        if (t.isReturnStatement(stmt) && stmt.argument && t.isJSXElement(stmt.argument)) {
          jsxElement = stmt.argument;
          break;
        }
      }
    }
    
    if (jsxElement) {
      // Check for key prop
      const openingElement = jsxElement.openingElement;
      const keyAttr = openingElement.attributes.find((attr: any) => 
        t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name) && attr.name.name === 'key'
      );
      
      if (keyAttr && t.isJSXAttribute(keyAttr) && keyAttr.value) {
        if (t.isJSXExpressionContainer(keyAttr.value)) {
          keyExpr = generate(keyAttr.value.expression as any).code;
        }
      }
      
      // Generate the JSX element
      const jsxNode = analyzeJSXElementSimple(jsxElement);
      
      // $each() always compiles to ui.List() for reactive rendering
      // The array MUST be a ref, otherwise ui.List will error at runtime
      let code = '';
      code += `${spaces}ui.List({\n`;
      code += `${spaces}  items: ${itemsExpr},\n`;
      code += `${spaces}  key: (${itemParam}) => ${keyExpr},\n`;
      code += `${spaces}  render: (${itemParam}, index, ui) => {\n`;
      code += generateNode(jsxNode, indent + 2);
      code += `${spaces}  }\n`;
      code += `${spaces}})\n`;
      
      return code;
    }
  }
  
  return '';
}

/**
 * Generate code for .map() expression (non-reactive iteration)
 * Example: items.map(item => <Component {...} />)
 */
function generateMapExpression(callExpr: any, indent: number): string {
  const spaces = '  '.repeat(indent);
  
  if (!t.isCallExpression(callExpr) || callExpr.arguments.length < 1) {
    return '';
  }
  
  // Get the array expression (e.g., "items" from "items.map(...)")
  const arrayExpr = t.isMemberExpression(callExpr.callee) 
    ? generate(callExpr.callee.object as any).code 
    : '';
  
  // First argument: (item) => <jsx>
  const renderFn = callExpr.arguments[0];
  
  let itemParam = 'item';
  
  if (t.isArrowFunctionExpression(renderFn) || t.isFunctionExpression(renderFn)) {
    // Get parameter name
    if (renderFn.params.length > 0 && t.isIdentifier(renderFn.params[0])) {
      itemParam = renderFn.params[0].name;
    }
    
    const body = renderFn.body;
    let jsxElement: any = null;
    
    if (t.isJSXElement(body)) {
      jsxElement = body;
    } else if (t.isBlockStatement(body)) {
      for (const stmt of body.body) {
        if (t.isReturnStatement(stmt) && stmt.argument && t.isJSXElement(stmt.argument)) {
          jsxElement = stmt.argument;
          break;
        }
      }
    } else if (t.isParenthesizedExpression(body) && t.isJSXElement(body.expression)) {
      jsxElement = body.expression;
    }
    
    if (jsxElement) {
      // Generate the JSX element
      const jsxNode = analyzeJSXElementSimple(jsxElement);
      
      // .map() is for static arrays - use simple forEach loop
      let code = '';
      code += `${spaces}${arrayExpr}.forEach((${itemParam}, index) => {\n`;
      code += generateNode(jsxNode, indent + 1);
      code += `${spaces}})\n`;
      
      return code;
    }
  }
  
  return '';
}

/**
 * Simple JSX element analyzer (without full traversal)
 */
function analyzeJSXElementSimple(element: any): JSXNode {
  // Create a temp function body to analyze
  const tempBody: any = {
    type: 'BlockStatement',
    body: [{
      type: 'ReturnStatement',
      argument: element
    }]
  };
  
  const analyzed = analyzeJSX(tempBody);
  return analyzed[0] || { type: 'element', tag: 'div', children: [] };
}

/**
 * Check if tag name is PascalCase (custom component)
 */
function isPascalCase(name: string): boolean {
  return /^[A-Z]/.test(name);
}

/**
 * Generate code for an element (regular elements only, control flow handled in generateNode)
 */
function generateElement(node: JSXNode, indent: number): string {
  // Special case: <a> tags with href should compile to Link component
  if (node.tag === 'a' && node.props && node.props.some((p: any) => p.name === 'href')) {
    return generateLinkComponent(node, indent);
  }
  
  // Special case: PascalCase components (custom components)
  if (node.tag && isPascalCase(node.tag)) {
    return generateCustomComponent(node, indent);
  }
  
  return generateElementBody(node, indent);
}

/**
 * Generate custom component usage: <Card prop={value} /> → ui.append(Card({ prop: value }))
 */
function generateCustomComponent(node: JSXNode, indent: number): string {
  const spaces = '  '.repeat(indent);
  const componentName = node.tag;
  
  // Build props object
  const propsParts: string[] = [];
  
  if (node.props) {
    for (const prop of node.props) {
      if (prop.isSpread) continue;
      
      const propName = prop.name;
      
      // Skip event handler props - they'll be handled separately
      if (propName.startsWith('on') && propName.length > 2) {
        continue;
      }
      
      let propValue: string;
      
      if (!prop.value) {
        // Boolean prop
        propValue = 'true';
      } else if (t.isStringLiteral(prop.value)) {
        propValue = `"${prop.value.value}"`;
      } else if (t.isJSXExpressionContainer(prop.value)) {
        propValue = generate(prop.value.expression as any).code;
      } else {
        propValue = generate(prop.value as any).code;
      }
      
      propsParts.push(`${propName}: ${propValue}`);
    }
  }
  
  // Handle event handler props (onClick, onInput, etc.)
  if (node.props) {
    for (const prop of node.props) {
      if (prop.isSpread) continue;
      
      if (prop.name.startsWith('on') && prop.name.length > 2) {
        // Convert onClick -> onClick (keep as-is for component props)
        const eventPropName = prop.name;
        
        if (prop.value && t.isJSXExpressionContainer(prop.value)) {
          const handlerCode = generate(prop.value.expression as any).code;
          propsParts.push(`${eventPropName}: ${handlerCode}`);
        }
      }
    }
  }
  
  // Handle directives (event handlers from JSX analyzer)
  if (node.directives) {
    for (const directive of node.directives) {
      // Convert directive back to prop name (click -> onClick)
      const propName = `on${directive.name.charAt(0).toUpperCase() + directive.name.slice(1)}`;
      const handlerCode = generate(directive.value as any).code;
      propsParts.push(`${propName}: ${handlerCode}`);
    }
  }
  
  const propsStr = propsParts.length > 0 ? `{ ${propsParts.join(', ')} }` : '{}';
  
  return `${spaces}ui.append(${componentName}(${propsStr}))\n`;
}

/**
 * Generate Link component for <a href="/path">text</a>
 * Compiles to: ui.append(Link({ to: '/path', text: 'text', className: '...' }))
 */
function generateLinkComponent(node: JSXNode, indent: number): string {
  const spaces = '  '.repeat(indent);
  
  // Extract href from props array
  const hrefProp = node.props?.find((p: any) => p.name === 'href');
  if (!hrefProp) return '';
  
  const to = typeof hrefProp.value === 'string' 
    ? `'${hrefProp.value}'` 
    : generate(hrefProp.value as any).code;
  
  // Extract text from children
  let text = '';
  if (node.children && node.children.length > 0) {
    const firstChild = node.children[0];
    if (firstChild.type === 'text') {
      text = `'${firstChild.text?.trim()}'`;
    } else if (firstChild.type === 'expression') {
      text = generate(firstChild.expression as any).code;
    }
  }
  
  // Extract className from props array (could be 'class' or 'className')
  const classNameProp = node.props?.find((p: any) => p.name === 'class' || p.name === 'className');
  const classNameStr = classNameProp
    ? typeof classNameProp.value === 'string' 
      ? `className: '${classNameProp.value}'`
      : `className: ${generate(classNameProp.value as any).code}`
    : '';
  
  // Build Link config
  const config = [
    `to: ${to}`,
    text ? `text: ${text}` : '',
    classNameStr
  ].filter(Boolean).join(', ');
  
  return `${spaces}ui.append(Link({ ${config} }))\n`;
}

/**
 * Generate the element body (config + children)
 */
function generateElementBody(node: JSXNode, indent: number): string {
  const spaces = '  '.repeat(indent);
  let code = '';
  
  if (!node.tag) return code;
  
  // Capitalize tag name (div -> Div)
  const tagName = node.tag.charAt(0).toUpperCase() + node.tag.slice(1);
  
  // Check if this is a text-only element (optimization)
  const hasChildren = node.children && node.children.length > 0;
  
  // Check if all children are text/expressions (can be combined into text prop)
  // But exclude control flow expressions - they need their own structure
  const isTextOnly = hasChildren && node.children!.every(child => 
    (child.type === 'text' || child.type === 'expression') && !(child as any).isControlFlow
  );
  
  if (isTextOnly && node.children!.length > 0) {
    // Element with only text/expressions - combine into single text prop
    const configWithText = buildConfigObjectWithMultipleText(node, node.children!);
    code += `${spaces}ui.${tagName}(${configWithText})\n`;
  } else {
    // Build config object
    const config = buildConfigObject(node);
    
    if (hasChildren) {
      // Element with children: ui.Div({ ... }, (ui) => { ... })
      code += `${spaces}ui.${tagName}(${config}, (ui) => {\n`;
      
      // Generate children
      if (node.children) {
        for (const child of node.children) {
          code += generateNode(child, indent + 1);
        }
      }
      
      code += `${spaces}})\n`;
    } else {
      // Element without children: ui.Div({ ... })
      code += `${spaces}ui.${tagName}(${config})\n`;
    }
  }
  
  return code;
}

/**
 * Build config object: { className: "...", on: { click: handler }, value: ref }
 */
function buildConfigObject(node: JSXNode): string {
  return buildConfigObjectInternal(node, null);
}

/**
 * Build config object with text content
 */
function buildConfigObjectWithText(node: JSXNode, textChildren: JSXNode[]): string {
  return buildConfigObjectInternal(node, textChildren);
}

/**
 * Build config object with multiple text/expression children
 */
function buildConfigObjectWithMultipleText(node: JSXNode, textChildren: JSXNode[]): string {
  return buildConfigObjectInternal(node, textChildren);
}

/**
 * Build config object implementation
 */
function buildConfigObjectInternal(node: JSXNode, textChildren: JSXNode[] | null): string {
  const configParts: string[] = [];
  
  // Add text content if provided
  if (textChildren && textChildren.length > 0) {
    if (textChildren.length === 1) {
      // Single text/expression child
      const child = textChildren[0];
      
      if (child.type === 'text') {
        // Static text
        configParts.push(`text: "${child.text || ''}"`);
      } else if (child.type === 'expression') {
        // Dynamic expression
        const exprCode = generate(child.expression as any).code;
        
        // Check if it's reactive (contains .value)
        if (exprCode.includes('.value')) {
          const refs = extractRefsFromExpression(child.expression);
          if (refs.length > 0) {
            // Wrap in watch for reactivity
            configParts.push(`text: watch([${refs.join(', ')}], () => String(${exprCode})) as Ref<string>`);
          } else {
            configParts.push(`text: () => String(${exprCode})`);
          }
        } else {
          // Not reactive
          configParts.push(`text: String(${exprCode})`);
        }
      }
    } else {
      // Multiple text/expression children - concatenate them
      const parts: string[] = [];
      const allRefs: string[] = [];
      
      for (const child of textChildren) {
        if (child.type === 'text') {
          parts.push(`"${child.text || ''}"`);
        } else if (child.type === 'expression') {
          const exprCode = generate(child.expression as any).code;
          parts.push(`String(${exprCode})`);
          
          // Collect refs for watch
          if (exprCode.includes('.value')) {
            const refs = extractRefsFromExpression(child.expression);
            refs.forEach(ref => {
              if (!allRefs.includes(ref)) {
                allRefs.push(ref);
              }
            });
          }
        }
      }
      
      const concatenated = parts.join(' + ');
      
      if (allRefs.length > 0) {
        // Has reactive refs - wrap in watch
        configParts.push(`text: watch([${allRefs.join(', ')}], () => ${concatenated}) as Ref<string>`);
      } else {
        // All static
        configParts.push(`text: ${concatenated}`);
      }
    }
  }
  
  // Add regular props (except special ones handled by directives)
  if (node.props) {
    for (const prop of node.props) {
      if (prop.isSpread) continue;
      
      // Convert 'class' to 'className'
      const propName = prop.name === 'class' ? 'className' : prop.name;
      
      // Skip event handler props - they'll be handled separately
      if (propName.startsWith('on') && propName.length > 2) {
        continue;
      }
      
      let propValue: string;
      
      if (!prop.value) {
        // Boolean prop
        propValue = 'true';
      } else if (t.isStringLiteral(prop.value)) {
        propValue = `"${prop.value.value}"`;
      } else if (t.isJSXExpressionContainer(prop.value)) {
        const exprCode = generate(prop.value.expression as any).code;
        
        // For className, style, and other reactive props that accept Ref<string>
        // We need to wrap in watch() to create a reactive ref
        if (['className', 'style'].includes(propName)) {
          // Check if expression contains property access or conditionals (might be reactive)
          if (t.isConditionalExpression(prop.value.expression) || 
              t.isLogicalExpression(prop.value.expression) ||
              exprCode.includes('.')) {
            // Extract any refs from the expression
            const refs = extractRefsFromExpression(prop.value.expression);
            if (refs.length > 0) {
              // Wrap in watch to create a Ref<string>
              propValue = `watch([${refs.join(', ')}], () => ${exprCode}) as Ref<string>`;
            } else {
              // No refs detected, but might still be reactive (e.g., parameter in render function)
              // For parameters like 'todo' in render functions, we need to pass them as dependencies
              // Extract identifiers from the expression
              const identifiers = extractIdentifiersFromExpression(prop.value.expression);
              if (identifiers.length > 0) {
                propValue = `watch([${identifiers.join(', ')}], () => ${exprCode}) as Ref<string>`;
              } else {
                propValue = exprCode;
              }
            }
          } else {
            propValue = exprCode;
          }
        } else {
          propValue = exprCode;
        }
      } else {
        propValue = generate(prop.value as any).code;
      }
      
      configParts.push(`${propName}: ${propValue}`);
    }
  }
  
  // Add event handlers: on: { click: handler, input: handler2 }
  const eventHandlers: string[] = [];
  
  // Handle event handler props (onClick, onInput, etc.)
  if (node.props) {
    for (const prop of node.props) {
      if (prop.isSpread) continue;
      
      if (prop.name.startsWith('on') && prop.name.length > 2) {
        // Convert onClick -> click, onInput -> input, etc.
        const eventName = prop.name.charAt(2).toLowerCase() + prop.name.slice(3);
        
        if (prop.value && t.isJSXExpressionContainer(prop.value)) {
          const handlerCode = generate(prop.value.expression as any).code;
          
          // If the handler is already a function expression, use it directly
          // Otherwise, wrap it as (e) => handler()
          let finalHandler: string;
          if (t.isArrowFunctionExpression(prop.value.expression) || 
              t.isFunctionExpression(prop.value.expression)) {
            finalHandler = handlerCode;
          } else {
            finalHandler = `(e) => ${handlerCode}()`;
          }
          
          eventHandlers.push(`${eventName}: ${finalHandler}`);
        }
      }
    }
  }
  
  // Handle event directives (legacy support)
  if (node.directives) {
    for (const directive of node.directives) {
      // Only handle event directives (not if, each, key)
      if (directive.type === 'click' && !['if', 'each', 'key'].includes(directive.name)) {
        const handler = generate(directive.value as any).code;
        
        // If the handler is already a function expression, use it directly
        // Otherwise, wrap it as (e) => handler()
        let finalHandler: string;
        if (t.isArrowFunctionExpression(directive.value) || 
            t.isFunctionExpression(directive.value)) {
          finalHandler = handler;
        } else {
          finalHandler = `(e) => ${handler}()`;
        }
        
        eventHandlers.push(`${directive.name}: ${finalHandler}`);
      }
    }
  }
  
  if (eventHandlers.length > 0) {
    configParts.push(`on: { ${eventHandlers.join(', ')} }`);
  }
  
  // Add bindings (value, checked, disabled, etc.)
  if (node.directives) {
    for (const directive of node.directives) {
      if (directive.type === 'bind') {
        const value = generate(directive.value as any).code;
        configParts.push(`${directive.name}: ${value}`);
      }
    }
  }
  
  if (configParts.length === 0) {
    return '{}';
  }
  
  // If only one config item and it's short, inline it
  if (configParts.length === 1 && configParts[0].length < 40) {
    return `{ ${configParts[0]} }`;
  }
  
  return `{ ${configParts.join(', ')} }`;
}

/**
 * Extract ref identifiers from expression for watch()
 */
function extractRefsFromExpression(expr: any): string[] {
  const refs = new Set<string>();
  
  function traverse(node: any) {
    if (!node) return;
    
    if (t.isMemberExpression(node)) {
      // Check if this member expression is accessing .value (indicates the parent is a ref)
      if (t.isIdentifier(node.property) && node.property.name === 'value') {
        // Extract the object before .value (that's the ref)
        // e.g., todo.done.value -> we want todo.done
        const refCode = generate(node.object).code;
        refs.add(refCode);
      }
      // Continue traversing
      traverse(node.object);
    } else if (t.isConditionalExpression(node)) {
      traverse(node.test);
      traverse(node.consequent);
      traverse(node.alternate);
    } else if (t.isLogicalExpression(node) || t.isBinaryExpression(node)) {
      traverse(node.left);
      traverse(node.right);
    } else if (t.isCallExpression(node)) {
      traverse(node.callee);
      node.arguments.forEach((arg: any) => traverse(arg));
    } else if (t.isArrayExpression(node)) {
      node.elements.forEach((el: any) => traverse(el));
    }
  }
  
  traverse(expr);
  return Array.from(refs);
}

/**
 * Extract identifiers (like 'todo.done' ref) from expression for watch dependencies
 * For expressions like: todo.done.value ? 'done' : ''
 * We want to extract: todo.done (the ref, not the .value)
 */
function extractIdentifiersFromExpression(expr: any): string[] {
  const identifiers = new Set<string>();
  
  function traverse(node: any) {
    if (!node) return;
    
    if (t.isMemberExpression(node)) {
      // Check if this member expression accesses .value (indicates a ref)
      if (t.isIdentifier(node.property) && node.property.name === 'value') {
        // This is accessing .value, so extract the object (which is the ref)
        const refCode = generate(node.object).code;
        identifiers.add(refCode);
      }
      // Continue traversing
      traverse(node.object);
      traverse(node.property);
    } else if (t.isConditionalExpression(node)) {
      traverse(node.test);
      traverse(node.consequent);
      traverse(node.alternate);
    } else if (t.isLogicalExpression(node) || t.isBinaryExpression(node)) {
      traverse(node.left);
      traverse(node.right);
    }
  }
  
  traverse(expr);
  return Array.from(identifiers);
}

/**
 * Generate JSX element from Babel AST (for @each items)
 */
function generateJSXFromBabel(jsxElement: t.JSXElement, indent: number, itemName: string = 'item'): string {
  // This is a simplified version - we'd need to recursively analyze this
  // For now, just generate a placeholder
  const spaces = '  '.repeat(indent);
  return `${spaces}// TODO: Generate ${itemName} rendering\n`;
}
