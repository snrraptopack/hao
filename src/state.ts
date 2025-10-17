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

    const handler: ProxyHandler<{ value: T }> = {
        get(target, property: string | symbol) {
            if (property === 'value') {
                return value;
            }
            if (property === 'subscribe') {
                return (callback: (newValue: T) => void) => {
                    subscribers.push(callback);
                    
                    // Return unsubscribe function
                    return () => {
                        const index = subscribers.indexOf(callback);
                        if (index > -1) {
                            subscribers.splice(index, 1);
                        }
                    };
                };
            }
            // Allow access to other properties (like __cleanup)
            return (target as any)[property];
        },
        
        set(target, property: string | symbol, newValue: any) {
            if (property === 'value') {
                if (value === newValue) return true; // Skip if same value
                
                value = newValue;
                
                // Notify all subscribers
                subscribers.forEach(callback => {
                    callback(newValue);
                });
                
                return true;
            }
            // Allow setting other properties (like __cleanup)
            (target as any)[property] = newValue;
            return true;
        }
    };

    return new Proxy({ value: initialValue }, handler) as Ref<T>;
}

/**
 * Watches one or more refs and creates derived state or runs side effects.
 * Returns a new Ref if the callback returns a value, otherwise runs as a side effect.
 * 
 * The returned ref (if any) has a special __cleanup property for unsubscribing.
 * 
 * @template T - The type(s) of the source ref(s)
 * @template R - The return type of the callback
 * @param {Ref<T> | Ref<any>[]} source - Single ref or array of refs to watch
 * @param {Function} callback - Function to run when sources change
 * @returns {Ref<R> | void} New reactive ref if callback returns value, void for side effects
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
 * // Side effect (no return value)
 * watch(todos, (newTodos) => {
 *   localStorage.setItem('todos', JSON.stringify(newTodos))
 * })
 * 
 * @example
 * // Cleanup when done
 * const derived = watch(source, (v) => v * 2)
 * // Later...
 * if (derived && '__cleanup' in derived) {
 *   (derived as any).__cleanup()
 * }
 */
export function watch<T, R>(
    source: Ref<T> | Ref<any>[],
    callback: ((value: any, oldValue?: any) => R | void)
): Ref<R> | void {
    const isArray = Array.isArray(source);
    const sources = isArray ? source : [source];
    
    // Get initial values
    const getValues = () => isArray 
        ? sources.map(s => s.value) as T
        : (sources[0]?.value as T);
    
    let oldValues = getValues();
    const result = callback(oldValues, undefined);
    
    // If callback returns a value, create a derived ref
    const hasReturnValue = result !== undefined;
    
    if (!hasReturnValue) {
        // Side effect only - just subscribe
        sources.forEach((sourceRef) => {
            sourceRef.subscribe(() => {
                const newValues = getValues();
                callback(newValues, oldValues);
                oldValues = newValues;
            });
        });
        return;
    }
    
    // Create derived ref with cleanup
    const derivedRef = ref(result as R);
    const unsubscribers: Array<() => void> = [];
    
    // Subscribe to all sources and track unsubscribers
    sources.forEach((sourceRef) => {
        const unsub = sourceRef.subscribe(() => {
            const newValues = getValues();
            const computedResult = callback(newValues, oldValues);
            
            if (computedResult !== undefined) {
                derivedRef.value = computedResult as R;
            }
            
            oldValues = newValues;
        });
        unsubscribers.push(unsub);
    });
    
    // Add cleanup method to derived ref
    (derivedRef as any).__cleanup = () => {
        unsubscribers.forEach(unsub => unsub());
    };
    
    return derivedRef as Ref<R>;
}