export type Ref<T> = {
    value: T;
    subscribe(callback: (newValue: T) => void): () => void;
};

// -------------------------------------------------------------
// Global reactive scheduler
// - Batches ref notifications in a microtask by default
// - Provides flushSync() to synchronously drain pending updates
// -------------------------------------------------------------
type Task = () => void;
const pendingTasks: Set<Task> = new Set();
let microtaskScheduled = false;

function flushPending() {
  // Drain until stable to handle cascading updates
  while (pendingTasks.size > 0) {
    const tasks = Array.from(pendingTasks);
    pendingTasks.clear();
    for (const task of tasks) {
      try {
        task();
      } catch (error) {
        console.error('Subscriber error:', error);
      }
    }
  }
}

function scheduleTask(task: Task) {
  pendingTasks.add(task);
  if (!microtaskScheduled) {
    microtaskScheduled = true;
    queueMicrotask(() => {
      microtaskScheduled = false;
      flushPending();
    });
  }
}

export function flushSync() {
  // Run all pending notifications immediately
  microtaskScheduled = false;
  flushPending();
}

// Async flush: wait for the scheduler microtask and next paint
export async function flush() {
  // Ensure any pending microtask-batched notifications run
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  // Wait a frame so the browser can commit layout/paint
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * Creates a reactive reference that tracks changes and notifies subscribers.
 * 
 * @template T - The type of the value being tracked
 * @param {T} initialValue - The initial value of the ref
 * @returns {Ref<T>} A reactive reference object
 * 
 * @example
 * ```typescript
 * const count = ref(0)
 * count.value++ // Updates value and notifies subscribers
 * 
 * const user = ref({ name: 'John', age: 30 })
 * user.value = { name: 'Jane', age: 25 }
 * 
 * // Subscribe to changes
 * const unsubscribe = count.subscribe((newValue) => {
 *   console.log('Count changed:', newValue)
 * })
 * 
 * // Cleanup when done
 * unsubscribe()
 * ```
 *
 * @example
 * // JSX usage: refs render as text nodes
 * const count = ref(0)
 * const App = () => (
 *   <button onClick={() => count.value++}>Clicked {count} times</button>
 * )
 */
export function ref<T>(initialValue: T): Ref<T> {
    let value = initialValue;
    const subscribers: ((newValue: T) => void)[] = [];
    let notifyScheduled = false;

    const notifySubscribers = () => {
        notifyScheduled = false;
        // Call each subscriber once with latest value
        subscribers.forEach(callback => {
            try {
                callback(value);
            } catch (error) {
                console.error('Subscriber error:', error);
            }
        });
    };

    const scheduleNotify = () => {
        if (notifyScheduled) return;
        notifyScheduled = true;
        // Use global scheduler for batching, can be drained via flushSync()
        scheduleTask(notifySubscribers);
    };

    const handler: ProxyHandler<{ value: T }> = {
        get(target, property: string | symbol) {
            if (property === 'value') {
                return value;
            }
            if (property === 'subscribe') {
                return (callback: (newValue: T) => void) => {
                    subscribers.push(callback);
                    return () => {
                        const index = subscribers.indexOf(callback);
                        if (index > -1) {
                            subscribers.splice(index, 1);
                        }
                    };
                };
            }
            return (target as any)[property];
        },
        
        set(target, property: string | symbol, newValue: any) {
            if (property === 'value') {
                if (value === newValue) return true; // Skip if same reference
                
                value = newValue;
                scheduleNotify(); // ✅ Batched
                
                return true;
            }
            (target as any)[property] = newValue;
            return true;
        }
    };

    return new Proxy({ value: initialValue }, handler) as Ref<T>;
}

// Track current component context for automatic cleanup
let currentWatchContext: Set<() => void> | null = null;

/**
 * Set the current watch context (used by Component internally)
 * @internal
 */
export function setWatchContext(context: Set<() => void> | null) {
    currentWatchContext = context;
}

/**
 * Get the current watch context
 * @internal
 */
export function getWatchContext() {
    return currentWatchContext;
}

/**
 * Watches one or more refs and creates derived state or runs side effects.
 * Returns a new Ref if the callback returns a value, otherwise runs as a side effect.
 * 
 * **Auto-cleanup**: When used inside a Component, subscriptions are automatically 
 * cleaned up when the component unmounts. No manual cleanup needed!
 * 
 * @template T - The type(s) of the source ref(s)
 * @template R - The return type of the callback
 * @param {Ref<T> | Ref<any>[]} source - Single ref or array of refs to watch
 * @param {Function} callback - Function to run when sources change
 * @returns {Ref<R> | (() => void)} New reactive ref if callback returns value, 
 *                                   cleanup function for side effects
 * 
 * @example
 * // Computed value (returns Ref)
 * const count = ref(0)
 * const doubled = watch(count, (v) => v * 2)
 * console.log(doubled.value) // 0
 * count.value = 5
 * console.log(doubled.value) // 10
 * 
 * @example
 * // Multiple sources
 * const firstName = ref('John')
 * const lastName = ref('Doe')
 * const fullName = watch([firstName, lastName], ([f, l]) => `${f} ${l}`)
 * 
 * @example
 * // Side effect with auto-cleanup in Component
 * const App = Component((ui) => {
 *   const todos = ref([])
 *   
 *   // ✅ Automatically cleaned up when component unmounts
 *   watch(todos, (newTodos) => {
 *     console.log('Todos changed:', newTodos)
 *   })
 * })
 * 
 * @example
 * // Side effect with manual cleanup (outside Component)
 * const cleanup = watch(source, (v) => console.log(v))
 * // Later...
 * cleanup() // ✅ Call to unsubscribe
 * 
 * @example
 * // JSX usage: use derived refs directly in templates
 * const count = ref(0)
 * const doubled = watch(count, (v) => v * 2)
 * const App = () => (
 *   <div>
 *     <button onClick={() => count.value++}>Inc</button>
 *     <span>Value: {count}, Doubled: {doubled}</span>
 *   </div>
 * )
 * 
 * @example
 * // Derived ref - cleanup is automatic in Component
 * const doubled = watch(count, (v) => v * 2)
 * // No manual cleanup needed inside Component!
 */
// Overloads: return Ref<R> when callback returns a value, otherwise return cleanup function
export function watch<T, R>(source: Ref<T> | Ref<any>[], callback: (value: any, oldValue?: any) => R): Ref<R>;
export function watch<T>(source: Ref<T> | Ref<any>[], callback: (value: any, oldValue?: any) => void): () => void;
export function watch<T, R>(
    source: Ref<T> | Ref<any>[],
    callback: ((value: any, oldValue?: any) => R | void)
): Ref<R> | (() => void) {
    const isArray = Array.isArray(source);
    const sources = isArray ? source : [source];
    
    const getValues = () => isArray 
        ? sources.map(s => s.value) as T
        : (sources[0]?.value as T);
    
    let oldValues = getValues();
    let cachedResult = callback(oldValues, undefined);
    
    const hasReturnValue = cachedResult !== undefined;
    const unsubscribers: Array<() => void> = [];
    
    if (!hasReturnValue) {
        // Side effect
        sources.forEach((sourceRef) => {
            const unsub = sourceRef.subscribe(() => {
                const newValues = getValues();
                
                // OPTIMIZATION: Deep equality check for arrays/objects
                if (!shallowEqual(newValues, oldValues)) {
                    callback(newValues, oldValues);
                    oldValues = newValues;
                }
            });
            unsubscribers.push(unsub);
        });
        
        const cleanup = () => unsubscribers.forEach(unsub => unsub());
        
        if (currentWatchContext) {
            currentWatchContext.add(cleanup);
        }
        
        return cleanup;
    }
    
    // Derived ref with memoization
    const derivedRef = ref(cachedResult as R);
    
    sources.forEach((sourceRef) => {
        const unsub = sourceRef.subscribe(() => {
            const newValues = getValues();
            
            // OPTIMIZATION: Only recompute if values actually changed
            if (!shallowEqual(newValues, oldValues)) {
                const computedResult = callback(newValues, oldValues);
                
                if (computedResult !== undefined) {
                    // OPTIMIZATION: Only update if result changed
                    if (!shallowEqual(computedResult, cachedResult)) {
                        cachedResult = computedResult;
                        derivedRef.value = computedResult as R;
                    }
                }
                
                oldValues = newValues;
            }
        });
        unsubscribers.push(unsub);
    });
    
    (derivedRef as any).__cleanup = () => {
        unsubscribers.forEach(unsub => unsub());
    };
    
    if (currentWatchContext) {
        currentWatchContext.add((derivedRef as any).__cleanup);
    }
    
    return derivedRef as Ref<R>;
}

function shallowEqual(a: any, b: any): boolean {
    if (a === b) return true;

    // Arrays: element-wise reference equality
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    // Treat DOM Nodes and non-plain objects as unequal unless strictly equal
    const isObjectA = typeof a === 'object' && a !== null;
    const isObjectB = typeof b === 'object' && b !== null;
    if (isObjectA && isObjectB) {
        // Detect DOM Node (has numeric nodeType)
        const isNodeA = typeof (a as any).nodeType === 'number';
        const isNodeB = typeof (b as any).nodeType === 'number';
        if (isNodeA || isNodeB) {
            // If either is a Node, only strict equality counts as equal
            return false;
        }

        // Plain object check: only compare enumerable own props
        const protoA = Object.getPrototypeOf(a);
        const protoB = Object.getPrototypeOf(b);
        const isPlainA = protoA === Object.prototype || protoA === null;
        const isPlainB = protoB === Object.prototype || protoB === null;
        if (!isPlainA || !isPlainB) {
            // Non-plain objects (Date, Map, Set, custom classes) are unequal by default
            return false;
        }

        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        for (let i = 0; i < keysA.length; i++) {
            const key = keysA[i]!;
            if ((a as any)[key] !== (b as any)[key]) return false;
        }
        return true;
    }

    // Primitives: already handled by strict equality at top
    return false;
}