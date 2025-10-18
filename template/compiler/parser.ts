import { parse as parseHtml } from 'node-html-parser';
import * as acorn from 'acorn';

export interface ParsedTemplate {
  template: string;
  script: string;
  variables: string[]; // e.g., ['count', 'email']
  functions: string[]; // e.g., ['increment', 'decrement']
}

/**
 * Parses an .html template file and extracts:
 * 1. The HTML template (without <script> tag)
 * 2. Variable declarations (let/const)
 * 3. Function declarations
 */
export function parseTemplate(htmlContent: string): ParsedTemplate {
  const root = parseHtml(htmlContent);
  
  // Extract <script> content
  const scriptTag = root.querySelector('script');
  let scriptContent = '';
  let variables: string[] = [];
  let functions: string[] = [];
  
  if (scriptTag) {
    scriptContent = scriptTag.text.trim();
    
    // Remove the script tag from template
    scriptTag.remove();
    
    // Parse JavaScript/TypeScript to find variables and functions
    // For TypeScript (.auwla files), we skip AST parsing since acorn doesn't support TS
    // The script will be passed through as-is with full type information intact
    try {
      // Only parse if it looks like plain JavaScript (no TypeScript syntax)
      const hasTypeScript = /\b(interface|type|enum)\b|:\s*\w+\s*[=,;)]/.test(scriptContent);
      
      if (!hasTypeScript) {
        const ast = acorn.parse(scriptContent, { 
          ecmaVersion: 2020,
          sourceType: 'module'
        });
        
        // Walk the AST to find declarations
        (ast as any).body.forEach((node: any) => {
          // Variable declarations: let count = 0
          if (node.type === 'VariableDeclaration') {
            node.declarations.forEach((decl: any) => {
              if (decl.id.type === 'Identifier') {
                variables.push(decl.id.name);
              }
            });
          }
          
          // Function declarations: function increment() {}
          if (node.type === 'FunctionDeclaration' && node.id) {
            functions.push(node.id.name);
          }
        });
      } else {
        // For TypeScript, we can use simple regex to extract declarations
        // This is less accurate but works for basic cases
        const varRegex = /(?:const|let|var)\s+(\w+)/g;
        let match;
        while ((match = varRegex.exec(scriptContent)) !== null) {
          variables.push(match[1]);
        }
        
        const funcRegex = /function\s+(\w+)/g;
        while ((match = funcRegex.exec(scriptContent)) !== null) {
          functions.push(match[1]);
        }
      }
    } catch (error) {
      console.error('Failed to parse script section:', error);
      // Even if parsing fails, we can continue - variables/functions are optional
    }
  }
  
  // Get remaining HTML as template
  const template = root.toString().trim();
  
  return {
    template,
    script: scriptContent,
    variables,
    functions
  };
}
