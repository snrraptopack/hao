# Chapter 18 — SSR Basics

Server-side rendering improves perceived performance and SEO. Start with render-to-string and client takeover.

## Minimal Plan
- Provide `jsx-ssr.ts` with an `hSSR` that serializes elements and children.
- Match routes on the server, prefetch data, and render the same tree to HTML.
- Inline initial state as `window.__AUWLA_STATE__` in the HTML payload.
- On client load, boot the router, read state, and mount (replacing server HTML).

## Why Client Takeover First?
- Simpler than hydration; fewer invariants.
- Good enough for many apps where interactivity reboots immediately.

## Steps
1. Add `isServer` guards for DOM-only code (`document`, `MutationObserver`).
2. Create a small Node server that:
   - Matches `req.url` → route/component.
   - Runs service prefetches (Node `fetch`).
   - Renders HTML via `renderToString(root)`.
   - Injects `__AUWLA_STATE__` and serves a single JS bundle.
3. Client reads `__AUWLA_STATE__` and boots the router.

## Exercise
- Implement `renderToString` for basic elements/attrs and text.
- Render the home page with preloaded posts.

## Checklist
- [ ] You can outline the SSR adapter.
- [ ] You can prefetch data and inject initial state.
- [ ] You can boot client takeover reliably.