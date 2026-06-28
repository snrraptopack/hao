import { commit, component } from 'auwla'
import { Link, getRouted, type RouteContext } from 'auwla/router'
import LiveCounter from '../components/live-preview/LiveCounter'
import LivePaint from '../components/live-preview/LivePaint'

import { track } from 'auwla/track'
import { getHomeShowcases } from './index.server'

export async function routed(ctx: RouteContext<'/'>, signal: AbortSignal) {
  return await track.get(getHomeShowcases, { signal });
}


// ─── Homepage Layout ──────────────────────────────────────────────────────────
export default function Home() {
  let copied = false;
  const self = component();

  const grid = [
    { title: "Direct compilation", desc: "Transforms TSX into optimized DOM patches, skipping Virtual DOM trees entirely." },
    { title: "No hooks or signals", desc: "No complex state wrappers. State is held in plain variables inside component closures." },
    { title: "Native DOM speed", desc: "Updates only what changed using direct templates and memoized element reuse." },
    { title: "Isomorphic by design", desc: "Built-in server rendering and type-safe RPC client hydration in one workspace." }
  ]

  function copyInstall() {
    navigator.clipboard.writeText('npm install auwla');
    copied = true;
    setTimeout(() => {
      copied = false;
      commit(self);
    }, 2000);
  }

  const data = getRouted(routed)?.value;
  const counterHtml = data?.counterHtml || '';
  const paintHtml = data?.paintHtml || '';

  return () => (
    <div class="text-slate-800 font-sans antialiased">

      {/* Hero Section (Vercel-style heavy Inter) */}
      <section class="mx-auto max-w-[1200px] px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <div class="text-center space-y-6">
          <h1 class="text-5xl md:text-7xl font-extrabold tracking-[-0.04em] text-black leading-[0.95] max-w-4xl mx-auto">
            The web framework that doesn&apos;t get in the way.
          </h1>

          <p class="text-lg md:text-xl text-slate-500 font-normal leading-relaxed max-w-2xl mx-auto font-sans pt-2">
            Auwla compiles JSX closures into direct, memoized DOM updates. Code with plain JavaScript variables—no reactive state wrappers needed.
          </p>

          <div class="flex flex-wrap items-center justify-center gap-4 pt-6">
            <Link
              href="/docs/:slug"
              params={{ slug: 'introduction' }}
              class="px-6 py-3 rounded-md bg-[#ff3e00] text-white font-medium hover:bg-[#e03500] transition text-center shadow-sm font-sans"
            >
              Get started
            </Link>
            <Link
              href="/playground"
              class="px-6 py-3 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-medium transition text-center font-sans"
            >
              Playground
            </Link>
            <button
              onClick={copyInstall}
              class="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 font-mono text-sm text-slate-500 px-4 py-3 transition group select-none"
            >
              <span class="text-[#ff3e00] font-bold">$</span>
              <span>npm install auwla</span>
              <span class="ml-4 text-xs font-bold text-slate-400 group-hover:text-slate-600">
                {copied ? 'Copied!' : 'Copy'}
              </span>
            </button>
          </div>
        </div>

        {/* Key Features Grid */}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-20 border-t border-slate-100 pt-16">
          {grid.map((val) => (
            <div key={val.title} class="space-y-2">
              <h4 class="font-semibold text-slate-900 text-base font-sans flex items-center gap-2">
                <span class="text-[#ff3e00] font-bold">✓</span> {val.title}
              </h4>
              <p class="text-sm text-slate-500 leading-relaxed font-sans">{val.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Demos Section */}
      <section class="bg-[#fafafa] border-t border-slate-100 py-24">
        <div class="mx-auto max-w-[1200px] px-6 space-y-24">

          <div class="text-center max-w-2xl mx-auto space-y-4">
            <h2 class="text-4xl md:text-5xl font-extrabold tracking-[-0.03em] text-black">
              See it in action.
            </h2>
            <p class="text-slate-500 text-base leading-relaxed font-sans">
              Explore how Auwla binds state variables and runs operations. Tap, interact, and draw in real-time.
            </p>
          </div>

          {/* Showcase 1: Counter */}
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div class="lg:col-span-4 space-y-4 flex flex-col justify-center">
              <h3 class="text-2xl font-bold tracking-tight text-black leading-tight">
                Reactivity through closures
              </h3>
              <p class="text-slate-500 leading-relaxed font-sans">
                Variables declared in the component setup scope serve as reactive state. Triggering an event automatically schedules a single re-render, patching the exact DOM text node.
              </p>
            </div>

            <div class="lg:col-span-8 flex flex-col sm:flex-row items-stretch gap-4 showcase-wrapper">
              <div
                class="flex-grow min-w-0 doc-content"
                dangerouslySetInnerHTML={{ __html: counterHtml }}
              />
              <div class="w-full sm:w-[280px] h-[250px] sm:h-auto shrink-0 border border-slate-200 rounded-lg overflow-hidden flex bg-white">
                <LiveCounter />
              </div>
            </div>
          </div>

          {/* Showcase 2: Paint */}
          <div class="space-y-6 pt-12">
            <div class="space-y-3">
              <h3 class="text-3xl font-extrabold tracking-tight text-black leading-tight">
                High-performance events
              </h3>
              <p class="text-slate-500 leading-relaxed font-sans text-base max-w-3xl">
                Auwla easily handles high-frequency pointer and touch events. Elements can be captured using ref callbacks, bypassing custom wrappers.
              </p>
            </div>

            <div class="relative w-full rounded-2xl border border-[#262936] bg-[#161b22] shadow-lg flex flex-col lg:block overflow-hidden min-h-[460px] showcase-wrapper">
              {/* Code Snippet */}
              <div class="lg:pr-[320px] doc-content flex-grow">
                <div dangerouslySetInnerHTML={{ __html: paintHtml }} />
              </div>
              {/* Floating Preview Card */}
              <div class="w-full lg:w-[280px] h-[300px] lg:h-auto lg:absolute lg:top-6 lg:right-6 lg:bottom-6 flex shrink-0 z-20">
                <LivePaint />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer class="border-t border-slate-200 bg-white py-12">
        <div class="mx-auto max-w-[1200px] px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p class="text-xs text-slate-400">
            &copy; 2026 Auwla. Under MIT License.
          </p>
          <div class="flex gap-6 text-xs font-semibold text-slate-400 font-sans">
            <Link href="/docs/:slug" params={{ slug: 'introduction' }} class="hover:text-[#ff3e00] transition">Documentation</Link>
            <Link href="/playground" class="hover:text-[#ff3e00] transition">Playground</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
