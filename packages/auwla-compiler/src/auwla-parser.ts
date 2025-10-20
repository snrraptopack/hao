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
  template?: string; // For template-style .auwla files
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
 * Parses both .auwla and .tsx/.jsx files with component functions
 * Supports multiple formats:
 * 1. Traditional .auwla: <script>...</script> followed by component function(s)
 * 2. Native TSX/JSX: Direct TypeScript/JavaScript with JSX
 * 3. Mixed: Any combination of the above
 */
export function parseAuwlaFile(content: string): AuwlaFile {
  const result: AuwlaFile = {
    imports: [],
    components: [],
    helpers: [],
    pageHelpers: [],
    types: []
  };

  // Check if this is a traditional .auwla file with <script> tags
  const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  
  if (scriptMatch) {
    // Traditional .auwla format with <script> tags
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
    
    // Parse template section (after </script>)
    const componentStart = content.indexOf('</script>') + 9;
    const templateContent = content.substring(componentStart).trim();
    
    if (templateContent) {
      // Check if this is a component function or template HTML/JSX
      try {
        const componentAst = parse(templateContent, {
          sourceType: 'module',
          plugins: ['typescript', 'jsx']
        });
        
        let foundComponent = false;
        
        traverse(componentAst, {
          FunctionDeclaration(path) {
            const name = path.node.id?.name;
            if (name && isPascalCase(name)) {
              foundComponent = true;
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
                foundComponent = true;
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
                foundComponent = true;
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
        
        // If no component functions found, treat as template HTML/JSX
        if (!foundComponent) {
          // Create a virtual default component with the template content
          result.components.push({
            name: 'default',
            params: [],
            body: null, // Will be handled specially in codegen
            isExported: true,
            isDefault: true,
            template: templateContent // Store the template content
          } as any);
        }
      } catch (error) {
        // If parsing as JS fails, treat as template HTML/JSX
        result.components.push({
          name: 'default',
          params: [],
          body: null,
          isExported: true,
          isDefault: true,
          template: templateContent
        } as any);
      }
    }
  } else {
    // Native TSX/JSX format or .auwla without <script> tags
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
      // OR if function returns JSX (React component pattern)
      const isComponent = isPascalCase(functionName) || returnsJSX(node.body);

      if (isComponent) {
        // This is a component function (PascalCase or returns JSX)
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
        const isComponent = isPascalCase(functionName) || returnsJSX(declaration.body);

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
      } else if (t.isArrowFunctionExpression(declaration) || t.isFunctionExpression(declaration)) {
        // Handle arrow functions and function expressions
        const isComponent = returnsJSX(declaration.body);
        if (isComponent) {
          result.components.push({
            name: 'default',
            params: declaration.params,
            body: declaration.body,
            isExported: true,
            isDefault: true
          });
        }
      }
    },

    ExportNamedDeclaration(path) {
      const declaration = path.node.declaration;
      
      if (declaration && t.isFunctionDeclaration(declaration)) {
        const functionName = declaration.id?.name || 'Anonymous';
        const isComponent = isPascalCase(functionName) || returnsJSX(declaration.body);

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
      } else if (declaration && t.isVariableDeclaration(declaration)) {
        // Handle const Component = () => JSX
        for (const declarator of declaration.declarations) {
          if (t.isIdentifier(declarator.id) && 
              (t.isArrowFunctionExpression(declarator.init) || t.isFunctionExpression(declarator.init))) {
            const functionName = declarator.id.name;
            const isComponent = isPascalCase(functionName) || returnsJSX(declarator.init.body);
            
            if (isComponent) {
              result.components.push({
                name: functionName,
                params: declarator.init.params,
                body: declarator.init.body,
                isExported: true,
                isDefault: false
              });
            }
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
      
      // Check if this is a component variable (const Component = () => JSX)
      let hasComponent = false;
      for (const declarator of path.node.declarations) {
        if (t.isIdentifier(declarator.id) && 
            (t.isArrowFunctionExpression(declarator.init) || t.isFunctionExpression(declarator.init))) {
          const functionName = declarator.id.name;
          const isComponent = isPascalCase(functionName) || returnsJSX(declarator.init.body);
          
          if (isComponent) {
            hasComponent = true;
            result.components.push({
              name: functionName,
              params: declarator.init.params,
              body: declarator.init.body,
              isExported: false,
              isDefault: false
            });
          }
        }
      }
      
      // Top-level variable declarations are component helpers (shared across all components)
      // This ensures that variables like `const counter = ref(0)` in TSX files
      // are available for ref detection and shared across components
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
      // For TSX files, treat top-level expressions as component helpers (shared across components)
      result.helpers.push(source.substring(start, end));
    }
  });

  return result;
}

/**
 * Check if a function body returns JSX elements
 */
function returnsJSX(body: any): boolean {
  if (!body) return false;
  
  let hasJSX = false;
  
  // Handle different body types
  if (t.isBlockStatement(body)) {
    // Function body with { return ... }
    // Simple recursive check without using traverse
    function checkForJSX(node: any): boolean {
      if (!node) return false;
      
      if (t.isJSXElement(node) || t.isJSXFragment(node)) {
        return true;
      }
      
      if (t.isReturnStatement(node) && node.argument) {
        return checkForJSX(node.argument);
      }
      
      if (Array.isArray(node)) {
        return node.some(checkForJSX);
      }
      
      if (typeof node === 'object') {
        return Object.values(node).some(checkForJSX);
      }
      
      return false;
    }
    
    hasJSX = checkForJSX(body.body);
  } else if (t.isJSXElement(body) || t.isJSXFragment(body)) {
    // Arrow function with direct JSX return: () => <div>...</div>
    hasJSX = true;
  }
  
  return hasJSX;
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