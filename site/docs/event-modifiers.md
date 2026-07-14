# Event Modifiers

Auwla features a powerful, chainable event builder API that keeps your JSX clean and declarative. 

Instead of polluting your handler functions with boilerplate for preventing default behaviors, filtering specific keys, debouncing high-frequency events, or tracking drag gestures, you can chain modifiers directly onto your event listeners.

To keep client-side bundle sizes as small as possible, Auwla's event system is designed to be fully **tree-shakable**. Heavy features (like touch gestures, intersection observers, and global hotkeys) are split into dedicated entry points, ensuring you only bundle what you actually use.

---

## 1. Core Events (`auwla/events`)

The default `auwla/events` entry point contains the lightweight core builder and standard DOM modifiers. It has a near-zero bundle footprint and is used for daily event operations.

```tsx
import { event } from 'auwla/events';

function SimpleForm() {
  return (
    <form onSubmit={event.trap(handleSubmit)}>
      {/* Prevents default action and stops bubbling */}
      <button type="submit">Submit</button>
      
      {/* Save action that fires at most once */}
      <button onClick={event.once.prevent(save)}>Save Once</button>
    </form>
  );
}
```

### Core Modifiers:
* **`.prevent`** — Calls `event.preventDefault()`
* **`.stop`** — Calls `event.stopPropagation()`
* **`.stopImmediate`** — Calls `event.stopImmediatePropagation()`
* **`.trap`** — Shorthand that calls both `preventDefault` and `stopPropagation`
* **`.once`** — Detaches the listener automatically after firing once
* **`.self`** — Only fires the callback if the event target is the host element itself (not a child)
* **`.trusted`** — Only fires for browser-trusted user events
* **`.capture`** / **`.passive`** — Sets event listener capture or passive options
* **`.silent`** — Runs the handler but suppresses component re-rendering

### Timing & Rate-Limiting Modifiers:
* **`.debounce(ms)`** — Defers execution until the event stops firing for `ms` milliseconds.
* **`.throttle(ms)`** — Executes the callback at most once every `ms` milliseconds.
* **`.cooldown(ms)`** — Ignores new incoming events for `ms` milliseconds after a run.

```tsx
// Debounces text search inputs
<input onInput={event.debounce(300).handler(performSearch)} />

// Throttles high-frequency mouse movements
<div onPointerMove={event.throttle(80).handler(trackPointer)} />
```

### Global Listeners (`.global`)
You can listen to events directly at the window or document level. These listeners are automatically attached on mount and cleaned up when the component unmounts.

```tsx
// Listens for clicks anywhere on the document
event.click.global.handler(() => {
  console.log("Clicked somewhere on the page");
});
```

---

## 2. Keyboard Filters (`auwla/events/keyboard`)

The keyboard module isolates key matchers and modifier key validation. It exposes three event chains: `keyDown`, `keyUp`, and `keyPress`.

```tsx
import { keyDown } from 'auwla/events/keyboard';

function InputField() {
  return (
    <div>
      {/* Trigger on Enter */}
      <input onKeyDown={keyDown.enter.prevent.handler(submit)} />
      
      {/* Trigger on custom multiple keys */}
      <input onKeyDown={keyDown.key(['Tab', 'Space']).handler(handleA11y)} />
    </div>
  );
}
```

### Supported Key Filters:
* **`.enter`** — Enter / Return key
* **`.esc`** — Escape key
* **`.space`** — Spacebar
* **`.tab`** — Tab key
* **`.up` / `.down`** — Arrow Up / Arrow Down
* **`.del`** — Delete key
* **`.key(name | name[])`** — Explicit key name(s) (e.g. `['Enter', 'NumpadEnter']`)

### Modifier Keys:
You can restrict listeners to only fire when modifier keys are pressed:
* **`.mod`** — Shorthand for `Cmd` on macOS and `Ctrl` on Windows/Linux
* **`.ctrl`** — Control key
* **`.meta`** — Meta / Command key
* **`.shift`** — Shift key
* **`.alt`** — Alt / Option key

```tsx
// Fire action only on Ctrl+Shift+Enter
<input onKeyDown={keyDown.ctrl.shift.enter.handler(postComment)} />
```

---

## 3. Global Hotkeys (`auwla/events/hotkey`)

The hotkey module enables global, document-wide keyboard shortcuts. It automatically ignores inputs when typing in `<input>` or `<textarea>` elements unless they contain command modifiers (like `Ctrl` or `Cmd`).

```tsx
import { hotkey } from 'auwla/events/hotkey';

function AppShortcuts() {
  // Registers Ctrl+K search globally
  const unbind = hotkey('ctrl+k').prevent.handler(() => {
    openSearchModal();
  });

  // Registers sequence shortcuts (press 'g' then 'i')
  hotkey('g i').handler(() => {
    navigateTo('/inbox');
  });

  // Hotkeys return an unbind function for manual teardowns
  return <p>Press Ctrl+K to search, or "g i" to open the inbox.</p>;
}
```

---

## 4. Touch & Gestures (`auwla/events/touch`)

The gesture module packs unified pointer listeners and gesture trackers. It exposes pointer starters: `touchStart`, `touchMove`, `touchEnd`, `touchCancel`, and `touch`.

```tsx
import { touchStart } from 'auwla/events/touch';
```

### Gestures:

#### Swipe Filtering (`.moved`)
Filters swipe actions by threshold distance (in pixels) and direction to prevent accidental taps from firing events.

```tsx
// Fire only if swiped right by at least 50px
<div onTouch={touchStart.moved(50, 'right').prevent.handler(swipeAction)}>
  Swipe right to complete task
</div>
```

#### Coordinate Syncing (`.sync`)
Tracks dragging and coordinates, binding values directly to a local coordinate object on move and cleaning up on release.

```tsx
function DraggableItem() {
  let coords = { x: 0, y: 0 };

  return (
    <div 
      style={{ left: `${coords.x}px`, top: `${coords.y}px`, position: 'absolute' }}
      onTouch={touchStart.sync(coords, 'x', 'y').handler(() => {
        // Coords are updated automatically; layout is patched on drag
      })}
    >
      Drag me
    </div>
  );
}
```

#### Coordinate Fitting & Interpolation (`.fit`)
Interpolates dragging offsets relative to the element's width/height, mapping positions into custom numeric ranges. Excellent for custom sliders.

```tsx
function VolumeSlider() {
  let volume = 50; // Constrained between 0 and 100

  return (
    <div 
      class="slider-track"
      onTouch={touchStart.fit(0, 100).handler((event) => {
        volume = event.detail.x; // Fitted value is available on event detail
      })}
    >
      <div class="slider-handle" style={{ left: `${volume}%` }} />
    </div>
  );
}
```

---

## 5. Intersection Observer (`auwla/events/intersect`)

The intersection observer module exposes the `intersect` builder, allowing you to catch entry and exit points of elements relative to the viewport.

```tsx
import { intersect } from 'auwla/events/intersect';

function LazyImage() {
  let visible = false;

  return (
    <div 
      class="lazy-wrapper"
      onIntersect={intersect(0.1).in.once.handler(() => {
        visible = true; // Trigger load when 10% visible
      })}
    >
      {visible ? <img src="/large-image.jpg" /> : <div class="placeholder" />}
    </div>
  );
}
```

### Modifiers:
* **`intersect(threshold)`** — Takes a threshold ratio between `0.0` and `1.0`
* **`.in`** — Triggers when the element enters the viewport
* **`.out`** — Triggers when the element exits the viewport
* **`.once`** — Detaches the intersection observer after the first matching trigger (useful for lazy-loading)
