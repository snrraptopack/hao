# Design Document

## Overview

This design extends the existing JSX rendering system to support function children with automatic dependency tracking. The implementation leverages the existing `derive()` function for automatic ref tracking and builds upon the current marker-based rendering approach used for `Ref<T>` children.

The key insight is that function children can be treated similarly to `Ref<T>` children - both require dynamic updates when their dependencies change. By wrapping function children with `derive()`, we get automatic dependency tracking without manual `watch()` calls.

## Architecture

### High-Level Flow

```
JSX with function child
    ↓
appendChildren() detects function
    ↓
Create marker comments (fn-start, fn-end)
    ↓
Wrap function with derive() → Ref<any>
    ↓
Execute function → collect dependencies
    ↓
Render initial result
    ↓
watch(derivedRef) → re-render on changes
    ↓
Check if result is keyed array
    ↓
Use keyed reconciliation OR simple replacement
```

### Integration Points

1. **appendChildren()** - Add function child detection before existing `isRef()` check
2. **h() function** - Extract and store `key` prop as `__key` property
3. **New renderKeyedArray()** - Handle array reconciliation with keys
4. **Existing derive()** - No changes needed, already tracks dependencies
5. **Existing watch()** - No changes needed, already handles cleanup

## Components and Interfaces

### 1. Function Child Detection (in appendChildren)

```typescript
// Add this check BEFORE the existing isRef(child) check
if (typeof child === 'function') {
  const start = document.createComment('fn-start');
  const end = document.createComment('fn-end');
  parent.appendChild(start);
  parent.appendChild(end);

  // Use derive() for automatic dependency tracking
  const derivedRef = derive(child);

  const render = (v: any) => {
    // Remove old nodes between markers
    let node: ChildNode | null = start.nextSibling as ChildNode | null;
    while (node && node !== end) {
      const next = node.nextSibling as ChildNode | null;
      node.remove();
      node = next;
    }
    
    // Check if result is a keyed array
    if (Array.isArray(v) && v.length > 0 && hasKeys(v)) {
      renderKeyedArray(start, end, v);
    } else {
      // Simple insertion for non-keyed content
      insertValue(end, v);
    }
  };

  render(derivedRef.value);
  watch(derivedRef, (v) => render(v));
  
  continue;
}
```

### 2. Key Extraction (in h function)

```typescript
// In the h() function, before processing other props
if (props?.key !== undefined) {
  (element as any).__key = props.key;
  delete props.key; // Don't set as DOM attribute
}
```

### 3. Keyed Array Reconciliation

```typescript
interface KeyedNode {
  key: string | number;
  node: Node;
}

function hasKeys(arr: any[]): boolean {
  return arr.some(item => 
    item instanceof Node && (item as any).__key !== undefined
  );
}

function renderKeyedArray(
  start: Comment,
  end: Comment,
  newItems: any[]
): void {
  // Get existing nodes between markers
  const oldNodes: KeyedNode[] = [];
  let node: ChildNode | null = start.nextSibling as ChildNode | null;
  while (node && node !== end) {
    if ((node as any).__key !== undefined) {
      oldNodes.push({
        key: (node as any).__key,
        node: node
      });
    }
    node = node.nextSibling as ChildNode | null;
  }

  // Build map of old nodes by key
  const oldMap = new Map<string | number, Node>();
  oldNodes.forEach(({ key, node }) => {
    if (oldMap.has(key)) {
      console.warn('[Auwla] Duplicate key detected:', key);
    }
    oldMap.set(key, node);
  });

  // Build new nodes array
  const newNodes: KeyedNode[] = [];
  const newKeys = new Set<string | number>();
  
  for (const item of newItems) {
    if (item instanceof Node && (item as any).__key !== undefined) {
      const key = (item as any).__key;
      if (newKeys.has(key)) {
        console.warn('[Auwla] Duplicate key detected:', key);
      }
      newKeys.add(key);
      newNodes.push({ key, node: item });
    }
  }

  // Remove nodes that are no longer in the new array
  for (const { key, node } of oldNodes) {
    if (!newKeys.has(key)) {
      (node as ChildNode).remove();
    }
  }

  // Insert/move nodes to match new order
  let currentNode: ChildNode | null = start.nextSibling as ChildNode | null;
  
  for (const { key, node } of newNodes) {
    const existingNode = oldMap.get(key);
    
    if (existingNode) {
      // Node exists, check if it's in the right position
      if (currentNode !== existingNode) {
        // Move to correct position
        end.parentNode!.insertBefore(existingNode, currentNode || end);
      }
      currentNode = existingNode.nextSibling as ChildNode | null;
    } else {
      // New node, insert it
      end.parentNode!.insertBefore(node, currentNode || end);
      currentNode = node.nextSibling as ChildNode | null;
    }
  }
}
```

### 4. Helper Functions

```typescript
// Already exists in appendChildren, just needs to be accessible
function insertValue(before: Node, v: any) {
  if (v == null || v === false || v === true) return;
  if (typeof v === 'string' || typeof v === 'number') {
    before.parentNode?.insertBefore(document.createTextNode(String(v)), before);
  } else if (v instanceof Node) {
    before.parentNode?.insertBefore(v, before);
  } else if (Array.isArray(v)) {
    for (const c of v.flat(Infinity)) insertValue(before, c);
  } else {
    // Fallback: stringify unknown types
    before.parentNode?.insertBefore(document.createTextNode(String(v)), before);
  }
}
```

## Data Models

### Extended Element Interface

```typescript
// Internal property added to DOM elements
interface ElementWithKey extends HTMLElement {
  __key?: string | number;
}
```

### Function Child Return Types

Function children can return:
- `string | number` - Rendered as text node
- `Node` - Inserted directly
- `Array<any>` - Recursively processed
- `null | undefined | boolean` - Rendered as nothing
- Other types - Stringified with warning

## Error Handling

### 1. Function Execution Errors

```typescript
try {
  const derivedRef = derive(child);
  // ... rest of logic
} catch (error) {
  console.error('[Auwla] Function child error:', error);
  // Render nothing, continue with other children
  continue;
}
```

### 2. Invalid Return Types

```typescript
if (v !== null && v !== undefined && typeof v === 'object' && !(v instanceof Node) && !Array.isArray(v)) {
  console.warn('[Auwla] Function child returned invalid type:', v);
  // Stringify as fallback
  insertValue(end, String(v));
}
```

### 3. Duplicate Keys

```typescript
if (oldMap.has(key)) {
  console.warn('[Auwla] Duplicate key detected:', key);
}
```

## Testing Strategy

### Unit Tests

1. **Basic Function Children**
   - Test function returning string
   - Test function returning Node
   - Test function returning array
   - Test function returning null/undefined

2. **Dependency Tracking**
   - Test single ref dependency
   - Test multiple ref dependencies
   - Test nested ref access
   - Test conditional ref access (only tracks accessed refs)

3. **Conditional Rendering**
   - Test if/else statements
   - Test ternary operators
   - Test logical && operators
   - Test switch statements

4. **List Rendering**
   - Test .map() with keys
   - Test for loops with keys
   - Test array updates (add/remove/reorder)
   - Test mixed keyed and non-keyed items

5. **Key Extraction**
   - Test key prop extraction in h()
   - Test key not set as DOM attribute
   - Test __key property storage
   - Test elements without keys

6. **Keyed Reconciliation**
   - Test node reuse for unchanged keys
   - Test node removal for deleted keys
   - Test node insertion for new keys
   - Test node reordering
   - Test duplicate key warnings

7. **Performance**
   - Test that unchanged dependencies don't trigger re-renders
   - Test that only changed items are updated in arrays
   - Test batched updates

8. **Error Handling**
   - Test function throwing error
   - Test invalid return types
   - Test duplicate keys
   - Test undefined ref access

9. **Nested Function Children**
   - Test function returning function
   - Test independent dependency tracking
   - Test cleanup of nested watchers

10. **Backward Compatibility**
    - Test existing If/When/For components still work
    - Test mixing function children with components
    - Test existing Ref<T> children still work

### Integration Tests

1. **Complex UI Patterns**
   - Todo list with add/remove/toggle
   - Conditional forms with validation
   - Nested lists with filtering
   - Dynamic tabs with content switching

2. **Performance Benchmarks**
   - Large list rendering (1000+ items)
   - Rapid updates (100 updates/second)
   - Deep nesting (10+ levels)
   - Memory usage over time

## Design Decisions and Rationales

### 1. Why derive() instead of manual watch()?

**Decision**: Use `derive(() => child())` to wrap function children.

**Rationale**: 
- `derive()` already implements automatic dependency tracking
- No need to manually specify which refs to watch
- Works with conditional ref access (only tracks refs actually read)
- Consistent with existing reactive primitives
- Minimal code changes required

### 2. Why marker-based rendering?

**Decision**: Use comment nodes to mark insertion points.

**Rationale**:
- Already used for `Ref<T>` children - proven approach
- Allows stable insertion point even when content changes
- Works with DocumentFragment and all parent node types
- Minimal DOM overhead (comments are lightweight)
- Easy to debug (visible in DevTools)

### 3. Why extract key in h() instead of during reconciliation?

**Decision**: Extract `key` prop in `h()` and store as `__key`.

**Rationale**:
- Key is available at element creation time
- Avoids prop pollution in DOM (key shouldn't be an attribute)
- Consistent with React's approach
- Makes reconciliation logic simpler (just read `__key`)
- Works with any JSX element, not just arrays

### 4. Why simple reconciliation instead of full LIS algorithm?

**Decision**: Use simple key-based reconciliation with move operations.

**Rationale**:
- Simpler implementation, easier to maintain
- Good enough for most use cases (add/remove/reorder)
- Can be optimized later with LIS if needed
- Matches the discussion's suggested approach
- Avoids premature optimization

### 5. Why keep If/When/For components?

**Decision**: Don't deprecate existing components.

**Rationale**:
- Backward compatibility is critical
- Components are still useful for complex cases (transitions, etc.)
- Developers can choose their preferred style
- Incremental adoption of function children
- No breaking changes

### 6. Why check for keyed arrays in render()?

**Decision**: Detect keyed arrays and use special reconciliation.

**Rationale**:
- Automatic optimization without developer intervention
- Falls back to simple replacement for non-keyed content
- Keeps the API simple (no special syntax needed)
- Performance benefit is transparent
- Matches developer expectations from React

## Performance Considerations

### Optimization Strategies

1. **Lazy Evaluation**: Functions only execute when dependencies change
2. **Reference Equality**: Reuse DOM nodes for unchanged array items
3. **Batched Updates**: Use existing scheduler for multiple changes
4. **Minimal DOM Operations**: Only insert/remove/move changed nodes
5. **Early Bailout**: Skip render if derived value hasn't changed

### Memory Management

1. **Automatic Cleanup**: `watch()` cleanup happens via component context
2. **Node Reuse**: Keep existing DOM nodes in keyed arrays
3. **Marker Cleanup**: Comment nodes removed when parent unmounts
4. **Ref Cleanup**: `derive()` unsubscribes when component unmounts

### Potential Bottlenecks

1. **Large Arrays**: Reconciliation is O(n) for n items
   - Mitigation: Use keyed reconciliation to minimize DOM ops
   
2. **Deep Nesting**: Multiple levels of function children
   - Mitigation: Each level tracks dependencies independently
   
3. **Rapid Updates**: Many changes in short time
   - Mitigation: Existing scheduler batches updates

## Migration Path

### For Developers

1. **Start with simple cases**: Replace `<If>` with ternaries
2. **Adopt for lists**: Use `.map()` with keys instead of `<For>`
3. **Keep components for complex cases**: Transitions, etc.
4. **Mix approaches**: Use both styles in same codebase

### Example Migrations

```tsx
// Before: Component-based
<If condition={() => count.value > 5}>
  <span>Greater</span>
  <Else>
    <span>Lesser</span>
  </Else>
</If>

// After: Function child
{() => count.value > 5 ? <span>Greater</span> : <span>Lesser</span>}

// Before: For component
<For each={todos} key={t => t.id}>
  {(todo) => <li>{todo.text}</li>}
</For>

// After: Function child with map
{() => todos.value.map(todo => (
  <li key={todo.id}>{todo.text}</li>
))}
```

## Future Enhancements

1. **LIS Algorithm**: Optimize reordering with Longest Increasing Subsequence
2. **Virtual Scrolling**: Render only visible items in large lists
3. **Memoization**: Cache function results based on dependencies
4. **DevTools Integration**: Show function child boundaries and dependencies
5. **Transition Support**: Add transition hooks for function children
