import { Plugin } from 'vite';
import { readFileSync } from 'fs';
import { parseTemplate } from './parser';
import { analyzeTemplate } from './analyzer';
import { generateCode } from './codegen';

/**
 * Vite plugin for compiling .html template files
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
export function templateCompiler(): Plugin {
  // Cache for compiled templates
  const cache = new Map<string, { code: string; mtime: number }>();

  return {
    name: 'auwla-template-compiler',
    
    // Handle .html and .auwla files
    async transform(code, id) {
      // Only process .html and .auwla files in the template directory
      const isTemplateFile = id.includes('template') && (id.endsWith('.html') || id.endsWith('.auwla'));
      
      if (!isTemplateFile) {
        return null;
      }

      try {
        // Check file modification time for cache
        const fs = await import('fs');
        const stats = await fs.promises.stat(id);
        const mtime = stats.mtimeMs;
        
        const cached = cache.get(id);
        if (cached && cached.mtime >= mtime) {
          console.log(`[template-compiler] Using cached: ${id}`);
          return {
            code: cached.code,
            map: null
          };
        }

        console.log(`[template-compiler] Compiling: ${id}`);
        
        // Parse the template
        const { script, template } = parseTemplate(code);
        
        // Analyze template nodes
        const nodes = analyzeTemplate(template);
        
        // Generate code
        const compiledCode = generateCode(nodes, script);
        
        // Cache the result
        cache.set(id, { code: compiledCode, mtime });
        
        return {
          code: compiledCode,
          map: null
        };
      } catch (error) {
        console.error(`[template-compiler] Error compiling ${id}:`, error);
        throw error;
      }
    },

    // Hot reload support
    handleHotUpdate({ file, server }) {
      const isTemplateFile = file.includes('template') && (file.endsWith('.html') || file.endsWith('.auwla'));
      
      if (isTemplateFile) {
        console.log(`[template-compiler] Template changed: ${file}`);
        
        // Invalidate cache for this file
        cache.delete(file);
        
        // Also invalidate any .compiled.js file
        const compiledFile = file.replace(/\.(html|auwla)$/, '.compiled.js');
        cache.delete(compiledFile);
        
        // Trigger full reload
        server.ws.send({
          type: 'full-reload',
          path: '*'
        });
      }
    }
  };
}
