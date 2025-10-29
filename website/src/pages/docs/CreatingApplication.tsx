import { h } from 'auwla'
import { CodeBlock } from '../../components/CodeBlock'

export function DocsCreatingApplication() {
  return (
    <section class="docs-prose">
      <h1>Creating an Application</h1>
      <p>Use the manual approach: import <code>h</code>, write pages as plain functions, and mount your app to a DOM container. No routing here — just the essentials.</p>

      <h2>0) Install & Run</h2>
      <p>Install dependencies and start the dev server:</p>
      <CodeBlock language="bash" code={`npm install auwla vite \nnpm run dev`} />

      <h2>vite.config.ts file</h2>
      <p>Ensure Vite and TypeScript are set to use the classic JSX factory (<code>h</code>/<code>Fragment</code>):</p>
      <CodeBlock language="ts" filename="vite.config.ts" code={`import { defineConfig } from 'vite'

      export default defineConfig({
        server: { port: 5173 },
        esbuild: {
          jsxFactory: 'h',
          jsxFragment: 'Fragment'
        }
      })`} />

         <h2>tsconfig.json file</h2>
        <CodeBlock language="json" filename="tsconfig.json" code={`{
        "compilerOptions": {
          "target": "ESNext",
          "module": "ESNext",
          "moduleResolution": "Bundler",
          "lib": ["DOM", "ESNext"],
          "strict": true,
          "skipLibCheck": true,
          "jsx": "react",
          "jsxFactory": "h",
          "jsxFragmentFactory": "Fragment"
        },
        "include": ["src"]
  }`} />


      <h2>1) HTML container</h2>
      <p>Add a root element in your <code>index.html</code> and load the entry file:</p>
      <CodeBlock language="markup" filename="index.html" code={`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Auwla App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`} />

      <h2>2) Write your app as plain functions</h2>
      <p>Import <code>h</code> to satisfy TypeScript (classic JSX factory) and return elements from functions. Keep composition small and explicit.</p>
      <CodeBlock language="tsx" filename="src/pages/App.tsx" code={`import { h } from 'auwla'

type HeaderProps = {
  title: string
}
function Header(props: HeaderProps) {
  return (
    <header>
      <h1>{props.title}</h1>
    </header>
  ) as HTMLElement
}

type CardProps = {
  title: string
  body: string
}
function Card(p: CardProps) {
  return (
    <section>
      <h2>{p.title}</h2>
      <p>{p.body}</p>
    </section>
  ) as HTMLElement
}

export function App() {
  return (
    <div>
      <Header title="Creating an Application" />
      <Card
        title="Plain functions"
        body="JSX is just functions with props."
      />
    </div>
  ) as HTMLElement
}
`} />

      <h2>3) Mount to the DOM</h2>
      <p>Replace the children of your container with your app’s root element:</p>
      <CodeBlock language="tsx" filename="src/main.tsx" code={`import { h } from 'auwla'
import { App } from './pages/App'

const root = document.getElementById('app')!
root.replaceChildren(App())
`} />

      <h2>Notes</h2>
      <ul class="list-disc pl-6">
        <li>TSX requires importing <code>h</code> when using the classic JSX factory (<code>jsxFactory: "h"</code>).</li>
        <li>Prefer small components and clear composition; avoid implicit <code>children</code> unless needed.</li>
        <li>Keep this page router‑free. Routing is covered separately.</li>
      </ul>
    </section>
  ) as HTMLElement
}