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

import { getRoutedContext } from './router'

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
 *     // Access path, params, query, router and previous match
 *     console.log(ctx.path, ctx.params.id, ctx.query.tab)
 *
 *     // Cache fetched data on the router to avoid refetching
 *     if (!ctx.state.user) {
 *       // fetchUser returns a promise, you can manage it here
 *       // and optionally return a cleanup for abort controllers, etc.
 *       // ctx.state.user = await fetchUser(ctx.params.id)
 *     }
 *   })
 *   return <div>User { /* render using refs or ctx.state /*} </div>
 /** 
 *
 *
 * Notes:
 * - Runs after mount; cleanup (if returned) is handled automatically.
 * - Prefer this over route-level `routed` when you need component-local effects.
 */
export function onRouted(
  callback: (ctx: ReturnType<typeof getRoutedContext> extends infer C ? C : any) => void | CleanupFn
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