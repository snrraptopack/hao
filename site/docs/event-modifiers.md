# Event Modifiers

Auwla features a powerful, chainable event builder API that keeps your JSX clean and declarative. Instead of polluting your handler functions with boilerplate for preventing defaults, checking keys, debouncing, or handling clicks outside, you can chain modifiers directly onto your event listeners.

```tsx
import { event } from 'auwla/events';
```

---

## Basic Behavior Modifiers

These wrappers handle standard DOM event behaviors:

| Modifier | Effect |
| :--- | :--- |
| **`.prevent`** | Calls `event.preventDefault()`. |
| **`.stop`** | Calls `event.stopPropagation()`. |
| **`.stopImmediate`** | Calls `event.stopImmediatePropagation()`. |
| **`.trap`** | Shorthand that calls **both** `preventDefault()` and `stopPropagation()`. |
| **`.self`** | Only fires the callback if the event target is the element itself (not a child). |
| **`.once`** | Automatically detaches the listener after firing once. |
| **`.trusted`** | Only fires for browser-trusted user events. |
| **`.capture`** | Uses the capture phase instead of bubbling. |
| **`.passive`** | Marks the listener as passive (useful for scroll/touch). |
| **`.silent`** | Runs the handler but does **not** schedule a component re-render. |

```tsx
// Block form submission and event bubble
<form onSubmit={event.trap(handleSubmit)}>
  <button type="submit">Submit</button>
</form>

<button onClick={event.once.prevent(handler)}>Save once</button>
```

---

## Conditional Modifiers

### `.if(condition)`

Runs the handler only when a condition is true. For mutable state, pass a predicate so it is evaluated at event time. A plain boolean is a snapshot taken when the chain is built.

```tsx
<button onClick={event.if(() => canSave).handler(save)}>
  Save
</button>
```

### `.target(filter)`

Runs only when the event target matches a CSS selector or a custom predicate. Useful for event delegation.

```tsx
<div onClick={event.target('button[data-action]').handler((e) => {
  const action = (e.target as HTMLElement).dataset.action;
})}>
  <button data-action="archive">Archive</button>
  <button data-action="delete">Delete</button>
</div>
```

### `.closest(selector)`

Runs only if the event target (or an ancestor) matches a CSS selector.

```tsx
<ul onClick={event.closest('.item-btn').handler((e) => {
  const button = e.target.closest('.item-btn');
})}>
  <li><button class="item-btn">Item 1</button></li>
</ul>
```

### `.outside`

Runs when the event originates outside the target element — useful for "click outside to close" panels.

```tsx
event.click.outside.handler((e) => {
  if (panel && !panel.contains(e.target)) closePanel();
});
```

---

## Keyboard Filters

Use these on keyboard events (`onKeyDown`, `onKeyUp`, etc.):

| Modifier | Key |
| :--- | :--- |
| `.enter` | Enter / Return |
| `.esc` | Escape |
| `.space` | Space |
| `.tab` | Tab |
| `.up` / `.down` | Arrow Up / Arrow Down |
| `.del` | Delete |

For other keys, use `.key(...)`:

```tsx
<input onKeyDown={event.key('Enter').prevent.handler(submit)} />
<input onKeyDown={event.key(['Enter', 'NumpadEnter']).handler(submit)} />
```

### Modifier keys

| Modifier | Meaning |
| :--- | :--- |
| `.mod` | Ctrl on Linux/Windows, Cmd on macOS |
| `.ctrl` | Control key |
| `.meta` | Meta / Cmd key |
| `.shift` | Shift key |
| `.alt` | Alt / Option key |

```tsx
// Save on Ctrl/Cmd + S
event.hotkey('ctrl+s').prevent.handler(saveDocument);
```

---

## Mouse & Pointer Filters

| Modifier | Meaning |
| :--- | :--- |
| `.left` | Primary mouse button |
| `.middle` | Middle mouse button |
| `.right` | Secondary mouse button (often triggers context menu) |

```tsx
<button onMouseDown={event.left.handler(select)}>Primary click only</button>
```

---

## Timing Modifiers

Control when the handler actually runs:

| Modifier | Effect |
| :--- | :--- |
| `.debounce(ms)` | Waits until the event stops firing for `ms` milliseconds. |
| `.throttle(ms)` | Runs at most once every `ms` milliseconds. |
| `.cooldown(ms)` | Ignores events until `ms` milliseconds have passed since the last run. |

Timing modifiers return a chain that must end with `.handler(...)`. Auwla defers component invalidation until the delayed handler actually runs, preventing premature re-renders.

```tsx
<input onInput={event.debounce(250).handler((e) => {
  query = (e.target as HTMLInputElement).value;
})} />

<div onPointerMove={event.throttle(80).handler(trackPointer)} />

<button onClick={event.cooldown(1000).handler(() => {
  saves++;
})}>
  Save
</button>
```

---

## Global Listeners (`.global`)

You can register event listeners directly at the window/document level. Auwla manages these listeners reactively — **they are automatically cleaned up and removed when the active component unmounts** or when conditional rendering hides the element.

```tsx
function GlobalClickDemo() {
  let clickCount = 0;

  // Listens to all clicks on the window
  event.click.global.handler(() => {
    clickCount++;
  });

  return () => (
    <div>Global clicks recorded: {clickCount}</div>
  );
}
```

---

## Global Hotkeys (`event.hotkey`)

Auwla supports registering global document-level hotkeys and multi-key keyboard sequences (Gmail-style). The event system automatically ignores these hotkeys when the user is typing inside input or textarea fields, unless they contain command modifiers (like `Ctrl` or `Cmd`).

```tsx
function Shortcuts() {
  // 1. Single shortcut with modifiers
  event.hotkey('ctrl+s').prevent.handler(() => {
    saveDocument();
  });

  // 2. Key sequence (press 'g' then 'i')
  event.hotkey('g i').handler(() => {
    navigateTo('/inbox');
  });

  // 3. Simple escape key
  event.hotkey('esc').handler(() => {
    closeModals();
  });

  return () => <p>Press Ctrl+S to save, or press "g i" to navigate.</p>;
}
```

---

## Touch & Gesture Modifiers (`event.touch`)

Auwla includes a pointer tracking and gesture system designed for building touch-friendly dragging, sliders, and swipe gestures:

### 1. Pointer Syncing (`event.touch.sync`)

Binds pointer dragging coordinates directly to a local coordinate object, updating it on move and cleaning up on release:

```tsx
function DraggableCard() {
  let position = { x: 50, y: 50 }; // Pixel coordinates

  return () => (
    <div 
      style={{ left: `${position.x}px`, top: `${position.y}px`, position: 'absolute' }}
      onTouch={event.touch.sync(position, 'x', 'y').handler(() => {
        // position is mutated automatically; re-render reads the new values
      })}
    >
      Drag Me
    </div>
  );
}
```

### 2. Coordinate Fitting & Interpolation (`event.touch.fit`)

Linearly interpolates drag positions relative to the container element width/height into custom numeric ranges. Perfect for sliders and progress bars:

```tsx
function Slider() {
  let val = 0; // State constrained between 0 and 100

  return () => (
    <div 
      class="slider-bar"
      onTouch={event.touch.fit(0, 100).handler((e) => {
        val = e.detail.x; // e.detail.x holds the fitted value
      })}
    >
      <div class="handle" style={{ left: `${val}%` }} />
    </div>
  );
}
```

### 3. Swipe Filtering (`event.touch.moved`)

Filters swipe actions by threshold distance (in pixels) and direction to prevent accidental taps from triggering swipes:

```tsx
// Fire action only if swiped right by at least 40 pixels
<div onTouch={event.touch.moved(40, 'right').handler(handleSwipeRight)}>
  Swipe Area
</div>
```

---

## Intersection Observer (`event.intersect`)

Easily bind elements to the viewport visibility lifecycle using `event.intersect()`. Use `.in` and `.out` to catch entry and exit points:

```tsx
<div 
  onIntersect={
    event
      .intersect(0.5) // Trigger when 50% visible
      .in.handler(() => console.log('Element entered viewport!'))
  }
/>

<div onIntersect={event.intersect.out.handler(handleExit)} />
```

---

## Logging (`.log`)

Logs the event to the console and continues the chain. Accepts an optional label.

```tsx
<button onClick={event.log('[Save]').handler(save)}>Save</button>
```

---

## Common Chains

```tsx
// Submit on Enter inside a form
<input onKeyDown={event.enter.prevent.handler(submit)} />

// Debounced search input
<input onInput={event.debounce(300).handler(runSearch)} />

// Global hotkey
event.hotkey('ctrl+k').handler(focusSearch);

// Click outside to close panel
event.click.outside.handler(closePanel);

// Silent high-frequency mouse tracking
<div onMouseMove={event.silent.handler(updateCoords)} />
```

---

In the next section, we will learn about the [Async & Data Lifecycle](/docs/async-lifecycle) and how to handle data fetching safely.
