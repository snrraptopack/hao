# JSX: Composition and Children

In Auwla, you build complex user interfaces by creating small, reusable components and composing them together. This guide covers how to pass data to components using `props` and how to manage nested content with `props.children`.

## Component Composition

Components are plain JavaScript functions that return DOM elements. You can use them inside other components just like you would with standard HTML tags. Data is passed down from a parent to a child component via `props`—an object containing the attributes you set in JSX.

Here’s how you can define two simple components and compose them into a larger `App` component:

```TypeScriptJSX
import { h } from 'auwla';

// A simple component that accepts a 'title' prop
type HeaderProps = {
  title: string;
};
function Header(props: HeaderProps) {
  return (
    <header>
      <h1>{props.title}</h1>
    </header>
  )
}

// Another component that takes 'title' and 'body' props
type CardProps = {
  title: string;
  body: string;
};
function Card(p: CardProps) {
  return (
    <section>
      <h2>{p.title}</h2>
      <p>{p.body}</p>
    </section>
  )
}

// The main App component composes the other two
export function App() {
  return (
    <div>
      <Header title="Template Syntax" />
      <Card title="Composition" body="Keep components small and focused." />
    </div>
  )
}
```

By breaking down your UI into smaller, focused components, you make your code easier to read, manage, and reuse.

## Handling Children

In JSX, any content you place between a component's opening and closing tags is passed to that component as the `children` prop. This is a powerful pattern for creating generic wrappers and layouts.

The `props.children` value is always normalized to an array, even if only one child is passed. This makes it easy to handle children consistently.

Here is a `Wrapper` component that renders its children inside a `div`:

```TypeScriptJSX
import { h } from 'auwla';

type WrapperProps = {
  children?: (Node | string | number)[];
};

function Wrapper(p: WrapperProps) {
  // The children are rendered here
  return <div class="wrapper">{p.children}</div> as HTMLElement;
}

export function Demo() {
  return (
    <section>
      {/* A single text child */}
      <Wrapper>Some text content</Wrapper>

      {/* A child element */}
      <Wrapper>
        <strong>Bold text</strong>
      </Wrapper>

      {/* An array of children from .map() */}
      <Wrapper>
        {['A', 'B', 'C'].map((item) => (
          <span>{item}</span>
        ))}
      </Wrapper>
    </section>
  )
}
```

> **Note:** In Auwla, `null`, `undefined`, and boolean values are ignored when rendered as children, which is useful for conditional rendering logic.

## Fragments

Sometimes you need to return multiple elements from a component without adding an extra wrapper element to the DOM. This is where `Fragment` comes in.

You can use `<Fragment>` to group a list of children. You'll need to import `Fragment` alongside `h`.

```TypeScriptJSX
import { h, Fragment } from 'auwla';

export function List() {
  const items = ['One', 'Two', 'Three'];
  return (
    <ul>
      <Fragment>
        {items.map((item) => (
          <li>{item}</li>
        ))}
      </Fragment>
    </ul>
  )
}
```

Fragments are especially useful when rendering lists or when a component's structure is determined by its parent (e.g., in table rows or flexbox layouts).

