import { h } from 'auwla'

export function DocsFrameworkOverview() {
  return (
    <section class="docs-prose">
      <h1>Auwla Framework Overview</h1>
      <p>Auwla is a lightweight, reactive UI framework designed for clarity, performance, and a familiar yet innovative developer experience.</p>

      <h2>Core Concepts</h2>
      <ul class="list-disc pl-6">
        <li><strong>Reactivity</strong>: `ref()`, `watch()`, `derive()` for state and computed values (`src/state.ts:122–207`, `300–417`, `480–567`).</li>
        <li><strong>JSX Runtime</strong>: `h()` creates elements and components, handles reactive attrs and events (`src/jsx.ts:121–178`, `193–301`).</li>
        <li><strong>Children Handling</strong>: `appendChildren()` supports refs, nodes, arrays, and function-children conditionals (`src/jsx.ts:35–98`).</li>
        <li><strong>Lifecycle</strong>: Component context with mount/unmount, error hooks (`src/lifecycle.ts:151–175`, `182–193`, `219–260`).</li>
        <li><strong>Routing & Meta</strong>: Typed routes and meta layer for pages/layouts (`src/routes.ts`, `src/meta.ts:78–173`).</li>
        <li><strong>Plugins</strong>: Define composable contexts with `definePlugin()` and inherit via layouts (`src/plugin.ts:47–64`, `69–86`, `109–143`).</li>
        <li><strong>Devtools</strong>: Collectors & overlay for debugging (`src/devtools.ts:108–327`, `src/devtools-ui.ts:21–99`).</li>
      </ul>

      <h2>JSX & Rendering</h2>
      <ul class="list-disc pl-6">
        <li><strong>Elements</strong>: <code>{"h('div', { class: 'box' }, children)"}</code> returns DOM nodes.</li>
        <li><strong>Components</strong>: returns JSX in a component context with auto cleanup (e.g., <code>{'<section/>'}</code>).</li>
        <li><strong>Reactive Attributes</strong>: Pass `Ref` values for `class`, `style`, and common props (e.g., `value`, `checked`).</li>
        <li><strong>Function Children</strong>: Inline conditionals via <code>{'() =>'}</code> functions with lazy, dependency-tracked updates (`src/jsx.ts:39–98`).</li>
        <li><strong>Lists</strong>: Use <code>{'<For/>'}</code> or arrays with `key` for efficient keyed reconciliation (`src/jsxutils.tsx:306–632`).</li>
      </ul>

      <h2>State & Reactivity</h2>
      <ul class="list-disc pl-6">
        <li><code>{'ref(initial)'}</code> creates a reactive value (<code>{'{ value, subscribe }'}</code>).</li>
        <li>`watch(source, fn)` observes changes; auto-cleaned in component context.</li>
        <li>`derive(getter)` auto-tracks dependencies during compute, re-runs when any accessed ref changes.</li>
        <li>Equality & batching designed for performance (`src/state.ts:569–599`).</li>
      </ul>

      <h2>Routing & Meta</h2>
      <ul class="list-disc pl-6">
        <li>Define routes with `defineRoutes`, `group`, and compose via `composeRoutes`.</li>
        <li><code>{'defineLayout((ctx, child) => ...)'}</code> provides shared plugin context and a `.definePage` helper.</li>
        <li><code>{'definePage((ctx) => ...)'}</code> receives route params/query/path and merged plugin context.</li>
      </ul>

      <h2>Plugins</h2>
      <ul class="list-disc pl-6">
        <li>Create plugins with <code>{'definePlugin(() => ({ ...context }))'}</code>.</li>
        <li>Compose with `plugins(...)` for type-safe tuples; cached for shared instances.</li>
        <li>Attach at layout/page level; contexts merge across hierarchy (`src/plugin.ts:124–143`, `163–181`).</li>
      </ul>

      <h2>Devtools & Performance</h2>
      <ul class="list-disc pl-6">
        <li>Enable devtools to inspect refs, watchers, and component lifecycles.</li>
        <li>Benchmarks: `apps/*-bench` compare list updates and rendering pathways.</li>
      </ul>

      <h2>Example</h2>
      <pre><code>{`import { h, ref, derive, watch } from 'auwla'

function Counter() {
  const count = ref(0)
  return (
    <div>
      <button onClick={() => count.value++}>+</button>
      {() => count.value > 0 ? <span>Positive</span> : <span>Zero</span>}
    </div>
  ) as HTMLElement
}`}</code></pre>
    </section>
  ) as HTMLElement
}
