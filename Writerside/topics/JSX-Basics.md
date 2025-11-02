# JSX Basics: Elements and Attributes

JSX is a syntax extension for JavaScript that lets you write HTML-like markup inside your code. It provides a powerful and readable way to describe what your UI should look like. In Auwla, JSX is compiled into plain JavaScript function calls, giving you the full power of JavaScript for building your user interface.

This section covers the fundamentals of using JSX in Auwla, focusing on creating elements, setting attributes, and embedding expressions.

## The `h` Function: How JSX Works

When you write JSX, the TypeScript compiler transforms it into calls to a function named `h`. This function is responsible for creating the actual DOM elements. Because of this transformation, you must import `h` from the `auwla` package in any file that contains JSX.

Think of this:

```TypeScriptJSX
// This JSX
const element = <div class="greeting">Hello</div>;

// Is compiled into this JavaScript
const _element = h('div', { class: 'greeting' }, 'Hello');
```

Here is a complete, basic component:

```TypeScriptJSX
import { h } from 'auwla';

export function Basic() {
  return (
    <div class="card">
      <h1>Title</h1>
      <p>Text and expressions</p>
    </div>
  )
}
```

## Attributes

You can set attributes on your JSX elements just like you would in HTML. Auwla provides flexible handling for common attributes.

### `class` and `className`

For setting CSS classes, you can use either `class` or `className`. Both are supported, so you can use whichever you prefer.

```TypeScriptJSX
<div class="card">...</div>
<div className="card">...</div>
```

### `style`

The `style` attribute accepts either a string of CSS or a JavaScript object with camelCased property names.

```TypeScriptJSX
// Style with an object (recommended)
<div style={{ backgroundColor: '#f0f0f0', padding: '1rem' }}>...</div>

// Style with a string
<div style="background-color: #f0f0f0; padding: 1rem;">...</div>
```

### Event Handlers

Event handlers follow the standard DOM naming convention, such as `onClick`, `onInput`, and `onMouseOver`. You pass a function directly to the handler.

```TypeScriptJSX
import { h } from 'auwla';

export function Attributes() {
  return (
    <button
      class="btn primary"
      style={{ padding: '8px', backgroundColor: '#f9fafb' }}
      onClick={() => alert('clicked')}
    >
      Click me
    </button>
  )
}
```

## Expressions & Interpolation

You can embed any JavaScript expression within your JSX by wrapping it in curly braces `{}`. This is commonly used to display dynamic text or values.

```TypeScriptJSX
import { h } from 'auwla';

export function Expressions() {
  const user = { name: 'Ada', count: 3 };
  return (
    <p>
      Hello {user.name}, you have {user.count} messages.
    </p>
  )
}
```

