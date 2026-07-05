# Auwla Automatic Islands Architecture (Partial Hydration) Prototype Design

This document details the architectural plan and implementation roadmap for bringing **Zero-Config Automatic Islands (Partial Hydration)** to Auwla. This design enables Astro-like performance by automatically rendering static components to raw HTML and only compiling/hydrating reactive parts of the page, all without requiring manual `client:*` directives.

---

## 1. Config & Types Extension

We will add `'islands'` as a first-class rendering target in the global schema:

```typescript
// src/config/index.ts
export type AuwlaRenderMode = 'ssr' | 'ssg' | 'spa' | 'islands';
```

This allows developers to configure islands rendering globally in `auwla.config.ts` or on a per-route basis:

```typescript
// auwla.config.ts
import { defineConfig } from 'auwla/config';

export default defineConfig({
  target: 'islands', // Enable automatic islands globally
  routeRules: {
    '/blog/**': { renderMode: 'ssg' }, // Plain static pages
    '/dashboard/**': { renderMode: 'spa' } // Full-client SPA
  }
});
```

---

## 2. Compiler-Driven Component Classification

The compiler will automatically analyze every component's AST to determine its reactivity classification:

```
[Component AST] --> Static Analysis
                     |
                     +--> Has Local Setup Mutations? (Yes -> Reactive Island)
                     |
                     +--> Has JSX Event Handlers?     (Yes -> Reactive Island)
                     |
                     +--> Has Two-Way Bindings?       (Yes -> Reactive Island)
                     |
                     +--> None of the above           (No  -> Static Component)
```

### Classification Rules:
1. **Static Component**:
   * No assignments to setup-local variables (except declarations).
   * No JSX event handlers (`onClick`, `onInput`, etc.).
   * No two-way binding properties (`bind={...}`).
2. **Reactive Component (Island)**:
   * Has local variables mutated within event handlers, timers, or fetches.
   * Has one or more interactive event bindings.
   * Uses two-way data binding.

---

## 3. Server-Side Island Container Generation

When compiling for the Server (`ssr: true` and `renderMode === 'islands'`):

### Static Components:
Rendered directly as raw static HTML string templates.

### Reactive Components:
The compiler automatically wraps the component's HTML output inside a custom boundary container (`data-auwla-island`):

```html
<!-- Server-Rendered Output -->
<div data-auwla-island="Counter" data-props='{"initial": 5}'>
  <button>Count: 5</button>
</div>
```

---

## 4. Client-Side Tree-Shaking (Zero Shipped JS)

During the client bundle build, our Vite/Rolldown plugin:
* Excludes the JavaScript setup, template, and update definitions of **Static** components.
* Only bundles and ships the JS code for **Reactive Islands** and the lightweight Auwla hydration micro-runtime.

---

## 5. Micro-Hydration Client Runtime

When the client page loads:
1. The micro-runtime executes and scans the DOM for any `[data-auwla-island]` container elements.
2. For each container found:
   * It extracts the `data-auwla-island` component name and parsing `data-props`.
   * It dynamically imports the reactive component:
     ```typescript
     const { Counter } = await import('/assets/islands/Counter.js');
     ```
   * It runs Auwla's lightweight hydration algorithm to mount and attach reactive listeners specifically to that container.

---

## 6. Implementation Roadmap

### Phase 1: Config & Types Setup
* Add `'islands'` rendering target to the `AuwlaRenderMode` type schema in `src/config/index.ts`.

### Phase 2: Compiler-Side Classifier
* Implement reactivity scanner in `src/compiler/index.ts` to identify if a component contains any setup mutations or event handlers.
* For server-side compilation, generate container attributes (`data-auwla-island`) for islands.

### Phase 3: Hydration Runtime
* Create a lightweight islands-hydration loader in the client runtime that scans the page for islands and boots them up.

### Phase 4: Vite Plugin Splitting
* Update the Vite plugin to split islands into separate chunks and tree-shake static components in the client bundle.
