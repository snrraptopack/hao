# Chapter 10 — Conditional UI with When

`When` mounts/unmounts content based on reactive conditions. Provide one or more condition/function pairs and an optional fallback.

## Props & Children
```ts
// src/jsxutils.tsx
interface WhenProps {
  children?: (Ref<boolean> | (() => Node) | Node)[]
}
```
- Children are parsed as: `Ref<boolean>`, then a render function `() => Node`.
- The last child can be a fallback: function or static node.

## Basic Usage
```tsx
import { h } from '../../src/jsx'
import { When } from '../../src/jsxutils'
import { ref, watch } from '../../src/state'

export function AuthStatus(): HTMLElement {
  const loggedIn = ref(false)
  const isAdmin = ref(false)
  return (
    <When>
      {loggedIn}
      {() => (
        <div>
          <div>Welcome!</div>
          <When>
            {isAdmin}
            {() => <div class="text-indigo-600">Admin tools enabled</div>}
            {() => <div class="text-gray-600">Standard user</div>}
          </When>
        </div>
      )}
      {() => <div>Please log in</div>}
    </When>
  )
}
```

## Fallbacks
- If no conditions match, `When` renders the final child (if present).
- You can pass a static node as the last child.

## Exercise
- Compose two `When`s for a multi-branch UI: loading, error, success.
- Replace branching logic in an existing page using `When`.

## Checklist
- [ ] You used `When` with multiple conditions.
- [ ] You provided a sensible fallback.
- [ ] You composed nested `When`s cleanly.