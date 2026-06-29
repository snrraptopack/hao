> This directory contains Auwla's DOM event system. It provides the `event` proxy primitive and the chainable, tree-shakable event modifier API.

# `events`

Auwla uses a chainable event listener API to keep your JSX clean and declarative. Instead of manually checking keys, preventing defaults, or throttling in your handlers, you can chain modifiers onto the event binding.

To keep client-side bundle sizes as small as possible, Auwla's event system is designed to be fully **tree-shakable**. Heavy modules (like touch gestures, intersection observers, and global hotkeys) are split into dedicated entry points. 

---

## 1. Core Events (`auwla/events`)

The default `auwla/events` entry point contains only the lightweight core builder and standard DOM modifiers (prevent, stop, self, once, outside, closest, etc.). It has a near-zero bundle footprint.

```tsx
import { event } from 'auwla/events'

// Basic event modifiers
<button onClick={event.prevent.stop.handler(handleClick)}>
  Click me
</button>
```

### Core Modifiers:
*   `.prevent` — Calls `event.preventDefault()`
*   `.stop` — Calls `event.stopPropagation()`
*   `.stopImmediate` — Calls `event.stopImmediatePropagation()`
*   `.once` — Limits execution to at most once
*   `.self` — Only fires if target is the host element itself
*   `.trusted` — Only fires for user-trusted events
*   `.outside` — Detects events firing outside the element
*   `.closest(selector)` — Limits event matches to selectors
*   `.capture` / `.passive` / `.silent` — Event listener configuration flags
*   `.debounce(ms)` / `.throttle(ms)` / `.cooldown(ms)` — Timing and rate-limiting modifiers

---

## 2. Intersection Observer (`auwla/events/intersect`)

Decoupled to prevent bundling IntersectionObserver monkey-patching and observer logic unless explicitly used. Exposes the `intersect` builder.

```tsx
import { intersect } from 'auwla/events/intersect'

// Chainable with core modifiers (prevent, stop, etc.)
<div onIntersect={intersect(0.08).in.prevent.handler(handleIntersect)}>
  Fade in when entering viewport
</div>
```

---

## 3. Touch & Gestures (`auwla/events/touch`)

Decoupled to keep touch gestures and pointer gesture trackers (~9KB) out of standard bundles. Exposes unified pointer gesture starters: `touchStart`, `touchMove`, `touchEnd`, `touchCancel`, and `touch`.

```tsx
import { touchStart } from 'auwla/events/touch'

// Chainable touch modifiers: .moved(px, dir), .fit(min, max), .sync(obj, x, y)
<div onTouch={touchStart.moved(10, 'right').prevent.handler(handleSwipeRight)}>
  Swipe right to action
</div>
```

---

## 4. Global Hotkeys (`auwla/events/hotkey`)

Decoupled to keep keyboard shortcut sequence parsing and matchers (~6.7KB) out of standard bundles. Exposes the `hotkey` builder.

```tsx
import { hotkey } from 'auwla/events/hotkey'

// Registers global hotkey listeners on keydown automatically
const unbind = hotkey('ctrl+k').prevent.handler(() => {
  toggleSearchModal();
});
```

---

## 5. Keyboard Filters (`auwla/events/keyboard`)

Decoupled to separate specific key filtering (Enter, Escape, Tab, Alt, Mod, etc.) from the core event builder. Exposes `keyDown`, `keyUp`, `keyPress`.

```tsx
import { keyDown } from 'auwla/events/keyboard'

// Listen for enter key specifically
<input onKeyDown={keyDown.enter.prevent.handler(handleSubmit)} />

// Or match custom keys
<input onKeyDown={keyDown.key(['Tab', 'Space']).handler(handleA11y)} />
```

---

## How it works under the hood
Specialized modules extend the shared `EventChainProto` prototype dynamically when imported. This preserves the exact chainable developer experience you expect while enabling bundlers to discard any event systems your application does not import.
