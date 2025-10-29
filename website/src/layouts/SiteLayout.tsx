import { h, Link } from 'auwla'

export function SiteLayout(child: HTMLElement) {
  return (
    <div class="min-h-screen bg-white grid grid-rows-[64px_1fr]">
      <header class="flex items-center gap-3 px-6 border-b bg-white/80 backdrop-blur">
        <div class="brand-text font-semibold tracking-wide text-2xl">Auwla</div>
        <nav class="ml-auto flex gap-1.5">
          <Link to="/" text="Home" className="px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-100 font-medium" />
          <Link to="/docs" text="Docs" className="px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100" activeClassName="bg-indigo-50 text-indigo-700 font-medium" />
        </nav>
      </header>
      <main class="relative p-8">
        <div class="fixed inset-0 site-bg opacity-80 -z-10 pointer-events-none"></div>
        {child}
      </main>
    </div>
  ) as HTMLElement
}