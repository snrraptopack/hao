> This directory contains Auwla's DOM event system. It provides the `event` proxy primitive and the chainable event modifier API.

# `events`

Auwla uses a chainable event listener API to keep your JSX clean and declarative. Instead of manually checking keys, preventing defaults, or throttling in your handlers, you can chain modifiers onto the event binding.

```tsx
import { event } from 'auwla/events'

// Basic event modifiers
<button onClick={event.prevent(handleClick)}>
  Click me
</button>

// Chainable modifiers with keys and timing
<input 
  onKeyDown={event.prevent.enter.throttle(300)(handleSearch)} 
/>
```

## Built-in Event Primitives

- `keyboard.ts`: `.key()`, `.ctrl()`, `.shift()`, `.alt()`, `.meta()`
- `mouse.ts`: `.left()`, `.right()`, `.middle()`, `.self()`
- `timing.ts`: `.debounce(ms)`, `.throttle(ms)`, `.once()`
- `outside.ts`: `.outside()` for click-outside detection
- `intersect.ts`: `.intersect()` for IntersectionObserver
- `touch.ts`: Touch and swipe gestures

*(Note: Async tracking and data-fetching primitives have been moved to the `src/track` directory.)*
