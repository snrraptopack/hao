import type { RouteComponent } from 'auwla/router'
import { Link, isActive, isExactActive } from 'auwla/router'

export default function RootLayout(Child: RouteComponent) {
  const isDocs = isActive('/docs')
  const isPlayground = isExactActive('/playground')

  return () => (
    <div class="min-h-screen bg-white flex flex-col">
      {/* Top Navbar */}
      <header class="sticky top-0 z-50 bg-white/80  shrink-0">
        <div class="mx-auto max-w-[1400px] px-6 h-16 flex items-center justify-between">
          <Link href="/" class="flex items-center gap-2">
            <svg class="w-6 h-6 text-black" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 22h4l3-6h6l3 6h4L12 2zm-1.5 11l1.5-3 1.5 3h-3z" />
            </svg>
            <span class="tracking-[0.2em] font-semibold text-slate-900 text-sm font-sans uppercase">
              Auwla
            </span>
            <span class="text-[10px] tracking-wider font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200/60 uppercase">
              v0.3.*
            </span>
          </Link>

          <div class="flex items-center gap-4">
            {/* Search Pill */}
            <button type="button" aria-label="Search documentation" class="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/50 rounded-full text-xs text-slate-500 cursor-pointer transition select-none w-40">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>search</span>
              <span class="ml-auto text-[9px] bg-white border border-slate-200 px-1 py-0.5 rounded text-slate-500 font-mono font-bold">CTRL K</span>
            </button>

            <nav class="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 font-sans">
              <Link
                href="/docs/:slug"
                params={{ slug: 'introduction' }}
                class={`transition ${isDocs
                  ? 'text-black font-semibold border-b-2 border-black px-1 py-5'
                  : 'hover:text-black transition py-5'
                  }`}
              >
                Docs
              </Link>
              <Link
                href="/playground"
                class={`transition ${isPlayground
                  ? 'text-black font-semibold border-b-2 border-black px-1 py-5'
                  : 'hover:text-black transition py-5'
                  }`}
              >
                Playground
              </Link>
            </nav>

            <a href="https://github.com/snrraptopack/hao" target="_blank" rel="noopener" aria-label="GitHub Repository" class="hover:text-black transition py-5 flex items-center">
              <svg class="w-5 h-5 text-slate-500 hover:text-slate-900 transition" fill="currentColor" viewBox="0 0 24 24">
                <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" clip-rule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* Dynamic page content */}
      <Child />
    </div>
  )
}
