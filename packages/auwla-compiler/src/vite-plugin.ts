import type { Plugin } from 'vite';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { parseAuwlaFile } from './auwla-parser';
import { generateAuwlaFile } from './auwla-codegen';

/**
 * Vite plugin for compiling .html template files with smart caching and hot reload
 *
 * Features:
 * - Content-based caching (not just mtime)
 * - CSS-only change detection for fast refresh
 * - Granular hot reload (only affected modules)
 * - Automatic dependency tracking
 *
 * Usage in vite.config.ts:
 * ```ts
 * import { templateCompiler } from './template/compiler/vite-plugin'
 *
 * export default defineConfig({
 *   plugins: [templateCompiler()]
 * })
 * ```
 */
export function templateCompiler(options?: { verbose?: boolean; emitDebugFiles?: boolean }): Plugin {
  const opts = Object.assign({ verbose: false, emitDebugFiles: false }, options || {})

  // Enhanced cache with content hash and dependencies
  const cache = new Map<string, {
    code: string;
    hash: string;
    mtime: number;
    dependencies: Set<string>;
    cssOnly: boolean;
  }>();

  // Track which files import which templates
  const reverseDeps = new Map<string, Set<string>>();

  // CSS change detection
  let lastCssHash = '';

  return {
    name: 'auwla-template-compiler',

    buildStart() {
      // Clear cache on build start
      cache.clear();
      reverseDeps.clear();
      lastCssHash = '';
    },

    // Handle .html and .auwla files
    async transform(code, id) {
      // Only process .html and .auwla files in the template directory

      const isTemplateFile = id.includes('template') && (id.endsWith('.html') || id.endsWith('.auwla'));

      // Only log per-file checks for template files or when verbose mode is enabled
      if (opts.verbose || isTemplateFile) {
        console.log(`[template-compiler] Checking file: ${id}, isTemplateFile: ${isTemplateFile}`);
      }

      if (!isTemplateFile) {
        return null;
      }

      try {
        const fs = await import('fs');

        // Get file stats and content
        const stats = await fs.promises.stat(id);
        const currentContent = await fs.promises.readFile(id, 'utf-8');
        const currentHash = createHash('md5').update(currentContent).digest('hex');

        // Check cache
        const cached = cache.get(id);
        if (cached && cached.hash === currentHash) {
          if (opts.verbose || isTemplateFile) console.log(`[template-compiler] Using cached: ${id}`);
          return {
            code: cached.code,
            map: null
          };
        }

        if (opts.verbose || isTemplateFile) console.log(`[template-compiler] Compiling: ${id}`);

        // Use the unified route generator for .auwla files
        const { generateRoutes } = await import('./route-generator');
        const pagesDir = id.substring(0, id.lastIndexOf('/'));
        const outputDir = '.routes/generated';
        
        // Generate routes and update registry
        await generateRoutes(pagesDir, outputDir);
        
        // For individual file compilation, still use the old method
        const parsed = parseAuwlaFile(currentContent);
        const compiledTS = generateAuwlaFile(parsed);

        // Transpile to JavaScript for Vite/runtime
        const compiledJS = await transpileTS(compiledTS);

  // Extract dependencies from the compiled JS
  const dependencies = extractDependencies(compiledJS);

        // Emit compiled TypeScript next to source for debugging (helpful when JS still contains JSX)
        try {
          const outTsPath = id.replace(/\.(auwla|html)$/, '.compiled.ts');
          fs.promises.writeFile(outTsPath, compiledTS, 'utf-8').catch(() => {});
        } catch (e) {}

        // Check if this is CSS-only change (compare JS outputs)
        const isCssOnly = cached && isCssOnlyChange(cached.code, compiledJS);

        // Cache the JS result
        cache.set(id, {
          code: compiledJS,
          hash: currentHash,
          mtime: stats.mtimeMs,
          dependencies,
          cssOnly: isCssOnly ? true : false
        });

        // Emit compiled JS file next to source for debugging (non-blocking)
        if (opts.emitDebugFiles) {
          try {
            const outPath = id.replace(/\.(auwla|html)$/, '.compiled.js');
            fs.promises.writeFile(outPath, compiledJS, 'utf-8').catch(() => {});
          } catch (e) {
            // ignore write errors in environments that forbid disk writes
          }
        }

        // Update reverse dependencies
        updateReverseDeps(id, dependencies, reverseDeps);

        return {
          code: compiledJS,
          map: null
        };
      } catch (error) {
        console.error(`[template-compiler] Error compiling ${id}:`, error);
        throw error;
      }
    },

    // Enhanced hot reload support
    async handleHotUpdate({ file, server, modules }) {
      const isTemplateFile = file.includes('template') && (file.endsWith('.html') || file.endsWith('.auwla'));
      const isCssFile = file.endsWith('.css') || file.includes('tailwind');

      if (isTemplateFile) {
        console.log(`[template-compiler] Template changed: ${file}`);

        // Read the file and compute new compiled output BEFORE deleting cache
        try {
          const fs = await import('fs');
          const content = await fs.promises.readFile(file, 'utf-8');

          const parsed = parseAuwlaFile(content);
          const newCompiledTS = generateAuwlaFile(parsed);
          const newCompiled = await transpileTS(newCompiledTS);

          const cached = cache.get(file);

          // If cached exists, check css-only change between cached.code and newCompiled
          if (cached) {
            const cssOnly = isCssOnlyChange(cached.code, newCompiled);
            if (cssOnly) {
              if (opts.verbose || isTemplateFile) console.log(`[template-compiler] CSS-only change detected for: ${file}`);

              // Notify only CSS updates for modules that import this template
              const affectedModules = reverseDeps.get(file) ?? new Set<string>();
              const updates = Array.from(affectedModules).map(p => ({
                type: 'css-update' as const,
                path: p.replace(/\\/g, '/'),
                acceptedPath: p.replace(/\\/g, '/'),
                timestamp: Date.now()
              }));

              // If no reverse deps, fall back to updating the modified module(s)
              if (updates.length === 0) {
                modules.forEach(m => updates.push({
                  type: 'css-update' as const,
                  path: (m.url ?? m.id ?? file).replace(/\\/g, '/'),
                  acceptedPath: (m.url ?? m.id ?? file).replace(/\\/g, '/'),
                  timestamp: Date.now()
                }));
              }

              server.ws.send({ type: 'update', updates });

                  // Update cache with new compiled JS and return early
                  cache.set(file, {
                    code: newCompiled,
                    hash: createHash('md5').update(content).digest('hex'),
                    mtime: (await fs.promises.stat(file)).mtimeMs,
                    dependencies: extractDependencies(newCompiled),
                    cssOnly: true
                  });

                  // Emit compiled JS for debugging (only when enabled)
                  if (opts.emitDebugFiles) {
                    try {
                      const outPath = file.replace(/\.(auwla|html)$/, '.compiled.js');
                      fs.promises.writeFile(outPath, newCompiled, 'utf-8').catch(() => {});
                    } catch (e) {}
                  }

              return [];
            }
          }

          // Not a css-only change (or no cache) — update cache and trigger granular reload
          const deps = extractDependencies(newCompiled);
          cache.set(file, {
            code: newCompiled,
            hash: createHash('md5').update(content).digest('hex'),
            mtime: (await fs.promises.stat(file)).mtimeMs,
            dependencies: deps,
            cssOnly: false
          });

          // Emit compiled JS for debugging
          try {
            const outPath = file.replace(/\.(auwla|html)$/, '.compiled.js');
            fs.promises.writeFile(outPath, newCompiled, 'utf-8').catch(() => {});
          } catch (e) {}

          // Update reverse deps mapping
          updateReverseDeps(file, deps, reverseDeps);

          // Determine modules to reload (reverse deps normalized)
          const affectedModules = new Set<string>([...(reverseDeps.get(file) ?? [])]);

          // If no reverse deps, fallback to modules passed in to HMR
          if (affectedModules.size === 0) {
            modules.forEach(m => affectedModules.add((m.url ?? m.id ?? file)));
          }

          if (affectedModules.size > 0) {
            console.log(`[template-compiler] Reloading ${affectedModules.size} affected modules`);
            server.ws.send({
              type: 'update',
              updates: Array.from(affectedModules).map(path => ({
                  type: 'js-update' as const,
                  path: path.replace(/\\/g, '/'),
                  acceptedPath: path.replace(/\\/g, '/'),
                  timestamp: Date.now()
                }))
            });
          } else {
            console.log(`[template-compiler] No specific modules found, doing full reload`);
            server.ws.send({ type: 'full-reload', path: '*' });
          }

          return [];
        } catch (err) {
          console.error('[template-compiler] Error during hot update template handling', err);
          // Fall back to clearing cache and full reload
          cache.delete(file);
          server.ws.send({ type: 'full-reload', path: '*' });
          return [];
        }
      }

      if (isCssFile) {
        console.log(`[template-compiler] CSS file changed: ${file}`);
        // For CSS changes, trigger style update only (use provided modules when possible)
        const updates = modules.map(m => ({
          type: 'css-update' as const,
          path: (m.url || m.id || file).replace(/\\/g, '/'),
          acceptedPath: (m.url || m.id || file).replace(/\\/g, '/'),
          timestamp: Date.now()
        }));

        // If Vite didn't give modules, just broadcast the changed css path
        if (updates.length === 0) {
          updates.push({ type: 'css-update' as const, path: file.replace(/\\/g, '/'), acceptedPath: file.replace(/\\/g, '/'), timestamp: Date.now() });
        }

        server.ws.send({ type: 'update', updates });
        return [];
      }

      // For other files, let Vite handle normally
      return modules;
    }
  };
}

/**
 * Transpile TypeScript source to JavaScript using typescript transpileModule
 */
async function transpileTS(tsSource: string): Promise<string> {
  try {
    const ts = await import('typescript');
    const result = ts.transpileModule(tsSource, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.Preserve,
        esModuleInterop: true,
        allowJs: true
      }
    });
    return result.outputText;
  } catch (e) {
    console.warn('[template-compiler] typescript not available, returning TS source');
    return tsSource;
  }
}

/**
 * Extract import dependencies from compiled code
 */
function extractDependencies(code: string): Set<string> {
  const dependencies = new Set<string>();
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;

  while ((match = importRegex.exec(code)) !== null) {
    dependencies.add(match[1]);
  }

  return dependencies;
}

/**
 * Update reverse dependency tracking
 */
function updateReverseDeps(file: string, dependencies: Set<string>, reverseDeps: Map<string, Set<string>>) {
  // Remove old reverse deps for this file
  reverseDeps.forEach((deps, key) => {
    deps.delete(file);
  });

  // Add new reverse deps
  dependencies.forEach(dep => {
    if (!reverseDeps.has(dep)) {
      reverseDeps.set(dep, new Set());
    }
    reverseDeps.get(dep)!.add(file);
  });
}

/**
 * Check if a change is CSS-only (no structural changes)
 */
function isCssOnlyChange(oldCode: string, newCode: string): boolean {
  // Simple heuristic: if the code structure is the same but className values changed
  const oldLines = oldCode.split('\n').map(line => line.trim());
  const newLines = newCode.split('\n').map(line => line.trim());

  if (oldLines.length !== newLines.length) {
    return false;
  }

  // Check if only className values changed
  for (let i = 0; i < oldLines.length; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    // If lines are identical, continue
    if (oldLine === newLine) continue;

    // Check if only className changed
    const classNameRegex = /className:\s*["']([^"']*)["']/;
    const oldMatch = oldLine.match(classNameRegex);
    const newMatch = newLine.match(classNameRegex);

    if (oldMatch && newMatch) {
      // className changed, but structure is same
      const oldWithoutClass = oldLine.replace(classNameRegex, 'className: "__CLASS__"');
      const newWithoutClass = newLine.replace(classNameRegex, 'className: "__CLASS__"');
      if (oldWithoutClass === newWithoutClass) {
        continue;
      }
    }

    // Lines are different and not just className
    return false;
  }

  return true;
}
