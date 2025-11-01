import { watch, type Ref } from './state';

// Helper to check if an item is a ref
function isRef<T = any>(v: any): v is Ref<T> {
  return v && typeof v === 'object' && 'value' in v && typeof v.subscribe === 'function';
}

// ============================================
// WHEN Component
// ============================================

interface WhenProps {
  children?: (Ref<boolean> | (() => Node) | Node)[];
}

/**
 * Conditional rendering in JSX.
 * Pairs `Ref<boolean>` conditions with render functions; the last child may be
 * a fallback (function or Node). The first truthy condition wins.
 *
 * Examples (JSX):
 * - Single condition with fallback Node
 *   `<When>{isLoading}{() => <span>Loading…</span>}{<span>Loaded</span>}</When>`
 *
 * - Multiple branches with final fallback
 *   `<When>
 *     {isLoading}={() => <span>Loading…</span>}
 *     {hasError}={() => <span class="error">Error!</span>}
 *     {() => <span>Ready</span>}
 *   </When>`
 *
 * Notes:
 * - Order matters: provide `(ref)`, then its render function.
 * - The last child is treated as fallback when no conditions are truthy.
 * - Watches are automatically managed and cleaned up.
 */
export function When(props: WhenProps): HTMLElement {
  const children = props.children ?? [];
  
  // Parse children into conditions and render functions
  const conditions: Ref<boolean>[] = [];
  const renderFns: (() => Node)[] = [];
  let fallback: (() => Node) | null = null;
  
  for (let i = 0; i < children.length; i++) {
    const item = children[i];
    
    if (isRef(item)) {
      if (children[i+1] && typeof children[i+1] === 'function') {
        conditions.push(item as Ref<boolean>);
        renderFns.push(children[i+1] as () => Node);
        i++;
      }
    } else if (typeof item === 'function' && i === children.length - 1) {
      fallback = item;
    } else if (i === children.length - 1) {
      fallback = () => item as Node;
    }
  }

  // Use start and end markers for stable positioning
  const startMarker = document.createComment('when-start');
  const endMarker = document.createComment('when-end');
  let currentNodes: Node[] = [];

  const render = () => {
    // Remove all nodes between markers
    currentNodes.forEach(node => (node as ChildNode).remove());
    currentNodes = [];

    // Find first true condition
    let rendered = false;
    for (let i = 0; i < conditions.length; i++) {
      if (conditions[i]?.value) {
        const fn = renderFns[i];
        if (fn) {
          const node = fn();
          currentNodes.push(node);
          endMarker.parentNode!.insertBefore(node, endMarker);
          rendered = true;
          break;
        }
      }
    }

    // Fallback if no match
    if (!rendered && fallback) {
      const node = fallback();
      currentNodes.push(node);
      endMarker.parentNode!.insertBefore(node, endMarker);
    }
  };

  // Wrap in a span to return an HTMLElement
  const wrapper = document.createElement('span');
  wrapper.style.display = 'contents'; // Makes wrapper invisible in layout
  wrapper.appendChild(startMarker);
  wrapper.appendChild(endMarker);

  // Initial render AFTER markers are attached to a parent
  render();
  
  // Watch all conditions
  watch(conditions, render);
  
  return wrapper;
}

// ============================================
// FOR Component - FINAL VERSION
// ============================================

interface ForProps<T> {
  each: Ref<T[]>;
  key?: (item: T, index: number) => string | number;
  children?: (item: T, index: number) => Node;
  // Alternative prop name if JSX transforms it
  render?: (item: T, index: number) => Node;
}

/**
 * Render lists declaratively with keyed reconciliation and smart change detection.
 *
 * Props:
 * - `each`: `Ref<T[]>` source array
 * - `key`: stable key function (defaults to index)
 * - `children` or `render`: `(item, index) => Node`
 *
 * Performance Optimization:
 * - Uses reference equality (Object.is) for objects to detect changes
 * - Uses value equality (===) for primitives
 * - Only re-renders nodes whose items actually changed
 * - Works best with immutable update patterns (like Array.map)
 *
 * Examples (JSX):
 * - Using children as a render function
 *   `<For each={todos} key={(t) => t.id}>
 *     {(todo) => <li className={todo.done ? 'done' : ''}>{todo.title}</li>}
 *   </For>`
 *
 * - Immutable update for best performance
 *   `todos.value = todos.value.map(t => 
 *     t.id === 5 ? { ...t, done: true } : t  // Only item 5 gets new reference
 *   )`
 *
 * Notes:
 * - Keys improve reorder performance; prefer unique IDs over indexes.
 * - Items with unchanged references reuse existing DOM nodes.
 * - Works seamlessly with Store's structural sharing pattern.
 */
export function For<T>(props: ForProps<T>): HTMLElement {
  const { each, key, render } = props;
  let renderFn: ((item: T, index: number) => Node) | undefined = render as any;
  
  // Support both 'render' prop and function passed as first child
  if (!renderFn) {
    const ch: any = (props as any).children;
    if (Array.isArray(ch) && typeof ch[0] === 'function') {
      renderFn = ch[0] as (item: T, index: number) => Node;
    } else if (typeof ch === 'function') {
      renderFn = ch as (item: T, index: number) => Node;
    }
  }
  
  if (!renderFn) {
    throw new Error('For component requires either "render" or "children" prop');
  }

  // Use comment markers to maintain position
  const startMarker = document.createComment('for-start');
  const endMarker = document.createComment('for-end');
  
  interface CacheEntry {
    node: Node;
    item: T;
  }
  
  const cache = new Map<string | number, CacheEntry>();
  const getKey = key || ((_item: T, index: number) => index);
  
  // Detect item type for optimal comparison strategy
  let itemType: 'primitive' | 'object' | null = null;
  
  function isPrimitive(val: any): boolean {
    return val !== Object(val); // true for string, number, boolean, null, undefined
  }
  
  function itemsAreEqual(a: T, b: T): boolean {
    if (itemType === 'primitive') {
      return a === b; // Value equality for primitives
    }
    return Object.is(a, b); // Reference equality for objects
  }

  // Helper: Longest Increasing Subsequence (indexes of LIS)
  function lis(arr: number[]): number[] {
    const n = arr.length;
    const p: number[] = new Array(n);
    const result: number[] = [];
    let u: number, v: number;
    for (let i = 0; i < n; i++) {
      const ai = arr[i]!;
      if (ai === -1) { p[i] = -1; continue; }
      const lastIdx = result.length > 0 ? result[result.length - 1]! : -1;
      if (result.length === 0 || (lastIdx !== -1 && arr[lastIdx]! < ai)) {
        p[i] = lastIdx !== -1 ? lastIdx : -1;
        result.push(i);
        continue;
      }
      u = 0; v = result.length - 1;
      while (u < v) {
        const c = ((u + v) / 2) | 0;
        const rc = result[c]!;
        if (arr[rc]! < ai) u = c + 1; else v = c;
      }
      // Now u is the lower bound
      const ru = result[u]!;
      if (ai < arr[ru]!) {
        if (u > 0) p[i] = result[u - 1]!; else p[i] = -1;
        result[u] = i;
      }
    }
    // Reconstruct
    let u2 = result.length;
    let v2 = result[u2 - 1]!;
    const lisIdx: number[] = new Array(u2);
    while (u2-- > 0) {
      lisIdx[u2] = v2;
      v2 = p[v2] ?? -1;
    }
    return lisIdx;
  }

  const renderList = () => {
    const newItems = each.value || [];
    const newCache = new Map<string | number, CacheEntry>();
    const nodesToInsert: Node[] = [];
    
    // Detect item type on first non-empty render
    if (itemType === null && newItems.length > 0 && newItems[0] !== undefined) {
      itemType = isPrimitive(newItems[0]) ? 'primitive' : 'object';
    }
    
    // Phase 1: Create/reuse nodes with smart change detection
    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i];
      if (item === undefined) continue;
      
      const itemKey = getKey(item, i);
      const cached = cache.get(itemKey);
      
      if (cached) {
        // Check if item actually changed
        if (itemsAreEqual(cached.item, item)) {
          // Item unchanged - reuse existing node (FAST PATH)
          if (newCache.has(itemKey)) {
            console.warn('[auwla] For: duplicate key detected:', String(itemKey));
          }
          newCache.set(itemKey, cached);
          nodesToInsert.push(cached.node);
        } else {
          // Item changed - re-render this node only
          const node = renderFn(item, i);
          if (newCache.has(itemKey)) {
            console.warn('[auwla] For: duplicate key detected:', String(itemKey));
          }
          newCache.set(itemKey, { node, item });
          nodesToInsert.push(node);
        }
      } else {
        // Create new node
        const node = renderFn(item, i);
        if (newCache.has(itemKey)) {
          console.warn('[auwla] For: duplicate key detected:', String(itemKey));
        }
        newCache.set(itemKey, { node, item });
        nodesToInsert.push(node);
      }
    }
    
    // Phase 2: Remove stale nodes
    for (const [oldKey, entry] of cache.entries()) {
      if (!newCache.has(oldKey)) {
        (entry.node as ChildNode).remove();
      }
    }
    
    // Phase 3: Initial mount optimization using DocumentFragment
    if (cache.size === 0) {
      const frag = document.createDocumentFragment();
      for (const n of nodesToInsert) frag.appendChild(n);
      endMarker.parentNode!.insertBefore(frag, endMarker);
    } else {
      // Phase 4: Quick Diff Algorithm (Vue 3 style)
      const oldKeys = Array.from(cache.keys());
      const newKeys = Array.from(newCache.keys());
      const oldLen = oldKeys.length;
      const newLen = newKeys.length;
      
      // Build index map for O(1) lookups
      const oldIndexMap = new Map<string | number, number>();
      for (let i = 0; i < oldLen; i++) {
        oldIndexMap.set(oldKeys[i]!, i);
      }
      
      // Step 1: Sync from start (common prefix)
      let i = 0;
      while (i < oldLen && i < newLen && oldKeys[i] === newKeys[i]) {
        i++;
      }
      
      // Step 2: Sync from end (common suffix)
      let oldEnd = oldLen - 1;
      let newEnd = newLen - 1;
      while (oldEnd >= i && newEnd >= i && oldKeys[oldEnd] === newKeys[newEnd]) {
        oldEnd--;
        newEnd--;
      }
      
      // Step 3: Common sequence = same → all nodes in right place
      if (i > oldEnd && i > newEnd) {
        // All matched, nothing to do
        return;
      }
      
      // Step 4: Old sequence done, new items remain → append
      if (i > oldEnd) {
        const anchor = newEnd + 1 < newLen ? newCache.get(newKeys[newEnd + 1]!)!.node : endMarker;
        for (let j = i; j <= newEnd; j++) {
          const node = newCache.get(newKeys[j]!)!.node;
          endMarker.parentNode!.insertBefore(node, anchor);
        }
        return;
      }
      
      // Step 5: New sequence done, old items remain → remove
      if (i > newEnd) {
        for (let j = i; j <= oldEnd; j++) {
          // Already removed in Phase 2
        }
        return;
      }
      
      // Step 6: Unknown sequence - use LIS for minimal moves
      const toBePatched = newEnd - i + 1;
      const newIndexToOldIndexMap = new Array(toBePatched).fill(-1);
      
      // Map new positions to old positions
      for (let j = i; j <= newEnd; j++) {
        const newKey = newKeys[j]!;
        const oldIndex = oldIndexMap.get(newKey);
        if (oldIndex !== undefined && oldIndex >= i && oldIndex <= oldEnd) {
          newIndexToOldIndexMap[j - i] = oldIndex;
        }
      }
      
      // Check if we need to move anything
      let moved = false;
      let maxIndexSoFar = -1;
      for (let j = 0; j < toBePatched; j++) {
        const oldIndex = newIndexToOldIndexMap[j];
        if (oldIndex !== -1) {
          if (oldIndex < maxIndexSoFar) {
            moved = true;
            break;
          }
          maxIndexSoFar = oldIndex;
        }
      }
      
      // If nothing moved and no additions, we're done
      if (!moved && !newIndexToOldIndexMap.includes(-1)) {
        return;
      }
      
      // Generate LIS only if nodes need to be moved
      const lisIndices = moved ? lis(newIndexToOldIndexMap) : [];
      const lisSet = new Set(lisIndices);
      
      // Patch by moving/inserting from right to left
      for (let j = toBePatched - 1; j >= 0; j--) {
        const newIndex = i + j;
        const newKey = newKeys[newIndex]!;
        const entry = newCache.get(newKey)!;
        const anchor = newIndex + 1 < newLen ? newCache.get(newKeys[newIndex + 1]!)!.node : endMarker;
        
        if (newIndexToOldIndexMap[j] === -1) {
          // New node - insert
          endMarker.parentNode!.insertBefore(entry.node, anchor);
        } else if (moved && !lisSet.has(j)) {
          // Existing node but needs to move
          endMarker.parentNode!.insertBefore(entry.node, anchor);
        }
        // else: node is in LIS, already in correct position
      }
    }
    
    // Update cache
    cache.clear();
    for (const [k, v] of newCache.entries()) {
      cache.set(k, v);
    }
  };

  // Wrap in a span to return an HTMLElement
  const wrapper = document.createElement('span');
  wrapper.style.display = 'contents'; // Makes wrapper invisible in layout
  wrapper.appendChild(startMarker);
  wrapper.appendChild(endMarker);
  
  // IMPORTANT: Render AFTER appending markers to wrapper
  renderList();
  watch(each, renderList);
  
  return wrapper;
}

// ============================================
// JSX USAGE EXAMPLES
// ============================================

/*

// Example 1: Basic For loop with todos
import { signal } from './state';
import { For, When } from './components';

const todos = signal([
  { id: 1, text: 'Learn signals', done: false },
  { id: 2, text: 'Build framework', done: true },
  { id: 3, text: 'Ship product', done: false }
]);

function TodoList() {
  return (
    <div>
      <h1>My Todos</h1>
      <ul>
        <For 
          each={todos}
          key={(todo) => todo.id}
          render={(todo, index) => {
            const isDone = signal(todo.done);
            
            return (
              <li>
                <input 
                  type="checkbox" 
                  checked={isDone.value}
                  onclick={() => isDone.value = !isDone.value}
                />
                <span>{todo.text}</span>
              </li>
            );
          }}
        />
      </ul>
    </div>
  );
}

// Example 2: For with When (conditional rendering inside list)
function UserList() {
  const users = signal([
    { id: 1, name: 'Alice', premium: true },
    { id: 2, name: 'Bob', premium: false },
    { id: 3, name: 'Charlie', premium: true }
  ]);
  
  return (
    <div>
      <For
        each={users}
        key={(user) => user.id}
        render={(user) => {
          const isPremium = signal(user.premium);
          
          return (
            <div class="user-card">
              <h3>{user.name}</h3>
              <When>
                {isPremium}
                {() => <span class="badge">⭐ Premium</span>}
                {() => <span class="badge">Free</span>}
              </When>
            </div>
          );
        }}
      />
    </div>
  );
}

// Example 3: Nested For loops
function Matrix() {
  const rows = signal([
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
  ]);
  
  return (
    <table>
      <For
        each={rows}
        key={(_, i) => i}
        render={(row, rowIndex) => (
          <tr>
            <For
              each={signal(row)}
              key={(_, i) => `${rowIndex}-${i}`}
              render={(cell) => <td>{cell}</td>}
            />
          </tr>
        )}
      />
    </table>
  );
}

// Example 4: Dynamic list manipulation
function ShoppingCart() {
  const items = signal([
    { id: 1, name: 'Apple', price: 1.99, qty: 2 },
    { id: 2, name: 'Banana', price: 0.99, qty: 5 }
  ]);
  
  const addItem = () => {
    items.value = [...items.value, {
      id: Date.now(),
      name: 'Orange',
      price: 2.49,
      qty: 1
    }];
  };
  
  const removeItem = (id: number) => {
    items.value = items.value.filter(item => item.id !== id);
  };
  
  return (
    <div>
      <button onclick={addItem}>Add Item</button>
      <ul>
        <For
          each={items}
          key={(item) => item.id}
          render={(item) => {
            const quantity = signal(item.qty);
            
            return (
              <li>
                <span>{item.name} - ${item.price}</span>
                <input 
                  type="number" 
                  value={quantity.value}
                  oninput={(e) => quantity.value = parseInt(e.target.value)}
                />
                <button onclick={() => removeItem(item.id)}>Remove</button>
              </li>
            );
          }}
        />
      </ul>
    </div>
  );
}

// Example 5: When without For
function LoginStatus() {
  const isLoggedIn = signal(false);
  const isLoading = signal(false);
  
  return (
    <div>
      <When>
        {isLoading}
        {() => <div>Loading...</div>}
        {isLoggedIn}
        {() => <div>Welcome back! <button>Logout</button></div>}
        {() => <div>Please login <button>Login</button></div>}
      </When>
    </div>
  );
}

*/