/**
 * @fileoverview Scanner for Auwla server-only `.server.ts` files.
 *
 * Walks the pages directory (and optionally src/server) and produces a list
 * of server module descriptors. Each descriptor contains the route name,
 * params type, and exported remote functions discovered in the file.
 */

import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import * as ts from 'typescript'
import type { RemoteMethod } from '../server/types'

/** Extensions recognised as server files. */
export const SERVER_EXTENSIONS = ['.server.ts', '.server.tsx', '.server.js', '.server.jsx']

/**
 * A single exported remote function inside a server module.
 */
export interface ServerExport {
  /** Export name, e.g. "getPosts". */
  name: string
  /** Declared HTTP method. Plain functions default to GET. */
  method: RemoteMethod
  /** Type strings for each positional argument. */
  argsType: string[]
  /** Type string for the resolved return value. */
  returnType: string
}

/**
 * Descriptor for one `.server.ts` file.
 */
export interface ServerModule {
  /** Absolute path to the server file. */
  filePath: string
  /** Relative path from the scanned root. */
  relativePath: string
  /**
   * Dot-notation route name used as the prefix for remote keys.
   */
  routeName: string
  /**
   * URL route pattern used by the adapter to extract params.
   */
  routePattern: string
  /**
   * Ordered param names extracted from the route pattern.
   */
  params: string[]
  /** Generated TypeScript type string for route params. */
  paramsType: string
  /** Discovered remote function exports. */
  exports: ServerExport[]
}

interface CollectedModule {
  filePath: string
  relativePath: string
  routeName: string
  routePattern: string
  params: string[]
  paramsType: string
}

/**
 * Scan `pagesDir` and `serverDir` for `.server.ts` files and return descriptors.
 *
 * @param pagesDir Absolute path to the pages directory (e.g. src/pages).
 * @param serverDir Absolute path to the server directory (e.g. src/server), or null to skip.
 */
export function scanServerModules(
  pagesDir: string,
  serverDir: string | null,
): ServerModule[] {
  const collected: CollectedModule[] = []

  if (pagesDir) collectModules(pagesDir, pagesDir, true, collected)
  if (serverDir) collectModules(serverDir, serverDir, false, collected)

  if (collected.length === 0) return []

  const filePaths = collected.map((m) => m.filePath)
  const compilerOptions = loadCompilerOptions()
  const program = getCachedProgram(filePaths, compilerOptions)
  const checker = program.getTypeChecker()

  const result: ServerModule[] = []

  for (const item of collected) {
    const sourceFile = program.getSourceFile(item.filePath)
    if (!sourceFile) continue

    const exports = extractServerExportsFromAST(sourceFile, checker)
    if (exports.length === 0) continue

    result.push({
      ...item,
      exports,
    })
  }

  return result
}

function collectModules(
  rootDir: string,
  currentDir: string,
  isPages: boolean,
  result: CollectedModule[],
): void {
  let entries: string[]
  try {
    entries = readdirSync(currentDir)
  } catch {
    return
  }

  for (const entry of entries) {
    const fullPath = join(currentDir, entry)
    let stat: ReturnType<typeof statSync>
    try {
      stat = statSync(fullPath)
    } catch {
      continue
    }

    if (stat.isDirectory()) {
      collectModules(rootDir, fullPath, isPages, result)
      continue
    }

    const ext = SERVER_EXTENSIONS.find((e) => entry.endsWith(e))
    if (!ext) continue

    const relativePath = relative(rootDir, fullPath).replace(/\\/g, '/')

    const routeName = isPages
      ? filePathToRouteName(relativePath)
      : filePathToServerRouteName(relativePath)
    const routePattern = isPages
      ? filePathToRoutePattern(relativePath)
      : ''
    const params = isPages
      ? filePathToParams(relativePath)
      : []
    const paramsType = isPages
      ? filePathToParamsType(relativePath)
      : 'Record<string, never>'

    result.push({
      filePath: fullPath,
      relativePath,
      routeName,
      routePattern,
      params,
      paramsType,
    })
  }
}

/**
 * Convert a pages-relative server file path into a dot-notation route name.
 */
export function filePathToRouteName(relativePath: string): string {
  const withoutExt = relativePath.replace(/\.server\.[jt]sx?$/, '')
  const parts = withoutExt.split('/')

  const segments: string[] = []
  for (const part of parts) {
    if (part === 'index') continue
    // Ignore dynamic/catch-all segments for the route name.
    if (/^\[/.test(part)) continue
    segments.push(part)
  }

  return segments.join('.') || 'index'
}

/**
 * Convert a server-dir-relative file path into a dot-notation route name.
 */
export function filePathToServerRouteName(relativePath: string): string {
  const withoutExt = relativePath.replace(/\.server\.[jt]sx?$/, '')
  return withoutExt.replace(/\//g, '.')
}

/**
 * Convert a pages-relative server file path into a URL route pattern.
 */
export function filePathToRoutePattern(relativePath: string): string {
  const withoutExt = relativePath.replace(/\.server\.[jt]sx?$/, '')
  const segments = withoutExt.split('/')

  const routeSegments: string[] = []
  for (const segment of segments) {
    if (/^\[\.\.\./.test(segment)) {
      routeSegments.push('*')
      return routeSegments.length === 0
        ? '/*'
        : '/' + routeSegments.join('/')
    }
    const dynamicMatch = segment.match(/^\[(.+)\]$/)
    if (dynamicMatch) {
      routeSegments.push(`:${dynamicMatch[1]}`)
      continue
    }
    if (segment === 'index') {
      continue
    }
    routeSegments.push(segment)
  }

  return routeSegments.length === 0 ? '/' : '/' + routeSegments.join('/')
}

/**
 * Generate a TypeScript params type from a pages-relative server file path.
 */
export function filePathToParamsType(relativePath: string): string {
  const withoutExt = relativePath.replace(/\.server\.[jt]sx?$/, '')
  const parts = withoutExt.split('/')

  const fields: string[] = []
  for (const part of parts) {
    const spreadMatch = part.match(/^\[\.\.\.([^\]]+)\]$/)
    if (spreadMatch) {
      fields.push(`${spreadMatch[1]}: string[]`)
      continue
    }
    const paramMatch = part.match(/^\[([^\]]+)\]$/)
    if (paramMatch) {
      fields.push(`${paramMatch[1]}: string`)
    }
  }

  if (fields.length === 0) return 'Record<string, never>'
  return `{ ${fields.join('; ')} }`
}

/**
 * Extract ordered param names from a pages-relative server file path.
 */
export function filePathToParams(relativePath: string): string[] {
  const withoutExt = relativePath.replace(/\.server\.[jt]sx?$/, '')
  const parts = withoutExt.split('/')

  const params: string[] = []
  for (const part of parts) {
    const spreadMatch = part.match(/^\[\.\.\.([^\]]+)\]$/)
    if (spreadMatch) {
      params.push(spreadMatch[1]!)
      break
    }
    const paramMatch = part.match(/^\[([^\]]+)\]$/)
    if (paramMatch) {
      params.push(paramMatch[1]!)
    }
  }

  return params
}

/**
 * `ts.createProgram` over all server files dominates scan time (P1), so the
 * program is cached across calls. The key includes every root file's path +
 * mtime and the compiler options, so any edit (e.g. HMR) invalidates the
 * cache and scan semantics are unchanged.
 */
let programCache: { key: string; program: ts.Program } | null = null

function getCachedProgram(filePaths: string[], compilerOptions: ts.CompilerOptions): ts.Program {
  const key =
    JSON.stringify(compilerOptions) +
    '|' +
    filePaths
      .map((f) => {
        let mtime = 0
        try {
          mtime = statSync(f).mtimeMs
        } catch {}
        return `${f}:${mtime}`
      })
      .sort()
      .join('|')

  if (programCache && programCache.key === key) {
    return programCache.program
  }

  const program = ts.createProgram(filePaths, compilerOptions)
  programCache = { key, program }
  return program
}

/**
 * Loads compiler options from the nearest tsconfig.json, falling back to defaults.
 */
function loadCompilerOptions(): ts.CompilerOptions {
  const tsconfigPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json')
  if (tsconfigPath) {
    const readResult = ts.readConfigFile(tsconfigPath, ts.sys.readFile)
    if (!readResult.error && readResult.config) {
      const parseResult = ts.parseJsonConfigFileContent(
        readResult.config,
        ts.sys,
        process.cwd(),
      )
      return parseResult.options
    }
  }

  return {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    allowJs: true,
    strict: true,
  }
}

/**
 * Parse a source file's AST using the TypeChecker to locate and resolve exports.
 */
export function extractServerExportsFromAST(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
): ServerExport[] {
  const exports: ServerExport[] = []

  for (const statement of sourceFile.statements) {
    if (!isExported(statement)) continue

    // Ignore type/interface/module exports as they don't produce runtime code
    if (
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isModuleDeclaration(statement)
    ) {
      continue
    }

    // Case 1: Plain function declarations: export async function name(...)
    if (ts.isFunctionDeclaration(statement)) {
      const detail = parseFunctionDeclaration(statement, checker)
      if (detail) {
        exports.push(detail)
      } else {
        throw new Error(
          `[Auwla Server Scanner] Exported function "${statement.name?.text}" in "${sourceFile.fileName}" is not valid. ` +
          `Only remote functions and types can be exported from .server.ts files.`
        )
      }
    }

    // Case 2: Remote variable declarations: export const name = remote.get(...)
    else if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.initializer) {
          const name = decl.name.text
          const remoteInfo = getRemoteMethodInfo(decl.initializer)
          if (remoteInfo) {
            const detail = parseRemoteCall(name, remoteInfo.method, remoteInfo.handler, checker)
            if (detail) {
              exports.push(detail)
            }
          } else {
            throw new Error(
              `[Auwla Server Scanner] Exported variable "${name}" in "${sourceFile.fileName}" is not wrapped in "remote.get()" or "remote.post()". ` +
              `Only remote endpoints and types can be exported from .server.ts files.`
            )
          }
        }
      }
    } else {
      throw new Error(
        `[Auwla Server Scanner] Unsupported export statement in "${sourceFile.fileName}". ` +
        `Only remote functions and remote-wrapped variables can be exported from .server.ts files.`
      )
    }
  }

  return exports
}



function isExported(node: ts.Node): boolean {
  return (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0
}

function getRemoteMethodInfo(
  initializer: ts.Expression,
): { method: RemoteMethod; handler: ts.Expression } | null {
  if (!ts.isCallExpression(initializer)) return null
  const expr = initializer.expression
  if (!ts.isPropertyAccessExpression(expr)) return null

  const objText = expr.expression.getText()
  const propText = expr.name.text

  if (objText !== 'remote') return null
  if (propText !== 'get' && propText !== 'post') return null

  const method = propText.toUpperCase() as RemoteMethod

  const args = initializer.arguments
  if (args.length === 0) return null
  const handler = args[args.length - 1]
  if (!handler) return null

  return { method, handler }
}

function parseFunctionDeclaration(
  node: ts.FunctionDeclaration,
  checker: ts.TypeChecker,
): ServerExport | null {
  if (!node.name) return null
  const name = node.name.text

  const signature = checker.getSignatureFromDeclaration(node)
  if (!signature) return null

  const argsType: string[] = []
  for (const param of signature.getParameters()) {
    const paramType = checker.getTypeOfSymbolAtLocation(param, node)
    argsType.push(checker.typeToString(paramType))
  }

  const returnType = unwrapPromiseType(signature.getReturnType(), checker)

  return {
    name,
    method: 'GET',
    argsType,
    returnType,
  }
}

function parseRemoteCall(
  name: string,
  method: RemoteMethod,
  handler: ts.Expression,
  checker: ts.TypeChecker,
): ServerExport | null {
  const handlerType = checker.getTypeAtLocation(handler)
  const signatures = handlerType.getCallSignatures()
  if (signatures.length === 0) return null

  const signature = signatures[0]!
  const parameters = signature.getParameters()

  // Skip local context
  const clientParams = parameters.slice(1)

  const argsType: string[] = []
  for (const param of clientParams) {
    const paramType = checker.getTypeOfSymbolAtLocation(param, handler)
    argsType.push(checker.typeToString(paramType))
  }

  const returnType = unwrapPromiseType(signature.getReturnType(), checker)

  return {
    name,
    method,
    argsType,
    returnType,
  }
}

function unwrapPromiseType(type: ts.Type, checker: ts.TypeChecker): string {
  const symbol = type.getSymbol()
  if (symbol && symbol.getName() === 'Promise') {
    const typeRef = type as ts.TypeReference
    if (typeRef.typeArguments && typeRef.typeArguments.length > 0) {
      const typeArg = typeRef.typeArguments[0]
      if (typeArg) {
        return checker.typeToString(typeArg)
      }
    }
  }

  const typeStr = checker.typeToString(type)
  const match = typeStr.match(/^Promise<(.+)>$/)
  if (match) {
    return match[1]!.trim()
  }
  return typeStr
}
