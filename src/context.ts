import { ref, type Ref } from './state';

export interface Context<T = any> {
  readonly id: symbol;
  readonly defaultValue: T;
}

// Global context store
const globalContexts = new Map<symbol, any>();

/**
 * Creates a new context with a default value
 */
export function createContext<T>(defaultValue: T): Context<T> {
  const id = Symbol('context');
  return { id, defaultValue };
}

/**
 * Provider component for setting context values
 */
export function Provider<T>({ context, value, children }: {
  context: Context<T>;
  value: T;
  children: any;
}) {
  // Set the context value globally
  globalContexts.set(context.id, value);
  
  // Return children (could be enhanced with proper scoping)
  return children;
}

/**
 * Hook to consume context values
 */
export function useContext<T>(context: Context<T>): T {
  if (globalContexts.has(context.id)) {
    return globalContexts.get(context.id);
  }
  return context.defaultValue;
}

/**
 * Reactive context hook that returns a Ref
 */
export function useReactiveContext<T>(context: Context<T>): Ref<T> {
  const value = useContext(context);
  return ref(value);
}

/**
 * Sets a global context value
 */
export function setGlobalContext<T>(context: Context<T>, value: T): void {
  globalContexts.set(context.id, value);
}