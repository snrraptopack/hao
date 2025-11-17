# View Transitions in Auwla

## Overview
- Native View Transitions provide animated, same‑document navigation.
- In Auwla, add `transition` to `Link` to enable out‑of‑the‑box transitions.
- Directional transitions (left/right/up/down) and shared element morphs are supported via CSS.

## Quick Start
1. Enable transitions on a link:
   ```tsx
   <Link to="/app/home" text="Home" transition />
   ```
2. Optional directional transition:
   ```tsx
   <Link to="/app/detail/42" text="Details" transition={{ direction: 'left' }} />
   ```
3. (Recommended) Add the preset CSS:
   ```ts
   import 'auwla/transition/view-transitions.css'
   ```
4. Name your route container to scope animations:
   ```css
   /* e.g., the element wrapping your route content */
   .route-root { view-transition-name: root }
   ```

## Link API
- `transition?: boolean | { name?: string; direction?: 'left' | 'right' | 'up' | 'down' | 'auto'; waitPrefetch?: boolean; duration?: number; easing?: string }`
- `name`: optional view‑transition group name for container/scoped animations
- `direction`: sets `html[data-vt-dir]` during transition for CSS targeting
- `waitPrefetch`: awaits route prefetch before transitioning to reduce flicker
- Defaults: feature‑detected, respects `prefers-reduced-motion`, debounces overlaps

## CSS Preset
- Import `auwla/transition/view-transitions.css` to get fade + directional slide animations keyed by `data-vt-dir`.
- The preset expects your route container to have `view-transition-name: root`.

## Beginner Examples
- Simple fade:
  ```tsx
  <Link to="/app/home" text="Home" transition />
  ```
- Left slide transition:
  ```tsx
  <Link to="/app/products" text="Products" transition={{ direction: 'left' }} />
  ```

## Intermediate Examples
- Await prefetch for smooth transitions:
  ```tsx
  <Link to="/app/detail/42" text="Details" transition={{ direction: 'left', waitPrefetch: true }} />
  ```
- Shared element morph:
  ```css
  [data-route-title] { view-transition-name: route-title }
  /* Optional: customize image pair */
  ::view-transition-image-pair(route-title) { animation-duration: 240ms }
  ```

## Advanced Examples
- Programmatic transitions via router:
  ```ts
  // Wrap any navigation or state update
  const vt = (document as any).startViewTransition(async () => router.push('/app/home'))
  ```
- Direction inference:
  ```ts
  // Use 'auto' direction and map forward/back to left/right in app logic
  <Link to="/app/back" text="Back" transition={{ direction: 'auto' }} />
  ```
- Custom animations:
  ```css
  html[data-vt-dir="left"] ::view-transition-new(root) { animation: my-enter 200ms ease }
  html[data-vt-dir="left"] ::view-transition-old(root) { animation: my-exit  200ms ease }
  @keyframes my-enter { from { opacity: 0; transform: translateX(8px) } to { opacity: 1; transform: none } }
  @keyframes my-exit  { from { opacity: 1; transform: none } to { opacity: 0; transform: translateX(-8px) } }
  ```

## Accessibility & Performance
- Respects `prefers-reduced-motion` (preset disables animations).
- Use transform/opacity for smoothness; keep durations short (200–300ms).
- Scope transitions to named containers to avoid heavy snapshots.
- Debounced overlapping clicks prevent stacked transitions.

## References
- Link config typing and handler: `src/router.ts:1009`, `src/router.ts:1088–1116`
- Prefetch helper: `src/router.ts:1057–1085`
- Preset CSS: `src/transition/view-transitions.css`
