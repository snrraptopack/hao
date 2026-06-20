import type { ViteDevServer } from 'vite'

export async function createDevServerMiddleware(
  server: ViteDevServer,
  serverEntry?: string
) {
  return async function auwlaDevMiddleware(req: any, res: any, next: any) {
    if (req.url?.startsWith('/@')) return next()
    if (req.url?.includes('?import')) return next()
    
    // Ignore static assets commonly requested
    if (req.url?.match(/\.(js|css|ico|png|jpg|jpeg|svg|gif|woff2?)$/)) {
      return next()
    }

    try {
      let fetchHandler: any

      if (serverEntry) {
        const mod = await server.ssrLoadModule(serverEntry)
        fetchHandler = mod.default?.fetch ?? mod.default
      } else {
        // Default server entry: pure fetch adapter
        // Import dynamically so we don't tie Vite directly to adapters unless needed
        const { createFetchAdapter } = await import('./adapters/fetch.js')
        fetchHandler = createFetchAdapter()
      }

      if (typeof fetchHandler !== 'function') {
        return next()
      }

      const origin = req.headers.host ? `http://${req.headers.host}` : 'http://localhost'
      const url = new URL(req.originalUrl || req.url || '/', origin)

      const headers = new Headers()
      for (const key in req.headers) {
        if (req.headers[key]) {
          headers.append(key, Array.isArray(req.headers[key]) ? req.headers[key].join(',') : req.headers[key] as string)
        }
      }

      const init: RequestInit = {
        method: req.method,
        headers,
      }

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        init.body = new ReadableStream({
          start(controller) {
            req.on('data', (chunk: any) => controller.enqueue(chunk))
            req.on('end', () => controller.close())
            req.on('error', (err: any) => controller.error(err))
          }
        })
        // @ts-ignore
        init.duplex = 'half'
      }

      const request = new Request(url, init)
      const response: Response | undefined = await fetchHandler(request)

      if (!response) {
        return next()
      }
      const contentType = response.headers.get('content-type') || ''
      
      // If it's an HTML response (SSR), we need to inject Vite's HMR scripts
      if (contentType.includes('text/html')) {
        let html = await response.text()
        
        // FOUC prevention: extract CSS from client entry
        try {
          const scriptMatch = html.match(/<script\s+type="module"\s+src="([^"]+)"/);
          if (scriptMatch && scriptMatch[1]) {
            const clientEntry = scriptMatch[1];
            await server.transformRequest(clientEntry);
            const mod = await server.moduleGraph.getModuleByUrl(clientEntry);
            if (mod) {
              let cssLinks = '';
              const seen = new Set<string>();
              const collectCss = (node: any) => {
                if (!node || !node.url || seen.has(node.url)) return;
                seen.add(node.url);
                if (node.url.match(/\.(css|scss|sass|less|styl)(\?.*)?$/)) {
                  cssLinks += `\n<link rel="stylesheet" href="${node.url}">`;
                }
                if (node.importedModules) {
                  for (const child of node.importedModules) {
                    collectCss(child);
                  }
                }
              };
              collectCss(mod);
              
              if (cssLinks) {
                html = html.replace('</head>', `${cssLinks}\n</head>`);
              }
            }
          }
        } catch(e) {
        }

        html = await server.transformIndexHtml(req.url || '/', html)

        if ((globalThis as any).__auwla_vite_css_handler) {
          const css = (globalThis as any).__auwla_vite_css_handler.getCssContent()
          if (css) {
            html = html.replace('</head>', `\n<style type="text/css" data-auwla-dev-css>\n${css}\n</style>\n</head>`)
          }
        }

        res.setHeader('content-type', 'text/html; charset=utf-8')
        res.statusCode = response.status
        res.end(html)
        return
      }

      res.statusCode = response.status
      res.statusMessage = response.statusText

      response.headers.forEach((value, key) => {
        res.setHeader(key, value)
      })

      if (response.body) {
        // ReadableStream to Node.js Response
        const reader = response.body.getReader()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            res.write(value)
          }
        } finally {
          res.end()
        }
      } else {
        res.end()
      }

    } catch (e) {
      server.ssrFixStacktrace(e as Error)
      next(e)
    }
  }
}
