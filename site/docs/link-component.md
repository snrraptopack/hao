# Link Component

Auwla provides the `<Link>` component to handle declarative, client-side routing.

Instead of writing standard HTML anchor tags (`<a>`), which trigger a full page reload and wipe out your reactive application state, the `<Link>` component intercepts clicks to perform instant transitions.

---

## Basic Usage

Import `Link` from `'auwla/router'` and pass the path inside the `href` attribute:

```tsx
import { Link } from 'auwla/router';

export default function Navbar() {
  return (
    <nav class="navbar">
      <Link href="/">Home</Link>
      <Link href="/about">About Us</Link>
    </nav>
  );
}
```

---

## All Configuration Props

The `<Link>` component accepts a comprehensive set of properties for path interpolation, active styling, event handling, and optimization:

| Property | Type | Default | Description |
|---|---|---|---|
| **`href`** | `string` | *(Required)* | The target route path pattern. Can be static (e.g. `/about`) or parameterized (e.g. `/posts/:id`). |
| **`params`** | `Record<string, string>` | `undefined` | Key-value pairs matching the parameters of your dynamic path. Required when `href` is parameterized. |
| **`query`** | `Record<string, string \| number \| boolean>` | `undefined` | Query string parameters appended to the URL (e.g. `{ ref: "nav", limit: 10 }`). |
| **`class`** | `string` | `undefined` | Custom CSS class names applied to the rendered anchor element. |
| **`style`** | `string \| Record<string, string>` | `undefined` | Inline styles applied to the anchor element. Accepts CSS string or object. |
| **`activeClass`** | `string` | `"active"` | CSS class applied when the current URL starts with this link's resolved URL path. |
| **`exactActiveClass`** | `string` | `"exact-active"` | CSS class applied only when the current URL matches the link's resolved URL path exactly. |
| **`prefetch`** | `boolean` | `true` | When true, hovering the link pre-downloads the target page's code chunk and triggers its data loader immediately. |
| **`onClick`** | `(e: MouseEvent) => void` | `undefined` | Custom event listener executed on click. Runs before navigation. |

---

## Practical Examples

### 1. Dynamic Parameter Interpolation (`params` & `query`)
For routes with dynamic segments, pass the path pattern to `href` and resolve values using `params`:

```tsx
import { Link } from 'auwla/router';

function PostCard(props: { id: string, category: string }) {
  return (
    <div class="card">
      <Link 
        href="/posts/:id" 
        params={{ id: props.id }}
        query={{ source: 'feed', cat: props.category }}
      >
        Read Full Post
      </Link>
    </div>
  );
}
```
* **Rendered output URL:** `/posts/123?source=feed&cat=tech`

### 2. Custom CSS Styles and Classes
```tsx
<Link 
  href="/profile"
  class="btn-primary"
  style={{ display: 'inline-flex', padding: '10px' }}
>
  View Profile
</Link>
```

### 3. Active Styling
Configure custom styles for active page headers:

```tsx
<Link 
  href="/docs/:slug"
  params={{ slug: 'introduction' }}
  activeClass="border-b-2 border-[#ff3e00]"
  exactActiveClass="font-bold text-[#ff3e00]"
>
  Documentation
</Link>
```

---

## Dynamic Prefetching (`prefetch`)

By default, `<Link>` is equipped with **smart prefetching** (`prefetch={true}`):
* When a user hovers their mouse cursor over a link, the router begins prefetching the code chunk for that page and starts executing the route's `routed` loader function in the background.
* By the time the user clicks, the page is often already loaded and resolves instantly.

To disable prefetching (e.g. for long lists of links or menus that are hovered frequently but rarely clicked), set the prop to `false`:

```tsx
<Link href="/settings" prefetch={false}>
  Settings
</Link>
```

---

## Native Browser Interactions

While `<Link>` intercepts navigation to keep routing inside the client-side lifecycle, it is fully accessible and automatically falls back to native browser behaviors when appropriate:
* **Modifier Key Clicks**: Hold down **Cmd (Mac)**, **Ctrl (Windows/Linux)**, **Shift**, or **Alt** while clicking a link to open the page in a new window or tab.
* **Middle-Clicks**: Mouse wheel clicks open the link in a new tab natively.
* **Custom event handling**: The `onClick` listener is executed first. You can call `e.preventDefault()` inside your click listener to block navigation if necessary:

```tsx
<Link 
  href="/profile" 
  onClick={(e) => {
    if (!confirm("Discard unsaved changes?")) {
      e.preventDefault(); // Blocks routing
    }
  }}
>
  Go to Profile
</Link>
```
