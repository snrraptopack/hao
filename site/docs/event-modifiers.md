# Event Modifiers

Auwla features a powerful, chainable event builder API that keeps your JSX clean and declarative. Instead of polluting your handler functions with boilerplate for preventing defaults, checking keys, debouncing, or handling clicks outside, you can chain modifiers directly onto your event listeners.

---

## Basic Behavior Modifiers

These wrappers handle standard DOM event behaviors:

* **`.prevent`**: Calls `event.preventDefault()`.
* **`.stop`**: Calls `event.stopPropagation()`.
* **`.trap`**: Shorthand that calls **both** `preventDefault()` and `stopPropagation()`.
* **`.self`**: Only fires the callback if the event target is the element itself (not a child).
* **`.once`**: Automatically detaches the listener after firing once.

```tsx
// Block form submission and event bubble
<form onSubmit={event.trap(handleSubmit)}>
  <button type="submit">Submit</button>
</form>
```

---

## Keyboard & Mouse Filters

Restrict keyboard and mouse events to specific keys or click buttons:

* **Key Filters**: `.enter`, `.escape`, `.space`, `.tab`, `.up`, `.down`, `.left`, `.right` (arrow keys).
* **Key Modifiers**: `.ctrl`, `.shift`, `.alt`, `.meta`.
* **Mouse Buttons**: `.left`, `.middle`, `.right`.

```tsx
// Move left on arrow-left click
<div onKeyDown={event.left.prevent(moveLeft)} />

// Custom context menu trigger on right click
<div onMouseDown={event.right.prevent(openMenu)} />
```

---

## Global Listeners (`.global`)

You can register event listeners directly at the window/document level. Auwla manages these listeners reactively—**they are automatically cleaned up and removed when the active component unmounts** or when conditional rendering hides the element.

```tsx
import { event } from 'auwla/events';

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
import { event } from 'auwla/events';

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
      onTouch={event.touch.sync(position, 'x', 'y')}
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
```

---

## DOM & Invalidation Control

### 1. Silent Listeners (`event.silent`)
Auwla event handlers trigger component re-renders automatically. For high-frequency actions (like mouse coordinates tracking) where you want to write to the DOM manually without causing framework overhead, use `.silent`:

```tsx
function HighFreqTrack() {
  let moves = 0;

  return () => (
    <div 
      onMouseMove={event.silent.handler(() => {
        moves++;
        // Manually update the DOM node directly for high performance
        document.getElementById('counter')!.innerText = String(moves);
      })}
    >
      Moves: <span id="counter">0</span>
    </div>
  );
}
```

### 2. Ancestor Matching (`event.closest`)
Matches event targets up the DOM tree, verifying if the clicked element (or any of its parents) matches a CSS selector before firing:

```tsx
// Fires only if the clicked element is (or is inside) an element with class .action-btn
<div onClick={event.closest('.action-btn').handler(handleAction)}>
  <button class="action-btn">
    <span>Click Child text</span>
  </button>
</div>
```
