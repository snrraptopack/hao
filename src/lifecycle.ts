type CleanupFn = () => void;
type LifecycleCallback = () => void | CleanupFn;

let currentComponent: Set<CleanupFn> | null = null;

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
    console.warn('onMount called outside component context')
    return
  }
  
  // Schedule for next frame (after DOM is ready)
  requestAnimationFrame(() => {
    const cleanup = callback()
    if (cleanup && currentComponent) {
      currentComponent.add(cleanup)
    }
  })
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
    console.warn('onUnmount called outside component context')
    return
  }
  currentComponent.add(callback)
}

/**
 * Internal: Set the current component context
 * @internal
 */
export function setCurrentComponent(cleanups: Set<CleanupFn> | null) {
  currentComponent = cleanups
}

/**
 * Internal: Get the current component context
 * @internal
 */
export function getCurrentComponent() {
  return currentComponent
}
