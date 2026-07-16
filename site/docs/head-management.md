=<Header>
title: Head Management
=</Header>

# Head Management

Auwla supports native, type-safe HTML `<head>` tag hoisting directly inside your JSX pages and components. There's no need for external libraries or custom wrappers—just use the standard HTML `<head>` tag and its children (`<title>`, `<meta>`, `<link>`, etc.) anywhere in your component tree.

```tsx
export default function BlogPost() {
  return (
    <div>
      <head>
        <title>Auwla - Isomorphic Head Management</title>
        <meta name="description" content="Auwla handles head elements natively!" />
        <link rel="canonical" href="https://auwla.dev/blog" />
      </head>
      
      <main>
        <h1>Dynamic Head Hoisting</h1>
        <p>Auwla handles head elements on both the server and client automatically.</p>
      </main>
    </div>
  );
}
```

---

## How It Works

### Server-Side Rendering (SSR) & Static Site Generation (SSG)
During SSR/SSG rendering, the engine intercepts any `<head>` tags encountered in the component tree, extracts their children, and merges them into the main HTML shell's `<head>` tag before serving the response. This ensures correct SEO metadata, title, and social share links are immediately visible to crawlers and search engine bots.

### Client-Side Navigation (CSR)
On the client, when a component containing a `<head>` tag mounts or is navigated to, Auwla automatically hoists all its child tags into the browser's real `document.head`. 

### Automatic Cleanup
When the component unmounts or you navigate to a different route, Auwla automatically cleans up the previous route's hoisted head tags. This prevents metadata leaks, duplicate tags, or stale page titles on transition.

---

## Router Accessibility & Title Synchronization

Auwla's router integrates with head management to deliver accessibility features out-of-the-box:

*   **Title Synchronization:** If a route is configured with a `meta.title` property in your routing definition, the router automatically updates the browser tab title (`document.title`) on transitions.
*   **Automatic Focus Reset:** On route transitions, the router automatically shifts keyboard focus to the first `<main>` element, `<h1>` heading, or the application container. This prompts screen readers to announce the new page content immediately.
