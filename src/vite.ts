import type { Plugin } from 'vite';
import ts from 'typescript';
import { compileAuwla } from './compiler';

import { type AuwlaConfig } from './config';

export type AuwlaViteOptions = AuwlaConfig;

function normalizeId(id: string): string {
  return id.split('?', 1)[0] ?? id;
}

function markerCode(value: boolean, debugFlag: boolean | string | undefined): string {
  if (!debugFlag) return '';
  const name = typeof debugFlag === 'string' ? debugFlag : '__AUWLA_COMPILED__';
  return `globalThis.${name} = ${value};\n`;
}

type ClientMountRewriteMode = 'islands' | 'static';

function rewriteClientMount(code: string, file: string, mode: ClientMountRewriteMode): string {
  if (!code.includes('createMemoApp')) return code;

  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const replacements: Array<{ start: number; end: number; text: string }> = [];
  const createMemoNames = new Set<string>();
  const strippedNames = new Set<string>();
  const runtimeImport = mode === 'islands' ? 'auwla/runtime/islands' : 'auwla/runtime/static';
  const runtimeExport = mode === 'islands' ? 'createIslandsApp' : 'createStaticApp';

  function collectIdentifiers(node: ts.Node) {
    if (ts.isIdentifier(node)) strippedNames.add(node.text);
    ts.forEachChild(node, collectIdentifiers);
  }

  function getImportLocalNames(statement: ts.ImportDeclaration): string[] {
    const clause = statement.importClause;
    if (!clause) return [];
    const names: string[] = [];
    if (clause.name) names.push(clause.name.text);
    const named = clause.namedBindings;
    if (named && ts.isNamespaceImport(named)) {
      names.push(named.name.text);
    } else if (named && ts.isNamedImports(named)) {
      for (const element of named.elements) names.push(element.name.text);
    }
    return names;
  }

  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const specifier = statement.moduleSpecifier.text;

    if (specifier === 'auwla:routes') {
      replacements.push({
        start: statement.getFullStart(),
        end: statement.getEnd(),
        text: '',
      });
      continue;
    }

    if (specifier === 'auwla/router') {
      const clause = statement.importClause;
      const named = clause?.namedBindings;
      if (
        !clause?.name &&
        named &&
        ts.isNamedImports(named) &&
        named.elements.length === 1 &&
        (named.elements[0]!.propertyName?.text ?? named.elements[0]!.name.text) === 'Router'
      ) {
        replacements.push({
          start: statement.getFullStart(),
          end: statement.getEnd(),
          text: '',
        });
      }
      continue;
    }

    if (specifier !== 'auwla') continue;
    const clause = statement.importClause;
    const named = clause?.namedBindings;
    if (!named || !ts.isNamedImports(named)) continue;
    if (clause.name || named.elements.length !== 1) continue;

    for (const element of named.elements) {
      const imported = element.propertyName?.text ?? element.name.text;
      if (imported !== 'createMemoApp') continue;

      const local = element.name.text;
      createMemoNames.add(local);
      const replacement = local === runtimeExport ? runtimeExport : `${runtimeExport} as ${local}`;
      replacements.push({
        start: element.getStart(source),
        end: element.getEnd(),
        text: replacement,
      });
      replacements.push({
        start: statement.moduleSpecifier.getStart(source),
        end: statement.moduleSpecifier.getEnd(),
        text: JSON.stringify(runtimeImport),
      });
    }
  }

  if (createMemoNames.size === 0) return code;

  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      createMemoNames.has(node.expression.text) &&
      node.arguments.length > 1
    ) {
      for (const argument of node.arguments.slice(1)) collectIdentifiers(argument);
      replacements.push({
        start: node.arguments[0]!.getEnd(),
        end: node.getEnd() - 1,
        text: '',
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);

  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const specifier = statement.moduleSpecifier.text;
    if (specifier === 'auwla' || specifier === 'auwla:routes' || specifier === 'auwla/router') continue;
    const names = getImportLocalNames(statement);
    if (names.length > 0 && names.every((name) => strippedNames.has(name))) {
      replacements.push({
        start: statement.getFullStart(),
        end: statement.getEnd(),
        text: '',
      });
    }
  }

  let output = code;
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    output = `${output.slice(0, replacement.start)}${replacement.text}${output.slice(replacement.end)}`;
  }

  return output;
}

export function auwla(options: AuwlaViteOptions = {}): Plugin {
  let viteConfig: any;

  return {
    name: 'auwla',
    enforce: 'pre',

    configResolved(resolvedConfig) {
      viteConfig = resolvedConfig;
    },

    async config(viteConfig, env) {
      const { loadConfigFromFile } = await import('vite');
      const fs = await import('node:fs');
      const path = await import('node:path');
      const root = viteConfig.root || process.cwd();
      
      let loaded = null;
      if (fs.existsSync(path.resolve(root, 'auwla.config.ts'))) {
        loaded = await loadConfigFromFile(env, 'auwla.config.ts', root);
      } else if (fs.existsSync(path.resolve(root, 'auwla.config.js'))) {
        loaded = await loadConfigFromFile(env, 'auwla.config.js', root);
      } else if (fs.existsSync(path.resolve(root, 'auwla.config.mjs'))) {
        loaded = await loadConfigFromFile(env, 'auwla.config.mjs', root);
      }

      if (loaded) {
        Object.assign(options, loaded.config);
      }

      return {
        ssr: {
          noExternal: ['auwla']
        }
      };
    },

    async closeBundle() {
      // Automatic two-pass build orchestration
      if (
        options.server?.entry &&
        !viteConfig.build.ssr &&
        process.env.AUWLA_SKIP_SSR_BUILD !== 'true'
      ) {
        process.env.AUWLA_SKIP_SSR_BUILD = 'true';
        console.log('\n[auwla] Client build complete. Automatically starting server build...');
        
        try {
          const vite = await import('vite');
          await vite.build({
            configFile: viteConfig.configFile,
            build: {
              ssr: options.server.entry,
              outDir: 'dist/server',
              emptyOutDir: false,
            }
          });
        } catch (e) {
          console.error('[auwla] Failed to run automatic SSR build', e);
        }
      }
    },

    async configureServer(server) {
      ;(globalThis as any).__auwla_vite_server = server;
      if (options.server?.entry) {
        console.log('[auwla:vite] configureServer running, serverEntry:', options.server?.entry)
        const { createDevServerMiddleware } = await import('./dev-middleware.js')
        const middleware = await createDevServerMiddleware(server, options.server.entry)
        server.middlewares.use(middleware)
        console.log('[auwla:vite] dev middleware registered!')
      }
    },

    transform(code, id, transformOptions) {
      const include = options.compiler?.include ?? /\.[tj]sx$/;
      const exclude = options.compiler?.exclude;

      const file = normalizeId(id);
      if (!include.test(file)) return null;
      if (exclude?.test(file)) return null;
      if (file.includes('/node_modules/') || file.includes('\\node_modules\\')) return null;

      const hasJsx = /<[a-zA-Z]/.test(code);
      if (!options.compiler?.debugFlag && !code.includes('css') && !code.includes('define') && !hasJsx) {
        return null;
      }

      // SSR compilation requires BOTH conditions to be true:
      //   1. The project opts into server-side HTML rendering via `target: 'ssr'` or `target: 'ssg'`.
      //      Without this, a project with a server entry (e.g. SPA fullstack or API-only) would
      //      never want page modules compiled to SSR string output.
      //   2. Vite confirms this specific module load is happening in a server-side context.
      //      This is the signal that distinguishes the server pass from the client pass for the
      //      same file. Using OR here (the previous bug) caused client modules to be compiled
      //      as SSR too, producing `[object Object]` instead of DOM nodes during hydration.
      const wantsServerRendering = options.target === 'ssr' || options.target === 'ssg' || options.target === 'islands' || options.target === 'island';
      const viteIsInSsrContext =
        transformOptions?.ssr === true ||
        // @ts-ignore: Vite 6 Environment API
        this.environment?.name === 'ssr' ||
        // @ts-ignore: Vite 6 Environment API fallback
        this.environment?.name === 'server';

      const ssr = wantsServerRendering && viteIsInSsrContext;
      const islands = options.target === 'islands' || options.target === 'island';
        
      let compiled = code;
      if (!ssr && !viteIsInSsrContext) {
        if (options.target === 'ssg') {
          compiled = rewriteClientMount(compiled, file, 'static');
        } else if (options.target === 'islands' || options.target === 'island') {
          compiled = rewriteClientMount(compiled, file, 'islands');
        }
      }
      compiled = compileAuwla(compiled, file, { ssr, islands });

      if (compiled === code) {
        const marker = markerCode(false, options.compiler?.debugFlag);
        return marker ? { code: `${marker}${code}`, map: null } : null;
      }

      return {
        code: `${markerCode(true, options.compiler?.debugFlag)}${compiled}`,
        map: null,
        moduleType: 'js',
      };
    },
  };
}

export default auwla;
