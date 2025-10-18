import type { TemplateNode } from './analyzer';

/**
 * Tracks generated condition variables to ensure unique names
 */
let conditionCounter = 0;

/**
 * Detects if an expression is a simple ref or a complex expression
 * Simple: "showCompleted", "todo.done"
 * Complex: "showCompleted || !todo.done", "count > 5 && active"
 */
function isComplexExpression(expr: string): boolean {
  // Check for operators that indicate complex expressions
  return /(\|\||&&|!|[<>!=]=|[<>])/.test(expr);
}

/**
 * Extracts all ref identifiers from a complex expression
 * E.g., "showCompleted || !todo.done" -> ["showCompleted", "todo.done"]
 */
function extractRefsFromExpression(expr: string): string[] {
  // Match JavaScript identifiers (with optional property access)
  // This regex matches: varName or obj.prop or obj.prop.nested
  const identifierRegex = /[a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*/g;
  const matches = expr.match(identifierRegex) || [];
  
  // Filter out JavaScript keywords and duplicates
  const keywords = new Set(['true', 'false', 'null', 'undefined', 'typeof', 'instanceof']);
  const refs = matches.filter(match => !keywords.has(match));
  
  // Remove duplicates
  return Array.from(new Set(refs));
}

/**
 * Transforms expression to use destructured variables
 * E.g., "showCompleted || !todo.done" with refs ["showCompleted", "todo.done"]
 * becomes "_v0 || !_v1" with mapping ["_v0", "_v1"]
 */
function transformExpression(expr: string, refs: string[]): { 
  transformedExpr: string, 
  varNames: string[] 
} {
  let transformed = expr;
  const varNames: string[] = [];
  
  // Sort refs by length (longest first) to avoid partial replacements
  // e.g., replace "todo.done" before "todo"
  const sortedRefs = [...refs].sort((a, b) => b.length - a.length);
  
  sortedRefs.forEach((ref, index) => {
    const varName = `_v${index}`;
    varNames.push(varName);
    
    // Replace the full ref with the variable name
    // Use regex to ensure we match the full expression
    const escapedRef = ref.replace(/\./g, '\\.');
    transformed = transformed.replace(
      new RegExp(`\\b${escapedRef}\\b`, 'g'),
      varName
    );
  });
  
  return { transformedExpr: transformed, varNames };
}

/**
 * Generates LayoutBuilder code from analyzed template nodes
 */
export function generateCode(
  nodes: TemplateNode[],
  script: string
): string {
  // Remove import statements from script (we'll add them at the top)
  const cleanScript = script
    .split('\n')
    .filter(line => !line.trim().startsWith('import '))
    .join('\n')
    .trim();
  
  // Generate UI building code
  const uiCode = nodes.map(node => generateNodeCode(node, 2)).join('\n');
  
  return `
import { Component, ref, watch } from '../../src/index.ts';

export default Component((ui) => {
${cleanScript.split('\n').map(line => '  ' + line).join('\n')}

${uiCode}
});
`;
}

function generateNodeCode(node: TemplateNode, indent: number, isInLoop: boolean = false): string {
  const spaces = ' '.repeat(indent);
  
  // Handle @each loop (check this FIRST because it might also have @if)
  if (node.eachItems && node.eachItemName) {
    const childrenCode = node.children
      .map(child => generateNodeCode(child, indent + 4, true)) // Mark as inside loop
      .join('\n');
    
    const methodName = node.tag.charAt(0).toUpperCase() + node.tag.slice(1);
    const configParts: string[] = [];
    
    // Add attributes
    if (Object.keys(node.attributes).length > 0) {
      Object.entries(node.attributes).forEach(([key, value]) => {
        configParts.push(`${key}: "${value}"`);
      });
    }
    
    const config = configParts.length > 0 ? `{ ${configParts.join(', ')} }` : '{}';
    
    // If the @each element also has @if, handle it inside the render function
    let renderContent = `${spaces}    ui.${methodName}(${config}, (ui) => {
${childrenCode}
${spaces}    });`;
    
    if (node.ifCondition) {
      // Add conditional logic inside the render function
      let conditionCode = node.ifCondition;
      let conditionVarDeclaration = '';
      
      // Check if it's a complex expression that needs derived ref
      if (isComplexExpression(node.ifCondition)) {
        const refs = extractRefsFromExpression(node.ifCondition);
        const { transformedExpr, varNames } = transformExpression(node.ifCondition, refs);
        
        // Generate unique variable name for this condition
        const condVarName = `_whenCond${++conditionCounter}`;
        
        // Generate watch() call to create derived boolean ref
        conditionVarDeclaration = `${spaces}    const ${condVarName} = watch([${refs.join(', ')}], ([${varNames.join(', ')}]) => ${transformedExpr});\n`;
        conditionCode = condVarName;
      }
      
      renderContent = `${conditionVarDeclaration}${spaces}    ui.When(${conditionCode}, (ui) => {
${spaces}      ui.${methodName}(${config}, (ui) => {
${childrenCode}
${spaces}      });
${spaces}    });`;
    }
    
    return `${spaces}ui.List({
${spaces}  items: ${node.eachItems},
${spaces}  render: (${node.eachItemName}, index, ui) => {
${renderContent}
${spaces}  }
${spaces}});`;
  }
  
  // Handle @if conditional (only if not @each)
  if (node.ifCondition) {
    const childrenCode = node.children
      .map(child => generateNodeCode(child, indent + 2, isInLoop))
      .join('\n');
    
    const methodName = node.tag.charAt(0).toUpperCase() + node.tag.slice(1);
    const configParts: string[] = [];
    
    // Add attributes
    if (Object.keys(node.attributes).length > 0) {
      Object.entries(node.attributes).forEach(([key, value]) => {
        configParts.push(`${key}: "${value}"`);
      });
    }
    
    // Add text content (for elements with @if and text)
    if (node.text) {
      const textValue = processReactiveText(node.text);
      configParts.push(`text: ${textValue}`);
    }
    
    const config = configParts.length > 0 ? `{ ${configParts.join(', ')} }` : '{}';
    
    // Determine the condition to use
    let conditionCode = node.ifCondition;
    let conditionVarDeclaration = '';
    
    // Check if it's a complex expression that needs derived ref
    if (isComplexExpression(node.ifCondition)) {
      const refs = extractRefsFromExpression(node.ifCondition);
      const { transformedExpr, varNames } = transformExpression(node.ifCondition, refs);
      
      // Generate unique variable name for this condition
      const condVarName = `_whenCond${++conditionCounter}`;
      
      // Generate watch() call to create derived boolean ref
      conditionVarDeclaration = `${spaces}const ${condVarName} = watch([${refs.join(', ')}], ([${varNames.join(', ')}]) => ${transformedExpr});\n`;
      conditionCode = condVarName;
    }
    
    // Always use ui.When() for reactive conditionals
    // The condition should be a ref for reactivity to work
    if (childrenCode.trim()) {
      return `${conditionVarDeclaration}${spaces}ui.When(${conditionCode}, (ui) => {
${spaces}  ui.${methodName}(${config}, (ui) => {
${childrenCode}
${spaces}  });
${spaces}});`;
    } else {
      // Element with no children (e.g., self-closing span with text)
      return `${conditionVarDeclaration}${spaces}ui.When(${conditionCode}, (ui) => {
${spaces}  ui.${methodName}(${config});
${spaces}});`;
    }
  }
  
  // Regular element
  const methodName = node.tag.charAt(0).toUpperCase() + node.tag.slice(1);
  
  // Build config object
  const configParts: string[] = [];
  
  // Add regular attributes
  if (Object.keys(node.attributes).length > 0) {
    Object.entries(node.attributes).forEach(([key, value]) => {
      configParts.push(`${key}: "${value}"`);
    });
  }
  
  // Add reactive attributes (:value="ref")
  const extraEvents: string[] = [];
  if (Object.keys(node.reactiveAttrs).length > 0) {
    Object.entries(node.reactiveAttrs).forEach(([key, value]) => {
      configParts.push(`${key}: ${value}`);
      
      // For input elements with :value, add two-way binding via input event
      if (node.tag === 'input' && key === 'value') {
        extraEvents.push(`input: (e) => ${value}.value = e.target.value`);
      }
      // For input[type="checkbox"] with :checked, add change event
      if (node.tag === 'input' && key === 'checked') {
        extraEvents.push(`change: (e) => ${value}.value = e.target.checked`);
      }
    });
  }
  
  // Add text content (reactive, static, or plain)
  if (node.text) {
    const textValue = processReactiveText(node.text);
    configParts.push(`text: ${textValue}`);
  }
  
  // Add event handlers
  const eventHandlers = [...extraEvents];
  if (Object.keys(node.events).length > 0) {
    Object.entries(node.events).forEach(([event, method]) => {
      // Check if the method has parameters (contains parentheses)
      if (method.includes('(')) {
        // Wrap in arrow function: toggleTodo(todo) => () => toggleTodo(todo)
        eventHandlers.push(`${event}: () => ${method}`);
      } else {
        eventHandlers.push(`${event}: ${method}`);
      }
    });
  }
  
  if (eventHandlers.length > 0) {
    configParts.push(`on: { ${eventHandlers.join(', ')} }`);
  }
  
  const config = configParts.length > 0 ? `{ ${configParts.join(', ')} }` : '{}';
  
  // Generate code
  if (node.children.length > 0) {
    const childrenCode = node.children
      .map(child => generateNodeCode(child, indent + 2, isInLoop))
      .join('\n');
    
    return `${spaces}ui.${methodName}(${config}, (ui) => {
${childrenCode}
${spaces}});`;
  } else {
    return `${spaces}ui.${methodName}(${config});`;
  }
}

function processReactiveText(text: string, isInLoop: boolean = false): string {
  // Check for reactive {{variable}} or static {variable}
  
  // Reactive: {{expression}} (can be variable, math, property access, etc.)
  const reactiveMatch = text.match(/\{\{([^}]+)\}\}/);
  if (reactiveMatch) {
    const expression = reactiveMatch[1].trim();
    
    // If expression contains property access (e.g., todo.text), just interpolate
    if (expression.includes('.')) {
      const template = text.replace(/\{\{[^}]+\}\}/, '${' + expression + '}');
      return `\`${template}\``;
    }
    
    // Extract variable names from the expression
    const varMatch = expression.match(/[a-zA-Z_$][a-zA-Z0-9_$]*/);
    if (varMatch) {
      const refVar = varMatch[0];
      
      // Replace the ref variable with 'v' in the expression
      // e.g., "count * 3" becomes "v * 3"
      const transformedExpr = expression.replace(new RegExp(`\\b${refVar}\\b`, 'g'), 'v');
      
      // Replace {{expression}} with the transformed expression in the template
      const template = text.replace(/\{\{[^}]+\}\}/, '${' + transformedExpr + '}');
      
      return `watch(${refVar}, (v) => \`${template}\`)`;
    }
    
    // Fallback: just use the expression as-is
    const template = text.replace(/\{\{[^}]+\}\}/, '${v}');
    return `watch(${expression}, (v) => \`${template}\`)`;
  }
  
  // Static: {variable}
  const staticMatch = text.match(/\{(\w+)\}/);
  if (staticMatch) {
    const varName = staticMatch[1];
    const template = text.replace(/\{(\w+)\}/, '${' + varName + '}');
    return `\`${template}\``;
  }
  
  return `"${text}"`;
}
