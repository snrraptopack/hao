#!/usr/bin/env node
import { promises as fs } from 'fs'
import { join, dirname, relative, resolve } from 'path'

async function transpileTS(tsSource: string) {
  try {
    const ts = await import('typescript')
    const out = ts.transpileModule(tsSource, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.Preserve,
        esModuleInterop: true,
        allowJs: true
      }
    })
    return out.outputText
  } catch (e) {
    console.warn('TypeScript not available, outputting TypeScript')
    return tsSource
  }
}

async function findAuwlaFiles(dir: string): Promise<string[]> {
  const files: string[] = []
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        const subFiles = await findAuwlaFiles(fullPath)
        files.push(...subFiles)
      } else if (entry.isFile() && entry.name.endsWith('.auwla')) {
        files.push(fullPath)
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read
  }
  
  return files
}

async function extractPageDirective(filePath: string): Promise<string | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const pageMatch = content.match(/^\s*\/\/\s*@page\s+(.+)$/m)
    return pageMatch && pageMatch[1] ? pageMatch[1].trim() : null
  } catch {
    return null
  }
}

async function generateRoutesCommand(srcDir: string = 'src') {
  console.log('🔍 Scanning for .auwla files with @page directives...')
  
  const auwlaFiles = await findAuwlaFiles(srcDir)
  const routes: Array<{ path: string; file: string; route: string }> = []
  
  for (const file of auwlaFiles) {
    const pageDirective = await extractPageDirective(file)
    if (pageDirective) {
      routes.push({
        path: pageDirective,
        file: relative(process.cwd(), file),
        route: file.replace(/\.auwla$/, '').replace(/\\/g, '/')
      })
    }
  }
  
  // Generate routes directory (clean it first)
  const routesDir = '.routes/auto'
  
  // Clean existing auto-generated routes
  try {
    console.log('🧹 Cleaning existing auto-generated routes...')
    await fs.rm(routesDir, { recursive: true, force: true })
  } catch (error) {
    // Directory might not exist, that's fine
  }
  
  await fs.mkdir(routesDir, { recursive: true })
  
  if (routes.length === 0) {
    console.log('❌ No .auwla files with @page directives found')
    
    // Create empty index file
    const emptyIndexContent = `// Auto-generated routes index (no routes found)
import type { RouteConfig } from 'auwla'

export const routes: RouteConfig[] = []

export default routes
`
    await fs.writeFile(join(routesDir, 'index.ts'), emptyIndexContent)
    console.log('📁 Generated empty routes index')
    return
  }
  
  console.log(`✅ Found ${routes.length} route(s):`)
  routes.forEach(route => {
    console.log(`   ${route.path} → ${route.file}`)
  })
  
  // Generate route files
  for (const route of routes) {
    let routeFileName: string
    if (route.path === '/') {
      routeFileName = 'index.ts'
    } else {
      // Handle dynamic routes by replacing special characters
      routeFileName = route.path
        .replace(/^\//, '')           // Remove leading slash
        .replace(/\//g, '_')          // Replace slashes with underscores
        .replace(/:/g, '$')           // Replace colons with dollar signs
        .replace(/\*/g, 'wildcard')   // Replace asterisks with 'wildcard'
        + '.ts'
    }
    const routeFilePath = join(routesDir, routeFileName)
    
    const routeContent = `// Auto-generated route file
import { RouteConfig } from 'auwla'

const route: RouteConfig = {
  path: '${route.path}',
  component: () => import('../../${route.file.replace(/\\/g, '/')}')
}

export default route
`
    
    await fs.writeFile(routeFilePath, routeContent)
  }
  
  // Generate index file
  const indexContent = `// Auto-generated routes index
import type { RouteConfig } from 'auwla'

${routes.map((route, i) => {
  let fileName: string
  if (route.path === '/') {
    fileName = 'index'
  } else {
    fileName = route.path
      .replace(/^\//, '')
      .replace(/\//g, '_')
      .replace(/:/g, '$')
      .replace(/\*/g, 'wildcard')
  }
  return `import route${i} from './${fileName}.js'`
}).join('\n')}

export const routes: RouteConfig[] = [
${routes.map((_, i) => `  route${i}`).join(',\n')}
]

export default routes
`
  
  await fs.writeFile(join(routesDir, 'index.ts'), indexContent)
  
  console.log(`📁 Generated ${routes.length} route files in ${routesDir}/`)
  console.log('✨ Routes generation complete!')
}

async function compileCommand(inputPath: string, outPath?: string) {
  if (!inputPath) {
    console.error('❌ No input file provided')
    process.exit(1)
  }
  
  console.log('❌ Compile command not yet implemented in standalone CLI')
  console.log('Use the auwla-compiler package for compilation features')
  process.exit(1)
}

function showHelp() {
  console.log(`
🚀 Auwla CLI - Build reactive web applications

Usage:
  auwla <command> [options]
  auwla-routes <command> [options]

Commands:
  compile <file>     Compile a .auwla file to JavaScript
  generate           Generate routes from .auwla files with @page directives
  help              Show this help message

Options:
  --out <file>      Output file for compile command
  --src <dir>       Source directory for generate command (default: src)

Examples:
  auwla compile my-component.auwla
  auwla compile my-component.auwla --out output.js
  auwla generate
  auwla-routes generate
  auwla-routes generate --src pages
`)
}

async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0 || args.includes('-h') || args.includes('--help') || args.includes('help')) {
    showHelp()
    process.exit(0)
  }
  
  const command = args[0]
  
  switch (command) {
    case 'compile': {
      const inputPath = args[1]
      if (!inputPath) {
        console.error('❌ No input file provided for compile command')
        process.exit(1)
      }
      const outIndex = args.indexOf('--out')
      const outPath = outIndex >= 0 && args[outIndex + 1] ? args[outIndex + 1] : undefined
      await compileCommand(inputPath, outPath)
      break
    }
    
    case 'generate': {
      const srcIndex = args.indexOf('--src')
      const srcDir = srcIndex >= 0 && args[srcIndex + 1] ? args[srcIndex + 1] : 'src'
      await generateRoutesCommand(srcDir)
      break
    }
    
    default:
      console.error(`❌ Unknown command: ${command}`)
      showHelp()
      process.exit(1)
  }
}

main().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})
