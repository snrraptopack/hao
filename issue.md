# Issue: Route-Path Keying Breaks Global Query Cache Sharing

## Problem Description
Currently, the Auwla framework's remote query mechanism (`track.get`) keys cache entries by appending the current route path to the query key:
```typescript
const remoteName = `remote:${key}:${routePath}`;
const stateKey = makeKey(remoteName, '__global');
```
This route-path keying was introduced to prevent collisions on loaders across different slug paths. However, it creates a major performance issue and test failures:
1. **No Cache Sharing for Static Endpoints**: A query like `track.get('auth.me')` is cached as `remote:auth.me:/posts/1` on `/posts/1` and `remote:auth.me:/profile` on `/profile`. Navigating to any new page forces a network refetch of the logged-in user or site settings because the cache is page-local instead of global.
2. **Broken Unit Tests**:
   - `hydration.test.ts > seeds the registry so track.get() resolves immediately without a fetch`: Fails because the test seeds the cache using `'remote:posts.getPost'` but the code queries `'remote:posts.getPost:/'`.
   - `remote-track.test.ts > track.get skips background sync when route path changes`: Fails because it expects a query to be shared across routes and skip sync when navigating, which is blocked by the path suffix.

---

## The Architectural Dilemma
We cannot simply remove the route path suffix entirely, because:
- Server functions in Auwla are parameter-less on the call side (they read route parameters from the request context automatically).
- If we query `track.get('posts.getPost')` on `/posts/123` and `/posts/456`, they must have different cache keys so that navigating doesn't render incorrect cached data from the previous post.

---

## Proposed Solution: Combined Parameter-Keying & Explicit Scoping

To resolve this issue cleanly, we should combine automatic parameter-based keying with explicit override options:

### 1. Parameter-Keyed Cache Suffix (Default)
Instead of keying by the entire route path, key queries by the active route *parameters* (e.g. `id` in `/posts/:id`). 
* **Static routes** (like `/profile`, `/about`) have no params (`{}`), so they will naturally share the same cache key.
* **Slug routes** (like `/posts/:id`) will automatically separate cache keys based on parameter values (e.g., `id=123` vs `id=456`).

```typescript
function getCacheKeySuffix(): string {
  const params = getCurrentRouteParams();
  const sortedKeys = Object.keys(params).sort();
  if (sortedKeys.length === 0) return '';
  return ':' + sortedKeys.map(k => `${k}=${params[k]}`).join(',');
}
```

### 2. Explicit Global Scope Override (`global: true`)
For endpoints that are truly static and should be shared everywhere regardless of page parameters (like authentication, navigation menus, or site configuration), allow developers to pass a `global: true` option:
```typescript
// Always cached as "remote:auth.me" without any parameter suffix
const user = track.get('auth.me', { global: true });
```

### 3. Update the Unit Tests
Once this is implemented, update `hydration.test.ts` and `remote-track.test.ts` to align with the new keying architecture.
