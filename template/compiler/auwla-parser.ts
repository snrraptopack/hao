// @ts-nocheck - Babel imports don't have type definitions
import { parse } from '@babel/parser';
// @ts-ignore - ESM interop issue
import traverseImport from '@babel/traverse';
import * as t from '@babel/types';

// Handle default export from @babel/traverse
const traverse = (traverseImport as any).default || traverseImport;

export interface ComponentFunction {
  name: string;
  params: any[];
  body: any;
  isExported: boolean;
  isDefault: boolean;
}

export interface AuwlaFile {
  imports: string[];
  components: ComponentFunction[];
  helpers: string[]; // Global scope - module level
  pageHelpers: string[]; // Page scope - component function level (from <script>)
  types: string[]; // Interface/type declarations
}

/**
 * Check if function name is PascalCase (component naming convention)
 * PascalCase = starts with uppercase letter
 */
function isPascalCase(name: string): boolean {
  return /^[A-Z]/.test(name);
}

/**
 * Parses a .auwla file with component functions (PascalCase naming convention)
 * Structure: <script>...</script> followed by component function(s)
 * Supports TypeScript + JSX
 */
export function parseAuwlaFile(content: string): AuwlaFile {
  const result: AuwlaFile = {
    imports: [],
    components: [],
    helpers: [],
    pageHelpers: [],
    types: []
  };

  // Extract script content and component content separately
  const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  
  if (scriptMatch) {
    // Parse script section (imports, types, state, helpers)
    const scriptContent = scriptMatch[1].trim();
    if (scriptContent) {
      const scriptAst = parse(scriptContent, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
      });
      
      traverse(scriptAst, {
        ImportDeclaration(path) {
          const start = path.node.start!;
          const end = path.node.end!;
          result.imports.push(scriptContent.substring(start, end));
        },
        TSInterfaceDeclaration(path) {
          const start = path.node.start!;
          const end = path.node.end!;
          result.types.push(scriptContent.substring(start, end));
        },
        TSTypeAliasDeclaration(path) {
          const start = path.node.start!;
          const end = path.node.end!;
          result.types.push(scriptContent.substring(start, end));
        },
        VariableDeclaration(path) {
          const start = path.node.start!;
          const end = path.node.end!;
          result.pageHelpers.push(scriptContent.substring(start, end));
        },
        FunctionDeclaration(path) {
          const name = path.node.id?.name;
          const start = path.node.start!;
          const end = path.node.end!;
          // All functions in script are pageHelpers (component function scope)
          if (name) {
            result.pageHelpers.push(scriptContent.substring(start, end));
          }
        },
        ExpressionStatement(path) {
          // Skip if this is inside a function
          if (path.getFunctionParent()) {
            return;
          }
          
          const start = path.node.start!;
          const end = path.node.end!;
          result.pageHelpers.push(scriptContent.substring(start, end));
        }
      });
    }
    
    // Parse component section (after </script>)
    const componentStart = content.indexOf('</script>') + 9;
    const componentContent = content.substring(componentStart).trim();
    
    if (componentContent) {
      const componentAst = parse(componentContent, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
      });
      
      traverse(componentAst, {
        FunctionDeclaration(path) {
          const name = path.node.id?.name;
          if (name && isPascalCase(name)) {
            result.components.push({
              name,
              params: path.node.params,
              body: path.node.body,
              isExported: false,
              isDefault: false
            });
          }
        },
        ExportNamedDeclaration(path) {
          if (t.isFunctionDeclaration(path.node.declaration)) {
            const name = path.node.declaration.id?.name;
            if (name && isPascalCase(name)) {
              result.components.push({
                name,
                params: path.node.declaration.params,
                body: path.node.declaration.body,
                isExported: true,
                isDefault: false
              });
            }
          }
        },
        ExportDefaultDeclaration(path) {
          if (t.isFunctionDeclaration(path.node.declaration)) {
            const name = path.node.declaration.id?.name || 'default';
            if (isPascalCase(name)) {
              result.components.push({
                name,
                params: path.node.declaration.params,
                body: path.node.declaration.body,
                isExported: true,
                isDefault: true
              });
            }
          }
        }
      });
    }
  } else {
    // No script tag, parse entire content as component
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx']
    });
    
    return extractFromAST(ast, content);
  }

  return result;
}

function extractFromAST(ast: any, source: string): AuwlaFile {
  const result: AuwlaFile = {
    imports: [],
    components: [],
    helpers: [],
    pageHelpers: [],
    types: []
  };

  traverse(ast, {
    // Extract import statements
    ImportDeclaration(path) {
      const start = path.node.start!;
      const end = path.node.end!;
      result.imports.push(source.substring(start, end));
    },

    // Extract TypeScript type declarations
    TSInterfaceDeclaration(path) {
      const start = path.node.start!;
      const end = path.node.end!;
      result.types.push(source.substring(start, end));
    },

    TSTypeAliasDeclaration(path) {
      const start = path.node.start!;
      const end = path.node.end!;
      result.types.push(source.substring(start, end));
    },

    // Extract functions
    FunctionDeclaration(path) {
      const node = path.node;
      const functionName = node.id?.name || 'Anonymous';
      
      // Check if function name is PascalCase (component naming convention)
      const isComponent = isPascalCase(functionName);

      if (isComponent) {
        // This is a component function (PascalCase)
        result.components.push({
          name: functionName,
          params: node.params,
          body: node.body,
          isExported: false,
          isDefault: false
        });
      } else {
        // Regular helper function (camelCase or other)
        const start = path.node.start!;
        const end = path.node.end!;
        result.helpers.push(source.substring(start, end));
      }
    },
    // Handle exported functions
    ExportDefaultDeclaration(path) {
      const declaration = path.node.declaration;
      
      if (t.isFunctionDeclaration(declaration)) {
        const functionName = declaration.id?.name || 'default';
        const isComponent = isPascalCase(functionName);

        if (isComponent) {
          const existing = result.components.find(c => c.name === functionName);
          if (existing) {
            existing.isDefault = true;
            existing.isExported = true;
          } else {
            result.components.push({
              name: functionName,
              params: declaration.params,
              body: declaration.body,
              isExported: true,
              isDefault: true
            });
          }
        }
      }
    },

    ExportNamedDeclaration(path) {
      const declaration = path.node.declaration;
      
      if (declaration && t.isFunctionDeclaration(declaration)) {
        const functionName = declaration.id?.name || 'Anonymous';
        const isComponent = isPascalCase(functionName);

        if (isComponent) {
          const existing = result.components.find(c => c.name === functionName);
          if (existing) {
            existing.isExported = true;
          } else {
            result.components.push({
              name: functionName,
              params: declaration.params,
              body: declaration.body,
              isExported: true,
              isDefault: false
            });
          }
        }
      }
    },

    // Extract variable declarations (const, let, var)
    VariableDeclaration(path) {
      // Skip if this is inside a component function
      if (path.getFunctionParent()) {
        return;
      }
      
      const start = path.node.start!;
      const end = path.node.end!;
      result.helpers.push(source.substring(start, end));
    },

    // Extract expression statements (setInterval, console.log, etc.)
    ExpressionStatement(path) {
      // Skip if this is inside a component function
      if (path.getFunctionParent()) {
        return;
      }
      
      const start = path.node.start!;
      const end = path.node.end!;
      result.helpers.push(source.substring(start, end));
    }
  });

  return result;
}

/**
 * Extract JSX elements from component body
 */
export function extractJSXFromBody(body: any): any[] {
  const jsxElements: any[] = [];

  traverse(body, {
    JSXElement(path) {
      // Only collect top-level JSX (not nested)
      if (!path.findParent(p => p.isJSXElement())) {
        jsxElements.push(path.node);
      }
    },
    
    JSXFragment(path) {
      if (!path.findParent(p => p.isJSXFragment())) {
        jsxElements.push(path.node);
      }
    }
  }, undefined, body);

  return jsxElements;
}
