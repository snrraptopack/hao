# Chapter 2 — Setup & Dev Workflow

Get the project running, keep a tight feedback loop, and know where to edit.

## Prerequisites
- Node 18+ installed
- A terminal and a browser

## Start the Dev Server
```bash
npm install
npm run dev
# Open http://localhost:5173/
```

Keep the server running. Edit files under `src/` and the page auto-reloads.

## Project Map
- `src/jsx.ts` — JSX runtime (`h`, attr binding, event handling).
- `src/state.ts` — `ref`, `watch`, and watch-context.
- `src/lifecycle.ts` — `onMount`, cleanup hooks.
- `src/router.ts` — routes, params, navigation, state cache.
- `src/fetch.ts` — data fetching helper with caching and `refetch`.
- `src/jsxutils.tsx` — `When`, `For` helpers.
- `src/app` — your app modules, pages, layouts, and routes.

## Editing Flow
- Create or edit components under `src/app/modules/*`.
- Use `ref/watch` inside components. Bind events directly in JSX.
- Verify changes in the preview. Fix TypeScript warnings early.

## Exercise
- Add a new page (e.g., `src/app/pages/Playground.tsx`) and route to it.
- Render a small component with a button and a counter.

## Checklist
- [ ] Dev server starts and reloads quickly.
- [ ] You know key files to edit.
- [ ] You added and visited a new page.