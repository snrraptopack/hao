import { h, Link, ref, watch, When } from 'auwla'

export function DocsLayout(child: HTMLElement) {
  const mobileNavOpen = ref(false)
  return (
    <div class="min-h-screen bg-white grid grid-rows-[64px_1fr] overflow-x-hidden">
      <header class="sticky top-0 z-10 flex items-center gap-3 px-6 border-b bg-white/80 backdrop-blur">
        <div class="text-indigo-600 font-semibold tracking-wide">Auwla Docs</div>
        <button class="md:hidden ml-auto px-3 py-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-100" onClick={() => mobileNavOpen.value = true}>
          Menu
        </button>
        <nav class="ml-auto hidden md:flex gap-1.5">
          <Link to="/docs/" text="Introduction" className="px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-indigo-700" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
          <Link to="/docs/quick-start" text="Quick Start" className="px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-indigo-700" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
        </nav>
      </header>
      <div class="md:grid md:grid-cols-[260px_1fr] h-[calc(100vh-64px)] min-w-0 overflow-x-hidden">
        {/* Mobile overlay when sidebar is open */}
        <When>
          {mobileNavOpen}
          {() => (
            <div class="fixed inset-0 z-40 md:hidden">
              <div class="absolute inset-0 bg-black/40" onClick={() => mobileNavOpen.value = false}></div>
              <aside class="absolute left-0 top-0 bottom-0 w-[80%] max-w-[280px] bg-white border-r p-5 space-y-6 overflow-y-auto">
                <div class="flex items-center justify-between mb-4">
                  <div class="text-indigo-600 font-semibold tracking-wide">Auwla Docs</div>
                  <button class="px-2 py-1 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-100" onClick={() => mobileNavOpen.value = false}>Close</button>
                </div>
                <div>
                  <div class="text-[11px] uppercase tracking-wider text-gray-500 mb-3">Getting Started</div>
                  <div class="space-y-1">
                    <Link to="/docs/installation" text="Installation" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
                    <Link to="/docs/" text="Introduction" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
                    <Link to="/docs/quick-start" text="Quick Start" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
                  </div>
                </div>
                <div>
                  <div class="text-[11px] uppercase tracking-wider text-gray-500 mb-3">Guide</div>
                  <div class="space-y-1">
                    <Link to="/docs/creating-an-application" text="Creating an Application" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
                    <Link to="/docs/template-syntax" text="Template Syntax" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
                    <Link to="/docs/components" text="Components" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
                    
                    <Link to="/docs/events" text="Events" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
                    <Link to="/docs/styling" text="Styling" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
                  </div>
                </div>
                <div>
                  <div class="text-[11px] uppercase tracking-wider text-gray-500 mb-3">Reactivity</div>
                  <div class="space-y-1">
                    <Link to="/docs/reactivity/" text="Introduction" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
                    <Link to="/docs/reactivity/ref-and-watch" text="Ref & Watch" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
                    <Link to="/docs/reactivity/conditional-rendering" text="Conditional Rendering" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
                    <Link to="/docs/reactivity/list-rendering" text="List Rendering (For)" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
                    <Link to="/docs/reactivity/composition" text="Reactive Composition" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
                  </div>
                </div>
                <div>
                  <div class="text-[11px] uppercase tracking-wider text-gray-500 mb-3">Routing</div>
                  <div class="space-y-1">
                    <Link to="/docs/routing/" text="Introduction" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
                    <Link to="/docs/routing/composition" text="Route Composition" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
                    <Link to="/docs/routing/params-and-query" text="Params & Query" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
                    <Link to="/docs/routing/tips" text="Tips & Patterns" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
                  </div>
                </div>
                <div>
                  <div class="text-[11px] uppercase tracking-wider text-gray-500 mb-3">Lifecycle & Data Fetching</div>
                  <div class="space-y-1">
                    <Link to="/docs/lifecycle-and-data-fetching" text="Overview" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
                  </div>
                </div>
              </aside>
            </div>
          )}
        </When>
        {/* Desktop sidebar (always hidden on mobile) */}
        <aside class="hidden md:block border-r p-5 space-y-6 overflow-y-auto">
          <div>
            <div class="text-[11px] uppercase tracking-wider text-gray-500 mb-3">Getting Started</div>
            <div class="space-y-1">
              <Link to="/docs/installation" text="Installation" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
              <Link to="/docs/" text="Introduction" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
              <Link to="/docs/quick-start" text="Quick Start" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
            </div>
          </div>
          <div>
            <div class="text-[11px] uppercase tracking-wider text-gray-500 mb-3">Guide</div>
            <div class="space-y-1">
              <Link to="/docs/creating-an-application" text="Creating an Application" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
              <Link to="/docs/template-syntax" text="Template Syntax" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
              <Link to="/docs/components" text="Components" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
              
              <Link to="/docs/events" text="Events" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
              <Link to="/docs/styling" text="Styling" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
            </div>
          </div>
          <div>
            <div class="text-[11px] uppercase tracking-wider text-gray-500 mb-3">Reactivity</div>
            <div class="space-y-1">
              <Link to="/docs/reactivity/" text="Introduction" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
              <Link to="/docs/reactivity/ref-and-watch" text="Ref & Watch" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
              <Link to="/docs/reactivity/conditional-rendering" text="Conditional Rendering" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
              <Link to="/docs/reactivity/list-rendering" text="List Rendering (For)" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
              <Link to="/docs/reactivity/composition" text="Reactive Composition" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
            </div>
          </div>
          <div>
            <div class="text-[11px] uppercase tracking-wider text-gray-500 mb-3">Routing</div>
            <div class="space-y-1">
              <Link to="/docs/routing/" text="Introduction" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
              <Link to="/docs/routing/composition" text="Route Composition" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
              <Link to="/docs/routing/params-and-query" text="Params & Query" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
              <Link to="/docs/routing/tips" text="Tips & Patterns" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
            </div>
          </div>
          <div>
            <div class="text-[11px] uppercase tracking-wider text-gray-500 mb-3">Lifecycle & Data Fetching</div>
            <div class="space-y-1">
              <Link to="/docs/lifecycle-and-data-fetching" text="Overview" className="block px-2.5 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100" activeClassName="bg-gray-50 text-gray-900 font-medium border border-gray-200" />
            </div>
          </div>
        </aside>
        <article class="p-8 overflow-y-auto overflow-x-hidden min-w-0">
          <div class="docs-article min-w-0">{child}</div>
        </article>
      </div>
    </div>
  ) as HTMLElement
}