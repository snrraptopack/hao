import traverse from '@babel/traverse';
import * as t from '@babel/types';

/**
 * JSX element representation for code generation
 */
export interface JSXNode {
  type: 'element' | 'text' | 'expression';
  tag?: string; // div, button, etc.
  props?: JSXProp[];
  children?: JSXNode[];
  text?: string;
  expression?: any; // Babel expression node
  directives?: Directive[];
}

export interface JSXProp {
  name: string;
  value: any; // Babel expression or literal
  isSpread?: boolean;
}

export interface Directive {
  type: 'if' | 'each' | 'click' | 'bind' | 'key';
  name: string; // @if, @click, :value, @key
  value: any; // Expression node
}

/**
 * Analyzes JSX AST from a component function body
 * Extracts structure and directives for code generation
 */
export function analyzeJSX(functionBody: t.BlockStatement): JSXNode[] {
  const jsxNodes: JSXNode[] = [];

  // Walk through the function body statements
  for (const statement of functionBody.body) {
    if (t.isReturnStatement(statement)) {
      const argument = statement.argument;
      
      if (!argument) continue;
      
      // Handle JSXElement or JSXFragment
      if (t.isJSXElement(argument)) {
        jsxNodes.push(analyzeJSXElement(argument));
      } else if (t.isJSXFragment(argument)) {
        jsxNodes.push(analyzeJSXFragment(argument));
      } else if (t.isJSXExpressionContainer(argument)) {
        // Handle expressions like {someValue}
        jsxNodes.push({
          type: 'expression',
          expression: argument.expression
        });
      }
    }
  }

  return jsxNodes;
}

/**
 * Analyze a single JSX element
 */
function analyzeJSXElement(element: t.JSXElement): JSXNode {
  const openingElement = element.openingElement;
  const tagName = getJSXTagName(openingElement.name);
  
  // Extract props and directives
  const { props, directives } = analyzeAttributes(openingElement.attributes);
  
  // Analyze children
  const children = element.children
    .map(child => analyzeJSXChild(child))
    .filter((child): child is JSXNode => child !== null);

  return {
    type: 'element',
    tag: tagName,
    props,
    directives,
    children
  };
}

/**
 * Analyze JSX fragment <>...</>
 */
function analyzeJSXFragment(fragment: t.JSXFragment): JSXNode {
  const children = fragment.children
    .map(child => analyzeJSXChild(child))
    .filter((child): child is JSXNode => child !== null);

  return {
    type: 'element',
    tag: 'fragment',
    children
  };
}

/**
 * Analyze a JSX child (element, text, or expression)
 */
function analyzeJSXChild(child: t.JSXElement['children'][0]): JSXNode | null {
  if (t.isJSXElement(child)) {
    return analyzeJSXElement(child);
  }
  
  if (t.isJSXFragment(child)) {
    return analyzeJSXFragment(child);
  }
  
  if (t.isJSXText(child)) {
    const text = child.value.trim();
    if (!text) return null; // Skip empty text nodes
    
    return {
      type: 'text',
      text
    };
  }
  
  if (t.isJSXExpressionContainer(child)) {
    // Handle {expression}
    const expr = child.expression;
    
    // Skip JSX comments: {/* comment */}
    if (t.isJSXEmptyExpression(expr)) {
      return null;
    }
    
    // Check for special control flow functions: $if, $each, and .map()
    if (t.isCallExpression(expr)) {
      const callee = expr.callee;
      
      // Check if it's $if or $each
      if (t.isIdentifier(callee)) {
        if (callee.name === '$if') {
          // $if(condition, () => <jsx>)
          return {
            type: 'expression',
            expression: expr,
            isControlFlow: true,
            controlFlowType: 'if'
          } as any;
        }
        
        if (callee.name === '$each') {
          // $each(items, (item) => <jsx>)
          return {
            type: 'expression',
            expression: expr,
            isControlFlow: true,
            controlFlowType: 'each'
          } as any;
        }
      }
      
      // Check for .map() calls (non-reactive iteration)
      if (t.isMemberExpression(callee) && 
          t.isIdentifier(callee.property) && 
          callee.property.name === 'map') {
        // items.map((item) => <jsx>)
        return {
          type: 'expression',
          expression: expr,
          isControlFlow: true,
          controlFlowType: 'map'
        } as any;
      }
    }
    
    return {
      type: 'expression',
      expression: child.expression
    };
  }
  
  return null;
}

/**
 * Get tag name from JSX identifier
 */
function getJSXTagName(name: t.JSXElement['openingElement']['name']): string {
  if (t.isJSXIdentifier(name)) {
    return name.name;
  }
  
  if (t.isJSXMemberExpression(name)) {
    // Handle <Foo.Bar>
    return getJSXMemberExpressionName(name);
  }
  
  if (t.isJSXNamespacedName(name)) {
    // Handle <ns:tag>
    return `${name.namespace.name}:${name.name.name}`;
  }
  
  return 'unknown';
}

/**
 * Get member expression name (e.g., Foo.Bar.Baz)
 */
function getJSXMemberExpressionName(expr: t.JSXMemberExpression): string {
  const object = expr.object;
  const property = expr.property.name;
  
  if (t.isJSXIdentifier(object)) {
    return `${object.name}.${property}`;
  }
  
  if (t.isJSXMemberExpression(object)) {
    return `${getJSXMemberExpressionName(object)}.${property}`;
  }
  
  return property;
}

/**
 * Analyze JSX attributes to extract props and directives
 */
function analyzeAttributes(attributes: t.JSXElement['openingElement']['attributes']): {
  props: JSXProp[];
  directives: Directive[];
} {
  const props: JSXProp[] = [];
  const directives: Directive[] = [];

  for (const attr of attributes) {
    if (t.isJSXSpreadAttribute(attr)) {
      // Handle {...spread}
      props.push({
        name: '...spread',
        value: attr.argument,
        isSpread: true
      });
      continue;
    }

    if (!t.isJSXAttribute(attr)) continue;

    const attrName = getAttributeName(attr.name);
    const attrValue = attr.value;

    // Check if it's a directive
    const directive = parseDirective(attrName, attrValue);
    if (directive) {
      directives.push(directive);
      continue;
    }

    // Regular prop
    props.push({
      name: attrName,
      value: attrValue
    });
  }

  return { props, directives };
}

/**
 * Get attribute name (supports namespaced names)
 */
function getAttributeName(name: t.JSXAttribute['name']): string {
  if (t.isJSXIdentifier(name)) {
    return name.name;
  }
  
  if (t.isJSXNamespacedName(name)) {
    return `${name.namespace.name}:${name.name.name}`;
  }
  
  return 'unknown';
}

/**
 * Parse directive from attribute
 * Directives: if, each, onClick, value, checked, etc.
 * Note: JSX doesn't allow @ or : prefixes, so we use standard camelCase
 */
function parseDirective(name: string, value: t.JSXAttribute['value']): Directive | null {
  // Special directives
  if (name === 'if') {
    return {
      type: 'if',
      name,
      value: extractExpressionValue(value)
    };
  }
  
  if (name === 'each') {
    return {
      type: 'each',
      name,
      value: extractExpressionValue(value)
    };
  }
  
  if (name === 'key') {
    return {
      type: 'key',
      name,
      value: extractExpressionValue(value)
    };
  }
  
  // Event handlers: onClick, onInput, onKeyDown, etc.
  if (name.startsWith('on') && name.length > 2 && /[A-Z]/.test(name[2])) {
    const eventName = name.slice(2).toLowerCase(); // onClick -> click
    return {
      type: 'click', // Generic event type
      name: eventName,
      value: extractExpressionValue(value)
    };
  }
  
  // Reactive bindings: value, checked, disabled, etc.
  // These are treated as bindings if they contain expressions
  const knownBindings = ['value', 'checked', 'disabled', 'selected'];
  if (knownBindings.includes(name)) {
    // Check if it's an expression (reactive)
    if (value && t.isJSXExpressionContainer(value)) {
      return {
        type: 'bind',
        name,
        value: extractExpressionValue(value)
      };
    }
  }
  
  return null;
}

/**
 * Extract expression value from JSX attribute value
 */
function extractExpressionValue(value: t.JSXAttribute['value']): any {
  if (!value) return null;
  
  if (t.isJSXExpressionContainer(value)) {
    return value.expression;
  }
  
  if (t.isStringLiteral(value)) {
    return value;
  }
  
  return value;
}

/**
 * Helper to convert expression to string for debugging
 */
export function expressionToString(expr: any): string {
  if (!expr) return '';
  
  if (t.isStringLiteral(expr)) {
    return expr.value;
  }
  
  if (t.isNumericLiteral(expr)) {
    return String(expr.value);
  }
  
  if (t.isBooleanLiteral(expr)) {
    return String(expr.value);
  }
  
  if (t.isIdentifier(expr)) {
    return expr.name;
  }
  
  if (t.isMemberExpression(expr)) {
    const object = expressionToString(expr.object);
    const property = t.isIdentifier(expr.property) ? expr.property.name : expressionToString(expr.property);
    return `${object}.${property}`;
  }
  
  if (t.isCallExpression(expr)) {
    const callee = expressionToString(expr.callee);
    const args = expr.arguments.map(arg => expressionToString(arg)).join(', ');
    return `${callee}(${args})`;
  }
  
  if (t.isArrowFunctionExpression(expr) || t.isFunctionExpression(expr)) {
    return '[Function]';
  }
  
  return '[Expression]';
}
