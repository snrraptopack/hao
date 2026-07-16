=<Header>
title: Installation
=</Header>

# Installation

Get up and running with Auwla by installing the package and setting up your bundler and compiler configurations.

## 1. Install the Package

Add `auwla` to your project dependencies using your package manager of choice:

```bash
# npm
npm install auwla

# pnpm
pnpm add auwla

# bun
bun add auwla
```

## 2. Configure Vite

Auwla relies on its custom JSX compiler to optimize your reactive scopes. Register the `auwla` plugin in your `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import { auwla } from "auwla/vite";

export default defineConfig({
  plugins: [
    auwla() // Compiles Auwla JSX templates
  ]
});
```

## 3. Configure TypeScript

To ensure TypeScript understands Auwla's JSX syntax and type definitions, add the following configuration to your `tsconfig.json` under `compilerOptions`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "auwla",
    "moduleResolution": "bundler"
  }
}
```

## 4. Setup Entry Point

Initialize your application by mounting your root component to the DOM in your entry file (e.g., `main.tsx`):

```tsx
import { createMemoApp } from "auwla";
import App from "./App";

createMemoApp(document.getElementById("app")!, <App />);
```

---

In the next section, we will walk through the [Quick Start](/docs/quick-start) to build your first reactive component.
