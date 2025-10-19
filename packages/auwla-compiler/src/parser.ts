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
// DEPRECATED: This old parser is kept for historical reasons. Prefer the
// `parseAuwlaFile` function in `auwla-parser.ts` which is the canonical,
// maintained parser for `.auwla` files. The newer pipeline produces more
// reliable generated TypeScript and should be used by the Vite plugin and
// tooling.
export function parseTemplate(htmlContent: string): ParsedTemplate {
  let scriptContent = '';
  let variables: string[] = [];
  let functions: string[] = [];

  // Extract first <script>...</script> block using a non-greedy regex
  const scriptMatch = htmlContent.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  if (scriptMatch) {
    scriptContent = scriptMatch[1].trim();
    // Remove the script block from the template
    htmlContent = htmlContent.slice(0, scriptMatch.index) + htmlContent.slice((scriptMatch.index || 0) + scriptMatch[0].length);

    // Parse JavaScript/TypeScript to find variables and functions
    try {
      const hasTypeScript = /\b(interface|type|enum|declare)\b|:\s*\w+\s*[=,;)]/.test(scriptContent);

      if (!hasTypeScript) {
        const ast = acorn.parse(scriptContent, {
          ecmaVersion: 2020,
          sourceType: 'module'
        });

        (ast as any).body.forEach((node: any) => {
          if (node.type === 'VariableDeclaration') {
            node.declarations.forEach((decl: any) => {
              if (decl.id && decl.id.type === 'Identifier') {
                variables.push(decl.id.name);
              }
            });
          }
          if (node.type === 'FunctionDeclaration' && node.id) {
            functions.push(node.id.name);
          }
        });
      } else {
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
    }
  }

  // Remaining content is the template
  const template = htmlContent.trim();
  
  return {
    template,
    script: scriptContent,
    variables,
    functions
  };
}
