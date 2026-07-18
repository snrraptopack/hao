/**
 * @fileoverview Static site generation (SSG) for the Auwla router plugin.
 *
 * Runs after the client bundle is written (`closeBundle`): spins up a
 * middleware-mode Vite server to load the generated routes, renders every
 * route whose render mode is `'ssg'` (page `config` or `routeRules`), and
 * splices the result into the built HTML shell (M6 — extracted from
 * router-plugin.ts).
 */

import { resolve } from 'node:path';
import type { ResolvedConfig } from 'vite';
import type { ServerManifest } from '../server/types';
import { writeSafe } from './manifest';
import type { AuwlaRouterOptions } from './types';

/** Module-level re-entrancy guard (shared across plugin instances). */
let ssgIsRunning = false;

function matchRouteRulePattern(pattern: string, path: string): boolean {
  let regexStr = pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  regexStr = regexStr.replace(/\\\*\\\*/g, '.*');
  regexStr = regexStr.replace(/\\\*/g, '[^/]*');
  regexStr = regexStr.replace(/:[a-zA-Z]+/g, '[^/]+');
  const regex = new RegExp(`^${regexStr}\\/?$`);
  return regex.test(path);
}

export interface SsgRunOptions {
  viteConfig: ResolvedConfig;
  pluginOptions: AuwlaRouterOptions;
  resolvedManifestDir: string;
}

/** Render every SSG-marked route to a static HTML file. No-op unless needed. */
export async function runSsgIfNeeded({ viteConfig, pluginOptions, resolvedManifestDir }: SsgRunOptions): Promise<void> {
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
        if (pluginOptions.routeRules) {
          for (const [pattern, rule] of Object.entries(pluginOptions.routeRules)) {
            if (matchRouteRulePattern(pattern, routePath)) {
              return rule.renderMode;
            }
          }
        }
        return pluginOptions.target ?? 'spa';
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
}
