// Ambient augmentation that supplies the union of registered route paths
// derived from the app's composed routes. This drives autocompletion
// for Link.to and router.push/replace.

// Use a type-only import via `typeof import()` to avoid runtime codegen.
type AllRoutes = typeof import('./routes').allRoutes;

declare global {
  interface AuwlaRouterAppPaths {
    // Extract only string-based route patterns (exclude RegExp routes)
    paths: Extract<AllRoutes[number]['path'], string>;
    names: Extract<AllRoutes[number]['name'], string>;
  }
}