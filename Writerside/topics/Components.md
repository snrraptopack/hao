# Components in Auwla

In Auwla, components are the fundamental building blocks of your application. They are plain JavaScript functions that accept an object of `props` and return a DOM element. This approach encourages creating small, reusable, and easily testable pieces of UI.

This guide covers the core patterns for creating and composing components, handling nested content with `children`, using "named slots" for complex layouts, and best practices for typing props.

## The Basics: A Simple Component

At its core, a component is a function that returns JSX. Remember to import `h` in any file that uses JSX.

Here’s how you can create a reusable `Button` component that accepts `props` to customize its appearance and content.

```TypeScriptJSX
import { h } from 'auwla';

type ButtonProps = {
  kind?: 'primary' | 'ghost';
  children?: (Node | string | number)[];
};

export function Button({ kind = 'primary', children = [] }: ButtonProps) {
  const baseClasses = 'px-3 py-2 rounded';
  const kindClasses = kind === 'primary'
    ? 'bg-indigo-600 text-white'
    : 'border text-gray-900';

  return (
    <button class={`${baseClasses} ${kindClasses}`}>
      {children}
    </button>
  );
}

// Example of how to use the Button component
export function Demo() {
  return (
    <div class="space-x-2">
      <Button>Save</Button>
      <Button kind="ghost">Cancel</Button>
    </div>
  );
}
```

## Handling Children Explicitly

Any content you place between a component's opening and closing tags is passed through the `props.children` property. In Auwla, `children` are not rendered automatically. You must explicitly place `{children}` in your JSX where you want the nested content to appear. This makes component layouts predictable and easy to reason about.

The `children` prop is always normalized to an array, making it easy to handle consistently.

```TypeScriptJSX
import { h } from 'auwla';

type CardProps = {
  title: string;
  children?: (Node | string | number)[];
};

export function Card({ title, children = [] }: CardProps) {
  return (
    <section class="rounded border p-4 space-y-2">
      <h2 class="font-semibold">{title}</h2>
      {/* Children are explicitly rendered here */}
      <div>{children}</div>
    </section>
  );
}

export function UseCard() {
  return (
    <Card title="Hello">
      <p>How are you?</p>
    </Card>
  );
}
```

## Named Slots for Complex Layouts

While `props.children` is perfect for a single content area, complex components often need multiple content regions. The "named slots" pattern solves this by using regular props to pass different pieces of UI. This makes your component's API clear and the layout explicit.

In this example, the `Card` component defines `header`, `actions`, and `footer` props as "slots" for custom content.

```TypeScriptJSX
import { h } from 'auwla';

type Slot = Node | string | number | undefined;

type CardProps = {
  title?: string;
  header?: Slot;
  actions?: Slot;
  children?: (Node | string | number)[]; // The default slot
  footer?: Slot;
};

export function Card({ title, header, actions, children = [], footer }: CardProps) {
  return (
    <section class="rounded border p-4 space-y-3">
      <div class="flex items-center justify-between">
        <div class="font-semibold">{header ?? title}</div>
        <div class="flex gap-2">{actions}</div>
      </div>
      <div>{children}</div>
      {footer ? <div class="text-sm text-gray-600">{footer}</div> : null}
    </section>
  );
}

export function Example() {
  return (
    <Card
      header={<span>Profile</span>}
      actions={<button class="px-2 py-1 border rounded">Edit</button>}
      footer="Last updated today"
    >
      <p>Content goes here.</p>
    </Card>
  );
}
```

## Prop Typing

Using clear and consistent TypeScript types for your component props is crucial for a good developer experience. It improves readability, enables autocompletion, and helps catch errors early.

For simple components, you can define prop types inline, but for more complex components, a `type` block is more readable.

```TypeScriptJSX
import { h } from 'auwla';

type AvatarProps = {
  src: string;
  alt?: string;
  size?: number;
};

export function Avatar(p: AvatarProps) {
  const s = p.size ?? 32;
  return (
    <img
      src={p.src}
      alt={p.alt ?? ''}
      style={{ width: s + 'px', height: s + 'px', borderRadius: '9999px' }}
    />
  );
}
```

## Summary of Composition Patterns

- **`children` Prop**: Best for components that have a single, primary content area.
- **Named Slots**: Ideal for complex layout components with multiple, distinct content regions (e.g., `header`, `footer`).
- **Data Props**: Use regular props for passing non-UI data like strings, numbers, or objects.

By combining these patterns, you can build a robust and flexible component library for your application.

