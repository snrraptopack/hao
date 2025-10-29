import { h } from 'auwla'

export function DocsIntro() {
  return (
    <section>
      <h1 class="text-2xl font-semibold">Welcome to Auwla</h1>
      <p>
        Auwla is a friendly TypeScript UI toolkit that keeps JSX familiar and
        makes state and routing straightforward. This documentation is designed
        to be approachable, practical, and full of copy‑paste examples.
      </p>
      <p>
        Whether you’re building a tiny widget or a full app, Auwla helps you
        stay productive with a small API surface and sensible defaults.
      </p>
      <h2 class="text-xl font-semibold mt-4">What you’ll find here</h2>
      <ul class="list-disc pl-6">
        <li>Clear guides for JSX, components, and routing.</li>
        <li>Simple patterns for state with <code>ref()</code> and <code>watch()</code>.</li>
        <li>Examples you can adapt directly to your project.</li>
      </ul>
      <p>
        Start with “Quick Start” when you’re ready, and explore at your own
        pace. We’ll keep the experience smooth and the concepts focused.
      </p>
    </section>
  ) as HTMLElement
}