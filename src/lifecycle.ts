type CleanupFn = () => void;
type LifecycleCallback = () => void | CleanupFn;

export interface ComponentContext {
  cleanups: Set<CleanupFn>;
  mountCallbacks: LifecycleCallback[];
  isMounted: boolean;
}

let currentComponent: ComponentContext | null = null;

/**
 * Runs callback when component is mounted to the DOM.
 * Return a cleanup function to run on unmount.
 * 
 * @param {LifecycleCallback} callback - Function to run on mount
 * 
 * @example
 * ```typescript
 * const App = Component((ui) => {
 *   onMount(() => {
 *     console.log('Component mounted!')
 *     
 *     // Setup interval
 *     const interval = setInterval(() => {
 *       console.log('tick')
 *     }, 1000)
 *     
 *     // Return cleanup function
 *     return () => clearInterval(interval)
 *   })
 *   
 *   ui.Text({ value: "Hello" })
 * })
 * ```
 */
export function onMount(callback: LifecycleCallback) {
  if (!currentComponent) {
    console.warn('onMount called outside component context');
    return;
  }
  
  // Store callback to run after DOM is ready
  currentComponent.mountCallbacks.push(callback);
}

/**
 * Runs callback when component is removed from DOM.
 * 
 * @param {CleanupFn} callback - Cleanup function
 * 
 * @example
 * ```typescript
 * onUnmount(() => {
 *   console.log('Cleaning up...')
 *   // Cancel subscriptions, close connections, etc.
 * })
 * ```
 */
export function onUnmount(callback: CleanupFn) {
  if (!currentComponent) {
    console.warn('onUnmount called outside component context');
    return;
  }
  currentComponent.cleanups.add(callback);
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