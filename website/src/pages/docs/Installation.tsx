import { h } from 'auwla'
import { CodeBlock } from '../../components/CodeBlock'

export function DocsInstallation() {
  return (
    <section class="docs-prose">
      <h1>Installation</h1>
      <p>Use the starter to scaffold a minimal project quickly.</p>

      <h2>Quick Start (npm create)</h2>
      <CodeBlock language="bash" code={`npm create auwla@latest`} />
      <p>The command will prompt for a directory and create a minimal setup with Vite.</p>

      <h2>Template Structure (minimal)</h2>
      <CodeBlock language="none" code={`.
├── index.html
├── package.json
├── src/
│   ├── global.d.ts
│   ├── main.tsx
│   └── routes.tsx
├── tsconfig.json
└── vite.config.ts`} />
      <p>Open the project, run <code>npm install</code>, then <code>npm run dev</code> to start the dev server.</p>
    </section>
  ) as HTMLElement
}