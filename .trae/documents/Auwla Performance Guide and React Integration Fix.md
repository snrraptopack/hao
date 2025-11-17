## Objectives

* Resolve external import error for `auwla/integrations/react` by emitting its JS build output.

* Remove self-dependency and React peer dependencies from the core package.

* Keep React externalized so the integration works when consumers install React, without forcing it for non-React users.

## Changes

### package.json

* Remove `dependencies.auwla` to eliminate self-dependency.

* Remove `peerDependencies.react` and `peerDependencies.react-dom` as requested.

* Keep `exports` entries as-is for `./integrations/react`, `./jsx-runtime`, `./jsx-dev-runtime`, `./transition`.

### Build Config (vite.config.ts)

* Add multiple entry inputs using Rollup `input` so Vite emits separate files:

  * `src/index.ts` → `dist/auwla.js`

  * `src/jsx-runtime.ts` → `dist/jsx-runtime.js`

  * `src/jsx-dev-runtime.ts` → `dist/jsx-dev-runtime.js`

  * `src/integrations/react.tsx` → `dist/integrations/react.js`

  * (optional) `src/transition/index.ts` → `dist/transition/index.js` (if not already emitted)

* Keep `rollupOptions.external` for `react`, `react-dom`, `react-dom/client` to avoid bundling React.

## Verification

* Build the library and confirm the following files exist:

  * `dist/integrations/react.js`

  * `dist/jsx-runtime.js`

  * `dist/jsx-dev-runtime.js`

* In an external project, `import { ReactIsland } from 'auwla/integrations/react'` should resolve.

* Run dev/preview to ensure no dependency scan errors.

## Notes

* `src/integrations/react.tsx` already exists and lazy-loads React modules; this will work once the JS file is emitted.

* If later you prefer to decouple integrations entirely, we can remove the export and publish a separate package, but for now we’ll keep it inside core and optional.

## After Approval

* Apply edits to `package.json` and `vite.config.ts`.

* Build and verify outputs.

* Share the exact diffs and build results.

