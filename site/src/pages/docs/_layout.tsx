import type { RouteComponent } from 'auwla/router'
import { Link, getParams } from 'auwla/router'
import { docCategories } from '../../../utils/navigation'

export default function DocsLayout(Child: RouteComponent) {
  const { slug } = getParams('/docs/:slug')

  return () => (
    <div class="flex-grow bg-[#fbfbfb] w-full">
      <div class="mx-auto max-w-[1400px] w-full px-6 flex">

        {/* Left Navigation Sidebar */}
        <aside class="w-64 shrink-0 hidden md:block border-r border-slate-200/60 py-8 pr-6 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto font-sans">
          <div class="space-y-6">
            {docCategories.map((cat) => (
              <div key={cat.title}>
                <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 font-sans">
                  {cat.title}
                </h4>
                <ul class="space-y-1">
                  {cat.links.map((link) => (
                    <li key={link.slug}>
                      <Link
                        href={link.href}
                        params={{ slug: link.slug }}
                        class={`block text-sm py-1.5 px-2 rounded-md transition font-medium font-sans ${
                          slug === link.slug
                            ? 'bg-[#ff3e00]/10 text-[#ff3e00] font-semibold'
                            : 'text-slate-650 hover:text-slate-900 hover:bg-slate-100/50'
                        }`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        {/* Dynamic Page Content */}
        <main class="flex-1 py-8 md:pl-10 min-w-0">
          <Child />
        </main>

      </div>
    </div>
  );
}
