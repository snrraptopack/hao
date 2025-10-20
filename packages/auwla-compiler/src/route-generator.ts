import { promises as fs } from 'fs'
import { join, basename, relative } from 'path'
import { parseAuwlaFile } from './auwla-parser.js'
import { generateAuwlaFile } from './codegen/main.js'
import { parseTSXFile, generateAuwlaFromTSX, compileTSX } from './tsx-only-compiler.js'
import { parse } from '@babel/parser'
// @ts-ignore - ESM interop issue
import traverseImport from '@babel/traverse'
// @ts-ignore - ESM interop issue
import * as _babelGenerator from '@babel/generator'
import * as t from '@babel/types'

// Handle default export from @babel/traverse
const traverse = (traverseImport as any).default || traverseImport

// Normalize the generator import
let generate: any = (_babelGenerator as any)?.default ?? _babelGenerator;
if (typeof generate !== 'function') {
  if (generate && typeof generate.generate === 'function') {
    generate = generate.generate;
  } else if (generate && typeof generate.default === 'function') {
    generate = generate.default;
  }
}

/**
 * Generates route definitions from .auwla files that are marked as pages
 * Only .auwla files with @page directive or in pages/ folder become routes
 */
export async function generateRoutes(pagesDir: string, outputDir: string) {
  // Clean up old generated files first
  await cleanupOldGeneratedFiles(outputDir)
  
  const auwlaFiles = await findAuwlaFiles(pagesDir)
  const routes: RouteDefinition[] = []
  const components: ComponentDefinition[] = []
  
  for (const filePath of auwlaFiles) {
    const content = await fs.readFile(filePath, 'utf-8')
    
    // Check if this should be a route or just a component
    const isRoute = shouldBeRoute(content, filePath, pagesDir)
    const fileExtension = filePath.endsWith('.tsx') ? '.tsx' : filePath.endsWith('.jsx') ? '.jsx' : '.auwla'
    const fileName = basename(filePath, fileExtension)
    

    
    if (isRoute) {
      // Generate as route
      const routePath = generateRoutePath(fileName)
      const componentName = toPascalCase(fileName) + 'Page'
      
      let routeComponent: string
      
      if (fileExtension === '.tsx') {
        // Handle native TSX files
        routeComponent = generateTSXRouteComponent(content, componentName, fileName)
      } else {
        // Handle .auwla files
        routeComponent = generateRouteComponent(content, componentName, fileName)
      }
      
      // Write compiled route component
      const outputPath = join(outputDir, `${fileName.toLowerCase()}.ts`)
      await fs.writeFile(outputPath, routeComponent, 'utf-8')
      
      routes.push({
        path: routePath,
        component: componentName,
        file: fileName.toLowerCase(),
        meta: extractMeta(content)
      })
    } else {
      // For components, try to parse with the old format
      try {
        let compiled: string
        const componentName = toPascalCase(fileName)
        
        if (fileExtension === '.tsx') {
          // Handle native TSX components
          compiled = generateTSXComponent(content, componentName)
        } else {
          // Handle .auwla components
          const parsed = parseAuwlaFile(content)
          compiled = generateAuwlaFile(parsed)
        }
        
        // Write compiled component (not a route)
        const outputPath = join(outputDir, `${fileName}.component.ts`)
        const wrappedComponent = wrapAsComponent(compiled, componentName)
        await fs.writeFile(outputPath, wrappedComponent, 'utf-8')
        
        components.push({
          name: componentName,
          file: `${fileName}.component`
        })
      } catch (error) {
        console.warn(`⚠️ Could not parse component ${fileName}: ${error instanceof Error ? error.message : String(error)}`)
        // Skip this file for now
      }
    }
  }
  
  // Update the unified route registry
  await updateRouteRegistry(routes, outputDir)
  
  return { routes, components }
}

interface RouteDefinition {
  path: string
  component: string
  file: string
  meta?: Record<string, any>
}

interface ComponentDefinition {
  name: string
  file: string
}

async function findAuwlaFiles(dir: string): Promise<string[]> {
  const files: string[] = []
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      
      if (entry.isDirectory()) {
        const subFiles = await findAuwlaFiles(fullPath)
        files.push(...subFiles)
      } else if (entry.name.endsWith('.auwla') || entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx')) {
        files.push(fullPath)
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read
  }
  
  return files
}

/**
 * Determines if a file should become a route
 * Rules:
 * 1. Has @page directive in comments
 * 2. File name contains "Page" suffix
 * 3. File is in a pages/ subfolder
 * 4. For TSX files: any file in pages/ directory is considered a route by default
 */
function shouldBeRoute(content: string, filePath: string, pagesDir: string): boolean {
  // Check for @page directive at start of line (most explicit)
  const hasPageDirective = /^\/\/\s*@page/m.test(content) || /^\/\/\s*@route/m.test(content)
  if (hasPageDirective) {
    return true
  }
  
  const fileExtension = filePath.endsWith('.tsx') ? '.tsx' : filePath.endsWith('.jsx') ? '.jsx' : '.auwla'
  const fileName = basename(filePath, fileExtension)
  const relativePath = relative(pagesDir, filePath)
  
  // Check if has Page suffix
  if (fileName.endsWith('Page')) {
    return true
  }
  
  // Check if in pages/ subfolder
  if (relativePath.includes('pages/')) {
    return true
  }
  
  // For TSX/JSX files in the pages directory, default to route
  if ((fileExtension === '.tsx' || fileExtension === '.jsx') && relativePath === basename(filePath)) {
    return true
  }
  
  // Default: treat as component, not route
  return false
}

/**
 * Extract metadata from .auwla file comments
 */
function extractMeta(content: string): Record<string, any> {
  const meta: Record<string, any> = {}
  
  // Extract @title directive
  const titleMatch = content.match(/\/\/\s*@title\s+(.+)/i)
  if (titleMatch && titleMatch[1]) {
    meta.title = titleMatch[1].trim()
  }
  
  // Extract @description directive
  const descMatch = content.match(/\/\/\s*@description\s+(.+)/i)
  if (descMatch && descMatch[1]) {
    meta.description = descMatch[1].trim()
  }
  
  // Extract @guard directive
  const guardMatch = content.match(/\/\/\s*@guard\s+(.+)/i)
  if (guardMatch && guardMatch[1]) {
    meta.guard = guardMatch[1].trim()
  }
  
  return meta
}

function generateRoutePath(fileName: string): string {
  // Convert file names to route paths
  // Home.auwla -> /
  // About.auwla -> /about
  // UserProfile.auwla -> /user-profile
  // TestComponent.auwla -> /test-component
  
  if (fileName.toLowerCase() === 'home' || fileName.toLowerCase() === 'index') {
    return '/'
  }
  
  // Remove "Page" suffix if present
  const cleanName = fileName.replace(/Page$/, '')
  
  // Convert PascalCase to kebab-case
  return '/' + cleanName
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '')
}

function generateRouteComponent(content: string, componentName: string, fileName: string): string {
  try {
    // Convert new template format to old format that the parser expects
    const convertedContent = convertNewTemplateToOldFormat(content, componentName);
    
    // Use the existing Auwla compiler
    const parsed = parseAuwlaFile(convertedContent);
    const compiled = generateAuwlaFile(parsed);
    
    return compiled;
  } catch (error) {
    console.warn(`Warning: Could not compile ${fileName} with Auwla compiler: ${error instanceof Error ? error.message : String(error)}`);
    
    // Fallback to simple generation
    const pageMatch = content.match(/\/\/\s*@page\s+(.+)/);
    const pagePath = pageMatch ? pageMatch[1].trim() : '/';
    
    const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    const scriptContent = scriptMatch ? scriptMatch[1].trim() : '';
    
    return `// Auto-generated route component from ${fileName}.auwla (fallback)
import { Component, ref, LayoutBuilder } from 'auwla'

${scriptContent}

export default function ${componentName}() {
  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({ text: "Route: ${fileName}" })
      ui.P({ text: "Path: ${pagePath}" })
      ui.P({ text: "Could not compile template - using fallback" })
    })
  })
}`;
  }
}

/**
 * Convert new template format to old format that the existing parser expects
 * New: <script>...</script> + JSX template
 * Old: <script>...</script> + export default function Component() { return JSX }
 */
function convertNewTemplateToOldFormat(content: string, componentName: string): string {
  // Extract @page directive and other comments
  const pageMatch = content.match(/\/\/\s*@page\s+(.+)/);
  const comments = content.match(/^\/\/.*$/gm) || [];
  
  // Extract script section
  const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  const scriptContent = scriptMatch ? scriptMatch[1].trim() : '';
  
  // Extract template section (everything after </script>)
  const scriptEndIndex = content.indexOf('</script>');
  const templateContent = scriptEndIndex !== -1 
    ? content.substring(scriptEndIndex + 9).trim()
    : content.trim();
  
  // Build the old format
  let convertedContent = '';
  
  // Add comments
  convertedContent += comments.join('\n') + '\n\n';
  
  // Add script section
  if (scriptContent) {
    convertedContent += `<script>\n${scriptContent}\n</script>\n\n`;
  }
  
  // Add component function wrapper
  convertedContent += `export default function ${componentName}() {\n`;
  convertedContent += `  return (\n`;
  convertedContent += `    <>\n`;
  convertedContent += `      ${templateContent}\n`;
  convertedContent += `    </>\n`;
  convertedContent += `  )\n`;
  convertedContent += `}\n`;
  
  return convertedContent;
}

/**
 * Generate route component from native TSX file
 */
function generateTSXRouteComponent(content: string, componentName: string, fileName: string): string {
  try {
    // Parse the TSX content with the TSX-specific compiler
    const parsed = parseTSXFile(content);
    
    // If we found components, use the TSX codegen
    if (parsed.components.length > 0) {
      const compiled = generateAuwlaFromTSX(parsed);
      return compiled;
    } else {
      // No components found, create a wrapper for the TSX content
      return generateTSXWrapper(content, componentName, fileName);
    }
  } catch (error) {
    console.warn(`Warning: Could not compile TSX ${fileName} with Auwla compiler: ${error instanceof Error ? error.message : String(error)}`);
    
    // Fallback: Create a wrapper for the TSX content
    return generateTSXWrapper(content, componentName, fileName);
  }
}

/**
 * Generate a wrapper that converts TSX to Auwla Component format
 */
function generateTSXWrapper(content: string, componentName: string, fileName: string): string {
  // Extract imports and other top-level declarations
  const imports: string[] = [];
  const helpers: string[] = [];
  let jsxContent = '';
  
  try {
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx']
    });
    
    traverse(ast, {
      ImportDeclaration(path: any) {
        const start = path.node.start!;
        const end = path.node.end!;
        imports.push(content.substring(start, end));
      },
      VariableDeclaration(path: any) {
        // Skip if inside a function
        if (path.getFunctionParent()) return;
        
        const start = path.node.start!;
        const end = path.node.end!;
        helpers.push(content.substring(start, end));
      },
      FunctionDeclaration(path: any) {
        // Skip if not the main component
        if (path.node.id?.name !== componentName && !path.node.id?.name?.endsWith('Page')) return;
        
        // Extract JSX from the function body
        traverse(path.node.body, {
          ReturnStatement(returnPath: any) {
            if (returnPath.node.argument) {
              const start = returnPath.node.argument.start!;
              const end = returnPath.node.argument.end!;
              jsxContent = content.substring(start, end);
            }
          }
        }, undefined, path.node.body);
      },
      ExportDefaultDeclaration(path: any) {
        if (t.isFunctionDeclaration(path.node.declaration)) {
          // Extract JSX from the function body
          traverse(path.node.declaration.body, {
            ReturnStatement(returnPath: any) {
              if (returnPath.node.argument) {
                const start = returnPath.node.argument.start!;
                const end = returnPath.node.argument.end!;
                jsxContent = content.substring(start, end);
              }
            }
          }, undefined, path.node.declaration.body);
        }
      }
    });
  } catch (error) {
    // If parsing fails, create a simple fallback
    const pageMatch = content.match(/\/\/\s*@page\s+(.+)/);
    const pagePath = pageMatch ? pageMatch[1].trim() : `/${fileName.toLowerCase()}`;
    
    return `// Auto-generated route component from ${fileName}.tsx (fallback)
import { Component, LayoutBuilder } from 'auwla'

export default function ${componentName}() {
  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "p-8" }, (ui: LayoutBuilder) => {
      ui.H1({ text: "TSX Route: ${fileName}" })
      ui.P({ text: "Path: ${pagePath}" })
      ui.P({ text: "Could not parse TSX - using fallback" })
    })
  })
}`;
  }
  
  // Convert JSX to Auwla Component calls
  const convertedJSX = convertJSXToAuwla(jsxContent);
  
  return `// Auto-generated route component from ${fileName}.tsx
${imports.filter(imp => !imp.includes('React')).join('\n')}
import { Component, LayoutBuilder } from 'auwla'

export default function ${componentName}() {
  ${helpers.map(h => h.trim()).join('\n  ')}

  return Component((ui: LayoutBuilder) => {
${convertedJSX}
  })
}`;
}

/**
 * Convert JSX syntax to Auwla Component calls
 * This is a basic converter - can be enhanced for more complex JSX
 */
function convertJSXToAuwla(jsxContent: string): string {
  if (!jsxContent) {
    return '    ui.Div({ text: "No content found" })';
  }
  
  // Basic JSX to Auwla conversion
  // This is a simplified version - a full converter would need proper AST transformation
  let converted = jsxContent
    .replace(/<div([^>]*)>/g, (match, attrs) => {
      const props = parseJSXAttributes(attrs);
      return `ui.Div(${props}, (ui: LayoutBuilder) => {`;
    })
    .replace(/<\/div>/g, '})')
    .replace(/<h1([^>]*)>(.*?)<\/h1>/g, (match, attrs, content) => {
      const props = parseJSXAttributes(attrs);
      const textProp = content.trim() ? `, text: "${content.trim()}"` : '';
      return `ui.H1({ ${props}${textProp} })`;
    })
    .replace(/<h2([^>]*)>(.*?)<\/h2>/g, (match, attrs, content) => {
      const props = parseJSXAttributes(attrs);
      const textProp = content.trim() ? `, text: "${content.trim()}"` : '';
      return `ui.H2({ ${props}${textProp} })`;
    })
    .replace(/<p([^>]*)>(.*?)<\/p>/g, (match, attrs, content) => {
      const props = parseJSXAttributes(attrs);
      const textProp = content.trim() ? `, text: "${content.trim()}"` : '';
      return `ui.P({ ${props}${textProp} })`;
    });
  
  // Add proper indentation
  return converted.split('\n').map(line => `    ${line}`).join('\n');
}

/**
 * Parse JSX attributes to Auwla props format
 */
function parseJSXAttributes(attrs: string): string {
  if (!attrs || !attrs.trim()) return '';
  
  // Basic attribute parsing - can be enhanced
  const classMatch = attrs.match(/className=["']([^"']+)["']/);
  if (classMatch) {
    return `className: "${classMatch[1]}"`;
  }
  
  return '';
}

/**
 * Generate component from native TSX file
 */
function generateTSXComponent(content: string, componentName: string): string {
  try {
    // Parse the TSX content with the TSX-specific compiler
    const compiled = compileTSX(content);
    
    return compiled;
  } catch (error) {
    console.warn(`Warning: Could not compile TSX component ${componentName}: ${error instanceof Error ? error.message : String(error)}`);
    
    return `// Auto-generated component from ${componentName}.tsx (fallback)
import { Component, LayoutBuilder } from 'auwla'

export function ${componentName}() {
  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "p-4" }, (ui: LayoutBuilder) => {
      ui.H2({ text: "TSX Component: ${componentName}" })
      ui.P({ text: "Could not compile TSX - using fallback" })
    })
  })
}`;
  }
}

/**
 * Convert string to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Create a default route registry file
 */
function createDefaultRouteRegistry(): string {
  return `// Auto-generated route registry
// This file is automatically updated when you run 'npm run routes:generate'

export interface RouteDefinition {
  path: string
  component: () => any
  name: string
  meta?: Record<string, any>
}

// --- AUTO-GENERATED IMPORTS START ---
// --- AUTO-GENERATED IMPORTS END ---

// Manual routes (add your custom routes here)
const manualRoutes: RouteDefinition[] = []

// --- AUTO-GENERATED ROUTES START ---
const generatedRoutes: RouteDefinition[] = []
// --- AUTO-GENERATED ROUTES END ---

// Export all routes
export const routes: RouteDefinition[] = [
  ...manualRoutes,
  ...generatedRoutes
]

export default routes
`
}

/**
 * Clean up old generated files before generating new ones
 */
async function cleanupOldGeneratedFiles(outputDir: string) {
  try {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true })
    
    // Read all files in output directory
    const files = await fs.readdir(outputDir)
    
    // Delete all .ts files (these are generated)
    for (const file of files) {
      if (file.endsWith('.ts')) {
        const filePath = join(outputDir, file)
        await fs.unlink(filePath)
      }
    }
    
    console.log(`🧹 Cleaned up old generated files in ${outputDir}`)
  } catch (error) {
    // Directory might not exist yet, that's fine
  }
}

function wrapAsComponent(compiledCode: string, componentName: string): string {
  // For regular components, just export the compiled component
  const modifiedCode = compiledCode.replace(
    /export default Component\(/,
    `export const ${componentName} = Component(`
  );
  
  return `// Auto-generated component from ${componentName}.auwla
${modifiedCode}`
}

/**
 * Update the unified route registry with generated routes
 */
async function updateRouteRegistry(routes: RouteDefinition[], outputDir: string) {
  const registryDir = join(outputDir, '../.routes')
  const registryPath = join(registryDir, 'index.ts')
  
  try {
    // Ensure the .routes directory exists
    await fs.mkdir(registryDir, { recursive: true })
    
    let registryContent: string
    
    // Try to read existing registry, or create a new one
    try {
      registryContent = await fs.readFile(registryPath, 'utf-8')
    } catch (error) {
      // File doesn't exist, create a new registry
      registryContent = createDefaultRouteRegistry()
      console.log('📝 Created new route registry file')
    }
    
    // Generate imports for generated routes
    const imports = routes.map(route => 
      `import ${route.component} from './${route.file}'`
    ).join('\n')
    
    // Generate route definitions
    const routeDefinitions = routes.map(route => {
      const metaStr = route.meta && Object.keys(route.meta).length > 0 
        ? `,\n    meta: ${JSON.stringify(route.meta)}`
        : ''
      
      return `  {
    path: '${route.path}',
    component: ${route.component},
    name: '${route.file}'${metaStr}
  }`
    }).join(',\n')
    
    // Update imports section
    const importStartMarker = '// --- AUTO-GENERATED IMPORTS START ---'
    const importEndMarker = '// --- AUTO-GENERATED IMPORTS END ---'
    
    const importStart = registryContent.indexOf(importStartMarker)
    const importEnd = registryContent.indexOf(importEndMarker)
    
    if (importStart !== -1 && importEnd !== -1) {
      registryContent = registryContent.substring(0, importStart + importStartMarker.length) +
        '\n' + imports + '\n' +
        registryContent.substring(importEnd)
    }
    
    // Update routes section
    const routeStartMarker = '// --- AUTO-GENERATED ROUTES START ---'
    const routeEndMarker = '// --- AUTO-GENERATED ROUTES END ---'
    
    const routeStart = registryContent.indexOf(routeStartMarker)
    const routeEnd = registryContent.indexOf(routeEndMarker)
    
    if (routeStart !== -1 && routeEnd !== -1) {
      const routesArray = routes.length > 0 
        ? `const generatedRoutes: RouteDefinition[] = [\n${routeDefinitions}\n]`
        : 'const generatedRoutes: RouteDefinition[] = []'
      
      registryContent = registryContent.substring(0, routeStart + routeStartMarker.length) +
        '\n' + routesArray + '\n' +
        registryContent.substring(routeEnd)
    }
    
    await fs.writeFile(registryPath, registryContent, 'utf-8')
    console.log(`✅ Updated route registry with ${routes.length} generated routes`)
    
  } catch (error) {
    console.warn('⚠️ Could not update route registry:', error)
  }
}