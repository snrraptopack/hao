export type Ref<T> = {
    value: T;
    subscribe(callback: (newValue: T) => void): () => void;
};

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
 */
export function ref<T>(initialValue: T): Ref<T> {
    let value = initialValue;
    const subscribers: ((newValue: T) => void)[] = [];
    let notifyScheduled = false;

    const scheduleNotify = () => {
        if (notifyScheduled) return;
        notifyScheduled = true;
        
        queueMicrotask(() => {
            notifyScheduled = false;
            // Call each subscriber once with latest value
            subscribers.forEach(callback => {
                try {
                    callback(value);
                } catch (error) {
                    console.error('Subscriber error:', error);
                }
            });
        });
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
 * // Derived ref - cleanup is automatic in Component
 * const doubled = watch(count, (v) => v * 2)
 * // No manual cleanup needed inside Component!
 */
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
    
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((val, idx) => val === b[idx]);
    }
    
    if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        return keysA.every(key => a[key] === b[key]);
    }
    
    return false;
}