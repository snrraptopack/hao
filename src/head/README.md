# Head Management

Auwla provides a declarative `<Head>` component for managing document head tags (title, meta, link, etc.) from anywhere in your component tree.

## Usage

Import the `Head` component from `auwla/head`:

```tsx
import { Head } from 'auwla/head';

export default function MyPage() {
  return () => (
    <div>
      <Head>
        <title>My Page Title</title>
        <meta name="description" content="Description of my page" />
      </Head>
      <main>
        <h1>Content</h1>
      </main>
    </div>
  );
}
```

## How it works

### Client-side (CSR)
When rendered in the browser, the `<Head>` component:
1. Leaves a `<!--auwla:head-->` placeholder comment in the DOM where it was rendered.
2. Hoists its children and appends them to `document.head`.
3. When the component unmounts (e.g. during a route change), it automatically removes those hoisted tags from the document head.

### Server-side (SSR)
When rendered on the server, the `<Head>` component:
1. Returns an empty string `''` to the template serializer (so no tags are rendered in the `<body>`).
2. Collects the serialized HTML of its children.
3. The server adapter injects all collected tags into the final HTML response just before the `</head>` closing tag.

## Reactivity

Auwla's `<Head>` component is fully reactive. Because Auwla mutates the `props` object in place on re-renders, the closure returned by `Head` always reads the latest `props.children` passed by the parent.

If your component has state that dictates the page title, simply passing that state to the `<title>` inside `<Head>` will automatically update `document.title` when the state changes.
