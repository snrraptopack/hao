type CleanupFn = () => void;
type LifecycleCallback = () => void | CleanupFn;

export interface ComponentContext {
  cleanups: Set<CleanupFn>;
  mountCallbacks: LifecycleCallback[];
  isMounted: boolean;
}

let currentComponent: ComponentContext | null = null;

/**
 * Run a callback after the component is mounted to the DOM.
 * Return a cleanup function to run on unmount.
 * 
 * @param {LifecycleCallback} callback - Function to run on mount
 * 
 * Example (JSX):
 * ```tsx
 * function Clock() {
 *   onMount(() => {
 *     const id = setInterval(() => console.log('tick'), 1000)
 *     return () => clearInterval(id)
 *   })
 *   return <div>Clock running…</div>
 * }
 * ```
 * 
 * Builder usage remains supported.
 */
export function onMount(callback: LifecycleCallback) {
  if (!currentComponent) {
    console.warn('onMount called outside component context', new Error().stack);
    return;
  }
  
  // Store callback to run after DOM is ready
  currentComponent.mountCallbacks.push(callback);
}

/**
 * Run a cleanup callback when the component is removed from the DOM.
 * 
 * @param {CleanupFn} callback - Cleanup function
 * 
 * Example (JSX):
 * ```tsx
 * function Sub() {
 *   onUnmount(() => console.log('Cleaning up…'))
 *   return <div>Subscribed</div>
 * }
 * ```
 */
export function onUnmount(callback: CleanupFn) {
  if (!currentComponent) {
    console.warn('onUnmount called outside component context');
    return;
  }
  currentComponent.cleanups.add(callback);
}

import { getRoutedContext, type RoutedContext } from './router'

// Routed lifecycle: runs after mount with route context provided by the router


/**
 * Run a callback after the component mounts with the current routed context.
 * Useful for reacting to `params`, `query`, reading/writing router `state`,
 * or performing route-scoped effects.
 *
 * Example (JSX):
 * ```tsx
 * function UserPage() {
 *   onRouted((ctx) => {
 *     // Access current route information
 *     console.log('Path:', ctx.path)
 *     console.log('Params:', ctx.params.id)
 *     console.log('Query:', ctx.query.tab)
 *     
 *     // Access previous route (now available!)
 *     if (ctx.prev) {
 *       console.log('Came from:', ctx.prev.path)
 *       console.log('Previous params:', ctx.prev.params)
 *     }
 *
 *     // Cache fetched data on the router to avoid refetching
 *     if (!ctx.state.user) {
 *       fetchUser(ctx.params.id).then(user => {
 *         ctx.state.user = user
 *       })
 *     }
 *     
 *     // Optional: return cleanup function
 *     return () => {
 *       console.log('Route cleanup')
 *     }
 *   })
 *   return <div>User page content</div>
 * }
 * ```
 *
 * Notes:
 * - Runs after mount; cleanup (if returned) is handled automatically.
 * - Prefer this over route-level `routed` when you need component-local effects.
 * - `ctx.prev` contains previous route match (path, params, query, route) or null if first navigation.
 */
export function onRouted(
  callback: (ctx: RoutedContext) => void | CleanupFn
) {
  if (!currentComponent) {
    console.warn('onRouted called outside component context');
    return;
  }
  const ctx = getRoutedContext();
  if (!ctx) {
    console.warn('onRouted: no routed context available');
    return;
  }
  // Capture ctx and run after mount; cleanup handled by executeMountCallbacks
  currentComponent.mountCallbacks.push(() => callback(ctx));
}

/**
 * Internal: Set the current component context
 * @internal
 */
export function setCurrentComponent(context: ComponentContext | null) {
  currentComponent = context;
}

/**
 * Internal: Get the current component context
 * @internal
 */
export function getCurrentComponent() {
  return currentComponent;
}

/**
 * Internal: Execute mount callbacks for a component
 * Should be called after component is attached to DOM
 * @internal
 */
export function executeMountCallbacks(context: ComponentContext) {
  if (context.isMounted) return;
  context.isMounted = true;
  
  // Execute all mount callbacks
  context.mountCallbacks.forEach(callback => {
    try {
      const cleanup = callback();
      if (typeof cleanup === 'function') {
        context.cleanups.add(cleanup);
      }
    } catch (error) {
      console.error('Error in onMount callback:', error);
    }
  });
  
  // Clear callbacks after execution
  context.mountCallbacks = [];
}

/**
 * Internal: Execute cleanup callbacks for a component
 * Should be called when component is being destroyed
 * @internal
 */
export function executeCleanup(context: ComponentContext) {
  context.cleanups.forEach(cleanup => {
    try {
      cleanup();
    } catch (error) {
      console.error('Error in cleanup:', error);
    }
  });
  context.cleanups.clear();
}

/**
 * Creates a new component context
 * @internal
 */
export function createComponentContext(): ComponentContext {
  return {
    cleanups: new Set<CleanupFn>(),
    mountCallbacks: [],
    isMounted: false
  };
}

import { ref, type Ref } from './state';

/**
 * Hook for handling errors within a component.
 * Returns a ref that will contain any error caught during rendering or lifecycle.
 * 
 * Example (JSX):
 * ```tsx
 * function DashboardWidget() {
 *   const error = onError()
 *   
 *   // Your component logic that might throw
 *   const data = fetchData() // might throw
 *   
 *   // Render error UI if error occurred
 *   if (error.value) {
 *     return (
 *       <div class="error-widget">
 *         <h3>Widget Error</h3>
 *         <p>{error.value.message}</p>
 *         <button onClick={() => window.location.reload()}>Retry</button>
 *       </div>
 *     )
 *   }
 *   
 *   return <div>Widget content: {data}</div>
 * }
 * ```
 * 
 * Advanced: Wrap risky operations
 * ```tsx
 * function UserProfile() {
 *   const error = onError()
 *   const user = ref<User | null>(null)
 *   
 *   onMount(() => {
 *     try {
 *       const data = await fetchUser()
 *       user.value = data
 *     } catch (e) {
 *       error.value = e as Error
 *     }
 *   })
 *   
 *   if (error.value) {
 *     return <div>Failed to load: {error.value.message}</div>
 *   }
 *   
 *   return <div>User: {user.value?.name}</div>
 * }
 * ```
 * 
 * Note: This is for component-local error handling. For app-wide error catching,
 * consider wrapping your root component in a try-catch or using window.onerror.
 */
export function onError(): Ref<Error | null> {
  const error = ref<Error | null>(null);
  
  if (!currentComponent) {
    console.warn('onError called outside component context');
    return error;
  }
  
  // Store error ref in context so it can be set by error handlers
  (currentComponent as any).__errorRef = error;
  
  return error;
}