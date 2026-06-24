import { Link } from 'auwla/router'

export default function Playground() {
  return () => (
    <div class="flex-grow bg-[#fbfbfb] flex flex-col font-sans">
      {/* Main Workspace */}
      <main class="flex-1 flex items-center justify-center p-8">
        <div class="text-center max-w-md">
          <h2 class="text-2xl font-semibold text-slate-850 font-sans tracking-tight">Playground</h2>
          <p class="text-slate-500 mt-2 text-sm leading-relaxed">
            The interactive code workbench is coming soon. Here you will be able to edit Auwla components and inspect their compiled DOM blocks in real-time.
          </p>
          <Link 
            href="/docs/:slug" 
            params={{ slug: 'introduction' }}
            class="mt-6 inline-block px-5 py-2.5 rounded-md bg-[#ff3e00] hover:bg-[#e03500] text-white text-sm font-medium shadow-sm transition"
          >
            Go to Documentation
          </Link>
        </div>
      </main>
    </div>
  )
}
