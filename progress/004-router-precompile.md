# 004 – Router matcher precompilation and app unmount cleanup

Status: Implemented, pending review

Overview
- Router now precompiles regexes for string route patterns and caches them, avoiding per-navigation rebuilds.
- Noisy console debug during matching has been removed (or gated under dev env for guard warnings).
- App.unmount() now calls the route component’s cleanup function before clearing the container, ensuring lifecycle cleanups run.

Changes
- src/router.ts: added compiledPatterns Map and normalize/build helpers; matchRoute now uses cached regex.
- src/router.ts: guard-blocked warnings gated behind isDevEnv; matching debug logs removed.
- src/app.ts: unmount implements cleanup of the current view before clearing DOM.

Behavior
- Route matching remains case-insensitive with tolerant trailing slash handling.
- Params continue to be extracted via named capture groups (e.g., :id).
- Lifecycle cleanups (onMount/onUnmount) registered within route components are executed when unmount is called.

Next steps (from refine.md)
- Strengthen route types by deriving Names/Paths directly from defineRoutes instead of ambient unions.
- Add path builders and type-safe pushNamed using inferred param types.
- Consider prefetchRoute(name, params) and integrate with createResource.