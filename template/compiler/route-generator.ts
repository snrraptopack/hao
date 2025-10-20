import { promises as fs } from 'fs'
import { join, basename, relative } from 'path'
import { parseAuwlaFile } from './auwla-parser'
import { generateAuwlaFile } from 'auwla-compiler'

/**
 * Generates route definitions from .auwla files that are marked as pages
 * Only .auwla files with @page directive or in pages/ folder become routes
 */
export async function generateRoutes(pagesDir: string, outputDir: string) {
  const auwlaFiles = await findAuwlaFiles(pagesDir)
  const routes: RouteDefinition[] = []
  const components: ComponentDefinition[] = []
  
  for (const filePath of auwlaFiles) {
    const content = await fs.readFile(filePath, 'utf-8')
    const parsed = parseAuwlaFile(content)
    
    // Check if this should be a route or just a component
    const isRoute = shouldBeRoute(content, filePath, pagesDir)
    const fileName = basename(filePath, '.auwla')
    
    if (isRoute) {
      // Generate as route
      const compiled = generateAuwlaFile(parsed)
      const routePath = generateRoutePath(fileName)
      const componentName = `${fileName}Page`
      
      // Write compiled route component
      const outputPath = join(outputDir, `${fileName.toLowerCase()}.ts`)
      const wrappedComponent = wrapAsRouteComponent(compiled, componentName, fileName)
      await fs.writeFile(outputPath, wrappedComponent, 'utf-8')
      
      routes.push({
        path: routePath,
        component: componentName,
        file: fileName.toLowerCase(),
        meta: extractMeta(content)
      })
    } else {
      // Generate as regular component
      const compiled = generateAuwlaFile(parsed)
      const componentName = `${fileName}`
      
      // Write compiled component (not a route)
      const outputPath = join(outputDir, `${fileName}.component.ts`)
      const wrappedComponent = wrapAsComponent(compiled, componentName)
      await fs.writeFile(outputPath, wrappedComponent, 'utf-8')
      
      components.push({
        name: componentName,
        file: `${fileName}.component`
      })
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
      } else if (entry.name.endsWith('.auwla')) {
        files.push(fullPath)
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read
  }
  
  return files
}

/**
 * Determines if an .auwla file should become a route
 * Rules:
 * 1. Has @page directive in comments
 * 2. File name contains "Page" suffix
 * 3. File is in a pages/ subfolder
 */
function shouldBeRoute(content: string, filePath: string, pagesDir: string): boolean {
  // Check for @page directive at start of line (most explicit)
  const hasPageDirective = /^\/\/\s*@page/m.test(content) || /^\/\/\s*@route/m.test(content)
  if (hasPageDirective) {
    return true
  }
  
  const fileName = basename(filePath, '.auwla')
  const relativePath = relative(pagesDir, filePath)
  
  // Check if has Page suffix
  if (fileName.endsWith('Page')) {
    return true
  }
  
  // Check if in pages/ subfolder
  if (relativePath.includes('pages/')) {
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

function wrapAsRouteComponent(compiledCode: string, componentName: string, fileName: string): string {
  // Extract the default export from compiled code and rename it
  const modifiedCode = compiledCode.replace(
    /export default Component\(/,
    `const MainComponent = Component(`
  );
  
  return `// Auto-generated route component from ${fileName}.auwla
${modifiedCode}

// Export as route component for router
export const ${componentName} = () => {
  return MainComponent;
}`
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
  const registryPath = join(outputDir, '../../.routes/index.ts')
  
  try {
    let registryContent = await fs.readFile(registryPath, 'utf-8')
    
    // Generate imports for generated routes
    const imports = routes.map(route => 
      `import { ${route.component} } from './generated/${route.file}'`
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