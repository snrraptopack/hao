/**
 * @file vite-css.ts
 * @description
 * Handles CSS extraction, aggregation, virtual module serving,
 * and Vite dev server HMR triggers for compiled styles.
 */

import type { ViteDevServer } from 'vite';
import { compileCSS } from './css/compiler/css-compiler';

export class ViteCSSHandler {
  // Nested map registry: filepath -> ruleKey -> ruleVal
  private registry = new Map<string, Map<string, string>>();
  private server?: ViteDevServer;
  private enabled: boolean;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Registers the active Vite development server instance.
   */
  setServer(server: ViteDevServer) {
    this.server = server;
  }

  /**
   * Resolves the virtual CSS module path.
   */
  resolveId(id: string): string | null {
    if (this.enabled && id === 'virtual:auwla.css') {
      return '\0virtual:auwla.css'; // Rollup virtual prefix
    }
    return null;
  }

  /**
   * Loads the aggregated stylesheet content for the virtual module.
   * Resolves Finding 1 by placing base styles before media queries.
   */
  load(id: string): string | null {
    if (this.enabled && id === '\0virtual:auwla.css') {
      const allRules: string[] = [];
      for (const fileRules of this.registry.values()) {
        allRules.push(...fileRules.values());
      }

      const importRules = Array.from(new Set(allRules.filter((r) => r.trim().startsWith('@import'))));
      const remainingRules = allRules.filter((r) => !r.trim().startsWith('@import'));

      const baseRules = remainingRules.filter((r) => !r.trim().startsWith('@media'));
      const mediaRules = remainingRules.filter((r) => r.trim().startsWith('@media'));

      return [...importRules, ...baseRules, ...mediaRules].join('\n');
    }
    return null;
  }

  /**
   * Runs the CSS compiler on the transformed code to extract style classes.
   * Resolves Finding 2 by garbage collecting deleted rules per file on HMR.
   */
  transform(code: string, filepath: string): string {
    if (!this.enabled) {
      return code;
    }

    const fileRules = new Map<string, string>();

    const compiled = compileCSS(code, filepath, (className, declaration, mediaQuery) => {
      const ruleKey = className === '' ? declaration : (mediaQuery ? `${mediaQuery}::${className}` : className);
      const ruleVal = mediaQuery
        ? `@media (${mediaQuery}) {\n  ${declaration}\n}`
        : declaration;

      fileRules.set(ruleKey, ruleVal);
    });

    const oldRules = this.registry.get(filepath);
    let changed = false;

    if (!oldRules) {
      if (fileRules.size > 0) {
        changed = true;
      }
    } else if (oldRules.size !== fileRules.size) {
      changed = true;
    } else {
      for (const [k, v] of fileRules) {
        if (oldRules.get(k) !== v) {
          changed = true;
          break;
        }
      }
    }

    this.registry.set(filepath, fileRules);

    if (changed && this.server) {
      this.triggerHMR();
    }

    return compiled;
  }

  /**
   * Invalidate the virtual CSS module and push an HMR update to the browser client.
   */
  private triggerHMR() {
    const mod = this.server?.moduleGraph.getModuleById('\0virtual:auwla.css');
    if (mod) {
      this.server?.moduleGraph.invalidateModule(mod);
      this.server?.ws.send({
        type: 'update',
        updates: [
          {
            type: 'js-update',
            path: '/@id/__x00__virtual:auwla.css',
            acceptedPath: '/@id/__x00__virtual:auwla.css',
            timestamp: Date.now(),
          },
        ],
      });
    }
  }
}
