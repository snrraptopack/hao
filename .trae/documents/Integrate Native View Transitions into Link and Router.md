## Goals
- Add native View Transitions (VT) to navigation with minimal API and safe defaults
- Support directional transitions (left/right/up/down) and prefetch gating
- Preserve accessibility and performance, with feature detection and skip heuristics

## Scope
- Public API: extend `Link` and router to opt-in transitions
- Runtime: wrap navigation (`push`/`popstate`) in `document.startViewTransition`
- CSS: define a simple contract for directional animations and shared element morphs

## Public API Changes
### Link Props
- `transition?: boolean | { name?: string; direction?: 'left' | 'right' | 'up' | 'down' | 'auto'; waitPrefetch?: boolean; duration?: number; easing?: string }`
- Default: no transition
- `name`: view-transition group name (e.g., `root`)
- `direction`: explicit or `auto`; used to set `html[data-vt-dir]`
- `waitPrefetch`: await route prefetch before pushing for flicker-free transitions
- `duration`/`easing`: optional hints (CSS remains source of truth)

### Router Options
- `enableTransitions?: boolean` (global default for links)
- `defaultDirection?: 'left' | 'right' | 'up' | 'down' | 'auto'`
- New method: `startTransition(opts, fn)` where `opts` mirrors `Link.transition`, and `fn` triggers navigation

## Implementation
### 1) Feature Detection & A11y
- `const supportsVT = 'startViewTransition' in document`
- Respect `prefers-reduced-motion`: skip transitions or use reduced animation

### 2) Link Click Handler (src/router.ts:1088–1116)
- Read `config.transition` (and router defaults)
- Compute `href` (already via `buildHref()` at 1020–1033)
- If VT enabled:
  - Compute `direction` (explicit or inferred when `'auto'`)
  - Set `document.documentElement.dataset.vtDir = direction`
  - If `waitPrefetch`, await `doPrefetch()` (1057–1085)
  - Call `document.startViewTransition(async () => { r.push(href) })`
  - After `vt.finished`, clear dataset
- Else: `r.push(href)` directly
- Debounce overlapping clicks while a transition is active

### 3) Direction Inference
- `auto` direction logic:
  - Track navigation stack depth in router (increment on `push`, decrement on `popstate`)
  - Forward → `'left'`, back → `'right'`
  - Expose helper: `router.getNavDirectionFor(path)`

### 4) Router.startTransition(fn)
- Add `startTransition(opts, fn)`:
  - Wraps any navigation or state update
  - Handles dataset, prefetch await, feature detection, reduced-motion
  - Returns the ViewTransition object or void

### 5) CSS Contract (App-level)
- Container naming:
  - Route root: `view-transition-name: root` (or custom `transition.name`)
- Directional animations:
  - `html[data-vt-dir="left"] ::view-transition-new(root)` slide-in; `::view-transition-old(root)` slide-out
  - Mirror for `right`, variants for `up/down`
- Shared element morphs:
  - Add `view-transition-name` to key elements (e.g., `[data-route-title]`)

### 6) Prefetch Gating
- If `waitPrefetch`, call `doPrefetch()` before `push(href)`
- Use existing helper at 1057–1085

### 7) Guardrails & Heuristics
- Skip when heavy:
  - Optional heuristic (future): if route marks itself heavy via `meta.heavy`, bypass VT
- Debounce clicks until `vt.finished`
- Cap default duration (~240–300ms), recommend transform/opacity only

## Files to Update
- `src/router.ts`
  - Extend `Link` props typing to include `transition`
  - Modify click handler to wrap navigation in VT
  - Add `startTransition(opts, fn)` and (optional) nav stack tracking
- (Optional) `src/app/style.css` or app-level CSS to showcase directional transitions (no framework changes needed)

## Testing
- Manual: navigate between pages with and without `transition`
- Cases:
  - `transition: true` default fade
  - `transition: { direction: 'left' }` and `'right'`
  - `waitPrefetch: true` on a route with `prefetch`
  - `prefers-reduced-motion` environment
  - Rapid clicks → only one transition runs
- Verify: class and dataset lifecycles, no console errors, no jank

## Rollout Strategy
- Ship as opt-in on `Link` to avoid breaking changes
- Add documentation examples and CSS snippets
- Provide router-level defaults for teams wanting global transitions

## Next Steps
- Implement `Link.transition` handling in `src/router.ts`
- Add `router.startTransition(opts, fn)`
- Provide example CSS snippets for left/right transitions in docs
- Validate across supported browsers
