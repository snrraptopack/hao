import type { Plugin } from 'vite';
import ts from 'typescript';
import path from 'path';
import { compileAuwla } from '../compiler';
import type { AuwlaConfig } from '../config';
import { getAuwlaConfig } from '../config/loader';

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
      // KEEP the routes import: the generated module performs registration
      // side effects the islands runtime depends on (__auwla_islandModules
      // registry, __prefetch map). Stripping it here left island roots with
      // no component registry, so hydration silently did nothing.
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
  let resolvedPagesDir = '';

  return {
    name: 'auwla',
    enforce: 'pre',

    configResolved(resolvedConfig) {
      viteConfig = resolvedConfig;
    },

    resolveId(source) {
      if (source === 'auwla:islands') {
        // Fallback resolver for 'auwla:islands' if the auwla-router plugin is not active.
        // This prevents Vite's import analysis from throwing resolution errors
        // during dev startup or reload of non-islands client SPAs.
        const hasRouter = viteConfig?.plugins?.some((p: any) => p.name === 'auwla-router');
        if (!hasRouter) {
          return '\0auwla:islands';
        }
      }
      return null;
    },

    load(id) {
      if (id === '\0auwla:islands') {
        return 'export default [];';
      }
      return null;
    },

    async config(config, env) {
      const root = config.root || process.cwd();
      const loadedOptions = await getAuwlaConfig(root, env);
      Object.assign(options, loadedOptions);

      const pagesDir = options.directories?.pages || 'src/pages';
      resolvedPagesDir = path.resolve(root, pagesDir);

      return {
        ssr: {
          noExternal: ['auwla']
        }
      };
    },

    async closeBundle() {
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
      (globalThis as any).__auwla_vite_server = server;
      if (options.server?.entry) {
        console.log('[auwla:vite] configureServer running, serverEntry:', options.server?.entry);
        const { createDevServerMiddleware } = await import('../dev-middleware.js');
        const middleware = await createDevServerMiddleware(server, options.server.entry);
        server.middlewares.use(middleware);
        console.log('[auwla:vite] dev middleware registered!');
      }
    },

    transform: {
      filter: {
        id: /^(?!.*[\\/]node_modules[\\/]).*\.[tj]sx$/
      },
      handler(code, id) {
        if (id.includes('/node_modules/') || id.includes('\\node_modules\\')) return null;
        const file = normalizeId(id);
        const debugFlag = options.compiler?.debugFlag || (options as any).debugFlag;
        const hasJsx = /<[a-zA-Z]/.test(code);
        if (!debugFlag && !code.includes('css') && !code.includes('define') && !hasJsx) {
          return null;
        }

        const wantsServerRendering =
          options.target === 'ssr' ||
          options.target === 'ssg' ||
          options.target === 'islands' ||
          options.target === 'island';
        
        const ssr = wantsServerRendering && this.environment?.name === 'ssr';
        const islands = options.target === 'islands' || options.target === 'island';
          
        let compiled = code;
        if (!ssr && this.environment?.name !== 'ssr') {
          if (options.target === 'ssg') {
            compiled = rewriteClientMount(compiled, file, 'static');
          } else if (options.target === 'islands' || options.target === 'island') {
            compiled = rewriteClientMount(compiled, file, 'islands');
          }
        }
        const isPage = resolvedPagesDir ? path.resolve(file).startsWith(resolvedPagesDir) : false;
        compiled = compileAuwla(compiled, file, { ssr, islands, isPage });

        if (compiled === code) {
          const marker = markerCode(false, debugFlag);
          return marker ? { code: `${marker}${code}`, map: null } : null;
        }

        return {
          code: `${markerCode(true, debugFlag)}${compiled}`,
          map: null,
        };
      }
    }
  };
}
