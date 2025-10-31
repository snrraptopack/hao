import { ref, watch, type Ref } from './state';

/**
 * SubStore represents a focused view over a nested slice of a parent Store.
 * It exposes a reactive value Ref<U> and write helpers that rebuild the parent
 * root via the provided `put` function (from branch()).
 */
export interface SubStore<U> {
  /** Reactive value of the nested slice. */
  value: Ref<U>;
  /** Replace the nested slice with `next`. */
  set(next: U): void;
  /** Compute the next nested slice from the previous value. */
  update(mutator: (prev: U) => U): void;
  /** Shallow update of a top-level key inside the nested slice. */
  updateAt<K extends keyof U>(key: K, next: U[K]): void;
}

/**
 * Store<T> is a local, structured, immutable state container.
 * - `value` is a Ref<T> that emits on changes.
 * - Writes produce a new root using structural sharing (copy only the changed path).
 * - Suitable for component/route/module scope; not necessarily global.
 */
export interface Store<T> {
  /** Reactive root value. */
  value: Ref<T>;
  /** Replace the entire root value. */
  set(next: T): void;
  /** Compute the next root from the previous value. */
  update(mutator: (prev: T) => T): void;
  /** Shallow merge of top-level keys (object roots only). */
  patch(partial: Partial<T>): void;
  /** Create a focused SubStore for a nested slice. */
  branch<U>(get: (t: T) => U, put?: (root: T, sub: U) => T): SubStore<U>;
  /** Update a top-level key with a mutator (object roots only). */
  updateAtKey<K extends keyof T>(key: K, mutator: (prev: T[K]) => T[K]): void;
  /**
   * Update a nested slice using a lens-like pair. Useful for one-off nested edits
   * without keeping a branch around.
   */
  updateAt<U>(get: (t: T) => U, mutator: (prev: U) => U, put: (root: T, sub: U) => T): void;
}

/**
 * Creates a local, structured, immutable state container.
 *
 * - value: Ref<T> of the current root value.
 * - set/patch/update: ergonomic write helpers. Updates are batched via the global scheduler.
 * - branch(): focus on a nested slice, returning a SubStore<U> with its own value and write helpers.
 * - updateAtKey(): shallow update for top-level keys without creating a branch.
 * - updateAt(): lens-style nested update using (get, put) without keeping a SubStore.
 *
 * Usage
 * ```ts
 * const userStore = createStore({ users: [], selectedId: null, byId: {} as Record<number, { id: number; name: string }> });
 * userStore.patch({ selectedId: 42 });
 * userStore.update(prev => ({ ...prev, byId: { ...prev.byId, 42: { ...prev.byId[42], name: 'Bob' } } }));
 *
 * // Focused work in a branch
 * const byId = userStore.branch(s => s.byId, (root, sub) => ({ ...root, byId: sub }));
 * byId.update(prev => ({ ...prev, 42: { ...prev[42], active: true } }));
 *
 * // Top-level key update
 * userStore.updateAtKey('selectedId', id => (id === 42 ? null : 42));
 * ```
 */
export function createStore<T>(initial: T): Store<T> {
  const root: Ref<T> = ref(initial);

  function set(next: T) {
    root.value = next;
  }

  function update(mutator: (prev: T) => T) {
    const prev = root.value;
    const next = mutator(prev);
    // Avoid redundant writes when Object.is equal
    if (!Object.is(prev, next)) {
      root.value = next;
    }
  }

  function patch(partial: Partial<T>) {
    const prev = root.value as unknown as Record<string, unknown>;
    if (typeof prev !== 'object' || prev === null) {
      throw new Error('patch() requires the root value to be an object');
    }
    // Shallow merge top-level keys
    const next = { ...(prev as any) } as any;
    let changed = false;
    for (const k of Object.keys(partial)) {
      const key = k as keyof T;
      const newVal = (partial as any)[key];
      if (!Object.is((prev as any)[key], newVal)) {
        (next as any)[key] = newVal;
        changed = true;
      }
    }
    if (changed) {
      root.value = next as T;
    }
  }

  function updateAtKey<K extends keyof T>(key: K, mutator: (prev: T[K]) => T[K]) {
    const prev = root.value as any;
    if (typeof prev !== 'object' || prev === null) {
      throw new Error('updateAtKey() requires the root value to be an object');
    }
    const curr = prev[key];
    const nextVal = mutator(curr);
    if (!Object.is(curr, nextVal)) {
      const next = { ...prev, [key]: nextVal } as T;
      root.value = next;
    }
  }

  function updateAt<U>(get: (t: T) => U, mutator: (prev: U) => U, put: (root: T, sub: U) => T) {
    const prevRoot = root.value;
    const prevSub = get(prevRoot);
    const nextSub = mutator(prevSub);
    if (!Object.is(prevSub, nextSub)) {
      const nextRoot = put(prevRoot, nextSub);
      if (!Object.is(prevRoot, nextRoot)) {
        root.value = nextRoot;
      }
    }
  }

  function branch<U>(get: (t: T) => U, put?: (root: T, sub: U) => T): SubStore<U> {
    // Derived view of the nested slice
    const value: Ref<U> = watch(root, (r) => get(r)) as Ref<U>;

    function ensurePut() {
      if (!put) throw new Error('Cannot write to a branch without a put(root, sub) function');
    }

    function getPut(): (root: T, sub: U) => T {
      ensurePut();
      return put as (root: T, sub: U) => T;
    }

    function set(next: U) {
      const prevRoot = root.value;
      const nextRoot = getPut()(prevRoot, next);
      if (!Object.is(prevRoot, nextRoot)) {
        root.value = nextRoot;
      }
    }

    function update(mutator: (prev: U) => U) {
      const prevRoot = root.value;
      const prevSub = get(prevRoot);
      const nextSub = mutator(prevSub);
      if (!Object.is(prevSub, nextSub)) {
        const nextRoot = getPut()(prevRoot, nextSub);
        if (!Object.is(prevRoot, nextRoot)) {
          root.value = nextRoot;
        }
      }
    }

    function updateAt<K extends keyof U>(key: K, next: U[K]) {
      const prevRoot = root.value;
      const prevSub = get(prevRoot) as any;
      if (typeof prevSub !== 'object' || prevSub === null) {
        throw new Error('updateAt() on branch requires the nested slice to be an object');
      }
      const curr = prevSub[key];
      if (!Object.is(curr, next)) {
        const nextSub = { ...prevSub, [key]: next } as U;
        const nextRoot = getPut()(prevRoot, nextSub);
        if (!Object.is(prevRoot, nextRoot)) {
          root.value = nextRoot;
        }
      }
    }

    return { value, set, update, updateAt };
  }

  return { value: root, set, update, patch, branch, updateAtKey, updateAt };
}

export type { Ref };