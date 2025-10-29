import { h } from 'auwla'

export function DocsAdvanced() {
  return (
    <section class="docs-prose">
      <h1>Advanced Guide</h1>
      <p>Performance, SSR, hydration, and advanced routing. Tips to keep apps fast and maintainable.</p>
      <h2>Highlights</h2>
      <ul class="list-disc pl-6">
        <li>Optimize rendering and avoid redundant watchers.</li>
        <li>Plan SSR/Hydration with islands for selective interactivity.</li>
        <li>Use route guards and query handling in complex flows.</li>
      </ul>
    </section>
  ) as HTMLElement
}