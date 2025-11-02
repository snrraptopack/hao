# Conditional Rendering: Making UI React to State

In Auwla, conditional rendering requires explicit subscriptions to reactive sources, just like any other dynamic UI update. You can't simply write `{isLoading && <Spinner />}` and expect it to work reactively—the JSX runtime needs a `ref` to subscribe to.

This guide explains the patterns for conditional rendering, from basic techniques to the powerful `When` component that makes complex conditional logic clean and maintainable.

> **The Core Problem**
>
> When you write `{someBoolean && <Component />}`, JavaScript evaluates this *once* during render. If `someBoolean` changes later, nothing tells the UI to re-evaluate. You must explicitly wire up subscriptions using `watch` or helper components like `When`.
{style="note"}

## The Naive Approach (Why It Fails)

Let's start with what doesn't work:

```TypeScriptJSX
import { h, ref } from 'auwla';

const isLoggedIn = ref(false);

export function Navbar() {
  return (
    <nav>
      <h1>My App</h1>
      {/* ❌ This doesn't work reactively */}
      {isLoggedIn.value && <button>Logout</button>}
      {!isLoggedIn.value && <button>Login</button>}
    </nav>
  );
}
```

**Why it fails**: The expressions `isLoggedIn.value && <button>Logout</button>` are evaluated once when the component function runs. When `isLoggedIn.value` changes later, the component doesn't re-run (Auwla doesn't re-render components), so the UI never updates.

## Pattern 1: Using `watch` with Ternary Operators

The fundamental pattern is to use `watch` to create a reactive binding that subscribes to your condition:

<tabs>
<tab title="Basic Ternary">

```TypeScriptJSX
import { h, ref, watch } from 'auwla';

const isLoggedIn = ref(false);

export function Navbar() {
  return (
    <nav>
      <h1>My App</h1>
      {/* ✅ This works! */}
      {watch(isLoggedIn, (loggedIn) => 
        loggedIn 
          ? <button onClick={() => isLoggedIn.value = false}>Logout</button>
          : <button onClick={() => isLoggedIn.value = true}>Login</button>
      )}
    </nav>
  );
}
```

</tab>
<tab title="Return null for false">

```TypeScriptJSX
import { h, ref, watch } from 'auwla';

const showModal = ref(false);

export function App() {
  return (
    <div>
      <button onClick={() => showModal.value = true}>Open Modal</button>
      
      {/* Return null when condition is false */}
      {watch(showModal, (show) => 
        show ? (
          <div class="modal">
            <p>This is a modal!</p>
            <button onClick={() => showModal.value = false}>Close</button>
          </div>
        ) : null
      )}
    </div>
  );
}
```

</tab>
<tab title="Multiple Conditions">

```TypeScriptJSX
import { h, ref, watch } from 'auwla';

const status = ref<'idle' | 'loading' | 'error' | 'success'>('idle');

export function DataFetcher() {
  return (
    <div>
      {watch(status, (s) => {
        if (s === 'loading') return <div>Loading...</div>;
        if (s === 'error') return <div class="error">Failed to load</div>;
        if (s === 'success') return <div class="success">Data loaded!</div>;
        return <div>Click to fetch data</div>;
      })}
    </div>
  );
}
```

</tab>
</tabs>

> **Why Return null, Not false?**
>
> When your condition is false, you must return `null` (or another node like an empty `<span></span>`). If you return `false`, the literal string `"false"` appears in your UI! Always use ternary operators with `null` for the false case.
{style="warning"}

### Common Pitfall: Returning Boolean Values

<tabs>
<tab title="❌ Wrong - Returns false">

```TypeScriptJSX
const isActive = ref(false);

// This will render "false" as text in the UI!
<div>
  {watch(isActive, (active) => active && <span>Active</span>)}
</div>
```

When `isActive.value` is `false`, the expression evaluates to `false`, which gets rendered as the text `"false"` in the DOM.

</tab>
<tab title="✅ Correct - Returns null">

```TypeScriptJSX
const isActive = ref(false);

// This renders nothing when false
<div>
  {watch(isActive, (active) => active ? <span>Active</span> : null)}
</div>
```

When `isActive.value` is `false`, `null` is returned, which renders nothing.

</tab>
</tabs>

## Pattern 2: The `When` Component

For complex conditional logic with multiple branches, the `When` component provides a clean, declarative API that eliminates the ternary operator verbosity.

### Basic Usage: Single Condition

<tabs>
<tab title="Using When">

```TypeScriptJSX
import { h, ref } from 'auwla';
import { When } from 'auwla';

const isLoading = ref(true);

export function DataDisplay() {
  return (
    <div>
      <When>
        {isLoading}
        {() => <div class="spinner">Loading...</div>}
        {() => <div class="content">Data loaded successfully!</div>}
      </When>
    </div>
  );
}
```

**How it works:**
1. First child: The condition (`Ref<boolean>`)
2. Second child: Render function for when condition is `true`
3. Third child: Fallback render function for when condition is `false`

</tab>
<tab title="Equivalent watch Pattern">

```TypeScriptJSX
import { h, ref, watch } from 'auwla';

const isLoading = ref(true);

export function DataDisplay() {
  return (
    <div>
      {watch(isLoading, (loading) => 
        loading 
          ? <div class="spinner">Loading...</div>
          : <div class="content">Data loaded successfully!</div>
      )}
    </div>
  );
}
```

Both approaches are equivalent, but `When` is more readable for complex conditions.

</tab>
</tabs>

### Multiple Conditions: if-else-if Logic

The real power of `When` shows when you have multiple conditions to check:

<tabs>
<tab title="When Component">

```TypeScriptJSX
import { h, ref } from 'auwla';
import { When } from 'auwla';

const isLoading = ref(false);
const hasError = ref(false);
const isEmpty = ref(false);

export function UserList() {
  return (
    <div>
      <When>
        {isLoading}
        {() => <div class="loading">Loading users...</div>}
        
        {hasError}
        {() => <div class="error">Failed to load users. Try again.</div>}
        
        {isEmpty}
        {() => <div class="empty">No users found.</div>}
        
        {() => <div class="content">Showing user list...</div>}
      </When>
    </div>
  );
}
```

**Evaluation order:**
1. If `isLoading` is true → renders "Loading users..."
2. Else if `hasError` is true → renders "Failed to load users..."
3. Else if `isEmpty` is true → renders "No users found."
4. Else → renders "Showing user list..." (fallback)

</tab>
<tab title="Equivalent watch Pattern">

```TypeScriptJSX
import { h, ref, watch } from 'auwla';

const isLoading = ref(false);
const hasError = ref(false);
const isEmpty = ref(false);

export function UserList() {
  return (
    <div>
      {watch([isLoading, hasError, isEmpty], ([loading, error, empty]) => {
        if (loading) return <div class="loading">Loading users...</div>;
        if (error) return <div class="error">Failed to load users. Try again.</div>;
        if (empty) return <div class="empty">No users found.</div>;
        return <div class="content">Showing user list...</div>;
      })}
    </div>
  );
}
```

The `When` component is cleaner and more declarative for this pattern.

</tab>
</tabs>

### Real-World Example: Data Fetching States

Here's a complete example showing a typical data-fetching scenario:

<tabs>
<tab title="Using When">

```TypeScriptJSX
import { h, ref, derive } from 'auwla';
import { When } from 'auwla';

type User = { id: number; name: string; email: string };

const users = ref<User[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

async function fetchUsers() {
  isLoading.value = true;
  error.value = null;
  
  try {
    const response = await fetch('/api/users');
    const data = await response.json();
    users.value = data;
  } catch (e) {
    error.value = 'Failed to fetch users';
  } finally {
    isLoading.value = false;
  }
}

export function UsersPage() {
  // We use derive here for computed boolean conditions
  // derive reads nicer at the top level before the template
  // watch is preferred inside JSX expressions for readability
  const hasError = derive(error, (e) => !!e);
  const isEmpty = derive(users, (u) => u.length === 0);

  return (
    <div>
      <h1>Users</h1>
      <button onClick={fetchUsers}>Fetch Users</button>
      
      <When>
        {isLoading}
        {() => (
          <div class="flex items-center gap-2">
            <div class="spinner"></div>
            <span>Loading users...</span>
          </div>
        )}
        
        {hasError}
        {() => (
          <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Error:</strong> {error.value}
            <button onClick={fetchUsers} class="ml-4 underline">Retry</button>
          </div>
        )}
        
        {isEmpty}
        {() => (
          <div class="text-gray-500 text-center py-8">
            No users found. Click "Fetch Users" to load data.
          </div>
        )}
        
        {() => (
          <ul class="space-y-2">
            {users.value.map((user) => (
              <li class="border p-4 rounded">
                <div class="font-bold">{user.name}</div>
                <div class="text-gray-600">{user.email}</div>
              </li>
            ))}
          </ul>
        )}
      </When>
    </div>
  );
}
```

</tab>
<tab title="Using watch">

```TypeScriptJSX
import { h, ref, watch } from 'auwla';

type User = { id: number; name: string; email: string };

const users = ref<User[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

async function fetchUsers() {
  isLoading.value = true;
  error.value = null;
  
  try {
    const response = await fetch('/api/users');
    const data = await response.json();
    users.value = data;
  } catch (e) {
    error.value = 'Failed to fetch users';
  } finally {
    isLoading.value = false;
  }
}

export function UsersPage() {
  return (
    <div>
      <h1>Users</h1>
      <button onClick={fetchUsers}>Fetch Users</button>
      
      {watch([isLoading, error, users], ([loading, err, userList]) => {
        if (loading) {
          return (
            <div class="flex items-center gap-2">
              <div class="spinner"></div>
              <span>Loading users...</span>
            </div>
          );
        }
        
        if (err) {
          return (
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <strong>Error:</strong> {err}
              <button onClick={fetchUsers} class="ml-4 underline">Retry</button>
            </div>
          );
        }
        
        if (userList.length === 0) {
          return (
            <div class="text-gray-500 text-center py-8">
              No users found. Click "Fetch Users" to load data.
            </div>
          );
        }
        
        return (
          <ul class="space-y-2">
            {userList.map((user) => (
              <li class="border p-4 rounded">
                <div class="font-bold">{user.name}</div>
                <div class="text-gray-600">{user.email}</div>
              </li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}
```

</tab>
</tabs>

> **When to Use When vs watch**
>
> - Use **`When`** for clean, declarative conditional rendering with multiple branches
> - Use **`watch`** when you need more control, complex logic, or want to use multiple refs with computations
> - Both are valid—choose based on readability for your specific case
{style="tip"}

> **derive vs watch for Computed Values**
>
> - Use **`derive`** for computed values at the top level (before your template) - it reads cleaner and is explicit about creating derived state
> - Use **`watch`** inside JSX expressions for inline transformations - it's more readable in context
> - Both create reactive refs that update when their sources change
{style="note"}

## Advanced Pattern: Nested Conditions

You can nest `When` components for complex nested conditional logic:

```TypeScriptJSX
import { h, ref } from 'auwla';
import { When } from 'auwla';

const isAuthenticated = ref(false);
const isAdmin = ref(false);
const hasPermission = ref(false);

export function AdminPanel() {
  return (
    <div>
      <When>
        {isAuthenticated}
        {() => (
          <When>
            {isAdmin}
            {() => (
              <When>
                {hasPermission}
                {() => <div class="admin-panel">Full Admin Access</div>}
                {() => <div class="warning">Admin without permissions</div>}
              </When>
            )}
            {() => <div class="error">Access denied: Admin role required</div>}
          </When>
        )}
        {() => <div class="login-prompt">Please log in to continue</div>}
      </When>
    </div>
  );
}
```

However, for deeply nested conditions, sometimes a `watch` with explicit if-else logic is more readable:

```TypeScriptJSX
export function AdminPanel() {
  return (
    <div>
      {watch([isAuthenticated, isAdmin, hasPermission], ([auth, admin, perm]) => {
        if (!auth) return <div class="login-prompt">Please log in to continue</div>;
        if (!admin) return <div class="error">Access denied: Admin role required</div>;
        if (!perm) return <div class="warning">Admin without permissions</div>;
        return <div class="admin-panel">Full Admin Access</div>;
      })}
    </div>
  );
}
```

## Framework Comparison: Conditional Rendering

Let's see how conditional rendering differs across frameworks:

<tabs>
<tab title="Auwla - Explicit">

```TypeScriptJSX
import { h, ref, watch } from 'auwla';

const isLoggedIn = ref(false);

export function App() {
  return (
    <div>
      {/* Must explicitly subscribe */}
      {watch(isLoggedIn, (loggedIn) =>
        loggedIn ? <DashboardPage /> : <LoginPage />
      )}
    </div>
  );
}

// Or using When
export function AppWithWhen() {
  return (
    <div>
      <When>
        {isLoggedIn}
        {() => <DashboardPage />}
        {() => <LoginPage />}
      </When>
    </div>
  );
}
```

**Key**: Explicit subscription required via `watch` or `When`.

</tab>
<tab title="React - Auto Re-render">

```TypeScriptJSX
import { useState } from 'react';

export function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  return (
    <div>
      {/* Component re-renders when state changes */}
      {isLoggedIn ? <DashboardPage /> : <LoginPage />}
      
      {/* Or with && operator */}
      {isLoggedIn && <DashboardPage />}
      {!isLoggedIn && <LoginPage />}
    </div>
  );
}
```

**Key**: Component re-renders automatically, all JSX re-evaluates.

</tab>
<tab title="Vue - Template Directives">

```html
<script setup>
import { ref } from 'vue';

const isLoggedIn = ref(false);
</script>

<template>
  <div>
    <!-- Template directives handle reactivity -->
    <DashboardPage v-if="isLoggedIn" />
    <LoginPage v-else />
    
    <!-- Or with v-show for CSS-based hiding -->
    <DashboardPage v-show="isLoggedIn" />
    <LoginPage v-show="!isLoggedIn" />
  </div>
</template>
```

**Key**: Template compiler creates subscriptions automatically.

</tab>
</tabs>

## Performance Considerations

### Conditional vs CSS Display

Sometimes you don't need conditional *rendering*—you just need conditional *visibility*:

<tabs>
<tab title="Conditional Rendering">

```TypeScriptJSX
import { h, ref, watch } from 'auwla';

const showPanel = ref(false);

// Element is added/removed from DOM
export function App() {
  return (
    <div>
      {watch(showPanel, (show) =>
        show ? <ExpensiveComponent /> : null
      )}
    </div>
  );
}
```

**When to use:**
- Component has expensive setup/teardown
- Component shouldn't exist when hidden
- You want true mount/unmount lifecycle

</tab>
<tab title="CSS Display Toggle">

```TypeScriptJSX
import { h, ref, watch } from 'auwla';

const showPanel = ref(false);

// Element stays in DOM, just hidden
export function App() {
  return (
    <div>
      <ExpensiveComponent 
        style={watch(showPanel, (show) => 
          show ? 'display:block' : 'display:none'
        )}
      />
    </div>
  );
}
```

**When to use:**
- Frequent toggling (avoids re-creating DOM)
- Component has internal state you want to preserve
- Cheaper than mount/unmount

</tab>
</tabs>

## Best Practices Summary

> **Do's and Don'ts**
>
> ✅ **Do**: Use ternary operators with `null` for false cases  
> ✅ **Do**: Use `When` for multiple condition branches  
> ✅ **Do**: Use `watch` when you need complex logic or computations  
> ✅ **Do**: Consider CSS display toggle for frequently toggled elements  
>
> ❌ **Don't**: Return boolean values (`false` renders as text "false")  
> ❌ **Don't**: Use `{condition && <Component />}` without `watch`  
> ❌ **Don't**: Forget that `.value` reads happen at render time without subscriptions  
> ❌ **Don't**: Over-nest `When` components—use `watch` for complex logic  
{style="warning"}

## Key Takeaways

**Explicit subscriptions are required**: Unlike React or Vue, Auwla doesn't automatically re-evaluate conditional expressions. You must use `watch` or `When` to subscribe to conditions.

**Always return null, not false**: When your condition is false, return `null` or another node. Never return a boolean value directly.

**Choose the right tool**:
- **`watch` with ternary**: Simple true/false conditions
- **`When` component**: Multiple conditions with clean, declarative syntax
- **CSS display**: Frequent toggling without remounting

**The `When` component shines for**: Data fetching states (loading/error/success), authentication flows, multi-step forms, and any if-else-if chains.

With these patterns, conditional rendering in Auwla becomes predictable, performant, and maintainable—giving you complete control over what updates and when.
