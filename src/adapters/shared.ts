import { renderToString } from '../runtime/ssr'
import type { Route } from '../router/types'
import type { SsrInvokeOptions } from '../server/ssr-invoke'

export interface SsrRenderOptions {
  routes?: Route[]
  manifest?: any
  template?: string
  templatePath?: string
  globalMiddlewares?: SsrInvokeOptions['globalMiddlewares']
  load?: (modulePath: string) => Promise<Record<string, unknown>>
}

declare const Bun: {
  file(path: string): Blob & { text(): Promise<string>; exists(): Promise<boolean> }
}

const templateCache = new Map<string, string>()

export async function readTemplate(path: string): Promise<string | null> {
  const isDev = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
  if (!isDev) {
    const cached = templateCache.get(path)
    if (cached) return cached
  }

  let text: string
  if (typeof Bun !== 'undefined') {
    const file = Bun.file(path)
    if (!(await file.exists())) return null
    text = await file.text()
  } else {
    try {
      // @ts-ignore
      const fs = await import('node:fs')
      text = await fs.promises.readFile(path, 'utf-8')
    } catch {
      return null
    }
  }

  if (!isDev) {
    templateCache.set(path, text)
  }
  return text
}

export async function ssrRender(
  request: Request,
  options: SsrRenderOptions,
  staticDir: string,
): Promise<Response | null> {
  const { routes, manifest, globalMiddlewares, load } = options
  if (!routes || !manifest) return null

  const isDev = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
  const defaultTemplatePath = isDev ? './index.html' : `${staticDir}/index.html`
  const templatePath = options.templatePath ?? defaultTemplatePath
  
  const template = options.template ?? await readTemplate(templatePath)
  if (!template) {
    return new Response('Not Found: index.html missing', { status: 404 })
  }

  const result = await renderToString(request.url, routes, {
    manifest: manifest as any,
    request,
    globalMiddlewares,
    load,
  })

  if (result.redirect) {
    return Response.redirect(result.redirect, 302)
  }

  if (result.status === 403) {
    return new Response(result.html, {
      status: 403,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  }

  if (!result.matched) {
    return new Response('Not Found', { status: 404 })
  }

  // Mark the #app root with data-auwla-ssr so the client runtime knows SSR
  // content is present and can hydrate instead of wiping the DOM on mount.
  let page = template
    .replace('id="app"', 'id="app" data-auwla-ssr="true"')
    .replace('<!--app-html-->', result.html)

  // Inject head tags collected by <Head> components during SSR rendering.
  // They are inserted just before </head> so they appear in the real document head.
  if (result.headTags && result.headTags.length > 0) {
    const otherTags: string[] = []
    
    for (const tag of result.headTags) {
      if (tag.startsWith('<title>')) {
        // Replace the static title in the HTML template
        page = page.replace(/<title>([\s\S]*?)<\/title>/i, tag)
      } else if (tag.includes('name="description"') || (tag.includes('content="') && tag.includes('description'))) {
        // Replace the static meta description in the HTML template
        if (/<meta\s+name="description"[\s\S]*?>/i.test(page)) {
          page = page.replace(/<meta\s+name="description"[\s\S]*?>/i, tag)
        } else {
          otherTags.push(tag)
        }
      } else {
        otherTags.push(tag)
      }
    }
    
    if (otherTags.length > 0) {
      const headHtml = otherTags.join('\n')
      page = page.replace('</head>', `${headHtml}\n</head>`)
    }
  }

  return new Response(page, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}
