# Chapter 19 — Hydration & Islands

Hydration wires events and reactivity onto server-rendered HTML without full re-rendering. Islands hydrate only parts.

## Hydration Plan
- Emit SSR markers/attributes for `When`/`For` (e.g., `data-auwla-key`, comment markers).
- Implement `hydrate(root, component)`:
  - Traverse existing DOM and attach event handlers.
  - Reuse nodes; don’t recreate unless needed.
  - Reconnect `watch` subscriptions to current nodes.

## Keys & Stability
- Ensure keys used in `For` are stable across SSR/CSR.
- The DOM order must match rendered order to avoid mismatches.

## Islands
- Render static sections server-side; hydrate only interactive islands.
- Mount islands by selectors or lightweight descriptors.

## Exercise
- Hydrate a simple list: SSR HTML with keys and a click handler.
- Implement partial hydration for a sidebar with toggles.

## Checklist
- [ ] You understand markers and mapping DOM to components.
- [ ] You reattached events without recreating nodes.
- [ ] You can selectively hydrate islands.