import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, basename, relative } from 'node:path';
import type { EnvironmentModuleNode, Plugin, ResolvedConfig, ViteDevServer } from 'vite';
import * as ts from 'typescript';
import type { AuwlaRouterOptions } from '../vite-router/types';
import { scanPagesAndLayouts, buildDirectoryTree, scanAllComponents } from '../vite-router/scanner';
import {
  generateVirtualModule,
  generateLazyVirtualModule,
  generateVirtualModuleWithLayouts,
  generateTypeFile,
} from '../vite-router/codegen';
import {
  scanServerModules,
  SERVER_EXTENSIONS,
  filePathToRouteName,
  filePathToServerRouteName,
} from '../vite-router/server-scanner';
import { buildServerManifest, writeServerManifest, generateServerManifestJs } from '../vite-router/manifest';
import type { ServerManifest } from '../server/types';
import { getAuwlaConfig } from './config-loader';

const VIRTUAL_MODULE_ID = 'auwla:routes';
const ISLANDS_VIRTUAL_MODULE_ID = 'auwla:islands';
const RESOLVED_VIRTUAL_ID = '\0auwla:routes';
const RESOLVED_ISLANDS_VIRTUAL_ID = '\0auwla:islands';
const MANIFEST_VIRTUAL_MODULE_ID = 'auwla:server-manifest';
const RESOLVED_MANIFEST_VIRTUAL_ID = '\0auwla:server-manifest';

let cachedManifestModule: string | null = null;
let ssgIsRunning = false;

function appendHotModules(
  modules: EnvironmentModuleNode[],
  ...additional: Array<EnvironmentModuleNode | undefined>
): EnvironmentModuleNode[] {
  const result = [...modules];
  const seen = new Set(result);
  for (const module of additional) {
    if (module && !seen.has(module)) {
      seen.add(module);
      result.push(module);
    }
  }
  return result;
}

export function auwlaRouter(options: AuwlaRouterOptions = {}): Plugin {
  let pagesRelDir = options.directories?.pages ?? 'src/pages';
  let genRelFile = options.router?.genFile ?? 'src/auwla.gen.ts';
  let serverRelDir = options.directories?.server ?? 'src/server';
  let manifestRelDir = options.directories?.manifest ?? '.auwla';
  let isLazy = options.router?.lazy ?? false;

  let resolvedPagesDir = '';
  let resolvedGenFile = '';
  let resolvedServerDir = '';
  let resolvedManifestDir = '';
  let viteConfig: ResolvedConfig;
  let cachedVirtualModule: string | null = null;

  return {
    name: 'auwla-router',
    enforce: 'pre',

    async config(config, env) {
      const root = config.root || process.cwd();
      const loadedOptions = await getAuwlaConfig(root, env);
      Object.assign(options, loadedOptions);
    },

    configResolved(config: ResolvedConfig) {
      viteConfig = config;
      pagesRelDir = options.directories?.pages ?? 'src/pages';
      genRelFile = options.router?.genFile ?? 'src/auwla.gen.ts';
      serverRelDir = options.directories?.server ?? 'src/server';
      manifestRelDir = options.directories?.manifest ?? '.auwla';
      isLazy = options.router?.lazy ?? false;

      resolvedPagesDir = resolve(config.root, pagesRelDir);
      resolvedGenFile = resolve(config.root, genRelFile);
      resolvedServerDir = resolve(config.root, serverRelDir);
      resolvedManifestDir = resolve(config.root, manifestRelDir);
    },

    buildStart() {
      const { moduleCode, typeCode } = buildRoutes(resolvedPagesDir, isLazy, options.router?.extensions);
      cachedVirtualModule = moduleCode;
      writeSafe(resolvedGenFile, typeCode);
      generateServerManifest(resolvedPagesDir, resolvedServerDir, resolvedManifestDir, viteConfig.root);
    },

    async closeBundle() {
      if (viteConfig.build.ssr) return;
      if (ssgIsRunning) return;
      ssgIsRunning = true;

      try {
        const { createServer } = await import('vite');
        const server = await createServer({
          configFile: viteConfig.configFile,
          server: {
            middlewareMode: true,
            hmr: { port: 0 },
            watch: null,
          },
          appType: 'custom',
        });

        try {
          const routesModule = await server.ssrLoadModule('auwla:routes');
          const routes = routesModule.default;

          if (routesModule.__prefetch) {
            for (const loadFn of Object.values(routesModule.__prefetch)) {
              if (typeof loadFn === 'function') {
                await loadFn();
              }
            }
          }

          const getRouteRenderMode = (routePath: string, routeConfig: any) => {
            if (routeConfig?.renderMode) return routeConfig.renderMode;
            if (options.routeRules) {
              for (const [pattern, rule] of Object.entries(options.routeRules)) {
                if (matchRouteRulePattern(pattern, routePath)) {
                  return rule.renderMode;
                }
              }
            }
            return options.target ?? 'spa';
          };

          const ssgRoutes = routes.filter((r: any) => {
            const mode = getRouteRenderMode(r.path, r.config);
            return mode === 'ssg';
          });
          if (ssgRoutes.length === 0) return;

          console.log(`\n[auwla] Found ${ssgRoutes.length} SSG route(s). Generating static pages...`);

          const { renderToString } = await server.ssrLoadModule('auwla/runtime/ssr');
          const outDir = resolve(viteConfig.root, viteConfig.build.outDir || 'dist');
          const templatePath = resolve(outDir, 'index.html');

          let template = '';
          try {
            const fs = await import('node:fs');
            template = fs.readFileSync(templatePath, 'utf-8');
          } catch {
            console.error(`[auwla] Error: SSG template index.html not found at ${templatePath}`);
            return;
          }

          for (const route of ssgRoutes) {
            let paths: string[] = [];
            if (route.path.includes(':') || route.path === '*') {
              if (route.config?.generatePaths) {
                const paramsList = await route.config.generatePaths();
                for (const params of paramsList) {
                  let path = route.path;
                  for (const [key, value] of Object.entries(params)) {
                    path = path.replace(`:${key}`, String(value));
                  }
                  paths.push(path);
                }
              } else {
                console.warn(`[auwla] Warning: Dynamic route "${route.path}" is configured for SSG but does not export "generatePaths()". Skipping.`);
              }
            } else {
              paths.push(route.path);
            }

            for (const path of paths) {
              console.log(`[auwla] Rendering static page: ${path}`);
              let ssgManifest: ServerManifest = {};
              try {
                const fs = await import('node:fs');
                const manifestPath = resolve(resolvedManifestDir, 'server-manifest.json');
                ssgManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
              } catch (e) {
                console.warn(`[auwla] Warning: Failed to load server manifest for SSG:`, e);
              }

              const result = await renderToString(`http://localhost${path}`, routes, {
                manifest: ssgManifest,
              });

              const pageHtml = template
                .replace('id="app"', 'id="app" data-auwla-ssr="true"')
                .replace('<!--app-html-->', result.html);

              const cleanPath = path === '/' ? 'index.html' : `${path.replace(/^\//, '')}/index.html`;
              const writePath = resolve(outDir, cleanPath);
              console.log(`[auwla] Writing static page to: ${writePath}`);

              writeSafe(writePath, pageHtml);
            }
          }
        } finally {
          await server.close();
          ssgIsRunning = false;
        }
      } catch (err) {
        console.error('[auwla] SSG generation failed:', err);
        ssgIsRunning = false;
      }
    },

    resolveId: {
      filter: {
        id: /^(auwla:routes|auwla:islands|auwla:server-manifest)$/
      },
      handler(source) {
        if (source === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_ID;
        if (source === ISLANDS_VIRTUAL_MODULE_ID) return RESOLVED_ISLANDS_VIRTUAL_ID;
        if (source === MANIFEST_VIRTUAL_MODULE_ID) return RESOLVED_MANIFEST_VIRTUAL_ID;
        return null;
      }
    },

    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const pathname = url.pathname;

        if (!pathname.includes('.') && pathname !== '/') {
          const outDir = server.config.build.outDir || 'dist';
          const cleanPath = pathname.replace(/^\//, '');
          const staticFile = resolve(server.config.root, outDir, cleanPath, 'index.html');

          if (existsSync(staticFile)) {
            req.url = pathname + (pathname.endsWith('/') ? '' : '/') + 'index.html' + url.search;
          }
        }
        next();
      });
    },

    load(id: string) {
      const isClient = this.environment?.name === 'client';
      if (isClient && isServerFile(id)) {
        const cleanId = id.replace(/[?#].*$/, '');
        const normId = cleanId.replace(/\\/g, '/');
        const normPages = resolvedPagesDir.replace(/\\/g, '/');
        const isPages = normId.startsWith(normPages);

        const rootDir = isPages ? resolvedPagesDir : resolvedServerDir;
        const relativePath = relative(rootDir, cleanId).replace(/\\/g, '/');

        const routeName = isPages
          ? filePathToRouteName(relativePath)
          : filePathToServerRouteName(relativePath);

        const manifestPath = resolve(resolvedManifestDir, 'server-manifest.json');
        let manifest: ServerManifest = {};
        try {
          manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
        } catch {}

        const exports = parseServerExports(cleanId);

        let code = `import { rpcCall, getCurrentRoutePath } from 'auwla/client';\n`;
        for (const name of exports) {
          const key = `${routeName}.${name}`;
          const entry = manifest[key];
          const method = entry?.method ?? 'GET';
          // Signature: rpcCall(key, args, routePath, options). The route path
          // must come from the live router context — page server functions
          // declare a routePattern and the adapter validates it (B1).
          code += `export const ${name} = (...args) => rpcCall('${key}', args, getCurrentRoutePath(), { method: '${method}' });\n`;
          code += `${name}.__auwla_key = '${key}';\n`;
        }
        return code;
      }

      if (id === RESOLVED_MANIFEST_VIRTUAL_ID) {
        if (!cachedManifestModule) {
          const serverModules = scanServerModules(resolvedPagesDir, resolvedServerDir);
          const manifest = buildServerManifest(serverModules, viteConfig.root);
          cachedManifestModule = generateServerManifestJs(manifest);
        }
        return cachedManifestModule;
      }

      if (id === RESOLVED_ISLANDS_VIRTUAL_ID) {
        const srcDir = resolve(resolvedPagesDir, '..');
        const components = scanAllComponents(srcDir, { extensions: options.router?.extensions });
        return generateIslandClientVirtualModule(components);
      }

      if (id !== RESOLVED_VIRTUAL_ID) return null;

      if (!cachedVirtualModule) {
        const { moduleCode, typeCode } = buildRoutes(resolvedPagesDir, isLazy, options.router?.extensions);
        cachedVirtualModule = moduleCode;
        writeSafe(resolvedGenFile, typeCode);
        generateServerManifest(resolvedPagesDir, resolvedServerDir, resolvedManifestDir, viteConfig.root);
      }

      return cachedVirtualModule;
    },

    transform(code: string, id: string) {
      if (id.includes('node_modules')) return null;

      const isSsr = this.environment?.name === 'ssr';
      if (isSsr && isServerFile(id)) {
        const cleanId = id.replace(/[?#].*$/, '');
        const normId = cleanId.replace(/\\/g, '/');
        const normPages = resolvedPagesDir.replace(/\\/g, '/');
        const isPages = normId.startsWith(normPages);

        const rootDir = isPages ? resolvedPagesDir : resolvedServerDir;
        const relativePath = relative(rootDir, cleanId).replace(/\\/g, '/');

        const routeName = isPages
          ? filePathToRouteName(relativePath)
          : filePathToServerRouteName(relativePath);

        const exports = parseServerExports(cleanId);
        let inject = '';
        for (const name of exports) {
          const key = `${routeName}.${name}`;
          inject += `\nif (typeof ${name} !== 'undefined' && ${name} !== null) { ${name}.__auwla_key = '${key}'; }`;
        }
        return { code: code + inject, map: null };
      }
      return null;
    },

    hotUpdate(ctx) {
      const file = ctx.file;
      const extensions = options.router?.extensions ?? ['.tsx', '.ts', '.jsx', '.js'];
      const isPage = isPageFile(file, resolvedPagesDir, extensions);
      const isLayout = /^_layout\.[jt]sx?$/.test(basename(file));
      const isSrv = isServerFile(file);
      const moduleGraph = this.environment.moduleGraph;

      if (isSrv) {
        generateServerManifest(resolvedPagesDir, resolvedServerDir, resolvedManifestDir, viteConfig.root);
        return appendHotModules(
          ctx.modules,
          moduleGraph.getModuleById(RESOLVED_MANIFEST_VIRTUAL_ID),
        );
      }

      if (!isPage && !isLayout) return;

      const { moduleCode, typeCode } = buildRoutes(resolvedPagesDir, isLazy, extensions);
      cachedVirtualModule = moduleCode;
      writeSafe(resolvedGenFile, typeCode);

      // Vite 8 invokes hotUpdate once per environment. Returning the generated
      // modules lets that environment's native HMR pipeline invalidate and
      // propagate them. Returning [] here would suppress propagation entirely.
      return appendHotModules(
        ctx.modules,
        moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID),
        moduleGraph.getModuleById(RESOLVED_ISLANDS_VIRTUAL_ID),
      );
    },


    configureServer(server: ViteDevServer) {
      server.watcher.add(resolvedPagesDir);
      if (resolvedServerDir) {
        server.watcher.add(resolvedServerDir);
      }

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', `http://${req.headers.host || 'localhost'}`);
        if (url.pathname !== '/_auwla/rpc' || (req.method !== 'POST' && req.method !== 'GET')) {
          return next();
        }

        try {
          const { createFetchAdapter } = await import('auwla/adapters/fetch');
          const manifestPath = resolve(resolvedManifestDir, 'server-manifest.json');
          const manifest: ServerManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
          const adapter = createFetchAdapter({
            manifest,
            load: (modulePath: string) => {
              // Manifest paths are root-relative (S6) — ssrLoadModule wants a
              // leading '/' for root-relative ids (absolute paths pass through).
              const isAbs = /^([a-zA-Z]:[\\/]|\/)/.test(modulePath);
              return server.ssrLoadModule(isAbs ? modulePath : `/${modulePath}`);
            },
          });
          const request = await nodeRequestToRequest(req);
          const response = await adapter(request, { vite: { server, req, res } })

          if (!response) {
            return next();
          }

          await sendNodeResponse(res, response);
        } catch (err) {
          next(err);
        }
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function generateServerManifest(
  pagesDir: string,
  serverDir: string,
  manifestDir: string,
  rootDir?: string,
): void {
  const serverModules = scanServerModules(pagesDir, serverDir);
  const manifest = buildServerManifest(serverModules, rootDir);
  writeServerManifest(manifestDir, manifest);
  cachedManifestModule = null;
}

function buildRoutes(
  pagesDir: string,
  lazy: boolean,
  extensions?: string[]
): { moduleCode: string; typeCode: string } {
  const { pages, layouts } = scanPagesAndLayouts(pagesDir, { extensions });
  const typeCode = generateTypeFile(pages);

  let moduleCode: string;
  if (layouts.length > 0) {
    const tree = buildDirectoryTree(pages, layouts);
    moduleCode = generateVirtualModuleWithLayouts(tree, lazy);
  } else {
    moduleCode = lazy
      ? generateLazyVirtualModule(pages)
      : generateVirtualModule(pages);
  }

  return { moduleCode, typeCode };
}

function generateIslandClientVirtualModule(
  components: { name: string; filePath: string }[],
): string {
  const lines: string[] = [
    '// auwla:islands - island client registry',
    '// Do not edit. Re-generated whenever the pages directory changes.',
    '',
    'if (typeof window !== \'undefined\') {',
    '  globalThis.__auwla_islandModules = globalThis.__auwla_islandModules || {}',
  ];

  for (const comp of components) {
    const importPath = JSON.stringify(comp.filePath.replace(/\\/g, '/'));
    lines.push(`  globalThis.__auwla_islandModules[${JSON.stringify(comp.name)}] = { load: () => import(${importPath}) }`);
  }

  lines.push('}');
  lines.push('export default []');
  lines.push('');

  return lines.join('\n');
}

function writeSafe(filePath: string, content: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, content, 'utf-8');
}

function isServerFile(file: string): boolean {
  const cleanPath = file.replace(/[?#].*$/, '');
  return SERVER_EXTENSIONS.some((ext) => cleanPath.endsWith(ext));
}

function isPageFile(
  file: string,
  pagesDir: string,
  extensions: string[],
): boolean {
  const cleanPath = file.replace(/[?#].*$/, '');
  const normFile = cleanPath.replace(/\\/g, '/');
  const normPagesDir = pagesDir.replace(/\\/g, '/');
  return (
    normFile.startsWith(normPagesDir) &&
    extensions.some((ext) => normFile.endsWith(ext))
  );
}

function parseServerExports(filePath: string): string[] {
  const content = readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const exports: string[] = [];

  for (const statement of sourceFile.statements) {
    if (ts.isExportDeclaration(statement)) {
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) {
          exports.push(element.name.text);
        }
      }
    } else if ((ts.getCombinedModifierFlags(statement as any) & ts.ModifierFlags.Export) !== 0) {
      if (ts.isFunctionDeclaration(statement) && statement.name) {
        exports.push(statement.name.text);
      } else if (ts.isVariableStatement(statement)) {
        for (const decl of statement.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            exports.push(decl.name.text);
          }
        }
      }
    }
  }

  return exports;
}

function matchRouteRulePattern(pattern: string, path: string): boolean {
  let regexStr = pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  regexStr = regexStr.replace(/\\\*\\\*/g, '.*');
  regexStr = regexStr.replace(/\\\*/g, '[^/]*');
  regexStr = regexStr.replace(/:[a-zA-Z]+/g, '[^/]+');
  const regex = new RegExp(`^${regexStr}\\/?$`);
  return regex.test(path);
}

async function nodeRequestToRequest(req: import('http').IncomingMessage): Promise<Request> {
  const protocol = (req.headers['x-forwarded-proto'] as string) || 'http';
  const host = req.headers.host || 'localhost';
  const pathname = (req as any).originalUrl ?? req.url ?? '/';
  const url = `${protocol}://${host}${pathname}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => headers.append(key, v));
    } else {
      headers.set(key, value);
    }
  }

  const method = req.method || 'GET';
  if (method === 'GET' || method === 'HEAD') {
    return new Request(url, { method, headers });
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks);

  return new Request(url, { method, headers, body });
}

async function sendNodeResponse(
  res: import('http').ServerResponse,
  response: Response,
): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  const body = await response.arrayBuffer();
  res.end(Buffer.from(body));
}
