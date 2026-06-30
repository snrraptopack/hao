import type { RouteComponent } from 'auwla/router'
import { Link, getParams } from 'auwla/router'
import { docCategories } from '../../../utils/navigation'


export default function DocsLayout(Child: RouteComponent) {
  const { slug } = getParams('/docs/:slug')
  let isMobileMenuOpen = false

  return () => (
    <div class="flex-grow bg-[#fbfbfb] w-full flex flex-col">
      {/* Mobile Menu Sticky Bar */}
      <div class="md:hidden flex items-center justify-between py-3 px-6 bg-white border-b border-slate-200/60 sticky top-16 z-30 w-full font-sans">
        <button
          onClick={() => isMobileMenuOpen = true}
          class="flex items-center gap-2 text-xs font-semibold text-slate-600 border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-50 transition active:scale-95 cursor-pointer"
        >
          <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span>Menu</span>
        </button>
        <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Documentation
        </span>
      </div>

      <div class="mx-auto max-w-[1400px] w-full px-6 flex flex-grow">

        {/* Left Navigation Sidebar */}
        <aside class="w-64 shrink-0 hidden md:block border-r border-slate-200/60 py-8 pr-6 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto font-sans">
          <div class="space-y-6">
            {docCategories.map((cat) => (
              <div key={cat.title}>
                <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 font-sans">
                  {cat.title}
                </h4>
                <ul class="space-y-1">
                  {cat.links.map((link) => (
                    <li key={link.slug}>
                      <Link
                        href={link.href}
                        params={{ slug: link.slug }}
                        class={`block text-sm py-1.5 px-2 rounded-md transition font-medium font-sans ${slug === link.slug
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

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div class="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div
              onClick={() => isMobileMenuOpen = false}
              class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            />

            {/* Drawer Container */}
            <aside class="relative w-72 max-w-[80vw] bg-white h-full shadow-xl flex flex-col p-6 overflow-y-auto border-r border-slate-200">
              {/* Close Button */}
              <button
                onClick={() => isMobileMenuOpen = false}
                class="absolute top-4 right-4 p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Drawer Links */}
              <div class="space-y-6 mt-8">
                {/* Global Navigation Section */}
                <div>
                  <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 font-sans">
                    Navigation
                  </h4>
                  <ul class="space-y-1 mb-6 border-b border-slate-100 pb-4">
                    <li>
                      <Link
                        href="/docs/:slug"
                        params={{ slug: 'introduction' }}
                        onClick={() => isMobileMenuOpen = false}
                        class={`block text-sm py-1.5 px-2 rounded-md transition font-medium font-sans ${
                          slug ? 'bg-[#ff3e00]/10 text-[#ff3e00] font-semibold' : 'text-slate-650 hover:text-slate-900'
                        }`}
                      >
                        Docs
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/playground"
                        onClick={() => isMobileMenuOpen = false}
                        class="block text-sm py-1.5 px-2 rounded-md transition font-medium font-sans text-slate-650 hover:text-slate-900"
                      >
                        Playground
                      </Link>
                    </li>
                  </ul>
                </div>

                {docCategories.map((cat) => (
                  <div key={cat.title}>
                    <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 font-sans">
                      {cat.title}
                    </h4>
                    <ul class="space-y-1">
                      {cat.links.map((link) => (
                        <li key={link.slug}>
                          <Link
                            href={link.href}
                            params={{ slug: link.slug }}
                            onClick={() => isMobileMenuOpen = false}
                            class={`block text-sm py-1.5 px-2 rounded-md transition font-medium font-sans ${slug === link.slug
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
          </div>
        )}

        {/* Dynamic Page Content */}
        <main class="flex-1 py-8 md:pl-10 min-w-0">
          <Child />
        </main>

      </div>
    </div>
  )
}
