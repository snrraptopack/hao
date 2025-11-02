# Creating An Application

This guide shows you how to build an Auwla application from scratch. We'll take a manual approach: importing `h`, writing pages as plain functions, and mounting the app to a DOM container. This example intentionally avoids routing to focus on the fundamentals.

## 0. Install & Run

First, you'll need to install Auwla and Vite, the build tool we'll use for the development server.

```shell
npm install auwla vite 
npm run dev
```

Next, you need to configure Vite and TypeScript to use Auwla's classic JSX factory (`h` and `Fragment`).

### vite.config.ts
Ensure Vite and TypeScript are set to use the classic JSX factory (`h`/`Fragment`):

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  server: { port: 5173 },
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment'
  }
})
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["DOM", "ESNext"],
    "strict": true,
    "skipLibCheck": true,
    "jsx": "preserve",
    "jsxFactory": "h",
    "jsxFragmentFactory": "Fragment"
  },
  "include": ["src"]
}
```

## 1. HTML Container

Add a root element in your `index.html` and load the entry file:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Auwla App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

## 2. Write Your App as Plain Functions

With Auwla, components are just functions that return DOM elements. You'll need to import `h` in every `.tsx` file to let TypeScript know how to handle the JSX syntax. Let's create an `App.tsx` file inside a `src` directory.

`src/App.tsx`
```TypeScriptJSX
import { h } from 'auwla'

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
```

## 3. Mount to the DOM

Finally, create a `main.tsx` file in `src` to mount your `App` component to the DOM. This file finds the `#app` container from your `index.html` and injects your application into it.

`src/main.tsx`
```TypeScriptJSX
import { h } from 'auwla'
import { App } from './App'

const root = document.getElementById('app')!
root.replaceChildren(App())
```

With these files in place, running `npm run dev` will start your server, and you can see your application at `http://localhost:5173`.

## Notes
- **TSX requires `h`**: When using the classic JSX factory (`jsxFactory: "h"`), you must import `h` in any file containing JSX.
- **Composition**: Prefer small components and clear, explicit composition. Avoid implicit `children` unless it clarifies your component's purpose.
- **Router-Free**: This guide intentionally omits routing to focus on core concepts. Routing is covered in its own section.
